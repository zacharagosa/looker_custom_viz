/**
 * Radial KPI Progress Gauge - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Upgraded with Multi-Modal Enterprise Flexibility:
 * - Dynamic Field-Role Mapping (Primary Dimension, Secondary Group Dimension, Primary Measure, Target Measure)
 * - Configurable Reference Lines & Targets (Measure Column, Fixed Value, Mean, Median, P75, P90)
 * - Interactive Sorting, Top-N Bucketing with automatic "Other" rollup, and zero/null suppression
 * - HUD, Legend, & Value Label Density Controls (Scorecard HUD, Compact Strip, Data Value Labels)
 * - Custom Brand Palettes, Polarity (Higher vs Lower is better), Font Scaling, and Value Formats
 * - Strictly minimized to 2 configuration sections: "Display" and "Style"
 * - Full Looker drill-down menu support (LookerCharts.Utils.openDrillMenu)
 * - Debounced ResizeObserver with <4px delta guard and responsive layout scaling
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.arc === 'function') {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.arc === 'function') {
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
      colors: ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#9C27B0', '#00ACC1', '#FF7043'],
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      trackOpacity: 0.16
    },
    modern_slate: {
      name: 'Modern Slate',
      colors: ['#0f766e', '#0284c7', '#3b82f6', '#6366f1', '#8b5cf6', '#0d9488', '#475569'],
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      trackOpacity: 0.15
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark',
      colors: ['#00F5D4', '#7B2CBF', '#F72585', '#4CC9F0', '#FFBE0B', '#3A0CA3', '#9D4EDD'],
      bg: '#0f172a',
      text: '#f8fafc',
      subtext: '#94a3b8',
      trackOpacity: 0.22
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      colors: ['#059669', '#10b981', '#34d399', '#0284c7', '#0d9488', '#047857', '#0f766e'],
      bg: '#ffffff',
      text: '#064e3b',
      subtext: '#047857',
      trackOpacity: 0.15
    },
    sunset_media: {
      name: 'Sunset Media',
      colors: ['#f43f5e', '#fb7185', '#f97316', '#fb923c', '#facc15', '#a855f7', '#d97706'],
      bg: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      trackOpacity: 0.16
    },
    wellverse_healthcare: {
      name: 'Wellverse Healthcare',
      colors: ['#143359', '#00AF68', '#2E7CF6', '#FFB500', '#7C5CFC', '#14B8A6', '#E5484D'],
      bg: '#ffffff',
      text: '#143359',
      subtext: '#64748B',
      trackOpacity: 0.16
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
    id: 'radial_progress_gauge',
    label: 'Radial KPI Progress Gauge',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'Gauge Layout Mode',
        display: 'select',
        values: [
          { 'Concentric Rings (Multi-Tier Apple Fitness)': 'concentric' },
          { 'Single Hero Ring with Sub-Gauges': 'hero_split' },
          { 'Radial Dial Speedometer': 'speedometer' },
          { 'Multi-Gauge Small Multiples Grid': 'small_multiples' }
        ],
        default: 'concentric',
        section: 'Display',
        order: 1
      },
      dimFieldOverride: {
        type: 'string',
        label: 'Primary Dimension Index or Name (1 = Col 1)',
        default: '1',
        section: 'Display',
        order: 2
      },
      measureFieldOverride: {
        type: 'string',
        label: 'Primary Measure Index or Name (1 = Measure 1)',
        default: '1',
        section: 'Display',
        order: 3
      },
      targetMeasureOverride: {
        type: 'string',
        label: 'Target Measure Index or Name (Optional)',
        default: '',
        section: 'Display',
        order: 4
      },
      targetMode: {
        type: 'string',
        label: 'Goal / Target Calculation Mode',
        display: 'select',
        values: [
          { 'Measure Column (From Query)': 'measure_column' },
          { 'Fixed Static Target Value': 'fixed_value' },
          { 'Dataset Mean (100% = Average)': 'dataset_mean' },
          { 'Dataset Median (100% = Median)': 'dataset_median' },
          { 'Top Percentile P75 Target': 'percentile_p75' },
          { 'Top Percentile P90 Target': 'percentile_p90' }
        ],
        default: 'fixed_value',
        section: 'Display',
        order: 5
      },
      targetValue: {
        type: 'number',
        label: 'Fixed Target Value (when Fixed Mode, 0 = Auto)',
        default: 0,
        section: 'Display',
        order: 6
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Custom Reference / Target Label',
        default: 'Quota Goal',
        section: 'Display',
        order: 7
      },
      anomalyThresholdPct: {
        type: 'number',
        label: 'Attainment Anomaly Alert Threshold (%)',
        default: 120,
        section: 'Display',
        order: 8
      },
      sortBy: {
        type: 'string',
        label: 'Sorting & Ring Ordering',
        display: 'select',
        values: [
          { 'Metric Descending (Highest Outside)': 'metric_desc' },
          { 'Metric Ascending (Lowest Outside)': 'metric_asc' },
          { 'Alphabetical / Dimension Label': 'label_asc' },
          { 'Natural / Query Order': 'natural' }
        ],
        default: 'metric_desc',
        section: 'Display',
        order: 9
      },
      topNLimit: {
        type: 'number',
        label: 'Top-N Rings Limit (0 = All, Max 12)',
        default: 6,
        section: 'Display',
        order: 10
      },
      enableOtherRollup: {
        type: 'boolean',
        label: 'Group Remaining into "Other" Ring',
        default: false,
        section: 'Display',
        order: 11
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Suppress Zero / Null Rings',
        default: true,
        section: 'Display',
        order: 12
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
        order: 13
      },
      showValueLabels: {
        type: 'string',
        label: 'Ring Value Labels',
        display: 'select',
        values: [
          { 'Show All Endcaps': 'all' },
          { 'Min/Max Peaks Only': 'peaks_only' },
          { 'Hidden': 'hidden' }
        ],
        default: 'all',
        section: 'Display',
        order: 14
      },
      showCenterText: {
        type: 'boolean',
        label: 'Show Center Metric & % Summary',
        default: true,
        section: 'Display',
        order: 15
      },
      centerTitle: {
        type: 'string',
        label: 'Custom Center Title Override',
        default: '',
        section: 'Display',
        order: 16
      },
      showLegend: {
        type: 'boolean',
        label: 'Show Metric Legend',
        default: true,
        section: 'Display',
        order: 17
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Category Search Bar',
        default: true,
        section: 'Display',
        order: 18
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorPalette: {
        type: 'string',
        label: 'Brand Palette Preset',
        display: 'select',
        values: [
          { 'Google Enterprise': 'google_enterprise' },
          { 'Modern Slate': 'modern_slate' },
          { 'Cyberpunk Dark': 'cyberpunk_dark' },
          { 'Emerald FinOps': 'emerald_finops' },
          { 'Sunset Media': 'sunset_media' },
          { 'Wellverse Healthcare': 'wellverse_healthcare' },
          { 'Custom Hex Override': 'custom_override' }
        ],
        default: 'google_enterprise',
        section: 'Style',
        order: 1
      },
      customPrimaryHex: {
        type: 'string',
        label: 'Custom Primary Brand Hex',
        default: '',
        section: 'Style',
        order: 2
      },
      customPositiveHex: {
        type: 'string',
        label: 'Custom Positive / Success Hex',
        default: '',
        section: 'Style',
        order: 3
      },
      customNegativeHex: {
        type: 'string',
        label: 'Custom Negative / Alert Hex',
        default: '',
        section: 'Style',
        order: 4
      },
      metricPolarity: {
        type: 'string',
        label: 'Metric Polarity',
        display: 'select',
        values: [
          { 'Higher is Better (Revenue, Orders, Completion)': 'higher_is_better' },
          { 'Lower is Better (Latency, Churn, Defect, Cost)': 'lower_is_better' }
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
          { 'Large Presentation (Executive Wallboard)': 'large' }
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
      ringThickness: {
        type: 'number',
        label: 'Ring Thickness (px)',
        display: 'range',
        min: 6,
        max: 36,
        step: 2,
        default: 16,
        section: 'Style',
        order: 8
      },
      ringSpacing: {
        type: 'number',
        label: 'Ring Spacing (px)',
        display: 'range',
        min: 2,
        max: 20,
        step: 1,
        default: 6,
        section: 'Style',
        order: 9
      },
      trackOpacity: {
        type: 'number',
        label: 'Background Track Opacity (%)',
        display: 'range',
        min: 5,
        max: 60,
        step: 5,
        default: 18,
        section: 'Style',
        order: 10
      }
    },

    create: function (element, config) {
      element.innerHTML = '';
      element.style.boxSizing = 'border-box';
      element.style.padding = '0';
      element.style.overflow = 'hidden';
      element.style.position = 'relative';
      element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

      var container = document.createElement('div');
      container.className = 'radial-gauge-root';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.boxSizing = 'border-box';
      container.style.overflow = 'hidden';
      element.appendChild(container);

      // Create floating tooltip
      var tooltip = document.createElement('div');
      tooltip.className = 'radial-gauge-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.display = 'none';
      tooltip.style.padding = '10px 14px';
      tooltip.style.background = 'rgba(15, 23, 42, 0.94)';
      tooltip.style.color = '#f8fafc';
      tooltip.style.borderRadius = '8px';
      tooltip.style.fontSize = '12px';
      tooltip.style.fontWeight = '500';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
      tooltip.style.zIndex = '9999';
      tooltip.style.backdropFilter = 'blur(6px)';
      element.appendChild(tooltip);

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
      var root = element.querySelector('.radial-gauge-root');
      var tooltip = element.querySelector('.radial-gauge-tooltip');
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
      var measures = fields.measures || [];
      var dimensions = fields.dimensions || [];

      if (measures.length === 0) {
        this.addError({
          title: 'Measure Required',
          message: 'Please add at least one measure to power the radial gauge.'
        });
        done();
        return;
      }

      // --- 1. RESOLVE FIELD ROLES WITH USER CONFIG OVERRIDES ---
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

      var primaryDim = resolveField(dimensions, config.dimFieldOverride, 0);
      var primaryMeas = resolveField(measures, config.measureFieldOverride, 0);
      var targetMeas = config.targetMeasureOverride ? resolveField(measures, config.targetMeasureOverride, 1) : (measures.length > 1 ? measures[1] : null);

      // --- 2. PALETTE & BRAND COLOR RESOLUTION ---
      var paletteKey = config.colorPalette || 'google_enterprise';
      var theme = PALETTES[paletteKey] || PALETTES.google_enterprise;
      var colorList = theme.colors.slice();

      if (paletteKey === 'custom_override' || config.customPrimaryHex) {
        var pColor = config.customPrimaryHex || '#1a73e8';
        var posColor = config.customPositiveHex || '#34a853';
        var negColor = config.customNegativeHex || '#ea4335';
        colorList = [pColor, posColor, '#fbbc04', negColor, '#9334e6', '#00acc1', '#ff7043'];
      }

      var isLowerBetter = config.metricPolarity === 'lower_is_better';
      var alertColor = config.customNegativeHex || '#dc2626';
      var successColor = config.customPositiveHex || '#16a34a';

      // --- 3. ROW PARSING & DATA NORMALIZATION ---
      var rawItems = [];
      var targetMode = config.targetMode || 'fixed_value';
      var staticTarget = Number(config.targetValue) || 0;

      var isMultiRow = dimensions.length > 0 && data.length > 1;

      if (isMultiRow && primaryDim && primaryMeas) {
        // Multi-row dimension breakdown
        for (var rIdx = 0; rIdx < data.length; rIdx++) {
          var row = data[rIdx];
          var rawVal = Number(row[primaryMeas.name] && row[primaryMeas.name].value) || 0;
          if (config.suppressZeroNull && (rawVal === 0 || isNaN(rawVal))) {
            continue;
          }
          var labelText = (row[primaryDim.name] && (row[primaryDim.name].rendered || row[primaryDim.name].value)) || ('Item ' + (rIdx + 1));
          var rowTarget = 0;
          if (targetMode === 'measure_column' && targetMeas && row[targetMeas.name]) {
            rowTarget = Number(row[targetMeas.name].value) || 0;
          }
          rawItems.push({
            id: 'row_' + rIdx,
            label: String(labelText),
            value: rawVal,
            rendered: (row[primaryMeas.name] && row[primaryMeas.name].rendered) || null,
            drillLinks: (row[primaryMeas.name] && row[primaryMeas.name].links) || (row[primaryDim.name] && row[primaryDim.name].links) || [],
            target: rowTarget
          });
        }
      } else {
        // Multi-measure on single row (or no dimension)
        var targetRow = data[0];
        for (var mIdx = 0; mIdx < measures.length; mIdx++) {
          var m = measures[mIdx];
          var val = Number(targetRow[m.name] && targetRow[m.name].value) || 0;
          if (config.suppressZeroNull && (val === 0 || isNaN(val))) {
            continue;
          }
          rawItems.push({
            id: 'meas_' + mIdx,
            label: m.label_short || m.label || m.name,
            value: val,
            rendered: targetRow[m.name] && targetRow[m.name].rendered,
            drillLinks: (targetRow[m.name] && targetRow[m.name].links) || [],
            target: staticTarget
          });
        }
      }

      if (rawItems.length === 0) {
        this.addError({
          title: 'No Active Metrics',
          message: 'All returned items evaluated to zero or null.'
        });
        done();
        return;
      }

      // --- 4. STATISTICAL TARGET COMPUTATION ---
      var valuesList = rawItems.map(function (d) { return d.value; }).sort(function (a, b) { return a - b; });
      var sumVal = valuesList.reduce(function (acc, v) { return acc + v; }, 0);
      var meanVal = sumVal / (valuesList.length || 1);
      var medianVal = valuesList[Math.floor(valuesList.length / 2)] || meanVal;
      var p75Val = valuesList[Math.floor(valuesList.length * 0.75)] || medianVal;
      var p90Val = valuesList[Math.floor(valuesList.length * 0.90)] || valuesList[valuesList.length - 1];
      var maxVal = valuesList[valuesList.length - 1] || 100;

      rawItems.forEach(function (item) {
        if (targetMode === 'dataset_mean') {
          item.target = meanVal;
        } else if (targetMode === 'dataset_median') {
          item.target = medianVal;
        } else if (targetMode === 'percentile_p75') {
          item.target = p75Val;
        } else if (targetMode === 'percentile_p90') {
          item.target = p90Val;
        } else if (targetMode === 'fixed_value') {
          item.target = staticTarget > 0 ? staticTarget : (maxVal * 1.15 || 100);
        } else if (targetMode === 'measure_column' && (!item.target || item.target <= 0)) {
          item.target = staticTarget > 0 ? staticTarget : (maxVal * 1.15 || 100);
        }
        item.pct = item.target > 0 ? (item.value / item.target) : (item.value / (maxVal || 1));
      });

      // --- 5. SORTING & TOP-N BUCKETING ---
      var sortBy = config.sortBy || 'metric_desc';
      if (sortBy === 'metric_desc') {
        rawItems.sort(function (a, b) { return b.value - a.value; });
      } else if (sortBy === 'metric_asc') {
        rawItems.sort(function (a, b) { return a.value - b.value; });
      } else if (sortBy === 'label_asc') {
        rawItems.sort(function (a, b) { return a.label.localeCompare(b.label); });
      }

      var topN = Number(config.topNLimit) || 6;
      var finalItems = rawItems;
      if (topN > 0 && rawItems.length > topN) {
        var topSlices = rawItems.slice(0, topN);
        if (config.enableOtherRollup) {
          var otherSlices = rawItems.slice(topN);
          var otherVal = otherSlices.reduce(function (acc, d) { return acc + d.value; }, 0);
          var otherTarget = otherSlices.reduce(function (acc, d) { return acc + d.target; }, 0) || (otherVal * 1.15);
          topSlices.push({
            id: 'other_rollup',
            label: 'Other (' + otherSlices.length + ' categories)',
            value: otherVal,
            rendered: formatNumber(otherVal, config.valueFormat || 'auto'),
            drillLinks: [],
            target: otherTarget,
            pct: otherTarget > 0 ? (otherVal / otherTarget) : 0.8
          });
        }
        finalItems = topSlices;
      }

      // Assign colors
      finalItems.forEach(function (d, i) {
        d.color = colorList[i % colorList.length];
      });

      // --- 6. RENDER EXECUTIVE KPI SCORECARD HUD ---
      var hudMode = config.hudMode || 'scorecard';
      if (hudMode !== 'hidden') {
        var hud = document.createElement('div');
        hud.className = 'radial-gauge-hud';
        hud.style.width = '100%';
        hud.style.display = 'flex';
        hud.style.flexWrap = 'wrap';
        hud.style.alignItems = 'center';
        hud.style.justifyContent = 'space-between';
        hud.style.padding = hudMode === 'compact_strip' ? '4px 12px' : '8px 16px';
        hud.style.backgroundColor = hudMode === 'compact_strip' ? '#f8fafc' : '#f1f5f9';
        hud.style.borderBottom = '1px solid #e2e8f0';
        hud.style.gap = '8px';
        hud.style.flexShrink = '0';
        hud.style.zIndex = '10';

        var avgAttainment = Math.round(
          (finalItems.reduce(function (acc, c) { return acc + c.pct; }, 0) / (finalItems.length || 1)) * 100
        );

        var topItem = finalItems[0];
        var anomalyAlert = finalItems.some(function (d) { return (d.pct * 100) >= (Number(config.anomalyThresholdPct) || 120); });

        var cardsHtml = '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">';
        cardsHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600;">Avg Attainment</span>' +
          '<span style="font-size:' + (hudMode === 'compact_strip' ? '13px' : '15px') + ';font-weight:700;color:' + (isLowerBetter ? (avgAttainment <= 100 ? successColor : alertColor) : (avgAttainment >= 100 ? successColor : '#1e3a8a')) + ';">' + avgAttainment + '%</span>' +
          '</div>';

        cardsHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600;">Total Active Volume</span>' +
          '<span style="font-size:' + (hudMode === 'compact_strip' ? '13px' : '15px') + ';font-weight:700;color:#0f172a;">' + formatNumber(sumVal, config.valueFormat || 'auto') + '</span>' +
          '</div>';

        if (topItem && hudMode === 'scorecard') {
          cardsHtml += '<div style="display:flex;flex-direction:column;">' +
            '<span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600;">Leading Driver</span>' +
            '<span style="font-size:13px;font-weight:600;color:#334155;">' + topItem.label + ' (' + Math.round(topItem.pct * 100) + '%)</span>' +
            '</div>';
        }

        if (anomalyAlert) {
          cardsHtml += '<div style="background:#fee2e2;border:1px solid #fecaca;color:#991b1b;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px;">' +
            '<span>⚠️ Anomaly Alert: >' + (Number(config.anomalyThresholdPct) || 120) + '% Target</span>' +
            '</div>';
        }

        cardsHtml += '</div>';

        // Search Bar integration
        if (config.showSearch !== false) {
          cardsHtml += '<div style="display:flex;align-items:center;">' +
            '<input type="text" class="radial-search-input" placeholder="Search rings..." style="padding:4px 8px;font-size:11px;border:1px solid #cbd5e1;border-radius:4px;outline:none;width:130px;" />' +
            '</div>';
        }

        hud.innerHTML = cardsHtml;
        root.appendChild(hud);

        var searchInput = hud.querySelector('.radial-search-input');
        if (searchInput) {
          searchInput.addEventListener('input', function (e) {
            var q = e.target.value.toLowerCase();
            d3.select(root).selectAll('.radial-fg-arc').style('opacity', function (d) {
              if (!q) return 1;
              return d.label.toLowerCase().indexOf(q) !== -1 ? 1 : 0.15;
            });
          });
        }
      }

      // --- 7. SVG MAIN CANVAS ---
      var chartContainer = document.createElement('div');
      chartContainer.className = 'radial-chart-viewport';
      chartContainer.style.width = '100%';
      chartContainer.style.flex = '1 1 auto';
      chartContainer.style.minHeight = '0';
      chartContainer.style.display = 'flex';
      chartContainer.style.alignItems = 'center';
      chartContainer.style.justifyContent = 'center';
      chartContainer.style.position = 'relative';
      root.appendChild(chartContainer);

      var width = chartContainer.clientWidth || element.clientWidth || 400;
      var height = chartContainer.clientHeight || element.clientHeight || 400;
      var margin = 20;
      var minDim = Math.min(width, height) - margin * 2;
      var outerRadius = Math.max(minDim / 2, 40);

      var thickness = Number(config.ringThickness) || 16;
      var spacing = Number(config.ringSpacing) || 6;
      var trackOpacity = (Number(config.trackOpacity) || 18) / 100;

      // Adjust thickness if too many rings
      var totalNeeded = finalItems.length * (thickness + spacing);
      if (totalNeeded > outerRadius - 35) {
        thickness = Math.max(6, Math.floor((outerRadius - 35) / finalItems.length) - spacing);
      }

      var layoutMode = config.layoutMode || 'concentric';
      var isSpeedometer = layoutMode === 'speedometer';
      var maxAngle = isSpeedometer ? Math.PI : (2 * Math.PI);
      var startOffsetAngle = isSpeedometer ? -Math.PI / 2 : 0;

      var svg = d3
        .select(chartContainer)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', '0 0 ' + width + ' ' + height)
        .attr('style', 'max-width: 100%; height: 100%; display: block;');

      var centerY = isSpeedometer ? (height / 2 + outerRadius * 0.25) : (height / 2);
      var g = svg
        .append('g')
        .attr('transform', 'translate(' + width / 2 + ',' + centerY + ')');

      // Gradients & Defs
      var defs = svg.append('defs');
      finalItems.forEach(function (d, i) {
        var grad = defs
          .append('linearGradient')
          .attr('id', 'rg_grad_' + i)
          .attr('x1', '0%')
          .attr('y1', '0%')
          .attr('x2', '100%')
          .attr('y2', '100%');

        grad.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', d.color)
          .attr('stop-opacity', 0.88);

        grad.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', d.color)
          .attr('stop-opacity', 1.0);
      });

      // Background Tracks & Foreground Arcs
      finalItems.forEach(function (d, i) {
        var rOuter = outerRadius - i * (thickness + spacing);
        var rInner = rOuter - thickness;

        if (rInner <= 6) return;

        // Background Track
        var trackArc = d3
          .arc()
          .innerRadius(rInner)
          .outerRadius(rOuter)
          .startAngle(startOffsetAngle)
          .endAngle(startOffsetAngle + maxAngle)
          .cornerRadius(thickness / 2);

        g.append('path')
          .attr('d', trackArc)
          .attr('fill', d.color)
          .attr('opacity', trackOpacity);

        // Foreground Arc
        var fgArc = d3
          .arc()
          .innerRadius(rInner)
          .outerRadius(rOuter)
          .startAngle(startOffsetAngle)
          .cornerRadius(thickness / 2);

        var clampedPct = Math.min(1.0, Math.max(0, d.pct));
        var targetEndAngle = startOffsetAngle + clampedPct * maxAngle;

        var path = g
          .append('path')
          .datum(d)
          .attr('class', 'radial-fg-arc')
          .attr('d', fgArc.endAngle(startOffsetAngle)())
          .attr('fill', 'url(#rg_grad_' + i + ')')
          .style('cursor', 'pointer');

        // Smooth Animated Transition
        path
          .transition()
          .duration(1100)
          .ease(d3.easeCubicOut)
          .attrTween('d', function () {
            var interpolate = d3.interpolate(startOffsetAngle, targetEndAngle);
            return function (t) {
              return fgArc.endAngle(interpolate(t))();
            };
          });

        // Hover & Drill Menu Events
        path
          .on('mouseover', function (event, item) {
            d3.select(this).attr('opacity', 0.82);
            tooltip.style.display = 'block';
            var formattedVal = item.rendered || formatNumber(item.value, config.valueFormat || 'auto');
            var formattedTarget = formatNumber(item.target, config.valueFormat || 'auto');
            var pctText = Math.round(item.pct * 100) + '%';

            var drillAffordance = (item.drillLinks && item.drillLinks.length > 0) ? '<div style="margin-top:4px;font-size:10px;color:#93c5fd;font-style:italic;">🔎 Click to Drill</div>' : '';

            tooltip.innerHTML =
              '<div style="font-weight:700;margin-bottom:4px;color:' + item.color + ';font-size:13px;">' + item.label + '</div>' +
              '<div>Actual: <b>' + formattedVal + '</b></div>' +
              '<div>' + (config.referenceLineLabel || 'Target Goal') + ': <b>' + formattedTarget + '</b></div>' +
              '<div style="margin-top:2px;">Attainment: <b style="color:' + (item.pct >= 1.0 ? '#4ade80' : '#f87171') + ';">' + pctText + '</b></div>' +
              drillAffordance;
          })
          .on('mousemove', function (event) {
            var bounds = element.getBoundingClientRect();
            var x = event.clientX + 14;
            var y = event.clientY + 14;
            if (x + 220 > window.innerWidth) x = event.clientX - 230;
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
          })
          .on('mouseout', function () {
            d3.select(this).attr('opacity', 1.0);
            tooltip.style.display = 'none';
          })
          .on('click', function (event, item) {
            if (item.drillLinks && item.drillLinks.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({
                links: item.drillLinks,
                event: event
              });
            }
          });

        // Endcap Value Labels
        var showLabels = config.showValueLabels || 'all';
        var isPeak = (i === 0 || i === finalItems.length - 1);
        if (showLabels === 'all' || (showLabels === 'peaks_only' && isPeak)) {
          var midAngle = startOffsetAngle + clampedPct * maxAngle;
          var labelR = (rOuter + rInner) / 2;
          var lx = Math.cos(midAngle - Math.PI / 2) * labelR;
          var ly = Math.sin(midAngle - Math.PI / 2) * labelR;

          if (clampedPct > 0.08) {
            g.append('text')
              .attr('x', lx)
              .attr('y', ly)
              .attr('text-anchor', 'middle')
              .attr('alignment-baseline', 'middle')
              .attr('fill', '#ffffff')
              .attr('font-size', Math.max(9, Math.floor(thickness * 0.55)) + 'px')
              .attr('font-weight', '700')
              .style('pointer-events', 'none')
              .text(Math.round(clampedPct * 100) + '%');
          }
        }
      });

      // Center KPI Summary Readout
      if (config.showCenterText !== false && finalItems.length > 0) {
        var primary = finalItems[0];
        var avgPct = Math.round(
          (finalItems.reduce(function (acc, curr) { return acc + curr.pct; }, 0) / finalItems.length) * 100
        );

        var centerG = g.append('g').attr('class', 'center-kpi-text');
        var fontScale = config.fontScale || 'standard';
        var fontFactor = fontScale === 'large' ? 1.25 : (fontScale === 'compact' ? 0.85 : 1.0);

        centerG
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', isSpeedometer ? '-0.4em' : '-0.1em')
          .attr('fill', theme.text || '#202124')
          .attr('font-size', Math.max(16, Math.floor(outerRadius * 0.25 * fontFactor)) + 'px')
          .attr('font-weight', '800')
          .text(avgPct + '%');

        var sub = config.centerTitle || (finalItems.length === 1 ? primary.label : 'Avg Completion');
        centerG
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', isSpeedometer ? '1.0em' : '1.4em')
          .attr('fill', theme.subtext || '#5F6368')
          .attr('font-size', Math.max(10, Math.floor(outerRadius * 0.11 * fontFactor)) + 'px')
          .attr('font-weight', '600')
          .text(sub);
      }

      // Legend if enabled
      if (config.showLegend !== false && finalItems.length > 1) {
        var legendContainer = document.createElement('div');
        legendContainer.className = 'radial-gauge-legend';
        legendContainer.style.display = 'flex';
        legendContainer.style.flexWrap = 'wrap';
        legendContainer.style.justifyContent = 'center';
        legendContainer.style.gap = '10px';
        legendContainer.style.padding = '6px 12px';
        legendContainer.style.fontSize = '11px';
        legendContainer.style.color = theme.text || '#3C4043';
        legendContainer.style.flexShrink = '0';
        legendContainer.style.zIndex = '10';

        finalItems.forEach(function (d) {
          var item = document.createElement('div');
          item.style.display = 'flex';
          item.style.alignItems = 'center';
          item.style.gap = '5px';
          item.style.cursor = 'pointer';
          item.innerHTML =
            '<span style="width:8px;height:8px;border-radius:50%;background:' + d.color + ';display:inline-block;"></span>' +
            '<span>' + d.label + ' (<b>' + Math.round(d.pct * 100) + '%</b>)</span>';

          item.addEventListener('click', function (ev) {
            if (d.drillLinks && d.drillLinks.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: ev });
            }
          });
          legendContainer.appendChild(item);
        });

        root.appendChild(legendContainer);
      }

      done();
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
