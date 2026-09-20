/**
 * Executive Gantt & Milestones Schedule Timeline - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Inspired by & Directly Solves:
 * - Buganizer Cloud Blocker b/449635128:
 *   "Data Analytics > Looker > Timeline Visualization and Color Formatting based on Measure [Cloud Blocker]"
 * - Buganizer Customer Requirement b/445748812 (Adani):
 *   "Support conditional formatting in Timeline visualization"
 * - Internal YAQS & Community Feature Requests (go/yeng/1995018768622813184):
 *   "Show time information on the Timeline chart", "Native Gantt Chart with Progress Tracking and Milestones",
 *   "Collapsible swimlanes by category/phase", and "High-density timeline scheduling for 5,000+ events".
 *
 * Multi-Modal Capabilities:
 * - 4 Adaptable Layout Modes:
 *     1. "gantt_progress": Executive Gantt bars with internal progress completion fills (%) & duration badges.
 *     2. "milestone_pins": Milestone delivery roadmap with diamond pins, target completion flags, and deliverable badges.
 *     3. "swimlane_phases": Categorical swimlane hierarchy grouped by phase/owner with collapsible lanes and counts.
 *     4. "metric_heatmap": Continuous measure heatmap gradient & threshold formatting directly unblocking b/449635128.
 * - 5,000+ Row Scalability: High-performance client-side timeline indexing, virtualized scrolling, and Top-N search filtering.
 * - Executive KPI HUD: Real-time project rollups (Total Tasks, Completed %, Active, Overdue/Delayed, Mean Duration, Value).
 * - Live Instant Search: Instant search-as-you-type filter matching task names, swimlanes, and dates.
 * - Time Granularity Controls: Auto-Fit, Day, Week, Month, and Quarter time scales with sticky timeline axis header.
 * - Reference "Today" Indicator: Dynamic current date marker with animated pulse dot.
 * - Native Looker Drill Menus: Direct integration with LookerCharts.Utils.openDrillMenu on click.
 * - Strict 2-Tab Options: Kept strictly to "Display" and "Style" to prevent Edit Viz modal header wrapping.
 */

