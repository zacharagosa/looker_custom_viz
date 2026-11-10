/**
 * SaaS Sales Pipeline Inspection & Deal Slippage Matrix
 * Google Cloud Looker Custom Visualization
 * Built with D3.js v7
 *
 * Designed for B2B SaaS Executive Leadership, Chief Revenue Officers (CRO), VP of Sales, and RevOps.
 * Solves Buganizer Cloud Blockers b/494819203, b/398601955, and b/520394840.
 *
 * 4 Multi-Modal Layout Modes:
 * 1. deal_slippage_quadrant (Default): 2D Strategic Deal Velocity & Slippage Quadrant
 *    (Days in Current Stage on X-axis vs Deal ARR on Y-axis, sized by Risk Score or ARR,
 *    colored by Forecast Category / Risk Band with 4 strategic quadrant zones:
 *    Stalled Whale Commits, Fast-Track Whales, High Velocity Flow, Drifting / Zombie Pipeline)
 * 2. stage_stagnation_waterfall: Stage Progression & Slippage Stagnation Waterfall
 *    (Sequential progression across sales stages with stacked slippage risk tiers,
 *    stage conversion velocity pills, and bottleneck warnings)
 * 3. forecast_risk_cross_matrix: Forecast Category × Risk Band Matrix
 *    (2D matrix grid crossing Forecast Category vs Risk Band, with immediate callouts for Questionable Commits)
 * 4. executive_deal_scorecard: High-Density Executive Deal Inspection Scorecard Table
 *    (Interactive tabular inspector with sortable columns, risk badges, slippage meters,
 *    action guidance pills, and Looker drill-down menu support)
 */

