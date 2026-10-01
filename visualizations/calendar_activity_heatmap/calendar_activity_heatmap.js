/**
 * Calendar Activity Heatmap - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Visualizes daily metrics over a rolling 365-day (or filtered date range)
 * calendar grid, inspired by GitHub contribution graphs.
 *
 * Upgraded with Multi-Modal Enterprise Flexibility:
 * - Dynamic Field-Role Mapping (Primary Date Dimension, Primary Measure, Target/Goal Measure)
 * - Configurable Reference Lines & Targets (Measure Column, Fixed Value, Mean, Median, P75, P90)
 * - Interactive Sorting, Top-N Day Bucketing, and Zero/Null Day Suppression
 * - HUD, Legend, & Value Label Density Controls (Executive Scorecard HUD, Compact Strip, Data Value Labels)
 * - Custom Brand Palettes, Polarity (Higher vs Lower is better), Font Scaling, and Value Formats
 * - Strictly minimized to 2 configuration sections: "Display" and "Style"
 * - Full Looker drill-down menu support (LookerCharts.Utils.openDrillMenu)
 * - Debounced ResizeObserver with <4px delta guard and responsive layout scaling
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.timeWeek === 'function') {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.timeWeek === 'function') {
          clearInterval(interval);
          callback(window.d3);
        }
      }, 50);
      return;
    }
    var script = document.createElement('script');
    script.src = 'https://d3js.org/d3.v7.min.js';
    script.onload = function () {
      callback(window.d3);
    };
    document.head.appendChild(script);
  }

  var PALETTES = {
    google_enterprise: {
      name: 'Google Enterprise',
      colors: ['#ebedf0', '#c6e7ff', '#7cb9f8', '#3b82f6', '#1d4ed8'],
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      cellBorder: 'rgba(0,0,0,0.06)'
    },
    github_green: {
      name: 'GitHub Classic',
      colors: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
      bg: '#ffffff',
      text: '#24292f',
      subtext: '#57606a',
      cellBorder: 'rgba(27,31,35,0.06)'
    },
    modern_slate: {
      name: 'Modern Slate',
      colors: ['#f1f5f9', '#cbd5e1', '#94a3b8', '#475569', '#0f172a'],
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      cellBorder: 'rgba(0,0,0,0.05)'
    },
    electric_blue: {
      name: 'Electric Blue',
      colors: ['#f0f7ff', '#bae0ff', '#69b1ff', '#1677ff', '#003eb3'],
      bg: '#ffffff',
      text: '#1f2937',
      subtext: '#4b5563',
      cellBorder: 'rgba(0,0,0,0.05)'
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark',
      colors: ['#1e1e2f', '#4c1d95', '#8b5cf6', '#d946ef', '#00f5d4'],
      bg: '#0f172a',
      text: '#f8fafc',
      subtext: '#94a3b8',
      cellBorder: 'rgba(255,255,255,0.1)'
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      colors: ['#f0fdf4', '#bbf7d0', '#4ade80', '#16a34a', '#14532d'],
      bg: '#ffffff',
      text: '#064e3b',
      subtext: '#047857',
      cellBorder: 'rgba(0,0,0,0.05)'
    },
    sunset_media: {
      name: 'Sunset Media',
      colors: ['#fff7ed', '#fed7aa', '#fb923c', '#ea580c', '#9a3412'],
      bg: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      cellBorder: 'rgba(0,0,0,0.05)'
    },
    wellverse_healthcare: {
      name: 'Wellverse Healthcare',
      colors: ['#EEF2F7', '#CDEFDD', '#7FD8AE', '#00AF68', '#143359'],
      bg: '#ffffff',
      text: '#143359',
      subtext: '#64748B',
      cellBorder: 'rgba(20,51,89,0.08)'
    }
  };

  function formatNumber(num, formatType) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    var abs = Math.abs(num);
    var sign = num < 0 ? '-' : '';

    if (formatType === 'compact_currency') {
      if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
      if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
      if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
      return sign + '$' + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
    if (formatType === 'compact_number') {
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + 'B';
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + 'M';
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
      return sign + abs.toLocaleString();
    }
    if (formatType === 'percentage') {
      return (num * (abs <= 1.0 ? 100 : 1)).toFixed(1) + '%';
    }
    if (formatType === 'decimal_2') {
      return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (formatType === 'raw') {
      return String(num);
    }
    // auto fallback
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
    return sign + (abs < 10 && abs > 0 && Math.floor(abs) !== abs ? abs.toFixed(2) : abs.toLocaleString());
  }

  var visObject = {
    id: 'calendar_activity_heatmap',
    label: 'Calendar Activity Heatmap',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      dimFieldOverride: {
        type: 'string',
        label: 'Date Dimension Index or Name (1 = Col 1)',
        default: '1',
        section: 'Display',
        order: 1
      },
      measureFieldOverride: {
        type: 'string',
        label: 'Primary Measure Index or Name (1 = Measure 1)',
        default: '1',
        section: 'Display',
        order: 2
      },
      targetMeasureOverride: {
        type: 'string',
        label: 'Target/Goal Measure Index or Name (Optional)',
        default: '',
        section: 'Display',
        order: 3
      },
      targetMode: {
        type: 'string',
        label: 'Goal / Target Calculation Mode',
        display: 'select',
        values: [
          { 'Measure Column (From Query)': 'measure_column' },
          { 'Fixed Static Target Value': 'fixed_value' },
          { 'Dataset Mean (100% = Daily Average)': 'dataset_mean' },
          { 'Dataset Median (100% = Daily Median)': 'dataset_median' },
          { 'Top Percentile P75 Target': 'percentile_p75' },
          { 'Top Percentile P90 Target': 'percentile_p90' }
        ],
        default: 'dataset_mean',
        section: 'Display',
        order: 4
      },
      targetValue: {
        type: 'number',
        label: 'Fixed Target Value (when Fixed Mode, 0 = Auto)',
        default: 0,
        section: 'Display',
        order: 5
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Target / Baseline Label',
        default: 'Daily Goal',
        section: 'Display',
        order: 6
      },
      anomalyThresholdPct: {
        type: 'number',
        label: 'Attainment Anomaly Alert Threshold (%)',
        default: 130,
        section: 'Display',
        order: 7
      },
      sortBy: {
        type: 'string',
        label: 'Time Series Ordering',
        display: 'select',
        values: [
          { 'Chronological / Natural (Oldest to Newest)': 'chronological' },
          { 'Reverse Chronological (Newest to Oldest)': 'reverse_chrono' }
        ],
        default: 'chronological',
        section: 'Display',
        order: 8
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Treat Zero / Null as Inactive Cells',
        default: true,
        section: 'Display',
        order: 9
      },
      hudMode: {
        type: 'string',
        label: 'Executive KPI HUD Mode',
        display: 'select',
        values: [
          { 'Full Scorecard HUD (Top Band)': 'scorecard' },
          { 'Compact Metric Strip': 'compact_strip' },
          { 'Hidden': 'hidden' }
        ],
        default: 'scorecard',
        section: 'Display',
        order: 10
      },
      showValueLabels: {
        type: 'string',
        label: 'Data Value Badges',
        display: 'select',
        values: [
          { 'Min/Max Peaks & Hotspots Only': 'peaks_only' },
          { 'Hidden': 'hidden' }
        ],
        default: 'peaks_only',
        section: 'Display',
        order: 11
      },
      summaryTitle: {
        type: 'string',
        label: 'Custom Calendar Title Override',
        default: '',
        section: 'Display',
        order: 12
      },
      showMonthLabels: {
        type: 'boolean',
        label: 'Show Month Labels',
        default: true,
        section: 'Display',
        order: 13
      },
      showDayLabels: {
        type: 'boolean',
        label: 'Show Day Labels',
        default: true,
        section: 'Display',
        order: 14
      },
      showLegend: {
        type: 'boolean',
        label: 'Show Intensity Legend',
        default: true,
        section: 'Display',
        order: 15
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Date Search / Filter Bar',
        default: true,
        section: 'Display',
        order: 16
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorPalette: {
        type: 'string',
        label: 'Brand Palette Preset',
        display: 'select',
        values: [
          { 'GitHub Classic': 'github_green' },
          { 'Google Enterprise': 'google_enterprise' },
          { 'Modern Slate': 'modern_slate' },
          { 'Electric Blue': 'electric_blue' },
          { 'Cyberpunk Dark': 'cyberpunk_dark' },
          { 'Emerald FinOps': 'emerald_finops' },
          { 'Sunset Media': 'sunset_media' },
          { 'Wellverse Healthcare': 'wellverse_healthcare' },
          { 'Custom Hex Override': 'custom_override' }
        ],
        default: 'github_green',
        section: 'Style',
        order: 1
      },
      customPrimaryHex: {
        type: 'string',
        label: 'Custom High-Intensity Hex',
        default: '',
        section: 'Style',
        order: 2
      },
      customPositiveHex: {
        type: 'string',
        label: 'Custom Target-Met / Success Hex',
        default: '',
        section: 'Style',
        order: 3
      },
      customNegativeHex: {
        type: 'string',
        label: 'Custom Alert / Deficit Hex',
        default: '',
        section: 'Style',
        order: 4
      },
      metricPolarity: {
        type: 'string',
        label: 'Metric Polarity',
        display: 'select',
        values: [
          { 'Higher is Better (Activity, Revenue, Commits)': 'higher_is_better' },
          { 'Lower is Better (Latency, Incidents, Dropouts, Cost)': 'lower_is_better' }
        ],
        default: 'higher_is_better',
        section: 'Style',
        order: 5
      },
      fontScale: {
        type: 'string',
        label: 'Typography Font Scale',
        display: 'select',
        values: [
          { 'Compact (High Density Dashboard)': 'compact' },
          { 'Standard (Default)': 'standard' },
          { 'Large Presentation (Wallboard)': 'large' }
        ],
        default: 'standard',
        section: 'Style',
        order: 6
      },
      valueFormat: {
        type: 'string',
        label: 'Value Format',
        display: 'select',
        values: [
          { 'Auto (from Looker Field)': 'auto' },
          { 'Compact Number (1.2M, 450K)': 'compact_number' },
          { 'Compact Currency ($1.2M, $450K)': 'compact_currency' },
          { 'Percentage (45.2%)': 'percentage' },
          { 'Decimal (1,234.56)': 'decimal_2' },
          { 'Raw Unformatted': 'raw' }
        ],
        default: 'auto',
        section: 'Style',
        order: 7
      },
      cellSize: {
        type: 'number',
        label: 'Cell Size (px)',
        display: 'range',
        min: 9,
        max: 24,
        step: 1,
        default: 13,
        section: 'Style',
        order: 8
      },
      cellRadius: {
        type: 'number',
        label: 'Corner Radius (px)',
        display: 'range',
        min: 0,
        max: 8,
        step: 1,
        default: 3,
        section: 'Style',
        order: 9
      },
      cellSpacing: {
        type: 'number',
        label: 'Cell Spacing (px)',
        display: 'range',
        min: 1,
        max: 6,
        step: 1,
        default: 3,
        section: 'Style',
        order: 10
      }
    },

    create: function (element, config) {
      element.innerHTML = '';
      element.style.fontFamily =
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      element.style.display = 'flex';
      element.style.flexDirection = 'column';
      element.style.overflow = 'hidden';
      element.style.padding = '0';
      element.style.boxSizing = 'border-box';
      element.style.position = 'relative';

      var root = document.createElement('div');
      root.className = 'calendar-heatmap-root';
      root.style.width = '100%';
      root.style.height = '100%';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      root.style.overflow = 'hidden';
      element.appendChild(root);

      var tooltip = document.createElement('div');
      tooltip.className = 'cal-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.padding = '10px 14px';
      tooltip.style.background = 'rgba(15, 23, 42, 0.94)';
      tooltip.style.backdropFilter = 'blur(6px)';
      tooltip.style.color = '#ffffff';
      tooltip.style.borderRadius = '8px';
      tooltip.style.fontSize = '12px';
      tooltip.style.fontWeight = '500';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.display = 'none';
      tooltip.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
      tooltip.style.zIndex = '99999';
      tooltip.style.border = '1px solid rgba(255,255,255,0.15)';
      document.body.appendChild(tooltip);
      element._calTooltip = tooltip;

      this._element = element;
      this._setupResizeObserver(element);
    },

    _setupResizeObserver: function (element) {
      var self = this;
      if (this._resizeObserver) {
        try { this._resizeObserver.disconnect(); } catch (e) {}
        this._resizeObserver = null;
      }
      if (typeof ResizeObserver !== 'undefined' && element) {
        this._resizeObserver = new ResizeObserver(function () {
          self._onResize();
        });
        this._resizeObserver.observe(element);
      }
      if (!this._windowResizeBound) {
        this._windowResizeBound = true;
        window.addEventListener('resize', function () {
          self._onResize();
        });
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

      if (self._lastRenderW && self._lastRenderH) {
        if (Math.abs(curW - self._lastRenderW) < 4 && Math.abs(curH - self._lastRenderH) < 4) {
          return;
        }
      }

      if (self._resizeTimer) {
        clearTimeout(self._resizeTimer);
      }
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
      }, 60);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

      this._element = element;
      this._lastElement = element;
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;
      this._lastRenderW = (element && element.clientWidth) || 0;
      this._lastRenderH = (element && element.clientHeight) || 0;

      if (!this._resizeObserver && element) {
        this._setupResizeObserver(element);
      }

      var self = this;
      ensureD3(function (d3) {
        self.render(d3, data, element, config, queryResponse, done);
      });
    },

    render: function (d3, data, element, config, queryResponse, done) {
      var root = element.querySelector('.calendar-heatmap-root');
      var tooltip = element._calTooltip;
      if (!root) {
        done();
        return;
      }
      root.innerHTML = '';

      if (!data || data.length === 0) {
        this.addError({
          title: 'No Data',
          message: 'The query returned no results to display.'
        });
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dimensions = fields.dimensions || [];
      var measures = fields.measures || [];

      if (dimensions.length === 0) {
        this.addError({
          title: 'Date Dimension Required',
          message: 'Please add a Date dimension (e.g. Activity Date, Created Date) to populate the calendar.'
        });
        done();
        return;
      }

      if (measures.length === 0) {
        this.addError({
          title: 'Measure Required',
          message: 'Please add at least one measure (e.g. Count, Total Revenue) to power the daily intensity.'
        });
        done();
        return;
      }

      // --- 1. RESOLVE FIELD ROLES WITH CONFIG OVERRIDES ---
      function resolveField(list, overrideVal, defaultIdx) {
        if (!list || list.length === 0) return null;
        if (overrideVal) {
          var trimmed = String(overrideVal).trim();
          var idx = parseInt(trimmed, 10);
          if (!isNaN(idx) && idx >= 1 && idx <= list.length) {
            return list[idx - 1];
          }
          for (var i = 0; i < list.length; i++) {
            if (list[i].name === trimmed || list[i].label === trimmed) {
              return list[i];
            }
          }
        }
        return list[defaultIdx] || list[0];
      }

      var dateDim = resolveField(dimensions, config.dimFieldOverride, 0);
      var primaryMeas = resolveField(measures, config.measureFieldOverride, 0);
      var targetMeas = config.targetMeasureOverride ? resolveField(measures, config.targetMeasureOverride, 1) : (measures.length > 1 ? measures[1] : null);

      // --- 2. PALETTE & BRAND COLOR RESOLUTION ---
      var paletteKey = config.colorPalette || 'github_green';
      var theme = PALETTES[paletteKey] || PALETTES.github_green;
      var colorList = theme.colors.slice();

      if (paletteKey === 'custom_override' || config.customPrimaryHex) {
        var baseLight = '#ebedf0';
        var prim = config.customPrimaryHex || '#1a73e8';
        var pos = config.customPositiveHex || '#10b981';
        colorList = [baseLight, d3.interpolateRgb(baseLight, prim)(0.35), d3.interpolateRgb(baseLight, prim)(0.65), prim, pos];
      }

      var isLowerBetter = config.metricPolarity === 'lower_is_better';
      var successColor = config.customPositiveHex || '#10b981';
      var alertColor = config.customNegativeHex || '#ef4444';

      // --- 3. ROW PARSING & DAILY NORMALIZATION ---
      var dateMap = {};
      var minDate = null;
      var maxDate = null;
      var totalSum = 0;
      var maxVal = 0;
      var maxDateStr = '';
      var activeDays = 0;
      var valuesList = [];

      data.forEach(function (row) {
        var rawDate = row[dateDim.name] ? row[dateDim.name].value : null;
        if (!rawDate) return;
        var dateObj = d3.timeParse('%Y-%m-%d')(String(rawDate).substring(0, 10));
        if (!dateObj) return;

        var cellObj = row[primaryMeas.name];
        var val = cellObj && cellObj.value !== null && !isNaN(Number(cellObj.value)) ? Number(cellObj.value) : 0;
        var rendered = cellObj && cellObj.rendered ? cellObj.rendered : formatNumber(val, config.valueFormat || 'auto');
        var drillLinks = (cellObj && cellObj.links) || (row[dateDim.name] && row[dateDim.name].links) || [];

        var targetVal = 0;
        if (targetMeas && row[targetMeas.name]) {
          targetVal = Number(row[targetMeas.name].value) || 0;
        }

        var dateKey = d3.timeFormat('%Y-%m-%d')(dateObj);
        dateMap[dateKey] = {
          date: dateObj,
          dateKey: dateKey,
          value: val,
          rendered: rendered,
          target: targetVal,
          drillLinks: drillLinks
        };

        valuesList.push(val);
        totalSum += val;
        if (val > 0) activeDays++;
        if (val > maxVal) {
          maxVal = val;
          maxDateStr = d3.timeFormat('%b %d, %Y')(dateObj);
        }

        if (!minDate || dateObj < minDate) minDate = dateObj;
        if (!maxDate || dateObj > maxDate) maxDate = dateObj;
      });

      if (!minDate || !maxDate) {
        this.addError({
          title: 'Invalid Date Format',
          message: 'Could not parse dates from dimension "' + (dateDim.label || dateDim.name) + '". Format should be YYYY-MM-DD.'
        });
        done();
        return;
      }

      // --- 4. TARGET & STATISTICAL BENCHMARKS ---
      valuesList.sort(function (a, b) { return a - b; });
      var meanVal = valuesList.length > 0 ? (totalSum / valuesList.length) : 0;
      var medianVal = valuesList.length > 0 ? (valuesList[Math.floor(valuesList.length / 2)] || meanVal) : 0;
      var p75Val = valuesList.length > 0 ? (valuesList[Math.floor(valuesList.length * 0.75)] || medianVal) : 0;
      var p90Val = valuesList.length > 0 ? (valuesList[Math.floor(valuesList.length * 0.90)] || valuesList[valuesList.length - 1]) : 0;

      var targetMode = config.targetMode || 'dataset_mean';
      var staticTarget = Number(config.targetValue) || 0;

      var benchmarkTarget = meanVal;
      if (targetMode === 'dataset_mean') benchmarkTarget = meanVal;
      else if (targetMode === 'dataset_median') benchmarkTarget = medianVal;
      else if (targetMode === 'percentile_p75') benchmarkTarget = p75Val;
      else if (targetMode === 'percentile_p90') benchmarkTarget = p90Val;
      else if (targetMode === 'fixed_value') benchmarkTarget = staticTarget > 0 ? staticTarget : (meanVal * 1.1 || 100);

      var daysMetTarget = 0;
      var anomalyThreshold = benchmarkTarget * ((Number(config.anomalyThresholdPct) || 130) / 100);
      var hasAnomaly = false;

      Object.keys(dateMap).forEach(function (k) {
        var item = dateMap[k];
        var itemTarget = (targetMode === 'measure_column' && item.target > 0) ? item.target : benchmarkTarget;
        item.benchmarkTarget = itemTarget;
        item.pct = itemTarget > 0 ? (item.value / itemTarget) : 1.0;
        if (isLowerBetter ? (item.value <= itemTarget && item.value > 0) : (item.value >= itemTarget)) {
          daysMetTarget++;
        }
        if (item.value >= anomalyThreshold) {
          hasAnomaly = true;
          item.isAnomaly = true;
        }
      });

      // --- 5. EXECUTIVE KPI SCORECARD HUD ---
      var hudMode = config.hudMode || 'scorecard';
      if (hudMode !== 'hidden') {
        var hud = document.createElement('div');
        hud.className = 'cal-hud';
        hud.style.width = '100%';
        hud.style.display = 'flex';
        hud.style.flexWrap = 'wrap';
        hud.style.alignItems = 'center';
        hud.style.justifyContent = 'space-between';
        hud.style.padding = hudMode === 'compact_strip' ? '6px 14px' : '10px 18px';
        hud.style.backgroundColor = hudMode === 'compact_strip' ? '#f8fafc' : '#f1f5f9';
        hud.style.borderBottom = '1px solid #e2e8f0';
        hud.style.gap = '10px';
        hud.style.flexShrink = '0';
        hud.style.zIndex = '10';

        var fontScale = config.fontScale || 'standard';
        var valFontSize = fontScale === 'compact' ? '13px' : (fontScale === 'large' ? '18px' : '15px');
        var targetPct = activeDays > 0 ? Math.round((daysMetTarget / activeDays) * 100) : 0;

        var hudHtml = '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">';

        // Title chip
        var titleText = config.summaryTitle || ((primaryMeas.label_short || primaryMeas.label || 'Activity') + ' Calendar');
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;letter-spacing:0.5px;">Metric Calendar</span>' +
          '<span style="font-size:' + valFontSize + ';font-weight:700;color:#0f172a;">' + titleText + '</span>' +
          '</div>';

        // Total
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600;">Total Volume</span>' +
          '<span style="font-size:' + valFontSize + ';font-weight:700;color:#0f172a;">' + formatNumber(totalSum, config.valueFormat || 'auto') + '</span>' +
          '</div>';

        // Active Days
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600;">Active Days</span>' +
          '<span style="font-size:' + valFontSize + ';font-weight:700;color:#0f172a;">' + activeDays + ' <span style="font-size:11px;font-weight:500;color:#64748b;">(' + Math.round((activeDays / (valuesList.length || 1)) * 100) + '%)</span></span>' +
          '</div>';

        // Goal Attainment
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600;">Days Meeting ' + (config.referenceLineLabel || 'Goal') + '</span>' +
          '<span style="font-size:' + valFontSize + ';font-weight:700;color:' + (targetPct >= 70 ? successColor : (targetPct >= 40 ? '#d97706' : alertColor)) + ';">' + targetPct + '% <span style="font-size:11px;font-weight:500;color:#64748b;">(' + daysMetTarget + 'd)</span></span>' +
          '</div>';

        // Peak Day
        if (maxVal > 0 && hudMode === 'scorecard') {
          hudHtml += '<div style="display:flex;flex-direction:column;">' +
            '<span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600;">All-Time Peak</span>' +
            '<span style="font-size:' + valFontSize + ';font-weight:700;color:#2563eb;">' + formatNumber(maxVal, config.valueFormat || 'auto') + ' <span style="font-size:11px;font-weight:500;color:#64748b;">(' + maxDateStr + ')</span></span>' +
            '</div>';
        }

        // Anomaly Tag
        if (hasAnomaly) {
          hudHtml += '<div style="background:#fee2e2;border:1px solid #fecaca;color:#991b1b;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px;">' +
            '<span>⚠️ Anomaly Spikes Detected (>' + (Number(config.anomalyThresholdPct) || 130) + '% ' + (config.referenceLineLabel || 'Goal') + ')</span>' +
            '</div>';
        }

        hudHtml += '</div>';

        // Search Bar integration
        if (config.showSearch !== false) {
          hudHtml += '<div style="display:flex;align-items:center;">' +
            '<input type="text" class="cal-search-input" placeholder="Search date (YYYY-MM)..." style="padding:5px 9px;font-size:11px;border:1px solid #cbd5e1;border-radius:5px;outline:none;width:150px;" />' +
            '</div>';
        }

        hud.innerHTML = hudHtml;
        root.appendChild(hud);

        var searchInput = hud.querySelector('.cal-search-input');
        if (searchInput) {
          searchInput.addEventListener('input', function (e) {
            var q = e.target.value.trim().toLowerCase();
            d3.select(root).selectAll('.cal-day').style('opacity', function (d) {
              if (!q) return 1;
              var dateStr = d3.timeFormat('%Y-%m-%d')(d).toLowerCase();
              return dateStr.indexOf(q) !== -1 ? 1 : 0.12;
            });
          });
        }
      }

      // --- 6. SCROLLABLE CALENDAR VIEWPORT ---
      var viewport = document.createElement('div');
      viewport.className = 'calendar-viewport';
      viewport.style.flex = '1 1 auto';
      viewport.style.minHeight = '0';
      viewport.style.overflow = 'auto';
      viewport.style.padding = '16px 20px';
      viewport.style.boxSizing = 'border-box';
      viewport.style.display = 'flex';
      viewport.style.flexDirection = 'column';
      viewport.style.alignItems = 'flex-start';
      root.appendChild(viewport);

      // Sizing parameters
      var cellSize = Number(config.cellSize) || 13;
      var cellRadius = Number(config.cellRadius) || 3;
      var cellSpacing = Number(config.cellSpacing) || 3;
      var step = cellSize + cellSpacing;

      var startDate = d3.timeSunday(minDate);
      var endDate = d3.timeSaturday(maxDate);
      var weeks = d3.timeWeeks(startDate, d3.timeDay.offset(endDate, 1));

      var daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      var leftMargin = config.showDayLabels !== false ? 36 : 12;
      var topMargin = config.showMonthLabels !== false ? 26 : 10;

      var svgWidth = leftMargin + weeks.length * step + 24;
      var svgHeight = topMargin + 7 * step + 20;

      var svg = d3
        .select(viewport)
        .append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .style('display', 'block');

      var g = svg
        .append('g')
        .attr('transform', 'translate(' + leftMargin + ',' + topMargin + ')');

      // Quantile color scale
      var nonZeroVals = Object.keys(dateMap)
        .map(function (k) { return dateMap[k].value; })
        .filter(function (v) { return v > 0; });

      var colorScale = d3
        .scaleQuantile()
        .domain(nonZeroVals.length > 0 ? nonZeroVals : [0, 1])
        .range(colorList.slice(1));

      // Day of week labels
      if (config.showDayLabels !== false) {
        var dayLabelsGroup = svg
          .append('g')
          .attr('transform', 'translate(0,' + topMargin + ')');

        [1, 3, 5].forEach(function (dIdx) {
          dayLabelsGroup
            .append('text')
            .attr('x', leftMargin - 8)
            .attr('y', dIdx * step + cellSize * 0.8)
            .attr('text-anchor', 'end')
            .attr('font-size', '10px')
            .attr('font-weight', '500')
            .attr('fill', '#64748b')
            .text(daysOfWeek[dIdx]);
        });
      }

      // Month labels
      if (config.showMonthLabels !== false) {
        var monthLabelsGroup = svg
          .append('g')
          .attr('transform', 'translate(' + leftMargin + ', 0)');

        var monthWeeks = {};
        weeks.forEach(function (w, i) {
          var m = d3.timeFormat('%b')(w);
          if (!monthWeeks[m]) {
            monthWeeks[m] = i;
          }
        });

        Object.keys(monthWeeks).forEach(function (mName) {
          var colIdx = monthWeeks[mName];
          monthLabelsGroup
            .append('text')
            .attr('x', colIdx * step)
            .attr('y', topMargin - 8)
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('fill', '#475569')
            .text(mName);
        });
      }

      // Render Days
      var allDays = d3.timeDays(startDate, d3.timeDay.offset(endDate, 1));

      var dayRects = g.selectAll('.cal-day')
        .data(allDays)
        .enter()
        .append('rect')
        .attr('class', 'cal-day')
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('rx', cellRadius)
        .attr('ry', cellRadius)
        .attr('x', function (d) {
          return d3.timeWeek.count(startDate, d) * step;
        })
        .attr('y', function (d) {
          return d.getDay() * step;
        })
        .attr('fill', function (d) {
          var dateKey = d3.timeFormat('%Y-%m-%d')(d);
          var entry = dateMap[dateKey];
          if (!entry || entry.value === 0) {
            return colorList[0];
          }
          return colorScale(entry.value);
        })
        .attr('stroke', function (d) {
          var dateKey = d3.timeFormat('%Y-%m-%d')(d);
          var entry = dateMap[dateKey];
          if (entry && entry.isAnomaly) {
            return alertColor;
          }
          return theme.cellBorder || 'rgba(0,0,0,0.06)';
        })
        .attr('stroke-width', function (d) {
          var dateKey = d3.timeFormat('%Y-%m-%d')(d);
          var entry = dateMap[dateKey];
          return (entry && entry.isAnomaly) ? 1.8 : 1.0;
        })
        .style('cursor', function (d) {
          var dateKey = d3.timeFormat('%Y-%m-%d')(d);
          var entry = dateMap[dateKey];
          return (entry && entry.drillLinks && entry.drillLinks.length > 0) ? 'pointer' : 'default';
        })
        .on('mouseover', function (event, d) {
          d3.select(this)
            .attr('stroke', '#0f172a')
            .attr('stroke-width', 2);

          var dateKey = d3.timeFormat('%Y-%m-%d')(d);
          var entry = dateMap[dateKey];
          var dateFormatted = d3.timeFormat('%A, %b %d, %Y')(d);
          var measLabel = primaryMeas.label_short || primaryMeas.label || 'Value';

          var valStr = entry && entry.value > 0
            ? '<b>' + (entry.rendered || formatNumber(entry.value, config.valueFormat || 'auto')) + '</b> ' + measLabel
            : 'No ' + measLabel.toLowerCase() + ' recorded';

          var targetHtml = '';
          if (entry && entry.benchmarkTarget > 0) {
            var attainmentPct = Math.round(entry.pct * 100);
            var isMet = isLowerBetter ? (entry.value <= entry.benchmarkTarget && entry.value > 0) : (entry.value >= entry.benchmarkTarget);
            targetHtml = '<div style="margin-top:4px;font-size:11px;color:#94a3b8;">' +
              (config.referenceLineLabel || 'Goal') + ': <b>' + formatNumber(entry.benchmarkTarget, config.valueFormat || 'auto') + '</b> ' +
              '(<b style="color:' + (isMet ? '#4ade80' : '#f87171') + ';">' + attainmentPct + '%</b>)' +
              '</div>';
          }

          var drillHtml = (entry && entry.drillLinks && entry.drillLinks.length > 0)
            ? '<div style="margin-top:6px;font-size:10px;color:#60a5fa;font-style:italic;">🔎 Click cell to explore drill menu</div>'
            : '';

          tooltip.style.display = 'block';
          tooltip.innerHTML =
            '<div style="font-weight:700;margin-bottom:3px;font-size:12px;color:#f8fafc;">' + dateFormatted + '</div>' +
            '<div style="font-size:12px;color:#e2e8f0;">' + valStr + '</div>' +
            targetHtml +
            drillHtml;
        })
        .on('mousemove', function (event) {
          var x = event.clientX + 14;
          var y = event.clientY + 14;
          if (x + 240 > window.innerWidth) x = event.clientX - 250;
          tooltip.style.left = x + 'px';
          tooltip.style.top = y + 'px';
        })
        .on('mouseout', function (event, d) {
          var dateKey = d3.timeFormat('%Y-%m-%d')(d);
          var entry = dateMap[dateKey];
          d3.select(this)
            .attr('stroke', (entry && entry.isAnomaly) ? alertColor : (theme.cellBorder || 'rgba(0,0,0,0.06)'))
            .attr('stroke-width', (entry && entry.isAnomaly) ? 1.8 : 1.0);
          tooltip.style.display = 'none';
        })
        .on('click', function (event, d) {
          var dateKey = d3.timeFormat('%Y-%m-%d')(d);
          var entry = dateMap[dateKey];
          if (entry && entry.drillLinks && entry.drillLinks.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
            window.LookerCharts.Utils.openDrillMenu({
              links: entry.drillLinks,
              event: event
            });
          }
        });

      // --- 7. PEAK HOTSPOT VALUE BADGES ---
      if (config.showValueLabels === 'peaks_only' && maxVal > 0) {
        var peakEntry = null;
        allDays.forEach(function (d) {
          var dateKey = d3.timeFormat('%Y-%m-%d')(d);
          var entry = dateMap[dateKey];
          if (entry && entry.value === maxVal) {
            peakEntry = { day: d, entry: entry };
          }
        });

        if (peakEntry) {
          var px = d3.timeWeek.count(startDate, peakEntry.day) * step + cellSize / 2;
          var py = peakEntry.day.getDay() * step;

          g.append('circle')
            .attr('cx', px)
            .attr('cy', py + cellSize / 2)
            .attr('r', cellSize * 0.75)
            .attr('fill', 'none')
            .attr('stroke', '#f59e0b')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '2,2');

          g.append('text')
            .attr('x', px)
            .attr('y', py - 4)
            .attr('text-anchor', 'middle')
            .attr('font-size', '9px')
            .attr('font-weight', '700')
            .attr('fill', '#b45309')
            .text('★ PEAK');
        }
      }

      // --- 8. INTENSITY LEGEND ---
      if (config.showLegend !== false) {
        var legendEl = document.createElement('div');
        legendEl.className = 'cal-legend';
        legendEl.style.display = 'flex';
        legendEl.style.alignItems = 'center';
        legendEl.style.gap = '6px';
        legendEl.style.marginTop = '14px';
        legendEl.style.fontSize = '11px';
        legendEl.style.fontWeight = '500';
        legendEl.style.color = '#64748b';

        var lessLabel = document.createElement('span');
        lessLabel.textContent = 'Less Active';
        legendEl.appendChild(lessLabel);

        colorList.forEach(function (col) {
          var box = document.createElement('span');
          box.style.width = cellSize + 'px';
          box.style.height = cellSize + 'px';
          box.style.borderRadius = cellRadius + 'px';
          box.style.background = col;
          box.style.display = 'inline-block';
          box.style.border = '1px solid ' + (theme.cellBorder || 'rgba(0,0,0,0.08)');
          legendEl.appendChild(box);
        });

        var moreLabel = document.createElement('span');
        moreLabel.textContent = 'More Active';
        legendEl.appendChild(moreLabel);

        if (benchmarkTarget > 0) {
          var targetBadge = document.createElement('span');
          targetBadge.style.marginLeft = '16px';
          targetBadge.style.padding = '2px 8px';
          targetBadge.style.background = '#e0f2fe';
          targetBadge.style.color = '#0369a1';
          targetBadge.style.borderRadius = '4px';
          targetBadge.style.fontSize = '10px';
          targetBadge.style.fontWeight = '600';
          targetBadge.textContent = (config.referenceLineLabel || 'Target Goal') + ': ' + formatNumber(benchmarkTarget, config.valueFormat || 'auto') + '/day';
          legendEl.appendChild(targetBadge);
        }

        viewport.appendChild(legendEl);
      }

      done();
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