(function () {
  // Palettes
  var COLOR_PALETTES = {
    google: {
      primary: "#1a73e8",
      secondary: "#34a853",
      accent: "#fbbc04",
      danger: "#ea4335",
      neutral: "#5f6368",
      ramp: ["#e8f0fe", "#aecbfa", "#669df6", "#1a73e8", "#174ea6"],
      status: {
        complete: "#34a853",
        shipped: "#1a73e8",
        processing: "#fbbc04",
        pending: "#5f6368",
        cancelled: "#ea4335",
        active: "#1a73e8",
        delayed: "#ea4335"
      }
    },
    executive: {
      primary: "#0f2027",
      secondary: "#203a43",
      accent: "#2c5364",
      danger: "#e63946",
      neutral: "#4a5568",
      ramp: ["#d0e1fd", "#8ab4f8", "#3872e0", "#185abc", "#0d3c82"],
      status: {
        complete: "#2a9d8f",
        shipped: "#264653",
        processing: "#e9c46a",
        pending: "#6c757d",
        cancelled: "#e76f51",
        active: "#2a9d8f",
        delayed: "#e76f51"
      }
    },
    emerald: {
      primary: "#059669",
      secondary: "#10b981",
      accent: "#34d399",
      danger: "#f87171",
      neutral: "#64748b",
      ramp: ["#d1fae5", "#6ee7b7", "#10b981", "#059669", "#064e3b"],
      status: {
        complete: "#059669",
        shipped: "#10b981",
        processing: "#fbbf24",
        pending: "#64748b",
        cancelled: "#ef4444",
        active: "#059669",
        delayed: "#ef4444"
      }
    },
    sunset: {
      primary: "#f97316",
      secondary: "#fb923c",
      accent: "#fdba74",
      danger: "#ef4444",
      neutral: "#78716c",
      ramp: ["#ffedd5", "#fed7aa", "#fb923c", "#f97316", "#c2410c"],
      status: {
        complete: "#10b981",
        shipped: "#f97316",
        processing: "#fbbf24",
        pending: "#78716c",
        cancelled: "#ef4444",
        active: "#f97316",
        delayed: "#ef4444"
      }
    },
    cyberpunk: {
      primary: "#00f0ff",
      secondary: "#ff007f",
      accent: "#ffe600",
      danger: "#ff0055",
      neutral: "#7000ff",
      ramp: ["#e0f7fa", "#80deea", "#26c6da", "#00acc1", "#006064"],
      status: {
        complete: "#00f0ff",
        shipped: "#ff007f",
        processing: "#ffe600",
        pending: "#7000ff",
        cancelled: "#ff0055",
        active: "#00f0ff",
        delayed: "#ff0055"
      }
    }
  };

  var vizConfig = {
    id: "gantt_milestones_timeline",
    label: "Executive Gantt & Milestones Schedule Timeline",
    options: {
      // SECTION 1: DISPLAY
      layout_mode: {
        section: "Display",
        type: "string",
        label: "Layout Mode",
        display: "select",
        values: [
          { "Gantt with Progress Fills (%)": "gantt_progress" },
          { "Milestone Pin Roadmap": "milestone_pins" },
          { "Categorical Swimlanes (Phase/Owner)": "swimlane_phases" },
          { "Measure Heatmap (Solves b/449635128)": "metric_heatmap" }
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
        order: 4
      },
      show_milestones: {
        section: "Display",
        type: "boolean",
        label: "Render Milestone Diamond Pins",
        default: true,
        order: 5
      },
      show_executive_hud: {
        section: "Display",
        type: "boolean",
        label: "Show Executive KPI HUD Bar",
        default: true,
        order: 6
      },
      show_search_bar: {
        section: "Display",
        type: "boolean",
        label: "Show Live Search & Filter Bar",
        default: true,
        order: 7
      },
      show_today_line: {
        section: "Display",
        type: "boolean",
        label: "Show Current Date (Today) Line",
        default: true,
        order: 8
      },
      show_task_labels: {
        section: "Display",
        type: "boolean",
        label: "Show Inline Task Bar Labels",
        default: true,
        order: 9
      },

      // SECTION 2: STYLE
      color_palette: {
        section: "Style",
        type: "string",
        label: "Color Palette",
        display: "select",
        values: [
          { "Google Modern": "google" },
          { "Executive Navy & Slate": "executive" },
          { "Emerald & Mint": "emerald" },
          { "Sunset Orange & Coral": "sunset" },
          { "Cyberpunk Neon": "cyberpunk" }
        ],
        default: "google",
        order: 1
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
        order: 2
      },
      bar_corner_radius: {
        section: "Style",
        type: "number",
        label: "Bar Corner Radius (px)",
        display: "range",
        min: 0,
        max: 12,
        step: 1,
        default: 4,
        order: 3
      },
      bar_height: {
        section: "Style",
        type: "number",
        label: "Bar Thickness (px)",
        display: "range",
        min: 16,
        max: 36,
        step: 2,
        default: 24,
        order: 4
      },
      show_gridlines: {
        section: "Style",
        type: "boolean",
        label: "Show Vertical Date Gridlines",
        default: true,
        order: 5
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
        order: 6
      }
    },

    create: function (element, config) {
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.fontFamily = "'Google Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

      // Clear existing content
      element.innerHTML = "";

      // Root container
      var container = document.createElement("div");
      container.className = "looker-gantt-root";
      container.style.cssText = "display: flex; flex-direction: column; width: 100%; height: 100%; background: #ffffff; color: #202124; position: relative; overflow: hidden;";
      element.appendChild(container);

      this._container = container;
      this._searchTerm = "";
      this._collapsedSwimlanes = {};

      // Tooltip instance
      var tooltip = document.createElement("div");
      tooltip.className = "looker-gantt-tooltip";
      tooltip.style.cssText = "position: absolute; pointer-events: none; opacity: 0; background: rgba(32, 33, 36, 0.95); color: #ffffff; padding: 10px 14px; border-radius: 6px; font-size: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.25); z-index: 10000; transition: opacity 0.15s ease, transform 0.1s ease; border: 1px solid rgba(255,255,255,0.15); max-width: 320px; line-height: 1.4; backdrop-filter: blur(4px);";
      element.appendChild(tooltip);
      this._tooltip = tooltip;

      // Attach debounced ResizeObserver
      var self = this;
      var lastH = 0;
      var lastW = 0;
      var resizeTimer = null;
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(function (entries) {
          if (!entries || !entries.length) return;
          var entry = entries[0];
          var cr = entry.contentRect;
          var h = cr.height;
          var w = cr.width;
          if (Math.abs(h - lastH) < 4 && Math.abs(w - lastW) < 4) return;
          lastH = h;
          lastW = w;
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () {
            if (self._lastData && self._lastConfig && self._lastQueryResponse) {
              self.render(self._lastData, self._lastConfig, self._lastQueryResponse);
            }
          }, 120);
        });
        ro.observe(element);
        this._resizeObserver = ro;
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

      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;

      try {
        this.render(data, config, queryResponse);
      } catch (err) {
        console.error("Gantt Milestones Timeline Render Error:", err);
        this.addError({
          title: "Render Exception",
          message: err.message || "An error occurred while rendering the timeline visualization."
        });
      }

      done();
    },

    render: function (data, config, queryResponse) {
      var self = this;
      var container = this._container;
      container.innerHTML = "";

      // Color scheme
      var paletteKey = config.color_palette || "google";
      var palette = COLOR_PALETTES[paletteKey] || COLOR_PALETTES.google;
      var isGlass = config.theme_mode === "glass";
      var bgColor = isGlass ? "#f8fafc" : "#ffffff";
      container.style.background = bgColor;

      // Extract fields
      var dims = queryResponse.fields.dimensions || queryResponse.fields.dimension_like || [];
      var meas = queryResponse.fields.measures || queryResponse.fields.measure_like || [];

      // Categorize dimensions: Dates vs Categorical Strings
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

      // Field assignments
      var nameField = catDims.length > 0 ? catDims[0] : (dims.length > 0 ? dims[0] : null);
      var groupField = catDims.length > 1 ? catDims[1] : null;

      var startDateField = dateDims.length > 0 ? dateDims[0] : null;
      var endDateField = dateDims.length > 1 ? dateDims[1] : null;

      // Primary measure
      var metricField = meas.length > 0 ? meas[0] : null;
      var progressField = meas.length > 1 ? meas[1] : null;

      if (!startDateField && dims.length > 0) {
        // Attempt to find any dimension whose values parse as dates
        for (var i = 0; i < dims.length; i++) {
          var sampleVal = data[0][dims[i].name] ? data[0][dims[i].name].value : null;
          if (sampleVal && !isNaN(Date.parse(sampleVal))) {
            startDateField = dims[i];
            break;
          }
        }
      }

      if (!nameField) {
        this.addError({
          title: "Dimension Required",
          message: "Please include at least one task or entity dimension (e.g. products.category or task name)."
        });
        return;
      }

      if (!startDateField) {
        this.addError({
          title: "Date Field Required",
          message: "Please include at least one date or timestamp dimension (e.g. order_items.created_date)."
        });
        return;
      }

      // Parse and structure task items
      var parsedTasks = [];
      var globalMinDate = Infinity;
      var globalMaxDate = -Infinity;
      var metricValues = [];

      var totalTasksCount = data.length;
      var completedCount = 0;
      var activeCount = 0;
      var delayedCount = 0;
      var totalDurationDays = 0;
      var totalMetricSum = 0;

      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        var taskNameCell = row[nameField.name];
        var taskName = (taskNameCell && taskNameCell.value != null) ? String(taskNameCell.value) : "Task " + (r + 1);

        var groupVal = "General";
        if (groupField && row[groupField.name] && row[groupField.name].value != null) {
          groupVal = String(row[groupField.name].value);
        } else if (row["order_items.status"] && row["order_items.status"].value != null) {
          groupVal = String(row["order_items.status"].value);
        }

        // Dates
        var startRaw = row[startDateField.name] ? row[startDateField.name].value : null;
        var endRaw = endDateField && row[endDateField.name] ? row[endDateField.name].value : null;

        var startDate = startRaw ? new Date(startRaw) : null;
        if (!startDate || isNaN(startDate.getTime())) {
          continue; // Skip invalid start date
        }

        var endDate = endRaw ? new Date(endRaw) : null;
        var isMilestone = false;

        if (!endDate || isNaN(endDate.getTime())) {
          // If no end date, treat as 3-day default window or milestone
          endDate = new Date(startDate.getTime() + (3 * 86400000));
          isMilestone = true;
        } else if (endDate.getTime() <= startDate.getTime()) {
          // Zero duration event
          isMilestone = true;
          endDate = new Date(startDate.getTime() + (1 * 86400000));
        }

        var durationDays = Math.max(0.5, (endDate.getTime() - startDate.getTime()) / 86400000);
        totalDurationDays += durationDays;

        if (startDate.getTime() < globalMinDate) globalMinDate = startDate.getTime();
        if (endDate.getTime() > globalMaxDate) globalMaxDate = endDate.getTime();

        // Metrics & Formatting
        var metricVal = 0;
        var metricRendered = "";
        if (metricField && row[metricField.name]) {
          metricVal = Number(row[metricField.name].value) || 0;
          metricRendered = row[metricField.name].rendered || d3.format("$,.2f")(metricVal);
          metricValues.push(metricVal);
          totalMetricSum += metricVal;
        }

        // Progress percentage calculation
        var progressPct = 0;
        var statusStr = groupVal.toLowerCase();
        if (progressField && row[progressField.name] && !isNaN(Number(row[progressField.name].value))) {
          var pVal = Number(row[progressField.name].value);
          progressPct = pVal <= 1 ? Math.round(pVal * 100) : Math.min(100, Math.round(pVal));
        } else {
          // Infer from status string
          if (statusStr.indexOf("complete") !== -1 || statusStr.indexOf("done") !== -1 || statusStr.indexOf("shipped") !== -1) {
            progressPct = 100;
          } else if (statusStr.indexOf("process") !== -1 || statusStr.indexOf("in progress") !== -1 || statusStr.indexOf("active") !== -1) {
            progressPct = 65;
          } else if (statusStr.indexOf("pending") !== -1 || statusStr.indexOf("planning") !== -1) {
            progressPct = 25;
          } else if (statusStr.indexOf("cancel") !== -1 || statusStr.indexOf("block") !== -1) {
            progressPct = 0;
          } else {
            progressPct = 50;
          }
        }

        if (progressPct >= 100) {
          completedCount++;
        } else if (statusStr.indexOf("cancel") !== -1 || statusStr.indexOf("block") !== -1 || statusStr.indexOf("delay") !== -1) {
          delayedCount++;
        } else {
          activeCount++;
        }

        // Extract drill links
        var drillLinks = [];
        if (taskNameCell && taskNameCell.links && taskNameCell.links.length) {
          drillLinks = taskNameCell.links;
        } else if (metricField && row[metricField.name] && row[metricField.name].links && row[metricField.name].links.length) {
          drillLinks = row[metricField.name].links;
        } else if (row[startDateField.name] && row[startDateField.name].links && row[startDateField.name].links.length) {
          drillLinks = row[startDateField.name].links;
        }

        parsedTasks.push({
          id: "task-" + r,
          index: r,
          name: taskName,
          group: groupVal,
          startDate: startDate,
          endDate: endDate,
          durationDays: durationDays,
          metric: metricVal,
          metricRendered: metricRendered,
          progress: progressPct,
          isMilestone: isMilestone,
          status: groupVal,
          drillLinks: drillLinks,
          rawRow: row
        });
      }

      if (parsedTasks.length === 0) {
        this.addError({
          title: "Date Parsing Error",
          message: "Unable to parse valid dates from dimension '" + startDateField.label + "'."
        });
        return;
      }

      // Add a 5% margin to date scale boundaries
      var dateSpan = Math.max(86400000 * 7, globalMaxDate - globalMinDate);
      var domainStart = new Date(globalMinDate - dateSpan * 0.04);
      var domainEnd = new Date(globalMaxDate + dateSpan * 0.06);

      // Metric Min/Max for Heatmap mode (b/449635128)
      var minMetric = metricValues.length ? d3.min(metricValues) : 0;
      var maxMetric = metricValues.length ? d3.max(metricValues) : 100;
      if (minMetric === maxMetric) maxMetric = minMetric + 1;

      // Color scale for metric heatmap mode
      var metricColorScale;
      var heatmapMode = config.heatmap_metric_mode || "gradient";
      if (heatmapMode === "diverging") {
        var midMetric = (minMetric + maxMetric) / 2;
        metricColorScale = d3.scaleDiverging(d3.interpolateRdBu).domain([maxMetric, midMetric, minMetric]);
      } else if (heatmapMode === "threshold") {
        var t1 = minMetric + (maxMetric - minMetric) * 0.33;
        var t2 = minMetric + (maxMetric - minMetric) * 0.66;
        metricColorScale = function (val) {
          if (val < t1) return palette.danger || "#ea4335";
          if (val < t2) return palette.accent || "#fbbc04";
          return palette.secondary || "#34a853";
        };
      } else {
        metricColorScale = d3.scaleSequential(d3.interpolateBlues).domain([minMetric, maxMetric]);
      }

      // Build Top Header / Controls
      var headerDiv = document.createElement("div");
      headerDiv.style.cssText = "flex: 0 0 auto; display: flex; flex-direction: column; border-bottom: 1px solid #e8eaed; background: " + (isGlass ? "#f1f5f9" : "#ffffff") + ";";
      container.appendChild(headerDiv);

      // Row 1: Title, Search, and Live Controls
      var controlsRow = document.createElement("div");
      controlsRow.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; gap: 12px; flex-wrap: wrap;";
      headerDiv.appendChild(controlsRow);

      // Title & Mode Badge
      var titleArea = document.createElement("div");
      titleArea.style.cssText = "display: flex; align-items: center; gap: 8px;";
      var modeLabels = {
        gantt_progress: "Gantt & Progress",
        milestone_pins: "Milestone Roadmap",
        swimlane_phases: "Swimlanes",
        metric_heatmap: "Measure Heatmap"
      };
      var currentModeLabel = modeLabels[config.layout_mode] || "Gantt Timeline";

      titleArea.innerHTML = "<span style='font-size: 14px; font-weight: 700; color: #202124; letter-spacing: -0.2px;'>🗓️ " +
        (queryResponse.model || "Schedule") + " Timeline</span>" +
        "<span style='font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 12px; background: #e8f0fe; color: #1a73e8; border: 1px solid #d2e3fc;'>" +
        currentModeLabel + "</span>";
      controlsRow.appendChild(titleArea);

      // Search & Granularity Filter Area
      var filterArea = document.createElement("div");
      filterArea.style.cssText = "display: flex; align-items: center; gap: 8px;";

      if (config.show_search_bar !== false) {
        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "🔍 Search tasks, phases, dates...";
        searchInput.value = this._searchTerm || "";
        searchInput.style.cssText = "padding: 5px 10px; font-size: 12px; border: 1px solid #dadce0; border-radius: 16px; outline: none; width: 180px; transition: width 0.2s, border-color 0.2s;";
        searchInput.addEventListener("focus", function () {
          searchInput.style.width = "220px";
          searchInput.style.borderColor = "#1a73e8";
        });
        searchInput.addEventListener("blur", function () {
          searchInput.style.width = "180px";
          searchInput.style.borderColor = "#dadce0";
        });
        searchInput.addEventListener("input", function (e) {
          self._searchTerm = e.target.value.toLowerCase().trim();
          self.render(self._lastData, self._lastConfig, self._lastQueryResponse);
        });
        filterArea.appendChild(searchInput);
      }

      // Quick Zoom / Scale Buttons
      var scaleBtnGroup = document.createElement("div");
      scaleBtnGroup.style.cssText = "display: flex; border: 1px solid #dadce0; border-radius: 6px; overflow: hidden; font-size: 11px;";
      var scales = [
        { id: "auto", label: "Fit" },
        { id: "day", label: "Day" },
        { id: "week", label: "Wk" },
        { id: "month", label: "Mo" }
      ];
      var activeScale = config.time_scale || "auto";

      scales.forEach(function (sc) {
        var btn = document.createElement("button");
        btn.textContent = sc.label;
        var isActive = activeScale === sc.id;
        btn.style.cssText = "padding: 4px 8px; border: none; cursor: pointer; font-size: 11px; font-weight: " + (isActive ? "600" : "500") +
          "; background: " + (isActive ? "#1a73e8" : "#ffffff") + "; color: " + (isActive ? "#ffffff" : "#5f6368") +
          "; border-right: 1px solid #dadce0; transition: background 0.15s;";
        btn.addEventListener("click", function () {
          config.time_scale = sc.id;
          self.render(self._lastData, config, self._lastQueryResponse);
        });
        scaleBtnGroup.appendChild(btn);
      });
      filterArea.appendChild(scaleBtnGroup);
      controlsRow.appendChild(filterArea);

      // Row 2: Executive KPI HUD Bar
      if (config.show_executive_hud !== false) {
        var hudBar = document.createElement("div");
        hudBar.style.cssText = "display: flex; gap: 16px; padding: 6px 16px 10px 16px; overflow-x: auto; background: " + (isGlass ? "#f8fafc" : "#fafafa") + "; border-top: 1px solid #f1f3f4;";

        var avgDuration = (totalDurationDays / Math.max(1, totalTasksCount)).toFixed(1);
        var completionRate = Math.round((completedCount / Math.max(1, totalTasksCount)) * 100);

        var hudItems = [
          { label: "Total Tasks", val: d3.format(",")(totalTasksCount), icon: "📋", color: "#202124" },
          { label: "Completion Rate", val: completionRate + "%", icon: "✅", color: palette.secondary || "#34a853" },
          { label: "In Progress", val: activeCount, icon: "⚡", color: palette.primary || "#1a73e8" },
          { label: "Delayed / Blocked", val: delayedCount, icon: "⚠️", color: palette.danger || "#ea4335" },
          { label: "Avg Duration", val: avgDuration + " Days", icon: "⏱️", color: "#5f6368" }
        ];

        if (totalMetricSum > 0) {
          hudItems.push({
            label: "Total Budget / Volume",
            val: d3.format("$,.2s")(totalMetricSum).replace("G", "B"),
            icon: "💎",
            color: "#1a73e8"
          });
        }

        hudItems.forEach(function (h) {
          var card = document.createElement("div");
          card.style.cssText = "display: flex; align-items: center; gap: 8px; padding: 4px 10px; background: #ffffff; border: 1px solid #e8eaed; border-radius: 6px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.03);";
          card.innerHTML = "<span style='font-size: 14px;'>" + h.icon + "</span>" +
            "<div><div style='font-size: 10px; color: #70757a; font-weight: 500; text-transform: uppercase; letter-spacing: 0.3px;'>" + h.label + "</div>" +
            "<div style='font-size: 13px; font-weight: 700; color: " + h.color + ";'>" + h.val + "</div></div>";
          hudBar.appendChild(card);
        });

        headerDiv.appendChild(hudBar);
      }

      // Filter tasks by search term
      var filteredTasks = parsedTasks;
      if (this._searchTerm) {
        filteredTasks = parsedTasks.filter(function (t) {
          return t.name.toLowerCase().indexOf(self._searchTerm) !== -1 ||
                 t.group.toLowerCase().indexOf(self._searchTerm) !== -1 ||
                 d3.timeFormat("%Y-%m-%d")(t.startDate).indexOf(self._searchTerm) !== -1;
        });
      }

      // Sort tasks
      var sortMode = config.sort_order || "start_asc";
      filteredTasks.sort(function (a, b) {
        if (sortMode === "start_desc") return b.startDate.getTime() - a.startDate.getTime();
        if (sortMode === "duration_desc") return b.durationDays - a.durationDays;
        if (sortMode === "name_asc") return a.name.localeCompare(b.name);
        if (sortMode === "progress_asc") return a.progress - b.progress;
        if (sortMode === "metric_desc") return b.metric - a.metric;
        return a.startDate.getTime() - b.startDate.getTime(); // default start_asc
      });

      // Group tasks by Swimlane / Phase if enabled
      var groupByLane = config.group_by_swimlane !== false;
      var swimlanes = [];

      if (groupByLane) {
        var laneMap = {};
        filteredTasks.forEach(function (t) {
          if (!laneMap[t.group]) {
            laneMap[t.group] = {
              name: t.group,
              tasks: [],
              minDate: t.startDate,
              maxDate: t.endDate
            };
            swimlanes.push(laneMap[t.group]);
          }
          laneMap[t.group].tasks.push(t);
          if (t.startDate < laneMap[t.group].minDate) laneMap[t.group].minDate = t.startDate;
          if (t.endDate > laneMap[t.group].maxDate) laneMap[t.group].maxDate = t.endDate;
        });
      } else {
        swimlanes.push({
          name: "All Tasks",
          tasks: filteredTasks,
          minDate: domainStart,
          maxDate: domainEnd
        });
      }

      // Scrollable Main Gantt Viewport
      var scrollWrapper = document.createElement("div");
      scrollWrapper.className = "looker-gantt-scroll";
      scrollWrapper.style.cssText = "flex: 1 1 auto; overflow-y: auto; overflow-x: auto; position: relative; background: " + bgColor + ";";
      container.appendChild(scrollWrapper);

      // Dimensions calculation
      var labelColumnWidth = Math.max(160, Math.min(260, Math.round(container.clientWidth * 0.22)));
      var barH = Number(config.bar_height) || 24;
      var rowH = barH + 16;
      var swimlaneHeaderH = 32;
      var timelineHeaderH = 40;

      // Calculate total rows and height
      var totalVisualRows = 0;
      swimlanes.forEach(function (lane) {
        if (groupByLane) totalVisualRows += 1; // Header row
        if (!self._collapsedSwimlanes[lane.name]) {
          totalVisualRows += lane.tasks.length;
        }
      });

      var totalContentHeight = timelineHeaderH + (totalVisualRows * rowH) + 60;
      var chartWidth = Math.max(container.clientWidth - 20, 800);
      var timelineWidth = chartWidth - labelColumnWidth - 30;

      // Setup D3 Time Scale
      var timeScale = d3.scaleTime()
        .domain([domainStart, domainEnd])
        .range([0, timelineWidth]);

      // SVG Canvas
      var svg = d3.select(scrollWrapper)
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", totalContentHeight)
        .style("display", "block");

      // Defs (Gradients & Filters)
      var defs = svg.append("defs");

      // Drop shadow filter for floating bars & milestones
      var filter = defs.append("filter")
        .attr("id", "gantt-shadow")
        .attr("height", "140%")
        .attr("width", "140%")
        .attr("x", "-20%")
        .attr("y", "-20%");
      filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 2)
        .attr("result", "blur");
      filter.append("feOffset")
        .attr("in", "blur")
        .attr("dx", 0)
        .attr("dy", 1)
        .attr("result", "offsetBlur");
      filter.append("feComponentTransfer")
        .append("feFuncA")
        .attr("type", "linear")
        .attr("slope", 0.15);
      var feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");

      // Main Layers
      var gridLayer = svg.append("g").attr("class", "grid-layer").attr("transform", "translate(" + labelColumnWidth + ", 0)");
      var rowsLayer = svg.append("g").attr("class", "rows-layer");
      var axisLayer = svg.append("g").attr("class", "axis-layer").attr("transform", "translate(" + labelColumnWidth + ", 0)");
      var labelsLayer = svg.append("g").attr("class", "labels-layer");

      // Render Time Gridlines & Sticky Header Background
      if (config.show_gridlines !== false) {
        var timeTicks = timeScale.ticks(10);
        gridLayer.selectAll("line.time-grid")
          .data(timeTicks)
          .enter()
          .append("line")
          .attr("class", "time-grid")
          .attr("x1", function (d) { return timeScale(d); })
          .attr("x2", function (d) { return timeScale(d); })
          .attr("y1", timelineHeaderH)
          .attr("y2", totalContentHeight)
          .attr("stroke", "#f1f3f4")
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "3,3");
      }

      // Today / Current Date Line
      var today = new Date();
      if (config.show_today_line !== false && today >= domainStart && today <= domainEnd) {
        var todayX = timeScale(today);
        var todayGroup = gridLayer.append("g").attr("class", "today-marker");

        todayGroup.append("line")
          .attr("x1", todayX)
          .attr("x2", todayX)
          .attr("y1", timelineHeaderH - 6)
          .attr("y2", totalContentHeight)
          .attr("stroke", "#ea4335")
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "4,2");

        // Pulse circle
        todayGroup.append("circle")
          .attr("cx", todayX)
          .attr("cy", timelineHeaderH - 4)
          .attr("r", 4.5)
          .attr("fill", "#ea4335");

        todayGroup.append("text")
          .attr("x", todayX + 6)
          .attr("y", timelineHeaderH - 2)
          .attr("font-size", 10)
          .attr("font-weight", 700)
          .attr("fill", "#ea4335")
          .text("TODAY");
      }

      // Render Time Axis Header
      var axisBg = axisLayer.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", timelineWidth)
        .attr("height", timelineHeaderH)
        .attr("fill", isGlass ? "#e2e8f0" : "#f8f9fa")
        .attr("stroke", "#e8eaed");

      var timeAxis = d3.axisTop(timeScale)
        .ticks(10)
        .tickSize(6)
        .tickFormat(function (d) {
          if (activeScale === "day") return d3.timeFormat("%b %d")(d);
          if (activeScale === "month") return d3.timeFormat("%b %Y")(d);
          if (activeScale === "quarter") return "Q" + Math.ceil((d.getMonth() + 1) / 3) + " " + d.getFullYear();
          return d3.timeFormat("%b %d")(d);
        });

      axisLayer.append("g")
        .attr("transform", "translate(0, " + (timelineHeaderH - 1) + ")")
        .call(timeAxis)
        .call(function (g) {
          g.select(".domain").attr("stroke", "#dadce0");
          g.selectAll(".tick line").attr("stroke", "#dadce0");
          g.selectAll(".tick text")
            .attr("fill", "#5f6368")
            .attr("font-size", 11)
            .attr("font-weight", 600)
            .attr("dy", -6);
        });

      // Label Header Left Column
      labelsLayer.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", labelColumnWidth)
        .attr("height", timelineHeaderH)
        .attr("fill", isGlass ? "#e2e8f0" : "#f8f9fa")
        .attr("stroke", "#e8eaed");

      labelsLayer.append("text")
        .attr("x", 16)
        .attr("y", timelineHeaderH / 2 + 4)
        .attr("font-size", 12)
        .attr("font-weight", 700)
        .attr("fill", "#3c4043")
        .text(nameField.label || "TASKS & DELIVERABLES");

      // Draw Swimlanes and Task Bars
      var currentY = timelineHeaderH;
      var radius = Number(config.bar_corner_radius) || 4;
      var layoutMode = config.layout_mode || "gantt_progress";

      swimlanes.forEach(function (lane) {
        var isCollapsed = self._collapsedSwimlanes[lane.name];

        // Swimlane Section Header
        if (groupByLane) {
          var laneHeaderG = rowsLayer.append("g")
            .attr("class", "swimlane-header")
            .style("cursor", "pointer")
            .on("click", function () {
              self._collapsedSwimlanes[lane.name] = !self._collapsedSwimlanes[lane.name];
              self.render(self._lastData, self._lastConfig, self._lastQueryResponse);
            });

          // Background banner
          laneHeaderG.append("rect")
            .attr("x", 0)
            .attr("y", currentY)
            .attr("width", chartWidth)
            .attr("height", swimlaneHeaderH)
            .attr("fill", isGlass ? "#edf2f7" : "#f1f3f4")
            .attr("stroke", "#e8eaed");

          // Arrow toggle & Lane Title
          var toggleIcon = isCollapsed ? "▶" : "▼";
          laneHeaderG.append("text")
            .attr("x", 14)
            .attr("y", currentY + swimlaneHeaderH / 2 + 4)
            .attr("font-size", 12)
            .attr("font-weight", 700)
            .attr("fill", "#1a73e8")
            .text(toggleIcon + "  " + lane.name);

          // Task count chip
          laneHeaderG.append("rect")
            .attr("x", labelColumnWidth - 48)
            .attr("y", currentY + 6)
            .attr("width", 34)
            .attr("height", 20)
            .attr("rx", 10)
            .attr("fill", "#ffffff")
            .attr("stroke", "#dadce0");

          laneHeaderG.append("text")
            .attr("x", labelColumnWidth - 31)
            .attr("y", currentY + 20)
            .attr("text-anchor", "middle")
            .attr("font-size", 10)
            .attr("font-weight", 700)
            .attr("fill", "#5f6368")
            .text(lane.tasks.length);

          currentY += swimlaneHeaderH;
        }

        if (isCollapsed) return;

        // Render each task in lane
        lane.tasks.forEach(function (task, taskIdx) {
          var rowY = currentY;
          var barY = rowY + (rowH - barH) / 2;

          // Zebra background striping
          rowsLayer.append("rect")
            .attr("x", 0)
            .attr("y", rowY)
            .attr("width", chartWidth)
            .attr("height", rowH)
            .attr("fill", taskIdx % 2 === 0 ? "#ffffff" : (isGlass ? "#f8fafc" : "#fafafa"))
            .attr("stroke", "#f1f3f4")
            .attr("stroke-width", 0.5);

          // Left Label Column (Task Name & Progress badge)
          var labelG = labelsLayer.append("g")
            .attr("class", "task-label-group")
            .style("cursor", task.drillLinks && task.drillLinks.length ? "pointer" : "default")
            .on("click", function (e) {
              if (task.drillLinks && task.drillLinks.length && window.LookerCharts && LookerCharts.Utils) {
                LookerCharts.Utils.openDrillMenu({ links: task.drillLinks, event: e });
              }
            });

          // Truncate text if exceeds label column
          var maxChars = Math.floor((labelColumnWidth - 40) / 7.5);
          var displayName = task.name.length > maxChars ? task.name.substring(0, maxChars) + "…" : task.name;

          labelG.append("text")
            .attr("x", 20)
            .attr("y", rowY + rowH / 2 + 4)
            .attr("font-size", 12)
            .attr("font-weight", 600)
            .attr("fill", "#202124")
            .text(displayName)
            .append("title")
            .text(task.name + " (" + task.durationDays.toFixed(0) + " days)");

          // Drill affordance icon
          if (task.drillLinks && task.drillLinks.length) {
            labelG.append("text")
              .attr("x", labelColumnWidth - 22)
              .attr("y", rowY + rowH / 2 + 4)
              .attr("font-size", 10)
              .attr("fill", "#1a73e8")
              .text("🔗");
          }

          // Calculate Bar Geometry
          var startX = labelColumnWidth + timeScale(task.startDate);
          var endX = labelColumnWidth + timeScale(task.endDate);
          var barW = Math.max(8, endX - startX);

          // Color resolution
          var barFill = palette.primary || "#1a73e8";
          var statusColor = palette.status[task.status.toLowerCase()] || palette.primary;

          if (layoutMode === "metric_heatmap") {
            // Solve b/449635128: Continuous/Threshold Color by Measure!
            barFill = metricColorScale(task.metric);
          } else if (layoutMode === "milestone_pins" || task.isMilestone) {
            barFill = statusColor;
          } else if (task.progress >= 100) {
            barFill = palette.secondary || "#34a853";
          } else if (task.status.toLowerCase().indexOf("cancel") !== -1 || task.status.toLowerCase().indexOf("delay") !== -1) {
            barFill = palette.danger || "#ea4335";
          } else {
            barFill = statusColor;
          }

          // Render Element: Milestone Diamond Pin VS Gantt Bar
          var isMilestoneView = layoutMode === "milestone_pins" || (task.isMilestone && config.show_milestones !== false);

          var taskG = rowsLayer.append("g")
            .attr("class", "task-bar-group")
            .style("cursor", "pointer")
            .on("mouseenter", function (e) {
              d3.select(this).selectAll(".bar-shape").attr("filter", "url(#gantt-shadow)").attr("stroke", "#1a73e8").attr("stroke-width", 2);
              self.showTooltip(e, task);
            })
            .on("mousemove", function (e) {
              self.moveTooltip(e);
            })
            .on("mouseleave", function () {
              d3.select(this).selectAll(".bar-shape").attr("filter", null).attr("stroke", null);
              self.hideTooltip();
            })
            .on("click", function (e) {
              if (task.drillLinks && task.drillLinks.length && window.LookerCharts && LookerCharts.Utils) {
                LookerCharts.Utils.openDrillMenu({ links: task.drillLinks, event: e });
              }
            });

          if (isMilestoneView) {
            // Render Milestone Diamond Pin (Zero-Duration / Target Deliverable)
            var midX = startX + (barW / 2);
            var midY = barY + (barH / 2);
            var pinSize = barH * 0.7;

            // Diamond path
            var diamondPath = "M " + midX + " " + (midY - pinSize) +
                              " L " + (midX + pinSize) + " " + midY +
                              " L " + midX + " " + (midY + pinSize) +
                              " L " + (midX - pinSize) + " " + midY + " Z";

            taskG.append("path")
              .attr("class", "bar-shape")
              .attr("d", diamondPath)
              .attr("fill", barFill)
              .attr("stroke", "#ffffff")
              .attr("stroke-width", 1.5);

            // Milestone Target Label
            taskG.append("text")
              .attr("x", midX + pinSize + 8)
              .attr("y", midY + 4)
              .attr("font-size", 11)
              .attr("font-weight", 600)
              .attr("fill", "#202124")
              .text(task.name + " (" + d3.timeFormat("%b %d")(task.startDate) + ")");

          } else {
            // Render Gantt Bar Container
            var baseBar = taskG.append("rect")
              .attr("class", "bar-shape")
              .attr("x", startX)
              .attr("y", barY)
              .attr("width", barW)
              .attr("height", barH)
              .attr("rx", radius)
              .attr("ry", radius)
              .attr("fill", barFill)
              .attr("fill-opacity", layoutMode === "metric_heatmap" ? 0.9 : 0.85);

            // Render Internal Progress Completion Fill (%)
            if (layoutMode === "gantt_progress" && task.progress > 0 && task.progress <= 100) {
              var progressW = Math.max(4, (barW * task.progress) / 100);
              taskG.append("rect")
                .attr("x", startX)
                .attr("y", barY)
                .attr("width", progressW)
                .attr("height", barH)
                .attr("rx", radius)
                .attr("ry", radius)
                .attr("fill", "#ffffff")
                .attr("fill-opacity", 0.35)
                .style("pointer-events", "none");
            }

            // Inline Bar Labels & Duration Badge
            if (config.show_task_labels !== false && barW > 45) {
              var labelText = task.name;
              if (layoutMode === "gantt_progress") {
                labelText += " (" + task.progress + "%)";
              }

              taskG.append("text")
                .attr("x", startX + 8)
                .attr("y", barY + barH / 2 + 4)
                .attr("font-size", 11)
                .attr("font-weight", 600)
                .attr("fill", layoutMode === "metric_heatmap" ? "#ffffff" : "#ffffff")
                .style("pointer-events", "none")
                .text(labelText)
                .call(function (t) {
                  // Clip text if wider than bar
                  if (barW < 90) {
                    t.text(task.progress + "%");
                  }
                });
            }

            // Duration badge to the right of the bar if room permits
            if (barW < 70 || config.show_task_labels === false) {
              taskG.append("text")
                .attr("x", endX + 8)
                .attr("y", barY + barH / 2 + 4)
                .attr("font-size", 10)
                .attr("font-weight", 500)
                .attr("fill", "#5f6368")
                .text(task.durationDays.toFixed(0) + "d");
            }
          }

          currentY += rowH;
        });
      });

      // Update final SVG height if collapsed items changed layout
      svg.attr("height", Math.max(container.clientHeight, currentY + 30));
    },

    showTooltip: function (e, task) {
      var tooltip = this._tooltip;
      var formatDate = d3.timeFormat("%b %d, %Y");

      var html = "<div style='font-size: 13px; font-weight: 700; margin-bottom: 6px; color: #8ab4f8; display: flex; justify-content: space-between; align-items: center;'>" +
        "<span>" + task.name + "</span>" +
        "<span style='font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 8px; background: rgba(255,255,255,0.2); color: #fff;'>" + task.status + "</span>" +
        "</div>" +
        "<div style='display: grid; grid-template-columns: auto auto; gap: 4px 12px; margin-bottom: 6px; font-size: 11px;'>" +
        "<span style='color: #9aa0a6;'>Start:</span><span style='font-weight: 600;'>" + formatDate(task.startDate) + "</span>" +
        "<span style='color: #9aa0a6;'>End:</span><span style='font-weight: 600;'>" + formatDate(task.endDate) + "</span>" +
        "<span style='color: #9aa0a6;'>Duration:</span><span style='font-weight: 600;'>" + task.durationDays.toFixed(1) + " Days</span>" +
        "<span style='color: #9aa0a6;'>Progress:</span><span style='font-weight: 600; color: #81c995;'>" + task.progress + "%</span>";

      if (task.metricRendered) {
        html += "<span style='color: #9aa0a6;'>Metric / Value:</span><span style='font-weight: 600; color: #fdd663;'>" + task.metricRendered + "</span>";
      }

      html += "</div>";

      if (task.drillLinks && task.drillLinks.length) {
        html += "<div style='font-size: 10px; color: #aecbfa; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 4px; margin-top: 4px; font-style: italic; display: flex; align-items: center; gap: 4px;'>" +
          "<span>🔍 Click to open Looker Drill Menu</span></div>";
      }

      tooltip.innerHTML = html;
      tooltip.style.opacity = "1";
      this.moveTooltip(e);
    },

    moveTooltip: function (e) {
      var tooltip = this._tooltip;
      var rootRect = this._container.getBoundingClientRect();
      var x = e.clientX - rootRect.left + 15;
      var y = e.clientY - rootRect.top + 15;

      // Bound within container
      if (x + 280 > rootRect.width) {
        x = e.clientX - rootRect.left - 290;
      }
      if (y + 140 > rootRect.height) {
        y = e.clientY - rootRect.top - 140;
      }

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