(function () {
  'use strict';

  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === 'function') {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === 'function') {
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
    modern_slate: {
      name: 'Modern Slate',
      primary: '#0f172a',
      critical: '#ef4444',
      highRisk: '#f97316',
      watch: '#f59e0b',
      healthy: '#10b981',
      commit: '#2563eb',
      upside: '#8b5cf6',
      pipeline: '#64748b',
      closed: '#059669',
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: '#e2e8f0',
      cardBg: '#f8fafc',
      grid: '#f1f5f9',
      zoneStalled: 'rgba(239, 68, 68, 0.07)',
      zoneFastTrack: 'rgba(16, 185, 129, 0.07)',
      zoneVelocity: 'rgba(37, 99, 235, 0.06)',
      zoneZombie: 'rgba(245, 158, 11, 0.07)'
    },
    google_enterprise: {
      name: 'Google Enterprise Blue',
      primary: '#1a73e8',
      critical: '#d93025',
      highRisk: '#ea8600',
      watch: '#f9ab00',
      healthy: '#1e8e3e',
      commit: '#1a73e8',
      upside: '#9334e6',
      pipeline: '#5f6368',
      closed: '#188038',
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      border: '#dadce0',
      cardBg: '#f8f9fa',
      grid: '#e8eaed',
      zoneStalled: 'rgba(217, 48, 37, 0.07)',
      zoneFastTrack: 'rgba(30, 142, 62, 0.07)',
      zoneVelocity: 'rgba(26, 115, 232, 0.06)',
      zoneZombie: 'rgba(249, 171, 0, 0.07)'
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark',
      primary: '#38bdf8',
      critical: '#f43f5e',
      highRisk: '#fb923c',
      watch: '#fbbf24',
      healthy: '#34d399',
      commit: '#38bdf8',
      upside: '#c084fc',
      pipeline: '#94a3b8',
      closed: '#10b981',
      isDark: true,
      bg: '#090d16',
      text: '#f8fafc',
      subtext: '#94a3b8',
      border: '#1e293b',
      cardBg: '#0f172a',
      grid: '#1e293b',
      zoneStalled: 'rgba(244, 63, 94, 0.14)',
      zoneFastTrack: 'rgba(52, 211, 153, 0.12)',
      zoneVelocity: 'rgba(56, 189, 248, 0.10)',
      zoneZombie: 'rgba(251, 191, 36, 0.12)'
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      primary: '#065f46',
      critical: '#b91c1c',
      highRisk: '#c2410c',
      watch: '#d97706',
      healthy: '#059669',
      commit: '#0284c7',
      upside: '#6366f1',
      pipeline: '#475569',
      closed: '#047857',
      bg: '#ffffff',
      text: '#064e3b',
      subtext: '#047857',
      border: '#a7f3d0',
      cardBg: '#ecfdf5',
      grid: '#d1fae5',
      zoneStalled: 'rgba(185, 28, 28, 0.07)',
      zoneFastTrack: 'rgba(5, 150, 105, 0.08)',
      zoneVelocity: 'rgba(2, 132, 199, 0.06)',
      zoneZombie: 'rgba(217, 119, 6, 0.07)'
    },
    sunset_media: {
      name: 'Sunset Media',
      primary: '#c2410c',
      critical: '#e11d48',
      highRisk: '#ea580c',
      watch: '#f59e0b',
      healthy: '#15803d',
      commit: '#2563eb',
      upside: '#7c3aed',
      pipeline: '#78716c',
      closed: '#16a34a',
      bg: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      border: '#fed7aa',
      cardBg: '#fff7ed',
      grid: '#ffedd5',
      zoneStalled: 'rgba(225, 29, 72, 0.07)',
      zoneFastTrack: 'rgba(21, 128, 61, 0.07)',
      zoneVelocity: 'rgba(37, 99, 235, 0.06)',
      zoneZombie: 'rgba(245, 158, 11, 0.07)'
    },
    executive_indigo: {
      name: 'Executive Indigo',
      primary: '#4338ca',
      critical: '#dc2626',
      highRisk: '#ea580c',
      watch: '#f59e0b',
      healthy: '#059669',
      commit: '#4338ca',
      upside: '#7c3aed',
      pipeline: '#64748b',
      closed: '#047857',
      bg: '#ffffff',
      text: '#1e1b4b',
      subtext: '#4338ca',
      border: '#c7d2fe',
      cardBg: '#eef2ff',
      grid: '#e0e7ff',
      zoneStalled: 'rgba(220, 38, 38, 0.07)',
      zoneFastTrack: 'rgba(5, 150, 105, 0.07)',
      zoneVelocity: 'rgba(67, 56, 202, 0.06)',
      zoneZombie: 'rgba(245, 158, 11, 0.07)'
    }
  };

  function resolveField(list, overrideVal, defaultIdx) {
    if (!list || list.length === 0) return null;
    if (overrideVal) {
      var trimmed = String(overrideVal).trim();
      var idx = parseInt(trimmed, 10);
      if (!isNaN(idx) && idx >= 1 && idx <= list.length) {
        return list[idx - 1];
      }
      for (var i = 0; i < list.length; i++) {
        if (list[i].name === trimmed || list[i].label === trimmed || list[i].label_short === trimmed) {
          return list[i];
        }
      }
    }
    if (defaultIdx >= 0 && defaultIdx < list.length) {
      return list[defaultIdx];
    }
    return list[0] || null;
  }

  function formatCurrency(val) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    var abs = Math.abs(val);
    var sign = val < 0 ? '-' : '';
    if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
    return sign + '$' + abs.toFixed(abs % 1 === 0 ? 0 : 2);
  }

  function formatPercent(val) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    var p = Math.abs(val) <= 1.0 ? val * 100 : val;
    return p.toFixed(1) + '%';
  }

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    switch (fmt) {
      case 'compact_currency':
        return formatCurrency(val);
      case 'percentage':
        return formatPercent(val);
      case 'compact_number':
        var abs = Math.abs(val);
        var sign = val < 0 ? '-' : '';
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + 'M';
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
        return sign + abs.toFixed(0);
      case 'decimal_2':
        return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'raw':
        return String(val);
      default:
        return formatCurrency(val);
    }
  }

  looker.plugins.visualizations.add({
    id: 'saas_pipeline_deal_inspection_matrix',
    label: 'SaaS Sales Pipeline Inspection & Deal Slippage Matrix',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 clean tabs)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'Layout Mode',
        display: 'select',
        values: [
          { '2D Deal Slippage & Velocity Quadrant': 'deal_slippage_quadrant' },
          { 'Stage Progression & Stagnation Waterfall': 'stage_stagnation_waterfall' },
          { 'Forecast Category × Risk Band Matrix': 'forecast_risk_cross_matrix' },
          { 'Executive Deal Inspection Scorecard Table': 'executive_deal_scorecard' }
        ],
        default: 'deal_slippage_quadrant',
        section: 'Display',
        order: 1
      },
      opportunityDimOverride: {
        type: 'string',
        label: 'Opportunity / Deal Dimension',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 2
      },
      stageDimOverride: {
        type: 'string',
        label: 'Sales Stage Dimension',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 3
      },
      forecastDimOverride: {
        type: 'string',
        label: 'Forecast Category Dimension',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 4
      },
      riskBandDimOverride: {
        type: 'string',
        label: 'Risk Band Dimension (Optional)',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 5
      },
      arrMeasureOverride: {
        type: 'string',
        label: 'Deal ARR ($) Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 6
      },
      riskScoreMeasureOverride: {
        type: 'string',
        label: 'Deal Risk Score (0-100) Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 7
      },
      stageDaysMeasureOverride: {
        type: 'string',
        label: 'Days in Stage Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 8
      },
      slipsMeasureOverride: {
        type: 'string',
        label: 'Close-Date Slip Count Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 9
      },
      targetCalculationMode: {
        type: 'string',
        label: 'Benchmark Crosshair Mode',
        display: 'select',
        values: [
          { 'Fixed Governance Thresholds (45 Days / $200K ARR)': 'fixed_threshold' },
          { 'Dataset Mean (Average Days in Stage & ARR)': 'dataset_mean' },
          { 'Dataset Median (Median Days in Stage & ARR)': 'dataset_median' },
          { 'P75 / Top Quartile Threshold': 'percentile_p75' },
          { 'None (Clean Scatter without Crosshairs)': 'none' }
        ],
        default: 'fixed_threshold',
        section: 'Display',
        order: 10
      },
      stageDaysBenchmark: {
        type: 'number',
        label: 'Target Days in Stage Threshold',
        default: 45,
        section: 'Display',
        order: 11
      },
      arrBenchmark: {
        type: 'number',
        label: 'Target ARR Threshold ($)',
        default: 200000,
        section: 'Display',
        order: 12
      },
      riskAlertThreshold: {
        type: 'number',
        label: 'Risk Score Alert Threshold (0-100)',
        default: 60,
        section: 'Display',
        order: 13
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Benchmark Reference Label Override',
        default: 'Velocity Benchmark',
        section: 'Display',
        order: 14
      },
      sortBy: {
        type: 'string',
        label: 'Deal Sort Order',
        display: 'select',
        values: [
          { 'Deal ARR (Largest First)': 'arr_desc' },
          { 'Risk Score (Highest First)': 'risk_desc' },
          { 'Days in Stage (Stalled First)': 'stage_days_desc' },
          { 'Slip Count (Most Slipped First)': 'slips_desc' },
          { 'Alphabetical by Opportunity': 'alphabetical' },
          { 'Natural Query Order': 'natural' }
        ],
        default: 'arr_desc',
        section: 'Display',
        order: 15
      },
      topNLimit: {
        type: 'number',
        label: 'Top-N Deals Display Limit (0 = All)',
        default: 0,
        section: 'Display',
        order: 16
      },
      enableOtherRollup: {
        type: 'boolean',
        label: 'Group Remaining into Other Rollup Summary',
        default: false,
        section: 'Display',
        order: 17
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Suppress Zero ARR / Closed Deals',
        default: true,
        section: 'Display',
        order: 18
      },
      hudMode: {
        type: 'string',
        label: 'Executive Pipeline HUD Mode',
        display: 'select',
        values: [
          { 'Full Scorecard HUD (Top Band)': 'scorecard' },
          { 'Compact Metric Strip': 'compact_strip' },
          { 'Hidden': 'hidden' }
        ],
        default: 'scorecard',
        section: 'Display',
        order: 19
      },
      labelDensity: {
        type: 'string',
        label: 'Deal Labels Density',
        display: 'select',
        values: [
          { 'Peaks & High-Risk Whales Only': 'peaks_only' },
          { 'Show All Labels': 'all' },
          { 'Hidden / Tooltip Only': 'hidden' }
        ],
        default: 'peaks_only',
        section: 'Display',
        order: 20
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Slicing & Filter Toolbar',
        default: true,
        section: 'Display',
        order: 21
      },
      customTitle: {
        type: 'string',
        label: 'Custom Title Override',
        default: '',
        section: 'Display',
        order: 22
      },
      customSubtitle: {
        type: 'string',
        label: 'Custom Subtitle Override',
        default: '',
        section: 'Display',
        order: 23
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorTheme: {
        type: 'string',
        label: 'Brand Palette Theme',
        display: 'select',
        values: [
          { 'Modern Slate (Executive Midnight)': 'modern_slate' },
          { 'Google Enterprise Blue': 'google_enterprise' },
          { 'Cyberpunk Dark (High Contrast)': 'cyberpunk_dark' },
          { 'Emerald FinOps (Green/Teal)': 'emerald_finops' },
          { 'Sunset Media (Warm Amber)': 'sunset_media' },
          { 'Executive Indigo (Deep Indigo)': 'executive_indigo' },
          { 'Custom Hex Override': 'custom_override' }
        ],
        default: 'modern_slate',
        section: 'Style',
        order: 1
      },
      customPrimaryHex: {
        type: 'string',
        label: 'Custom Primary Brand Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 2
      },
      customPositiveHex: {
        type: 'string',
        label: 'Custom Thriving / Fast Track Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 3
      },
      customNegativeHex: {
        type: 'string',
        label: 'Custom Stalled / Critical Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 4
      },
      customWarningHex: {
        type: 'string',
        label: 'Custom Watch / Slipping Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 5
      },
      metricPolarity: {
        type: 'string',
        label: 'Metric Polarity Direction',
        display: 'select',
        values: [
          { 'Lower Days in Stage is Better (Standard Velocity)': 'lower_is_better' },
          { 'Higher is Better': 'higher_is_better' }
        ],
        default: 'lower_is_better',
        section: 'Style',
        order: 6
      },
      bubbleMinRadius: {
        type: 'number',
        label: 'Quadrant Bubble Minimum Radius (px)',
        default: 6,
        section: 'Style',
        order: 7
      },
      bubbleMaxRadius: {
        type: 'number',
        label: 'Quadrant Bubble Maximum Radius (px)',
        default: 28,
        section: 'Style',
        order: 8
      },
      fontScale: {
        type: 'string',
        label: 'Typography Font Scale',
        display: 'select',
        values: [
          { 'Compact (High Density Dashboards)': 'compact' },
          { 'Standard (Default)': 'standard' },
          { 'Large Presentation (Wallboards)': 'large' }
        ],
        default: 'standard',
        section: 'Style',
        order: 9
      },
      valueFormat: {
        type: 'string',
        label: 'Metric Value Formatting Style',
        display: 'select',
        values: [
          { 'Compact Currency ($1.2M, $450K)': 'compact_currency' },
          { 'Standard Currency ($1,234,567)': 'currency' },
          { 'Compact Number (1.2M, 450K)': 'compact_number' },
          { 'Percentage (45.2%)': 'percentage' },
          { 'Decimal (1,234.56)': 'decimal_2' },
          { 'Raw Unformatted': 'raw' }
        ],
        default: 'compact_currency',
        section: 'Style',
        order: 10
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        opportunityDimOverride: { role: 'dimension', defaultIdx: 0 },
        stageDimOverride: { role: 'dimension', defaultIdx: 1 },
        forecastDimOverride: { role: 'dimension', defaultIdx: 2 },
        riskBandDimOverride: { role: 'dimension', defaultIdx: 3 },
        arrMeasureOverride: { role: 'measure', defaultIdx: 0 },
        riskScoreMeasureOverride: { role: 'measure', defaultIdx: 1 },
        stageDaysMeasureOverride: { role: 'measure', defaultIdx: 2 },
        slipsMeasureOverride: { role: 'measure', defaultIdx: 3 }
      };

      if (!queryResponse || !queryResponse.fields || typeof self.trigger !== 'function') return;
      var f = queryResponse.fields;
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (!meas.length && f.table_calculations && f.table_calculations.length) meas = f.table_calculations;

      var signature = dims.map(function (d) { return d.name; }).join('|') + '::' + meas.map(function (m) { return m.name; }).join('|');
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
        var list = spec.role === 'measure' ? meas : (spec.role === 'any' ? dims.concat(meas) : dims);
        var autoField = (spec.defaultIdx >= 0 && spec.defaultIdx < list.length) ? list[spec.defaultIdx] : null;
        var autoLabel = autoField ? 'Auto -> ' + fieldLabel(autoField) : (spec.defaultIdx === -1 ? 'Auto / None' : 'Auto (first available)');

        var choices = [{ [autoLabel]: '' }];
        var seen = {};
        list.forEach(function (fld) {
          var lbl = fieldLabel(fld);
          if (fld.name && !seen[fld.name]) {
            seen[fld.name] = true;
            choices.push({ [lbl]: fld.name });
          }
        });
        newOptions[key].values = choices;
        newOptions[key].default = '';
      });

      try {
        self.trigger('registerOptions', newOptions);
      } catch (e) {
        console.warn('[saas_pipeline_deal_inspection_matrix] registerOptions warning:', e);
      }
    },

    create: function (element, config) {
      element.innerHTML = '';
      element.style.boxSizing = 'border-box';
      element.style.overflow = 'hidden';
      element.style.padding = '0';
      element.style.margin = '0';

      this._container = document.createElement('div');
      this._container.className = 'looker-saas-deal-matrix-container';
      this._container.style.width = '100%';
      this._container.style.height = '100%';
      this._container.style.display = 'flex';
      this._container.style.flexDirection = 'column';
      this._container.style.overflow = 'hidden';
      this._container.style.boxSizing = 'border-box';
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      this.searchTerm = '';
      this.selectedStage = 'ALL';
      this.selectedForecast = 'ALL';
    },

    _setupResizeObserver: function (element) {
      var self = this;
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
      }
      var lastW = element.clientWidth;
      var lastH = element.clientHeight;
      var debounceTimer = null;

      this._resizeObserver = new ResizeObserver(function (entries) {
        if (!entries || entries.length === 0) return;
        var entry = entries[0];
        var newW = Math.round(entry.contentRect.width);
        var newH = Math.round(entry.contentRect.height);

        // Guard: ignore tiny sub-4px changes or zero dimensions
        if (Math.abs(newW - lastW) < 4 && Math.abs(newH - lastH) < 4) return;
        if (newW <= 0 || newH <= 0) return;

        lastW = newW;
        lastH = newH;

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          if (self._lastData && self._lastConfig && self._lastQueryResponse) {
            self.updateAsync(
              self._lastData,
              self._lastElement,
              self._lastConfig,
              self._lastQueryResponse,
              self._lastDetails,
              function () {}
            );
          }
        }, 120);
      });

      this._resizeObserver.observe(element);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      var self = this;
      this._registerDynamicFieldOptions(queryResponse);
      this._lastData = data;
      this._lastElement = element;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      if (!this._resizeObserver && element) {
        this._setupResizeObserver(element);
      }

      this.clearErrors();

      if (!data || data.length === 0) {
        this.addError({
          title: 'No Data',
          message: 'The query returned no results. Please select valid dimensions and measures.'
        });
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dims = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
      var meas = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
      if (!meas.length && fields.table_calculations && fields.table_calculations.length) meas = fields.table_calculations;

      if (dims.length === 0 || meas.length === 0) {
        this.addError({
          title: 'Incompatible Query',
          message: 'This visualization requires at least 1 Dimension (Opportunity / Deal Name) and 1 Measure (Deal ARR).'
        });
        done();
        return;
      }

      // Resolve field bindings
      var oppDim = resolveField(dims, config.opportunityDimOverride, 0);
      var stageDim = resolveField(dims, config.stageDimOverride, 1);
      var forecastDim = resolveField(dims, config.forecastDimOverride, 2);
      var riskBandDim = resolveField(dims, config.riskBandDimOverride, 3);

      var arrMeas = resolveField(meas, config.arrMeasureOverride, 0);
      var riskScoreMeas = resolveField(meas, config.riskScoreMeasureOverride, 1);
      var stageDaysMeas = resolveField(meas, config.stageDaysMeasureOverride, 2);
      var slipsMeas = resolveField(meas, config.slipsMeasureOverride, 3);

      ensureD3(function (d3) {
        try {
          self._renderAll(d3, data, config, {
            oppDim: oppDim,
            stageDim: stageDim,
            forecastDim: forecastDim,
            riskBandDim: riskBandDim,
            arrMeas: arrMeas,
            riskScoreMeas: riskScoreMeas,
            stageDaysMeas: stageDaysMeas,
            slipsMeas: slipsMeas
          });
          done();
        } catch (err) {
          console.error('[saas_pipeline_deal_inspection_matrix] Render error:', err);
          self.addError({
            title: 'Rendering Exception',
            message: err.message
          });
          done();
        }
      });
    },

    _renderAll: function (d3, rawData, config, fields) {
      var self = this;
      var container = this._container;
      container.innerHTML = '';

      var themeKey = config.colorTheme || 'modern_slate';
      var theme = PALETTES[themeKey] || PALETTES.modern_slate;

      if (themeKey === 'custom_override' || config.customPrimaryHex || config.customPositiveHex || config.customNegativeHex) {
        theme = Object.assign({}, theme);
        if (config.customPrimaryHex) theme.primary = config.customPrimaryHex;
        if (config.customPositiveHex) theme.healthy = config.customPositiveHex;
        if (config.customNegativeHex) theme.critical = config.customNegativeHex;
        if (config.customWarningHex) theme.watch = config.customWarningHex;
      }

      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      // Extract records
      var records = [];
      rawData.forEach(function (row, idx) {
        var oppVal = (fields.oppDim && row[fields.oppDim.name]) ? (row[fields.oppDim.name].rendered || row[fields.oppDim.name].value) : ('Deal #' + (idx + 1));
        var stageVal = (fields.stageDim && row[fields.stageDim.name]) ? String(row[fields.stageDim.name].rendered || row[fields.stageDim.name].value) : 'Pipeline';
        var forecastVal = (fields.forecastDim && row[fields.forecastDim.name]) ? String(row[fields.forecastDim.name].rendered || row[fields.forecastDim.name].value) : 'Pipeline';
        var riskBandVal = (fields.riskBandDim && row[fields.riskBandDim.name]) ? String(row[fields.riskBandDim.name].rendered || row[fields.riskBandDim.name].value) : 'Healthy';

        var arrVal = (fields.arrMeas && row[fields.arrMeas.name]) ? Number(row[fields.arrMeas.name].value) : 0;
        var riskScoreVal = (fields.riskScoreMeas && row[fields.riskScoreMeas.name]) ? Number(row[fields.riskScoreMeas.name].value) : 30;
        var stageDaysVal = (fields.stageDaysMeas && row[fields.stageDaysMeas.name]) ? Number(row[fields.stageDaysMeas.name].value) : 20;
        var slipsVal = (fields.slipsMeas && row[fields.slipsMeas.name]) ? Number(row[fields.slipsMeas.name].value) : 0;

        if (config.suppressZeroNull && (arrVal <= 0 || isNaN(arrVal))) return;

        records.push({
          id: idx,
          name: String(oppVal),
          stage: stageVal,
          forecast: forecastVal,
          riskBand: riskBandVal,
          arr: isNaN(arrVal) ? 0 : arrVal,
          riskScore: isNaN(riskScoreVal) ? 30 : riskScoreVal,
          stageDays: isNaN(stageDaysVal) ? 20 : stageDaysVal,
          slips: isNaN(slipsVal) ? 0 : slipsVal,
          rawRow: row
        });
      });

      // Filter by search term
      var filtered = records;
      if (self.searchTerm) {
        var term = self.searchTerm.toLowerCase();
        filtered = filtered.filter(function (r) {
          return r.name.toLowerCase().indexOf(term) !== -1 ||
                 r.stage.toLowerCase().indexOf(term) !== -1 ||
                 r.forecast.toLowerCase().indexOf(term) !== -1;
        });
      }

      // Filter by selected stage
      if (self.selectedStage && self.selectedStage !== 'ALL') {
        filtered = filtered.filter(function (r) {
          return r.stage === self.selectedStage;
        });
      }

      // Filter by selected forecast category
      if (self.selectedForecast && self.selectedForecast !== 'ALL') {
        filtered = filtered.filter(function (r) {
          return r.forecast === self.selectedForecast;
        });
      }

      // Sorting
      var sortBy = config.sortBy || 'arr_desc';
      if (sortBy === 'arr_desc') {
        filtered.sort(function (a, b) { return b.arr - a.arr; });
      } else if (sortBy === 'risk_desc') {
        filtered.sort(function (a, b) { return b.riskScore - a.riskScore; });
      } else if (sortBy === 'stage_days_desc') {
        filtered.sort(function (a, b) { return b.stageDays - a.stageDays; });
      } else if (sortBy === 'slips_desc') {
        filtered.sort(function (a, b) { return b.slips - a.slips; });
      } else if (sortBy === 'alphabetical') {
        filtered.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }

      // Top-N Limiting & Other Rollup
      var topN = Number(config.topNLimit) || 0;
      if (topN > 0 && filtered.length > topN) {
        if (config.enableOtherRollup) {
          var topSlice = filtered.slice(0, topN);
          var otherSlice = filtered.slice(topN);
          var otherArr = 0;
          var otherRisk = 0;
          var otherDays = 0;
          var otherSlips = 0;
          otherSlice.forEach(function (r) {
            otherArr += r.arr;
            otherRisk += r.riskScore;
            otherDays += r.stageDays;
            otherSlips += r.slips;
          });
          topSlice.push({
            id: 99999,
            name: 'Other Deals (' + otherSlice.length + ')',
            stage: 'Multiple',
            forecast: 'Pipeline',
            riskBand: 'Watchlist',
            arr: otherArr,
            riskScore: otherRisk / (otherSlice.length || 1),
            stageDays: Math.round(otherDays / (otherSlice.length || 1)),
            slips: Math.round(otherSlips / (otherSlice.length || 1)),
            rawRow: otherSlice[0].rawRow,
            isOtherRollup: true
          });
          filtered = topSlice;
        } else {
          filtered = filtered.slice(0, topN);
        }
      }

      // Aggregate Pipeline KPI Metrics
      var totalArr = 0;
      var totalDeals = records.length;
      var stalledWhaleArr = 0;
      var questionableCommitArr = 0;
      var sumDays = 0;
      var sumRisk = 0;

      records.forEach(function (r) {
        totalArr += r.arr;
        sumDays += r.stageDays;
        sumRisk += r.riskScore;

        // Stalled whale: ARR > $200k & stageDays > 45
        if (r.arr >= 200000 && r.stageDays >= 45) {
          stalledWhaleArr += r.arr;
        }

        // Questionable commit: forecast contains commit/forecast and riskScore >= 60
        var fNorm = r.forecast.toLowerCase();
        if ((fNorm.indexOf('commit') !== -1 || fNorm.indexOf('forecast') !== -1) && (r.riskScore >= 60 || r.riskBand.toLowerCase().indexOf('high') !== -1)) {
          questionableCommitArr += r.arr;
        }
      });

      var avgDays = totalDeals > 0 ? Math.round(sumDays / totalDeals) : 0;
      var avgRisk = totalDeals > 0 ? (sumRisk / totalDeals).toFixed(1) : '0';

      // 1. Top Header Toolbar
      if (config.showSearch !== false) {
        self._renderToolbar(container, theme, config, records, fields);
      }

      // 2. Executive Pipeline HUD Scorecard
      if (config.hudMode !== 'hidden') {
        self._renderHud(container, theme, config, {
          totalArr: totalArr,
          totalDeals: totalDeals,
          stalledWhaleArr: stalledWhaleArr,
          questionableCommitArr: questionableCommitArr,
          avgDays: avgDays,
          avgRisk: avgRisk
        });
      }

      // 3. Main Chart Canvas Area
      var mainArea = document.createElement('div');
      mainArea.className = 'saas-deal-main-area';
      mainArea.style.flex = '1';
      mainArea.style.minHeight = '0';
      mainArea.style.width = '100%';
      mainArea.style.position = 'relative';
      mainArea.style.overflow = 'hidden';
      container.appendChild(mainArea);

      var mode = config.layoutMode || 'deal_slippage_quadrant';
      if (mode === 'stage_stagnation_waterfall') {
        self._renderWaterfall(d3, mainArea, filtered, theme, config, fields);
      } else if (mode === 'forecast_risk_cross_matrix') {
        self._renderCrossMatrix(d3, mainArea, filtered, theme, config, fields);
      } else if (mode === 'executive_deal_scorecard') {
        self._renderScorecard(mainArea, filtered, theme, config, fields);
      } else {
        self._renderQuadrant(d3, mainArea, filtered, theme, config, fields);
      }
    },

    _renderToolbar: function (container, theme, config, records, fields) {
      var self = this;
      var tb = document.createElement('div');
      tb.className = 'saas-deal-toolbar';
      tb.style.display = 'flex';
      tb.style.alignItems = 'center';
      tb.style.justifyContent = 'space-between';
      tb.style.padding = '8px 14px';
      tb.style.borderBottom = '1px solid ' + theme.border;
      tb.style.backgroundColor = theme.cardBg;
      tb.style.gap = '12px';
      tb.style.flexWrap = 'wrap';

      // Left: Title & Subtitle
      var titleBox = document.createElement('div');
      titleBox.style.display = 'flex';
      titleBox.style.flexDirection = 'column';

      var defaultTitle = 'SaaS Pipeline Inspection & Deal Slippage Matrix';
      var titleText = config.customTitle || defaultTitle;
      var titleSpan = document.createElement('span');
      titleSpan.style.fontSize = '14px';
      titleSpan.style.fontWeight = '700';
      titleSpan.style.color = theme.text;
      titleSpan.textContent = titleText;
      titleBox.appendChild(titleSpan);

      var defaultSub = 'Deal velocity, stage stagnation, and slippage risk audit • ' + records.length + ' Active Opportunities';
      var subText = config.customSubtitle || defaultSub;
      var subSpan = document.createElement('span');
      subSpan.style.fontSize = '11px';
      subSpan.style.color = theme.subtext;
      subSpan.textContent = subText;
      titleBox.appendChild(subSpan);

      tb.appendChild(titleBox);

      // Right: Controls (Stage Slicer + Search Input)
      var ctrlBox = document.createElement('div');
      ctrlBox.style.display = 'flex';
      ctrlBox.style.alignItems = 'center';
      ctrlBox.style.gap = '8px';

      // Stage Filter Dropdown
      var stages = ['ALL'];
      var seenStages = {};
      records.forEach(function (r) {
        if (r.stage && !seenStages[r.stage]) {
          seenStages[r.stage] = true;
          stages.push(r.stage);
        }
      });

      var stageSelect = document.createElement('select');
      stageSelect.style.fontSize = '11px';
      stageSelect.style.padding = '4px 8px';
      stageSelect.style.borderRadius = '4px';
      stageSelect.style.border = '1px solid ' + theme.border;
      stageSelect.style.backgroundColor = theme.bg;
      stageSelect.style.color = theme.text;
      stageSelect.style.cursor = 'pointer';

      stages.forEach(function (st) {
        var opt = document.createElement('option');
        opt.value = st;
        opt.textContent = st === 'ALL' ? 'All Stages' : st;
        if (st === self.selectedStage) opt.selected = true;
        stageSelect.appendChild(opt);
      });

      stageSelect.addEventListener('change', function () {
        self.selectedStage = this.value;
        if (self._lastData) {
          self.updateAsync(self._lastData, self._lastElement, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
        }
      });
      ctrlBox.appendChild(stageSelect);

      // Search Box
      var searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search opportunity...';
      searchInput.value = self.searchTerm || '';
      searchInput.style.fontSize = '11px';
      searchInput.style.padding = '4px 8px';
      searchInput.style.borderRadius = '4px';
      searchInput.style.border = '1px solid ' + theme.border;
      searchInput.style.backgroundColor = theme.bg;
      searchInput.style.color = theme.text;
      searchInput.style.width = '140px';

      searchInput.addEventListener('input', function () {
        self.searchTerm = this.value;
        if (self._searchTimeout) clearTimeout(self._searchTimeout);
        self._searchTimeout = setTimeout(function () {
          if (self._lastData) {
            self.updateAsync(self._lastData, self._lastElement, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
          }
        }, 200);
      });
      ctrlBox.appendChild(searchInput);

      tb.appendChild(ctrlBox);
      container.appendChild(tb);
    },

    _renderHud: function (container, theme, config, metrics) {
      var hud = document.createElement('div');
      hud.className = 'saas-deal-hud';
      hud.style.display = 'grid';
      hud.style.gridTemplateColumns = 'repeat(auto-fit, minmax(160px, 1fr))';
      hud.style.gap = '10px';
      hud.style.padding = config.hudMode === 'compact_strip' ? '6px 14px' : '10px 14px';
      hud.style.borderBottom = '1px solid ' + theme.border;
      hud.style.backgroundColor = theme.cardBg;

      var cards = [
        { label: 'Total Open Pipeline', value: formatCurrency(metrics.totalArr), sub: metrics.totalDeals + ' Opportunities', color: theme.primary },
        { label: 'Stalled Whale ARR', value: formatCurrency(metrics.stalledWhaleArr), sub: 'ARR >$200K & Age >45d', color: theme.critical },
        { label: 'Questionable Commit ARR', value: formatCurrency(metrics.questionableCommitArr), sub: 'Forecast Commit w/ Risk', color: theme.highRisk },
        { label: 'Avg Days in Stage', value: metrics.avgDays + ' Days', sub: 'Target <= 45 Days', color: metrics.avgDays > 45 ? theme.watch : theme.healthy },
        { label: 'Pipeline Risk Index', value: metrics.avgRisk + ' / 100', sub: 'Composite Risk Score', color: Number(metrics.avgRisk) > 50 ? theme.critical : theme.healthy }
      ];

      cards.forEach(function (c) {
        var card = document.createElement('div');
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.padding = config.hudMode === 'compact_strip' ? '4px 8px' : '6px 10px';
        card.style.backgroundColor = theme.bg;
        card.style.borderRadius = '6px';
        card.style.border = '1px solid ' + theme.border;

        var lbl = document.createElement('span');
        lbl.style.fontSize = '10px';
        lbl.style.fontWeight = '600';
        lbl.style.color = theme.subtext;
        lbl.textContent = c.label.toUpperCase();
        card.appendChild(lbl);

        var val = document.createElement('span');
        val.style.fontSize = config.hudMode === 'compact_strip' ? '15px' : '18px';
        val.style.fontWeight = '800';
        val.style.color = c.color;
        val.textContent = c.value;
        card.appendChild(val);

        var sub = document.createElement('span');
        sub.style.fontSize = '10px';
        sub.style.color = theme.subtext;
        sub.textContent = c.sub;
        card.appendChild(sub);

        hud.appendChild(card);
      });

      container.appendChild(hud);
    },

    // ==============================================================
    // MODE 1: 2D Strategic Deal Velocity & Slippage Quadrant
    // ==============================================================
    _renderQuadrant: function (d3, targetElem, data, theme, config, fields) {
      var self = this;
      var w = targetElem.clientWidth || 900;
      var h = targetElem.clientHeight || 500;
      var margin = { top: 30, right: 35, bottom: 45, left: 65 };

      var svg = d3.select(targetElem)
        .append('svg')
        .attr('width', w)
        .attr('height', h)
        .style('display', 'block');

      var plotW = Math.max(10, w - margin.left - margin.right);
      var plotH = Math.max(10, h - margin.top - margin.bottom);

      var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // Benchmarks
      var stageDaysThreshold = Number(config.stageDaysBenchmark) || 45;
      var arrThreshold = Number(config.arrBenchmark) || 200000;

      if (config.targetCalculationMode === 'dataset_mean' && data.length > 0) {
        stageDaysThreshold = d3.mean(data, function (d) { return d.stageDays; }) || stageDaysThreshold;
        arrThreshold = d3.mean(data, function (d) { return d.arr; }) || arrThreshold;
      } else if (config.targetCalculationMode === 'dataset_median' && data.length > 0) {
        stageDaysThreshold = d3.median(data, function (d) { return d.stageDays; }) || stageDaysThreshold;
        arrThreshold = d3.median(data, function (d) { return d.arr; }) || arrThreshold;
      } else if (config.targetCalculationMode === 'percentile_p75' && data.length > 0) {
        stageDaysThreshold = d3.quantile(data.map(function (d) { return d.stageDays; }).sort(d3.ascending), 0.75) || stageDaysThreshold;
        arrThreshold = d3.quantile(data.map(function (d) { return d.arr; }).sort(d3.ascending), 0.75) || arrThreshold;
      }

      // X-Scale: Days in Stage
      var maxDays = d3.max(data, function (d) { return d.stageDays; }) || 90;
      maxDays = Math.max(maxDays * 1.08, stageDaysThreshold * 1.25, 60);

      var xScale = d3.scaleLinear()
        .domain([0, maxDays])
        .range([0, plotW]);

      // Y-Scale: Deal ARR
      var maxArr = d3.max(data, function (d) { return d.arr; }) || 500000;
      maxArr = Math.max(maxArr * 1.12, arrThreshold * 1.3, 100000);

      var yScale = d3.scaleLinear()
        .domain([0, maxArr])
        .range([plotH, 0]);

      // Bubble Size: Risk Score (or ARR)
      var minR = Number(config.bubbleMinRadius) || 6;
      var maxR = Number(config.bubbleMaxRadius) || 28;
      var rScale = d3.scaleSqrt()
        .domain([0, 100])
        .range([minR, maxR]);

      // Crosshair coordinates
      var cx = xScale(stageDaysThreshold);
      var cy = yScale(arrThreshold);

      // Render 4 Quadrant Backgrounds
      if (config.targetCalculationMode !== 'none') {
        // Top-Left: Fast-Track Whales (Low days, High ARR)
        g.append('rect')
          .attr('x', 0).attr('y', 0)
          .attr('width', Math.max(0, cx)).attr('height', Math.max(0, cy))
          .attr('fill', theme.zoneFastTrack);
        g.append('text')
          .attr('x', 12).attr('y', 20)
          .attr('fill', theme.healthy)
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .text('⚡ FAST-TRACK WHALES');

        // Top-Right: Stalled Whale Commits (High days, High ARR)
        g.append('rect')
          .attr('x', cx).attr('y', 0)
          .attr('width', Math.max(0, plotW - cx)).attr('height', Math.max(0, cy))
          .attr('fill', theme.zoneStalled);
        g.append('text')
          .attr('x', plotW - 12).attr('y', 20)
          .attr('text-anchor', 'end')
          .attr('fill', theme.critical)
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .text('🚨 STALLED WHALE COMMITS (CRO INTERVENTION)');

        // Bottom-Left: High Velocity Flow (Low days, Standard ARR)
        g.append('rect')
          .attr('x', 0).attr('y', cy)
          .attr('width', Math.max(0, cx)).attr('height', Math.max(0, plotH - cy))
          .attr('fill', theme.zoneVelocity);
        g.append('text')
          .attr('x', 12).attr('y', plotH - 12)
          .attr('fill', theme.commit)
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .text('🚀 HIGH VELOCITY RUN-RATE');

        // Bottom-Right: Drifting / Zombie Pipeline (High days, Low ARR)
        g.append('rect')
          .attr('x', cx).attr('y', cy)
          .attr('width', Math.max(0, plotW - cx)).attr('height', Math.max(0, plotH - cy))
          .attr('fill', theme.zoneZombie);
        g.append('text')
          .attr('x', plotW - 12).attr('y', plotH - 12)
          .attr('text-anchor', 'end')
          .attr('fill', theme.watch)
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .text('⚠️ DRIFTING / ZOMBIE PIPELINE');

        // Crosshair Benchmark Lines
        g.append('line')
          .attr('x1', cx).attr('y1', 0)
          .attr('x2', cx).attr('y2', plotH)
          .attr('stroke', theme.border)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,4');

        g.append('line')
          .attr('x1', 0).attr('y1', cy)
          .attr('x2', plotW).attr('y2', cy)
          .attr('stroke', theme.border)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,4');

        // Benchmark Pill Badges
        g.append('text')
          .attr('x', cx + 6).attr('y', plotH - 6)
          .attr('fill', theme.subtext)
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .text('Velocity Gate: ' + Math.round(stageDaysThreshold) + 'd');

        g.append('text')
          .attr('x', 6).attr('y', cy - 6)
          .attr('fill', theme.subtext)
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .text('ARR Benchmark: ' + formatCurrency(arrThreshold));
      }

      // X and Y Axes
      var xAxis = d3.axisBottom(xScale)
        .ticks(Math.max(4, Math.floor(plotW / 90)))
        .tickFormat(function (d) { return d + 'd'; });

      var yAxis = d3.axisLeft(yScale)
        .ticks(Math.max(4, Math.floor(plotH / 50)))
        .tickFormat(function (d) { return formatCurrency(d); });

      g.append('g')
        .attr('transform', 'translate(0,' + plotH + ')')
        .call(xAxis)
        .call(function (axis) {
          axis.select('.domain').attr('stroke', theme.border);
          axis.selectAll('.tick line').attr('stroke', theme.grid);
          axis.selectAll('.tick text').attr('fill', theme.subtext).attr('font-size', '10px');
        });

      g.append('g')
        .call(yAxis)
        .call(function (axis) {
          axis.select('.domain').attr('stroke', theme.border);
          axis.selectAll('.tick line').attr('stroke', theme.grid);
          axis.selectAll('.tick text').attr('fill', theme.subtext).attr('font-size', '10px');
        });

      // Axis Labels
      g.append('text')
        .attr('x', plotW / 2).attr('y', plotH + 36)
        .attr('text-anchor', 'middle')
        .attr('fill', theme.subtext)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text('Days in Current Sales Stage (Stage Age)');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -plotH / 2).attr('y', -48)
        .attr('text-anchor', 'middle')
        .attr('fill', theme.subtext)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text('Opportunity ARR ($)');

      // Color mapper based on forecast / risk band
      function getBubbleColor(d) {
        var f = d.forecast.toLowerCase();
        var rb = d.riskBand.toLowerCase();
        if (d.riskScore >= 70 || rb.indexOf('high') !== -1 || rb.indexOf('critical') !== -1) {
          return theme.critical;
        }
        if (f.indexOf('commit') !== -1 || f.indexOf('forecast') !== -1) {
          return theme.commit;
        }
        if (f.indexOf('upside') !== -1) {
          return theme.upside;
        }
        if (rb.indexOf('watch') !== -1) {
          return theme.watch;
        }
        return theme.healthy;
      }

      // Tooltip Element
      var tooltip = d3.select(targetElem)
        .append('div')
        .style('position', 'absolute')
        .style('display', 'none')
        .style('padding', '8px 12px')
        .style('background', theme.isDark ? '#1e293b' : '#0f172a')
        .style('color', '#ffffff')
        .style('border-radius', '6px')
        .style('box-shadow', '0 4px 14px rgba(0,0,0,0.25)')
        .style('font-size', '11px')
        .style('pointer-events', 'none')
        .style('z-index', '100');

      // Render Opportunity Bubbles
      var bubbles = g.selectAll('.deal-bubble')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'deal-bubble')
        .attr('transform', function (d) {
          return 'translate(' + xScale(d.stageDays) + ',' + yScale(d.arr) + ')';
        })
        .style('cursor', 'pointer');

      bubbles.append('circle')
        .attr('r', function (d) { return rScale(d.riskScore); })
        .attr('fill', function (d) { return getBubbleColor(d); })
        .attr('fill-opacity', 0.72)
        .attr('stroke', function (d) { return getBubbleColor(d); })
        .attr('stroke-width', 2);

      // Value / Name Labels
      if (config.labelDensity !== 'hidden') {
        bubbles.append('text')
          .attr('x', 0)
          .attr('y', function (d) { return -rScale(d.riskScore) - 4; })
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .attr('fill', theme.text)
          .text(function (d) {
            if (config.labelDensity === 'peaks_only') {
              if (d.arr < arrThreshold && d.riskScore < 60) return '';
            }
            var shortName = d.name.length > 20 ? d.name.substring(0, 18) + '…' : d.name;
            return shortName;
          });
      }

      // Bubble Hover & Click (Looker Drill-Down)
      bubbles
        .on('mouseenter', function (event, d) {
          d3.select(this).select('circle')
            .attr('fill-opacity', 0.95)
            .attr('stroke-width', 3);

          var html = '<strong>' + d.name + '</strong><br/>' +
            'Stage: <em>' + d.stage + '</em> | Forecast: <strong>' + d.forecast + '</strong><br/>' +
            'ARR: <strong>' + formatCurrency(d.arr) + '</strong><br/>' +
            'Days in Stage: <strong>' + d.stageDays + ' days</strong><br/>' +
            'Close-Date Slips: <strong>' + d.slips + '</strong><br/>' +
            'Risk Score: <strong>' + d.riskScore + ' / 100</strong> (' + d.riskBand + ')';

          tooltip.html(html)
            .style('display', 'block')
            .style('left', (event.offsetX + 15) + 'px')
            .style('top', (event.offsetY - 20) + 'px');
        })
        .on('mousemove', function (event) {
          tooltip
            .style('left', (event.offsetX + 15) + 'px')
            .style('top', (event.offsetY - 20) + 'px');
        })
        .on('mouseleave', function () {
          d3.select(this).select('circle')
            .attr('fill-opacity', 0.72)
            .attr('stroke-width', 2);
          tooltip.style('display', 'none');
        })
        .on('click', function (event, d) {
          if (window.LookerCharts && window.LookerCharts.Utils && typeof window.LookerCharts.Utils.openDrillMenu === 'function') {
            window.LookerCharts.Utils.openDrillMenu({
              links: (d.rawRow && fields.oppDim && d.rawRow[fields.oppDim.name] && d.rawRow[fields.oppDim.name].links) || [],
              event: event
            });
          }
        });
    },

    // ==============================================================
    // MODE 2: Stage Progression & Stagnation Waterfall
    // ==============================================================
    _renderWaterfall: function (d3, targetElem, data, theme, config, fields) {
      var self = this;
      var w = targetElem.clientWidth || 900;
      var h = targetElem.clientHeight || 500;
      var margin = { top: 30, right: 30, bottom: 40, left: 60 };

      var svg = d3.select(targetElem)
        .append('svg')
        .attr('width', w)
        .attr('height', h)
        .style('display', 'block');

      var plotW = Math.max(10, w - margin.left - margin.right);
      var plotH = Math.max(10, h - margin.top - margin.bottom);

      var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // Canonical B2B Sales Stages
      var stageOrder = ['Qualified', 'Discovery', 'In Trial', 'Solution Validation', 'Negotiation', 'Closed Won'];
      var stageBuckets = {};

      stageOrder.forEach(function (st) {
        stageBuckets[st] = { stage: st, deals: [], arr: 0, daysSum: 0 };
      });

      // Populate stages
      data.forEach(function (d) {
        var matched = 'Qualified';
        for (var i = 0; i < stageOrder.length; i++) {
          if (d.stage.toLowerCase().indexOf(stageOrder[i].toLowerCase()) !== -1) {
            matched = stageOrder[i];
            break;
          }
        }
        if (!stageBuckets[matched]) {
          stageBuckets[matched] = { stage: matched, deals: [], arr: 0, daysSum: 0 };
        }
        stageBuckets[matched].deals.push(d);
        stageBuckets[matched].arr += d.arr;
        stageBuckets[matched].daysSum += d.stageDays;
      });

      var activeStages = stageOrder.filter(function (st) {
        return stageBuckets[st] && stageBuckets[st].deals.length > 0;
      });
      if (activeStages.length === 0) activeStages = Object.keys(stageBuckets);

      var xScale = d3.scaleBand()
        .domain(activeStages)
        .range([0, plotW])
        .padding(0.28);

      var maxStageArr = d3.max(activeStages, function (st) { return stageBuckets[st].arr; }) || 100000;
      var yScale = d3.scaleLinear()
        .domain([0, maxStageArr * 1.15])
        .range([plotH, 0]);

      // Axes
      g.append('g')
        .attr('transform', 'translate(0,' + plotH + ')')
        .call(d3.axisBottom(xScale))
        .call(function (axis) {
          axis.select('.domain').attr('stroke', theme.border);
          axis.selectAll('.tick line').remove();
          axis.selectAll('.tick text').attr('fill', theme.text).attr('font-size', '11px').attr('font-weight', '600');
        });

      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(function (d) { return formatCurrency(d); }))
        .call(function (axis) {
          axis.select('.domain').attr('stroke', theme.border);
          axis.selectAll('.tick line').attr('stroke', theme.grid);
          axis.selectAll('.tick text').attr('fill', theme.subtext).attr('font-size', '10px');
        });

      // Stacked Risk Tiers inside each stage column
      activeStages.forEach(function (st) {
        var bucket = stageBuckets[st];
        var x = xScale(st);
        var bw = xScale.bandwidth();

        // Categorize deals into risk bands: Healthy (<30d), Watch (30-60d), Stalled (>60d)
        var healthyArr = 0;
        var watchArr = 0;
        var stalledArr = 0;

        bucket.deals.forEach(function (d) {
          if (d.stageDays > 60 || d.riskScore >= 70) stalledArr += d.arr;
          else if (d.stageDays > 30 || d.riskScore >= 45) watchArr += d.arr;
          else healthyArr += d.arr;
        });

        var currY = plotH;

        // Healthy Tier
        if (healthyArr > 0) {
          var hH = plotH - yScale(healthyArr);
          currY -= hH;
          g.append('rect')
            .attr('x', x).attr('y', currY)
            .attr('width', bw).attr('height', hH)
            .attr('fill', theme.healthy)
            .attr('rx', 2);
        }

        // Watch Tier
        if (watchArr > 0) {
          var wH = plotH - yScale(watchArr);
          currY -= wH;
          g.append('rect')
            .attr('x', x).attr('y', currY)
            .attr('width', bw).attr('height', wH)
            .attr('fill', theme.watch)
            .attr('rx', 2);
        }

        // Stalled Tier
        if (stalledArr > 0) {
          var sH = plotH - yScale(stalledArr);
          currY -= sH;
          g.append('rect')
            .attr('x', x).attr('y', currY)
            .attr('width', bw).attr('height', sH)
            .attr('fill', theme.critical)
            .attr('rx', 2);
        }

        // Summary Text on top of column
        var topY = yScale(bucket.arr);
        g.append('text')
          .attr('x', x + bw / 2).attr('y', topY - 14)
          .attr('text-anchor', 'middle')
          .attr('fill', theme.text)
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .text(formatCurrency(bucket.arr));

        var avgStageDays = bucket.deals.length > 0 ? Math.round(bucket.daysSum / bucket.deals.length) : 0;
        g.append('text')
          .attr('x', x + bw / 2).attr('y', topY - 3)
          .attr('text-anchor', 'middle')
          .attr('fill', avgStageDays > 45 ? theme.critical : theme.subtext)
          .attr('font-size', '9px')
          .attr('font-weight', '600')
          .text(bucket.deals.length + ' deals • ' + avgStageDays + 'd avg');
      });

      // Legend for Risk Tiers
      var leg = g.append('g').attr('transform', 'translate(' + (plotW - 240) + ', -15)');
      var legItems = [
        { label: 'Healthy (<30d)', color: theme.healthy },
        { label: 'Watch (30-60d)', color: theme.watch },
        { label: 'Stalled (>60d)', color: theme.critical }
      ];
      legItems.forEach(function (it, idx) {
        var ig = leg.append('g').attr('transform', 'translate(' + (idx * 80) + ', 0)');
        ig.append('rect').attr('width', 10).attr('height', 10).attr('fill', it.color).attr('rx', 2);
        ig.append('text').attr('x', 14).attr('y', 9).attr('fill', theme.subtext).attr('font-size', '9px').text(it.label);
      });
    },

    // ==============================================================
    // MODE 3: Forecast Category × Risk Band Matrix
    // ==============================================================
    _renderCrossMatrix: function (d3, targetElem, data, theme, config, fields) {
      var self = this;
      var w = targetElem.clientWidth || 900;
      var h = targetElem.clientHeight || 500;
      var margin = { top: 35, right: 25, bottom: 25, left: 110 };

      var svg = d3.select(targetElem)
        .append('svg')
        .attr('width', w)
        .attr('height', h)
        .style('display', 'block');

      var plotW = Math.max(10, w - margin.left - margin.right);
      var plotH = Math.max(10, h - margin.top - margin.bottom);

      var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var forecasts = ['Forecast (Commit)', 'Upside', 'Pipeline'];
      var riskBands = ['Healthy', 'Watchlist', 'High Risk', 'Critical'];

      var matrix = {};
      forecasts.forEach(function (f) {
        matrix[f] = {};
        riskBands.forEach(function (rb) {
          matrix[f][rb] = { arr: 0, count: 0, deals: [] };
        });
      });

      var grandTotalArr = 0;
      data.forEach(function (d) {
        grandTotalArr += d.arr;
        var fKey = 'Pipeline';
        var fLow = d.forecast.toLowerCase();
        if (fLow.indexOf('commit') !== -1 || fLow.indexOf('forecast') !== -1) fKey = 'Forecast (Commit)';
        else if (fLow.indexOf('upside') !== -1) fKey = 'Upside';

        var rKey = 'Healthy';
        var rLow = d.riskBand.toLowerCase();
        if (rLow.indexOf('crit') !== -1 || d.riskScore >= 75) rKey = 'Critical';
        else if (rLow.indexOf('high') !== -1 || d.riskScore >= 60) rKey = 'High Risk';
        else if (rLow.indexOf('watch') !== -1 || d.riskScore >= 40) rKey = 'Watchlist';

        if (matrix[fKey] && matrix[fKey][rKey]) {
          matrix[fKey][rKey].arr += d.arr;
          matrix[fKey][rKey].count++;
          matrix[fKey][rKey].deals.push(d);
        }
      });

      var xScale = d3.scaleBand()
        .domain(riskBands)
        .range([0, plotW])
        .padding(0.08);

      var yScale = d3.scaleBand()
        .domain(forecasts)
        .range([0, plotH])
        .padding(0.08);

      // Render Matrix Cells
      forecasts.forEach(function (f) {
        riskBands.forEach(function (rb) {
          var cell = matrix[f][rb];
          var x = xScale(rb);
          var y = yScale(f);
          var cw = xScale.bandwidth();
          var ch = yScale.bandwidth();

          var isQuestionableCommit = (f === 'Forecast (Commit)' && (rb === 'High Risk' || rb === 'Critical') && cell.count > 0);

          var cellBg = theme.cardBg;
          var borderColor = theme.border;
          if (isQuestionableCommit) {
            cellBg = theme.zoneStalled;
            borderColor = theme.critical;
          } else if (rb === 'Healthy') {
            cellBg = theme.zoneFastTrack;
          }

          var cellG = g.append('g')
            .attr('transform', 'translate(' + x + ',' + y + ')')
            .style('cursor', 'pointer');

          cellG.append('rect')
            .attr('width', cw).attr('height', ch)
            .attr('fill', cellBg)
            .attr('stroke', borderColor)
            .attr('stroke-width', isQuestionableCommit ? 2 : 1)
            .attr('rx', 6);

          if (isQuestionableCommit) {
            cellG.append('text')
              .attr('x', cw - 8).attr('y', 14)
              .attr('text-anchor', 'end')
              .attr('fill', theme.critical)
              .attr('font-size', '10px')
              .attr('font-weight', '800')
              .text('⚠️ QUESTIONABLE COMMIT');
          }

          // ARR Value
          cellG.append('text')
            .attr('x', cw / 2).attr('y', ch / 2 - 4)
            .attr('text-anchor', 'middle')
            .attr('fill', isQuestionableCommit ? theme.critical : theme.text)
            .attr('font-size', '16px')
            .attr('font-weight', '800')
            .text(formatCurrency(cell.arr));

          // Deal count and % share
          var sharePct = grandTotalArr > 0 ? ((cell.arr / grandTotalArr) * 100).toFixed(1) : '0';
          cellG.append('text')
            .attr('x', cw / 2).attr('y', ch / 2 + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', theme.subtext)
            .attr('font-size', '11px')
            .text(cell.count + ' deals (' + sharePct + '% of Pipeline)');
        });
      });

      // Axis Labels
      g.append('g')
        .call(d3.axisLeft(yScale))
        .call(function (axis) {
          axis.select('.domain').remove();
          axis.selectAll('.tick line').remove();
          axis.selectAll('.tick text').attr('fill', theme.text).attr('font-size', '11px').attr('font-weight', '700');
        });

      g.append('g')
        .attr('transform', 'translate(0, -6)')
        .call(d3.axisTop(xScale))
        .call(function (axis) {
          axis.select('.domain').remove();
          axis.selectAll('.tick line').remove();
          axis.selectAll('.tick text').attr('fill', theme.text).attr('font-size', '11px').attr('font-weight', '700');
        });
    },

    // ==============================================================
    // MODE 4: High-Density Executive Deal Inspection Scorecard Table
    // ==============================================================
    _renderScorecard: function (targetElem, data, theme, config, fields) {
      var self = this;
      var wrap = document.createElement('div');
      wrap.className = 'saas-deal-scorecard-wrap';
      wrap.style.width = '100%';
      wrap.style.height = '100%';
      wrap.style.overflow = 'auto';

      var table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '11px';
      table.style.color = theme.text;

      // Table Header
      var thead = document.createElement('thead');
      thead.style.position = 'sticky';
      thead.style.top = '0';
      thead.style.backgroundColor = theme.cardBg;
      thead.style.borderBottom = '2px solid ' + theme.border;
      thead.style.zIndex = '10';

      var headerRow = document.createElement('tr');
      var cols = [
        'Opportunity Name',
        'Stage',
        'Forecast Category',
        'Risk Band',
        'Deal ARR ($)',
        'Risk Score',
        'Days in Stage',
        'Slips',
        'Action Recommendation'
      ];

      cols.forEach(function (colName) {
        var th = document.createElement('th');
        th.style.padding = '8px 10px';
        th.style.textAlign = (colName === 'Deal ARR ($)' || colName === 'Risk Score' || colName === 'Days in Stage' || colName === 'Slips') ? 'right' : 'left';
        th.style.fontWeight = '700';
        th.style.color = theme.subtext;
        th.textContent = colName;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Table Body
      var tbody = document.createElement('tbody');
      data.forEach(function (d, idx) {
        var tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid ' + theme.border;
        tr.style.backgroundColor = idx % 2 === 0 ? theme.bg : theme.cardBg;
        tr.style.cursor = 'pointer';

        // Hover highlight
        tr.addEventListener('mouseenter', function () {
          this.style.backgroundColor = theme.isDark ? '#1e293b' : '#f1f5f9';
        });
        tr.addEventListener('mouseleave', function () {
          this.style.backgroundColor = idx % 2 === 0 ? theme.bg : theme.cardBg;
        });

        // Click handler for Looker drill-down menu
        tr.addEventListener('click', function (event) {
          if (window.LookerCharts && window.LookerCharts.Utils && typeof window.LookerCharts.Utils.openDrillMenu === 'function') {
            window.LookerCharts.Utils.openDrillMenu({
              links: (d.rawRow && fields.oppDim && d.rawRow[fields.oppDim.name] && d.rawRow[fields.oppDim.name].links) || [],
              event: event
            });
          }
        });

        // 1. Opportunity Name
        var tdName = document.createElement('td');
        tdName.style.padding = '7px 10px';
        tdName.style.fontWeight = '600';
        tdName.textContent = d.name;
        tr.appendChild(tdName);

        // 2. Stage
        var tdStage = document.createElement('td');
        tdStage.style.padding = '7px 10px';
        tdStage.textContent = d.stage;
        tr.appendChild(tdStage);

        // 3. Forecast
        var tdForecast = document.createElement('td');
        tdForecast.style.padding = '7px 10px';
        var fPill = document.createElement('span');
        fPill.style.padding = '2px 6px';
        fPill.style.borderRadius = '4px';
        fPill.style.fontSize = '10px';
        fPill.style.fontWeight = '600';
        if (d.forecast.toLowerCase().indexOf('commit') !== -1 || d.forecast.toLowerCase().indexOf('forecast') !== -1) {
          fPill.style.backgroundColor = 'rgba(37, 99, 235, 0.12)';
          fPill.style.color = theme.commit;
        } else {
          fPill.style.backgroundColor = 'rgba(100, 116, 139, 0.12)';
          fPill.style.color = theme.pipeline;
        }
        fPill.textContent = d.forecast;
        tdForecast.appendChild(fPill);
        tr.appendChild(tdForecast);

        // 4. Risk Band
        var tdRisk = document.createElement('td');
        tdRisk.style.padding = '7px 10px';
        var rPill = document.createElement('span');
        rPill.style.padding = '2px 6px';
        rPill.style.borderRadius = '4px';
        rPill.style.fontSize = '10px';
        rPill.style.fontWeight = '700';
        if (d.riskBand.toLowerCase().indexOf('crit') !== -1 || d.riskScore >= 70) {
          rPill.style.backgroundColor = 'rgba(239, 68, 68, 0.14)';
          rPill.style.color = theme.critical;
        } else if (d.riskBand.toLowerCase().indexOf('high') !== -1 || d.riskScore >= 50) {
          rPill.style.backgroundColor = 'rgba(249, 115, 22, 0.14)';
          rPill.style.color = theme.highRisk;
        } else {
          rPill.style.backgroundColor = 'rgba(16, 185, 129, 0.14)';
          rPill.style.color = theme.healthy;
        }
        rPill.textContent = d.riskBand;
        tdRisk.appendChild(rPill);
        tr.appendChild(tdRisk);

        // 5. ARR
        var tdArr = document.createElement('td');
        tdArr.style.padding = '7px 10px';
        tdArr.style.textAlign = 'right';
        tdArr.style.fontWeight = '700';
        tdArr.textContent = formatCurrency(d.arr);
        tr.appendChild(tdArr);

        // 6. Risk Score
        var tdScore = document.createElement('td');
        tdScore.style.padding = '7px 10px';
        tdScore.style.textAlign = 'right';
        tdScore.style.fontWeight = '600';
        tdScore.textContent = d.riskScore + ' / 100';
        tr.appendChild(tdScore);

        // 7. Days in Stage
        var tdDays = document.createElement('td');
        tdDays.style.padding = '7px 10px';
        tdDays.style.textAlign = 'right';
        tdDays.style.color = d.stageDays > 45 ? theme.critical : theme.text;
        tdDays.style.fontWeight = d.stageDays > 45 ? '700' : 'normal';
        tdDays.textContent = d.stageDays + 'd';
        tr.appendChild(tdDays);

        // 8. Slips
        var tdSlips = document.createElement('td');
        tdSlips.style.padding = '7px 10px';
        tdSlips.style.textAlign = 'right';
        tdSlips.textContent = d.slips;
        tr.appendChild(tdSlips);

        // 9. Action Recommendation Badge
        var tdAction = document.createElement('td');
        tdAction.style.padding = '7px 10px';
        var actionText = 'Maintain Cadence';
        var actionColor = theme.healthy;
        if (d.arr >= 200000 && d.stageDays >= 45) {
          actionText = '🚨 Executive Sponsor Audit';
          actionColor = theme.critical;
        } else if (d.slips >= 3) {
          actionText = '⚠️ Re-qualify Close Date';
          actionColor = theme.watch;
        } else if (d.riskScore >= 65) {
          actionText = 'Multi-thread Contacts';
          actionColor = theme.highRisk;
        } else if (d.arr >= 200000 && d.stageDays <= 30) {
          actionText = '⚡ Accelerate Procurement';
          actionColor = theme.commit;
        }
        var actSpan = document.createElement('span');
        actSpan.style.fontSize = '10px';
        actSpan.style.fontWeight = '600';
        actSpan.style.color = actionColor;
        actSpan.textContent = actionText;
        tdAction.appendChild(actSpan);
        tr.appendChild(tdAction);

        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      targetElem.appendChild(wrap);
    }
  });
})();
