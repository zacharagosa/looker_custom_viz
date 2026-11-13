/**
 * SaaS Deal Velocity & Stage Slippage Matrix
 * Google Cloud Looker Custom Visualization
 * Built with D3.js v7
 *
 * Designed for B2B SaaS Executive Leadership, CROs, VPs of Sales, and RevOps analytics.
 * Solves Buganizer Cloud Blockers b/419284729, b/398701962, and b/520494850.
 *
 * 4 Multi-Modal Layout Modes:
 * 1. velocity_stage_matrix (Default): Stage progression board across sales cycle stages,
 *    showing deal volume, stage velocity (Days in Stage vs SLA threshold), close-date slips,
 *    and risk distributions.
 * 2. stage_aging_quadrant: Days in Stage (X-axis) vs Open ARR (Y-axis) interactive scatter plot
 *    with risk quadrants, identifying stalled commitments ("Danger Zone").
 * 3. slippage_waterfall: Revenue progression waterfall decomposing pipeline ARR into
 *    on-track, slipped, and high-risk deals across stages.
 * 4. forecast_category_cross_matrix: Cross-tabulation heatmap matrix comparing Sales Stage vs
 *    Forecast Category (Pipeline, Upside, Forecast/Commit, Omitted) to expose stale commits.
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
    slate: {
      name: 'Modern Slate',
      primary: '#0f172a',
      accent: '#2563eb',
      onTrack: '#10b981',
      warning: '#f59e0b',
      alert: '#ef4444',
      bg: '#ffffff',
      cardBg: '#f8fafc',
      border: '#e2e8f0',
      text: '#0f172a',
      subtext: '#64748b',
      grid: '#f1f5f9',
      isDark: false
    },
    indigo_enterprise: {
      name: 'Enterprise Indigo',
      primary: '#4338ca',
      accent: '#6366f1',
      onTrack: '#059669',
      warning: '#d97706',
      alert: '#e11d48',
      bg: '#ffffff',
      cardBg: '#f5f3ff',
      border: '#ddd6fe',
      text: '#1e1b4b',
      subtext: '#6b7280',
      grid: '#ede9fe',
      isDark: false
    },
    google_enterprise: {
      name: 'Google Enterprise Blue',
      primary: '#1a73e8',
      accent: '#4285f4',
      onTrack: '#1e8e3e',
      warning: '#f9ab00',
      alert: '#d93025',
      bg: '#ffffff',
      cardBg: '#f8f9fa',
      border: '#dadce0',
      text: '#202124',
      subtext: '#5f6368',
      grid: '#e8eaed',
      isDark: false
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Neon Dark',
      primary: '#06b6d4',
      accent: '#a855f7',
      onTrack: '#10b981',
      warning: '#f59e0b',
      alert: '#f43f5e',
      bg: '#0f172a',
      cardBg: '#1e293b',
      border: '#334155',
      text: '#f8fafc',
      subtext: '#94a3b8',
      grid: '#1e293b',
      isDark: true
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      primary: '#047857',
      accent: '#10b981',
      onTrack: '#059669',
      warning: '#d97706',
      alert: '#dc2626',
      bg: '#ffffff',
      cardBg: '#f0fdf4',
      border: '#bbf7d0',
      text: '#064e3b',
      subtext: '#047857',
      grid: '#dcfce7',
      isDark: false
    },
    sunset_ember: {
      name: 'Sunset Ember',
      primary: '#c2410c',
      accent: '#ea580c',
      onTrack: '#16a34a',
      warning: '#f59e0b',
      alert: '#dc2626',
      bg: '#ffffff',
      cardBg: '#fff7ed',
      border: '#fed7aa',
      text: '#431407',
      subtext: '#9a3412',
      grid: '#ffedd5',
      isDark: false
    },
    wellverse_healthcare: {
      name: 'Wellverse Healthcare',
      primary: '#143359',
      accent: '#00af68',
      onTrack: '#00af68',
      warning: '#e69500',
      alert: '#dc2626',
      bg: '#ffffff',
      cardBg: '#f8fafc',
      border: '#e2e8f0',
      text: '#143359',
      subtext: '#64748b',
      grid: '#f1f5f9',
      isDark: false
    }
  };

  function formatValue(val, formatType) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    var abs = Math.abs(val);
    var sign = val < 0 ? '-' : '';

    if (formatType === 'compact_currency') {
      if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
      if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
      if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
      return sign + '$' + Math.round(abs).toLocaleString();
    }
    if (formatType === 'compact_number') {
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + 'B';
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + 'M';
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
      return sign + Math.round(abs).toLocaleString();
    }
    if (formatType === 'percentage') {
      var pctVal = abs <= 1.0 ? val * 100 : val;
      return pctVal.toFixed(1) + '%';
    }
    if (formatType === 'decimal_2') {
      return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (formatType === 'raw') {
      return String(val);
    }
    // Auto
    if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
    return sign + Math.round(abs).toLocaleString();
  }

  var visObject = {
    id: 'saas_deal_velocity_slippage_matrix',
    label: 'SaaS Deal Velocity & Stage Slippage Matrix',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'Visual Paradigm Layout',
        display: 'select',
        values: [
          { 'Stage Progression & Velocity Matrix (Default)': 'velocity_stage_matrix' },
          { 'Days in Stage vs ARR Risk Quadrant': 'stage_aging_quadrant' },
          { 'Revenue Slippage & Health Waterfall': 'slippage_waterfall' },
          { 'Stage vs Forecast Category Cross-Matrix': 'forecast_category_cross_matrix' }
        ],
        default: 'velocity_stage_matrix',
        section: 'Display',
        order: 1
      },
      stageDimOverride: {
        type: 'string',
        label: 'Sales Stage Dimension',
        display: 'select',
        values: [{ 'Auto (run query to populate choices)': '' }],
        default: '',
        section: 'Display',
        order: 2
      },
      categoryDimOverride: {
        type: 'string',
        label: 'Forecast Category / Risk Dimension',
        display: 'select',
        values: [{ 'Auto (run query to populate choices)': '' }],
        default: '',
        section: 'Display',
        order: 3
      },
      arrMeasureOverride: {
        type: 'string',
        label: 'Pipeline ARR Measure',
        display: 'select',
        values: [{ 'Auto (run query to populate choices)': '' }],
        default: '',
        section: 'Display',
        order: 4
      },
      daysMeasureOverride: {
        type: 'string',
        label: 'Days in Stage (Velocity) Measure',
        display: 'select',
        values: [{ 'Auto (run query to populate choices)': '' }],
        default: '',
        section: 'Display',
        order: 5
      },
      slipsMeasureOverride: {
        type: 'string',
        label: 'Close-Date Slips Measure',
        display: 'select',
        values: [{ 'Auto (run query to populate choices)': '' }],
        default: '',
        section: 'Display',
        order: 6
      },
      riskMeasureOverride: {
        type: 'string',
        label: 'Deal Risk Score Measure (Optional)',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 7
      },
      targetMeasureOverride: {
        type: 'string',
        label: 'Target / SLA Measure (Optional)',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 8
      },
      targetMode: {
        type: 'string',
        label: 'Velocity SLA Reference Mode',
        display: 'select',
        values: [
          { 'Fixed Static SLA Target': 'fixed_value' },
          { 'Target Measure Column': 'measure_column' },
          { 'Dataset Mean Duration': 'dataset_mean' },
          { 'Dataset Median Duration': 'dataset_median' },
          { 'Top Percentile P75 Benchmark': 'percentile_p75' },
          { 'Top Percentile P90 Benchmark': 'percentile_p90' },
          { 'Hidden / None': 'none' }
        ],
        default: 'fixed_value',
        section: 'Display',
        order: 9
      },
      targetValue: {
        type: 'number',
        label: 'Velocity SLA Target (Days in Stage)',
        default: 60,
        section: 'Display',
        order: 10
      },
      referenceLineLabel: {
        type: 'string',
        label: 'SLA Benchmark Label',
        default: 'Velocity SLA Threshold (60d)',
        section: 'Display',
        order: 11
      },
      alertThresholdPct: {
        type: 'number',
        label: 'Stall Alert Threshold (% Over SLA)',
        default: 20,
        section: 'Display',
        order: 12
      },
      sortBy: {
        type: 'string',
        label: 'Stage / Card Sort Order',
        display: 'select',
        values: [
          { 'Pipeline ARR Descending': 'metric_desc' },
          { 'Pipeline ARR Ascending': 'metric_asc' },
          { 'Stage Name Alphabetical': 'alphabetical' },
          { 'Natural Sales Stage Flow': 'natural_stage' }
        ],
        default: 'metric_desc',
        section: 'Display',
        order: 13
      },
      topNLimit: {
        type: 'number',
        label: 'Top-N Stages Limit (0 = All)',
        default: 0,
        section: 'Display',
        order: 14
      },
      enableOtherRollup: {
        type: 'boolean',
        label: "Rollup Unselected Stages into '(Other Stages)'",
        default: true,
        section: 'Display',
        order: 15
      },
      suppressNulls: {
        type: 'boolean',
        label: 'Suppress Null & Zero Pipeline Rows',
        default: true,
        section: 'Display',
        order: 16
      },
      hudMode: {
        type: 'string',
        label: 'Executive Scorecard HUD Mode',
        display: 'select',
        values: [
          { 'Full Scorecard HUD': 'scorecard' },
          { 'Compact Metric Strip': 'compact_strip' },
          { 'Hidden': 'hidden' }
        ],
        default: 'scorecard',
        section: 'Display',
        order: 17
      },
      labelDensity: {
        type: 'string',
        label: 'Data Label Density',
        display: 'select',
        values: [
          { 'All Values & Percentages': 'all' },
          { 'Major Outliers & Peaks Only': 'peaks_only' },
          { 'Hidden / Hover Tooltips Only': 'hidden' }
        ],
        default: 'all',
        section: 'Display',
        order: 18
      },
      customTitle: {
        type: 'string',
        label: 'Custom Chart Title Override',
        default: '',
        section: 'Display',
        order: 19
      },
      customSubtitle: {
        type: 'string',
        label: 'Custom Subtitle Override',
        default: '',
        section: 'Display',
        order: 20
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Interactive Search / Filter Bar',
        default: true,
        section: 'Display',
        order: 21
      },
      showLegend: {
        type: 'boolean',
        label: 'Show Legend & Status Guide',
        default: true,
        section: 'Display',
        order: 22
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs)
      // ==========================================
      colorPalette: {
        type: 'string',
        label: 'Executive Brand Palette',
        display: 'select',
        values: [
          { 'Modern Slate (Default)': 'slate' },
          { 'Enterprise Royal Indigo': 'indigo_enterprise' },
          { 'Google Enterprise Blue': 'google_enterprise' },
          { 'Cyberpunk Neon Dark': 'cyberpunk_dark' },
          { 'Emerald FinOps': 'emerald_finops' },
          { 'Sunset Ember': 'sunset_ember' },
          { 'Wellverse Healthcare': 'wellverse_healthcare' },
          { 'Custom Hex Override': 'custom_override' }
        ],
        default: 'slate',
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
        label: 'Custom On-Track / Safe Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 3
      },
      customNegativeHex: {
        type: 'string',
        label: 'Custom High-Risk / Alert Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 4
      },
      metricPolarity: {
        type: 'string',
        label: 'Metric Velocity Polarity',
        display: 'select',
        values: [
          { 'Lower Days/Slips is Better (Standard Sales Ops)': 'lower_is_better' },
          { 'Higher is Better': 'higher_is_better' }
        ],
        default: 'lower_is_better',
        section: 'Style',
        order: 5
      },
      fontScale: {
        type: 'string',
        label: 'Typography Font Scale',
        display: 'select',
        values: [
          { 'Compact (High Density Grid)': 'compact' },
          { 'Standard (Default)': 'standard' },
          { 'Large Presentation': 'large' }
        ],
        default: 'standard',
        section: 'Style',
        order: 6
      },
      valueFormat: {
        type: 'string',
        label: 'Currency & Number Format',
        display: 'select',
        values: [
          { 'Compact Currency ($1.2M, $450K)': 'compact_currency' },
          { 'Compact Number (1.2M, 450K)': 'compact_number' },
          { 'Percentage (45.2%)': 'percentage' },
          { 'Decimal (1,234.56)': 'decimal_2' },
          { 'Raw Numbers': 'raw' }
        ],
        default: 'compact_currency',
        section: 'Style',
        order: 7
      }
    },

    // ------------------------------------------------------------------
    // Dynamic Field-Role Selectors
    // ------------------------------------------------------------------
    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        stageDimOverride: { role: 'dimension', defaultIdx: 0 },
        categoryDimOverride: { role: 'dimension', defaultIdx: 1 },
        arrMeasureOverride: { role: 'measure', defaultIdx: 0 },
        daysMeasureOverride: { role: 'measure', defaultIdx: 1 },
        slipsMeasureOverride: { role: 'measure', defaultIdx: 2 },
        riskMeasureOverride: { role: 'measure', defaultIdx: 3 },
        targetMeasureOverride: { role: 'measure', defaultIdx: -1 }
      };
      if (!queryResponse || !queryResponse.fields || typeof self.trigger !== 'function') return;
      var f = queryResponse.fields;
      var dims = f.dimensions && f.dimensions.length ? f.dimensions : f.dimension_like || [];
      var meas = f.measures && f.measures.length ? f.measures : f.measure_like || [];
      if (!meas.length && f.table_calculations && f.table_calculations.length) meas = f.table_calculations;

      var signature =
        dims.map(function (d) { return d.name; }).join('|') + '::' +
        meas.map(function (m) { return m.name; }).join('|');
      if (self._dynamicFieldSignature === signature) return;
      self._dynamicFieldSignature = signature;

      if (!self._baseOptions) self._baseOptions = self.options || {};
      var newOptions = {};
      Object.keys(self._baseOptions).forEach(function (k) {
        newOptions[k] = Object.assign({}, self._baseOptions[k]);
      });

      function fieldLabel(fld) {
        return fld.label || fld.label_short || fld.name;
      }

      Object.keys(FIELD_ROLE_OPTIONS).forEach(function (key) {
        var spec = FIELD_ROLE_OPTIONS[key];
        if (!newOptions[key]) return;
        var list = spec.role === 'measure' ? meas : spec.role === 'any' ? dims.concat(meas) : dims;
        var autoField = spec.defaultIdx >= 0 && spec.defaultIdx < list.length ? list[spec.defaultIdx] : null;
        var autoLabel = autoField ? 'Auto \u2192 ' + fieldLabel(autoField) : 'Auto / None';
        var values = [];
        var autoEntry = {};
        autoEntry[autoLabel] = '';
        values.push(autoEntry);
        var seen = {};
        list.forEach(function (fld) {
          var lbl = fieldLabel(fld);
          if (seen[lbl]) lbl = lbl + ' (' + fld.name + ')';
          seen[lbl] = true;
          var entry = {};
          entry[lbl] = fld.name;
          values.push(entry);
        });
        newOptions[key].type = 'string';
        newOptions[key].display = 'select';
        newOptions[key].values = values;
        newOptions[key].default = '';
      });

      try {
        self.trigger('registerOptions', newOptions);
      } catch (e) {
        console.warn('registerOptions unavailable:', e);
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
      root.className = 'saas-velocity-root';
      root.style.width = '100%';
      root.style.height = '100%';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      root.style.boxSizing = 'border-box';
      root.style.overflow = 'hidden';
      element.appendChild(root);

      var tooltip = document.createElement('div');
      tooltip.className = 'saas-velocity-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.padding = '10px 14px';
      tooltip.style.background = 'rgba(15, 23, 42, 0.96)';
      tooltip.style.backdropFilter = 'blur(6px)';
      tooltip.style.color = '#ffffff';
      tooltip.style.borderRadius = '8px';
      tooltip.style.fontSize = '12px';
      tooltip.style.fontWeight = '500';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.display = 'none';
      tooltip.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
      tooltip.style.zIndex = '99999';
      tooltip.style.border = '1px solid rgba(255,255,255,0.12)';
      document.body.appendChild(tooltip);
      element._velocityTooltip = tooltip;

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

      if (self._resizeTimer) clearTimeout(self._resizeTimer);
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
      this._registerDynamicFieldOptions(queryResponse);
      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

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
      var root = element.querySelector('.saas-velocity-root');
      var tooltip = element._velocityTooltip;
      if (!root) {
        if (typeof done === 'function') done();
        return;
      }
      root.innerHTML = '';

      if (!data || data.length === 0) {
        if (this.addError) {
          this.addError({
            title: 'No Pipeline Data',
            message: 'The query returned no open pipeline deals to inspect.'
          });
        }
        if (typeof done === 'function') done();
        return;
      }

      var fields = queryResponse.fields;
      var dimensions = fields.dimensions || [];
      var measures = fields.measures || [];
      if (dimensions.length === 0) {
        if (this.addError) {
          this.addError({
            title: 'Stage Dimension Required',
            message: 'Please add a Stage dimension (e.g. Stage Name) to group pipeline velocity.'
          });
        }
        if (typeof done === 'function') done();
        return;
      }

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
        return (defaultIdx >= 0 && defaultIdx < list.length) ? list[defaultIdx] : (list[0] || null);
      }

      var stageDim = resolveField(dimensions, config.stageDimOverride, 0);
      var categoryDim = dimensions.length > 1 ? resolveField(dimensions, config.categoryDimOverride, 1) : null;

      var arrMeas = resolveField(measures, config.arrMeasureOverride, 0);
      var daysMeas = measures.length > 1 ? resolveField(measures, config.daysMeasureOverride, 1) : null;
      var slipsMeas = measures.length > 2 ? resolveField(measures, config.slipsMeasureOverride, 2) : null;
      var riskMeas = measures.length > 3 ? resolveField(measures, config.riskMeasureOverride, 3) : null;

      // Theme Colors
      var paletteKey = config.colorPalette || 'slate';
      var theme = PALETTES[paletteKey] || PALETTES.slate;
      var primaryColor = config.customPrimaryHex || theme.primary;
      var onTrackColor = config.customPositiveHex || theme.onTrack;
      var alertColor = config.customNegativeHex || theme.alert;
      var warningColor = theme.warning;
      var valueFmt = config.valueFormat || 'compact_currency';

      // ------------------------------------------------------------------
      // Stage Aggregation & Velocity Computation
      // ------------------------------------------------------------------
      var stageMap = {};
      var stageOrder = [];
      var totalOpenArr = 0;
      var totalDeals = 0;
      var sumDays = 0;
      var countDays = 0;
      var sumSlips = 0;
      var countSlips = 0;
      var totalHighRiskArr = 0;

      data.forEach(function (row) {
        var stageName = (stageDim && row[stageDim.name] && row[stageDim.name].value !== null) ? String(row[stageDim.name].value).trim() : 'Unknown Stage';
        var catName = (categoryDim && row[categoryDim.name] && row[categoryDim.name].value !== null) ? String(row[categoryDim.name].value).trim() : 'All Categories';

        var arrVal = (arrMeas && row[arrMeas.name] && row[arrMeas.name].value !== null) ? Number(row[arrMeas.name].value) : 0;
        var daysVal = (daysMeas && row[daysMeas.name] && row[daysMeas.name].value !== null) ? Number(row[daysMeas.name].value) : 0;
        var slipsVal = (slipsMeas && row[slipsMeas.name] && row[slipsMeas.name].value !== null) ? Number(row[slipsMeas.name].value) : 0;
        var riskVal = (riskMeas && row[riskMeas.name] && row[riskMeas.name].value !== null) ? Number(row[riskMeas.name].value) : 0;

        if (config.suppressNulls && arrVal === 0 && daysVal === 0) return;

        if (!stageMap[stageName]) {
          stageMap[stageName] = {
            stage: stageName,
            totalArr: 0,
            dealCount: 0,
            weightedDays: 0,
            weightedSlips: 0,
            avgRiskScore: 0,
            riskSum: 0,
            categories: {},
            drillLinks: (arrMeas && row[arrMeas.name] && row[arrMeas.name].links) || (stageDim && row[stageDim.name] && row[stageDim.name].links) || []
          };
          stageOrder.push(stageName);
        }

        var sObj = stageMap[stageName];
        sObj.totalArr += arrVal;
        sObj.dealCount += 1;
        sObj.weightedDays += (daysVal * Math.max(1, arrVal));
        sObj.weightedSlips += slipsVal;
        sObj.riskSum += riskVal;

        if (!sObj.categories[catName]) {
          sObj.categories[catName] = { name: catName, arr: 0, deals: 0, days: daysVal };
        }
        sObj.categories[catName].arr += arrVal;
        sObj.categories[catName].deals += 1;

        totalOpenArr += arrVal;
        totalDeals += 1;
        sumDays += daysVal;
        countDays++;
        sumSlips += slipsVal;
        countSlips++;
        if (riskVal > 60 || catName.toLowerCase().indexOf('high') !== -1) {
          totalHighRiskArr += arrVal;
        }
      });

      var stages = stageOrder.map(function (sName) {
        var s = stageMap[sName];
        var avgDays = s.totalArr > 0 ? (s.weightedDays / s.totalArr) : 0;
        var avgSlips = s.dealCount > 0 ? (s.weightedSlips / s.dealCount) : 0;
        var avgRisk = s.dealCount > 0 ? (s.riskSum / s.dealCount) : 0;
        return {
          stage: s.stage,
          arr: s.totalArr,
          deals: s.dealCount,
          avgDays: Math.round(avgDays),
          avgSlips: Number(avgSlips.toFixed(1)),
          avgRisk: Math.round(avgRisk),
          categories: Object.keys(s.categories).map(function (cKey) { return s.categories[cKey]; }),
          drillLinks: s.drillLinks
        };
      });

      // Target SLA calculation
      var targetMode = config.targetMode || 'fixed_value';
      var allDays = stages.map(function (s) { return s.avgDays; });
      var sortedDays = allDays.slice().sort(function (a, b) { return a - b; });
      var slaDays = Number(config.targetValue) || 60;
      if (targetMode === 'dataset_mean') {
        slaDays = countDays > 0 ? Math.round(sumDays / countDays) : 60;
      } else if (targetMode === 'dataset_median') {
        slaDays = sortedDays.length > 0 ? sortedDays[Math.floor(sortedDays.length / 2)] : 60;
      } else if (targetMode === 'percentile_p75') {
        slaDays = sortedDays.length > 0 ? sortedDays[Math.floor(sortedDays.length * 0.75)] : 60;
      } else if (targetMode === 'percentile_p90') {
        slaDays = sortedDays.length > 0 ? sortedDays[Math.floor(sortedDays.length * 0.90)] : 90;
      }

      var alertThreshold = Number(config.alertThresholdPct) || 20;
      var stalledStageCount = 0;
      stages.forEach(function (s) {
        s.isStalled = (s.avgDays > slaDays * (1 + alertThreshold / 100));
        if (s.isStalled) stalledStageCount++;
      });

      // Sorting
      var sortBy = config.sortBy || 'metric_desc';
      if (sortBy === 'metric_desc') {
        stages.sort(function (a, b) { return b.arr - a.arr; });
      } else if (sortBy === 'metric_asc') {
        stages.sort(function (a, b) { return a.arr - b.arr; });
      } else if (sortBy === 'alphabetical') {
        stages.sort(function (a, b) { return a.stage.localeCompare(b.stage); });
      } else if (sortBy === 'natural_stage') {
        var stageRank = { 'lead': 1, 'qual': 2, 'dev': 3, 'trial': 4, 'proof': 4, 'poc': 4, 'prop': 5, 'quote': 5, 'neg': 6, 'commit': 7, 'clos': 7, 'won': 8 };
        stages.sort(function (a, b) {
          var getRank = function (str) {
            var l = str.toLowerCase();
            for (var k in stageRank) { if (l.indexOf(k) !== -1) return stageRank[k]; }
            return 99;
          };
          return getRank(a.stage) - getRank(b.stage);
        });
      }

      // Top-N
      var topN = parseInt(config.topNLimit, 10) || 0;
      if (topN > 0 && stages.length > topN) {
        if (config.enableOtherRollup) {
          var kept = stages.slice(0, topN);
          var otherSlice = stages.slice(topN);
          var otherArr = otherSlice.reduce(function (acc, s) { return acc + s.arr; }, 0);
          var otherDeals = otherSlice.reduce(function (acc, s) { return acc + s.deals; }, 0);
          var otherDays = Math.round(otherSlice.reduce(function (acc, s) { return acc + s.avgDays; }, 0) / otherSlice.length);
          var otherSlips = Number((otherSlice.reduce(function (acc, s) { return acc + s.avgSlips; }, 0) / otherSlice.length).toFixed(1));
          kept.push({
            stage: '(Other ' + otherSlice.length + ' Stages)',
            arr: otherArr,
            deals: otherDeals,
            avgDays: otherDays,
            avgSlips: otherSlips,
            avgRisk: 50,
            categories: [],
            isStalled: otherDays > slaDays,
            drillLinks: []
          });
          stages = kept;
        } else {
          stages = stages.slice(0, topN);
        }
      }

      var avgVelocityDays = countDays > 0 ? Math.round(sumDays / countDays) : 0;
      var avgSlipsOverall = countSlips > 0 ? Number((sumSlips / countSlips).toFixed(1)) : 0;
      var highRiskPct = totalOpenArr > 0 ? Math.round((totalHighRiskArr / totalOpenArr) * 100) : 0;

      // ------------------------------------------------------------------
      // HUD & Header Bar
      // ------------------------------------------------------------------
      var hudMode = config.hudMode || 'scorecard';
      if (hudMode !== 'hidden') {
        var hud = document.createElement('div');
        hud.className = 'saas-velocity-hud';
        hud.style.width = '100%';
        hud.style.display = 'flex';
        hud.style.flexWrap = 'wrap';
        hud.style.alignItems = 'center';
        hud.style.justifyContent = 'space-between';
        hud.style.padding = hudMode === 'compact_strip' ? '6px 14px' : '10px 18px';
        hud.style.backgroundColor = hudMode === 'compact_strip' ? theme.cardBg : (theme.isDark ? '#1e293b' : '#f8fafc');
        hud.style.borderBottom = '1px solid ' + theme.border;
        hud.style.gap = '14px';
        hud.style.flexShrink = '0';

        var fontScale = config.fontScale || 'standard';
        var valFontSize = fontScale === 'compact' ? '13px' : (fontScale === 'large' ? '18px' : '15px');
        var mainTitle = config.customTitle ? String(config.customTitle).trim() : 'Sales Cycle Deal Velocity & Stage Dwell Time';
        var subTitle = config.customSubtitle ? String(config.customSubtitle).trim() : '';

        var hudHtml = '<div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;">';
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:' + theme.subtext + ';font-weight:700;letter-spacing:0.5px;">RevOps Intelligence</span>' +
          '<span style="font-size:' + valFontSize + ';font-weight:700;color:' + theme.text + ';">' + mainTitle + '</span>' +
          (subTitle ? '<span style="font-size:11px;color:' + theme.subtext + ';margin-top:1px;">' + subTitle + '</span>' : '') +
          '</div>';

        // Total ARR
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:' + theme.subtext + ';font-weight:600;">Active Pipeline ARR</span>' +
          '<span style="font-size:' + valFontSize + ';font-weight:700;color:' + primaryColor + ';">' + formatValue(totalOpenArr, valueFmt) + '</span>' +
          '</div>';

        // Stage Velocity
        var velColor = avgVelocityDays <= slaDays ? onTrackColor : warningColor;
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:' + theme.subtext + ';font-weight:600;">Avg Stage Velocity</span>' +
          '<span style="font-size:' + valFontSize + ';font-weight:700;color:' + velColor + ';">' + avgVelocityDays + ' Days</span>' +
          '</div>';

        // Slips
        var slipColor = avgSlipsOverall < 2.5 ? onTrackColor : alertColor;
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:' + theme.subtext + ';font-weight:600;">Avg Close-Date Slips</span>' +
          '<span style="font-size:' + valFontSize + ';font-weight:700;color:' + slipColor + ';">' + avgSlipsOverall + ' Slips</span>' +
          '</div>';

        // SLA Chip
        if (targetMode !== 'none') {
          hudHtml += '<div style="display:flex;flex-direction:column;">' +
            '<span style="font-size:10px;text-transform:uppercase;color:#d97706;font-weight:600;">' + (config.referenceLineLabel || 'Velocity SLA') + '</span>' +
            '<span style="font-size:' + valFontSize + ';font-weight:700;color:#b45309;">' + slaDays + ' Days</span>' +
            '</div>';
        }

        // Stalled Stage Warning Pill
        if (stalledStageCount > 0) {
          hudHtml += '<div style="background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;padding:4px 9px;border-radius:6px;font-size:11px;font-weight:700;display:flex;align-items:center;gap:4px;">' +
            '<span>⚠️ ' + stalledStageCount + ' Stalled Stage' + (stalledStageCount > 1 ? 's' : '') + ' (&gt;' + alertThreshold + '% SLA)</span>' +
            '</div>';
        }

        hudHtml += '</div>';

        if (config.showSearch) {
          hudHtml += '<div style="display:flex;align-items:center;">' +
            '<input type="text" class="saas-velocity-search" placeholder="Search stage or deal..." style="padding:5px 10px;font-size:11px;border:1px solid ' + theme.border + ';border-radius:6px;outline:none;width:150px;background:' + theme.bg + ';color:' + theme.text + ';" />' +
            '</div>';
        }

        hud.innerHTML = hudHtml;
        root.appendChild(hud);

        if (config.showSearch) {
          var searchInput = hud.querySelector('.saas-velocity-search');
          if (searchInput) {
            searchInput.addEventListener('input', function (e) {
              var q = e.target.value.toLowerCase().trim();
              var cards = root.querySelectorAll('.velocity-card, .scatter-bubble, .waterfall-bar, .cross-cell');
              cards.forEach(function (card) {
                var text = (card.getAttribute('data-search') || card.textContent || '').toLowerCase();
                card.style.display = (!q || text.indexOf(q) !== -1) ? '' : 'none';
              });
            });
          }
        }
      }

      // ------------------------------------------------------------------
      // Main Body Container
      // ------------------------------------------------------------------
      var bodyContainer = document.createElement('div');
      bodyContainer.className = 'saas-velocity-body';
      bodyContainer.style.flex = '1 1 0';
      bodyContainer.style.minHeight = '0';
      bodyContainer.style.overflow = 'auto';
      bodyContainer.style.padding = '14px 18px';
      bodyContainer.style.boxSizing = 'border-box';
      bodyContainer.style.backgroundColor = theme.bg;
      root.appendChild(bodyContainer);

      var layoutMode = config.layoutMode || 'velocity_stage_matrix';

      // ==================================================================
      // LAYOUT 1: VELOCITY STAGE MATRIX (Default)
      // ==================================================================
      if (layoutMode === 'velocity_stage_matrix') {
        var grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        grid.style.gap = '14px';
        bodyContainer.appendChild(grid);

        var maxArr = d3.max(stages, function (d) { return d.arr; }) || 1;

        stages.forEach(function (s) {
          var card = document.createElement('div');
          card.className = 'velocity-card';
          card.setAttribute('data-search', s.stage);
          card.style.backgroundColor = theme.cardBg;
          card.style.border = '1px solid ' + (s.isStalled ? '#fca5a5' : theme.border);
          card.style.borderLeft = '5px solid ' + (s.isStalled ? alertColor : (s.avgDays <= slaDays ? onTrackColor : warningColor));
          card.style.borderRadius = '8px';
          card.style.padding = '14px';
          card.style.display = 'flex';
          card.style.flexDirection = 'column';
          card.style.gap = '10px';
          card.style.boxShadow = s.isStalled ? '0 2px 8px rgba(220,38,38,0.08)' : '0 1px 3px rgba(0,0,0,0.04)';
          card.style.cursor = s.drillLinks.length > 0 ? 'pointer' : 'default';

          // Card Header
          var header = '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
            '<div>' +
            '<div style="font-size:14px;font-weight:700;color:' + theme.text + ';">' + s.stage + '</div>' +
            '<div style="font-size:11px;color:' + theme.subtext + ';margin-top:2px;">' + s.deals + ' Active Deals</div>' +
            '</div>' +
            '<div style="font-size:13px;font-weight:700;color:' + primaryColor + ';background:' + (theme.isDark ? '#334155' : '#e2e8f0') + ';padding:3px 8px;border-radius:5px;">' +
            formatValue(s.arr, valueFmt) +
            '</div>' +
            '</div>';

          // Velocity Dwell Time Progress Bar vs SLA
          var velPct = slaDays > 0 ? Math.min(100, Math.round((s.avgDays / (slaDays * 1.5)) * 100)) : 50;
          var barColor = s.avgDays <= slaDays ? onTrackColor : (s.isStalled ? alertColor : warningColor);
          var velocityBar = '<div style="display:flex;flex-direction:column;gap:4px;">' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:600;color:' + theme.text + ';">' +
            '<span>Stage Velocity: <b>' + s.avgDays + ' Days</b></span>' +
            '<span style="color:' + (s.isStalled ? alertColor : theme.subtext) + ';">SLA: ' + slaDays + 'd ' + (s.isStalled ? '⚠️ STALLED' : '✓ OK') + '</span>' +
            '</div>' +
            '<div style="width:100%;height:8px;background:' + (theme.isDark ? '#334155' : '#e2e8f0') + ';border-radius:4px;overflow:hidden;position:relative;">' +
            '<div style="width:' + velPct + '%;height:100%;background:' + barColor + ';border-radius:4px;transition:width 0.3s ease;"></div>' +
            '</div>' +
            '</div>';

          // Slips & Risk Indicators
          var indicators = '<div style="display:flex;gap:10px;font-size:11px;flex-wrap:wrap;">' +
            '<div style="background:' + (s.avgSlips > 3 ? '#fee2e2' : (theme.isDark ? '#1e293b' : '#f1f5f9')) + ';color:' + (s.avgSlips > 3 ? '#991b1b' : theme.text) + ';padding:4px 8px;border-radius:5px;font-weight:600;">' +
            '🔄 Avg Slips: ' + s.avgSlips +
            '</div>' +
            (s.avgRisk > 0 ? '<div style="background:' + (s.avgRisk > 50 ? '#fef3c7' : (theme.isDark ? '#1e293b' : '#f1f5f9')) + ';color:' + (s.avgRisk > 50 ? '#92400e' : theme.text) + ';padding:4px 8px;border-radius:5px;font-weight:600;">' +
            '⚡ Risk Score: ' + s.avgRisk + '/100' +
            '</div>' : '') +
            '</div>';

          card.innerHTML = header + velocityBar + indicators;

          if (s.drillLinks.length > 0) {
            card.addEventListener('click', function (e) {
              if (window.LookerCharts && window.LookerCharts.Utils && window.LookerCharts.Utils.openDrillMenu) {
                window.LookerCharts.Utils.openDrillMenu({
                  links: s.drillLinks,
                  event: e
                });
              }
            });
          }

          grid.appendChild(card);
        });
      }

      // ==================================================================
      // LAYOUT 2: DAYS IN STAGE VS ARR RISK QUADRANT (Scatter)
      // ==================================================================
      else if (layoutMode === 'stage_aging_quadrant') {
        var w = bodyContainer.clientWidth || 600;
        var h = bodyContainer.clientHeight || 400;
        var margin = { top: 20, right: 30, bottom: 50, left: 70 };
        var innerW = Math.max(100, w - margin.left - margin.right);
        var innerH = Math.max(100, h - margin.top - margin.bottom);

        var svg = d3.select(bodyContainer)
          .append('svg')
          .attr('width', w)
          .attr('height', h);

        var g = svg.append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var maxX = d3.max(stages, function (d) { return d.avgDays; }) || 100;
        var maxY = d3.max(stages, function (d) { return d.arr; }) || 1000;

        var xScale = d3.scaleLinear().domain([0, maxX * 1.15]).range([0, innerW]);
        var yScale = d3.scaleLinear().domain([0, maxY * 1.15]).range([innerH, 0]);

        // Background Risk Quadrant Tint
        var midX = xScale(slaDays);
        var midY = yScale(maxY * 0.4);

        // Danger Zone: High ARR, Long Dwell Time (> SLA)
        g.append('rect')
          .attr('x', midX)
          .attr('y', 0)
          .attr('width', innerW - midX)
          .attr('height', midY)
          .attr('fill', '#fee2e2')
          .attr('opacity', 0.45);

        g.append('text')
          .attr('x', innerW - 10)
          .attr('y', 20)
          .attr('text-anchor', 'end')
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .attr('fill', '#991b1b')
          .text('⚠️ DANGER ZONE: High ARR & Stalled Velocity');

        // Axes
        g.append('g')
          .attr('transform', 'translate(0,' + innerH + ')')
          .call(d3.axisBottom(xScale).ticks(6))
          .attr('color', theme.subtext);

        g.append('g')
          .call(d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return formatValue(d, valueFmt); }))
          .attr('color', theme.subtext);

        // Reference SLA Vertical Line
        g.append('line')
          .attr('x1', midX)
          .attr('x2', midX)
          .attr('y1', 0)
          .attr('y2', innerH)
          .attr('stroke', '#d97706')
          .attr('stroke-dasharray', '4,4')
          .attr('stroke-width', 1.5);

        g.append('text')
          .attr('x', midX + 6)
          .attr('y', innerH - 8)
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .attr('fill', '#d97706')
          .text('Velocity SLA (' + slaDays + 'd)');

        // Bubbles
        var bubbles = g.selectAll('.scatter-bubble')
          .data(stages)
          .enter()
          .append('g')
          .attr('class', 'scatter-bubble')
          .attr('data-search', function (d) { return d.stage; })
          .attr('transform', function (d) { return 'translate(' + xScale(d.avgDays) + ',' + yScale(d.arr) + ')'; })
          .style('cursor', 'pointer');

        bubbles.append('circle')
          .attr('r', function (d) { return Math.max(7, Math.min(26, Math.sqrt(d.deals) * 4)); })
          .attr('fill', function (d) { return d.isStalled ? alertColor : (d.avgDays <= slaDays ? onTrackColor : warningColor); })
          .attr('fill-opacity', 0.8)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);

        if (config.labelDensity !== 'hidden') {
          bubbles.append('text')
            .attr('dy', -12)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('font-weight', '600')
            .attr('fill', theme.text)
            .text(function (d) { return d.stage; });
        }

        bubbles
          .on('mouseover', function (event, d) {
            tooltip.style.display = 'block';
            tooltip.style.left = (event.clientX + 14) + 'px';
            tooltip.style.top = (event.clientY - 12) + 'px';
            tooltip.innerHTML = '<div style="font-weight:700;font-size:13px;margin-bottom:4px;">' + d.stage + '</div>' +
              '<div>Pipeline ARR: <b>' + formatValue(d.arr, valueFmt) + '</b></div>' +
              '<div>Active Deals: <b>' + d.deals + '</b></div>' +
              '<div>Avg Days in Stage: <b>' + d.avgDays + ' Days</b> (SLA: ' + slaDays + 'd)</div>' +
              '<div>Avg Close Slips: <b>' + d.avgSlips + '</b></div>';
          })
          .on('mouseout', function () {
            tooltip.style.display = 'none';
          })
          .on('click', function (event, d) {
            if (d.drillLinks && d.drillLinks.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: event });
            }
          });
      }

      // ==================================================================
      // LAYOUT 3: SLIPPAGE REVENUE WATERFALL
      // ==================================================================
      else if (layoutMode === 'slippage_waterfall') {
        var w = bodyContainer.clientWidth || 600;
        var h = bodyContainer.clientHeight || 400;
        var margin = { top: 20, right: 30, bottom: 60, left: 80 };
        var innerW = Math.max(100, w - margin.left - margin.right);
        var innerH = Math.max(100, h - margin.top - margin.bottom);

        var svg = d3.select(bodyContainer).append('svg').attr('width', w).attr('height', h);
        var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var xScale = d3.scaleBand().domain(stages.map(function (d) { return d.stage; })).range([0, innerW]).padding(0.28);
        var maxY = d3.max(stages, function (d) { return d.arr; }) || 1000;
        var yScale = d3.scaleLinear().domain([0, maxY * 1.15]).range([innerH, 0]);

        g.append('g')
          .attr('transform', 'translate(0,' + innerH + ')')
          .call(d3.axisBottom(xScale))
          .selectAll('text')
          .attr('transform', 'rotate(-25)')
          .style('text-anchor', 'end')
          .attr('color', theme.text);

        g.append('g')
          .call(d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return formatValue(d, valueFmt); }))
          .attr('color', theme.subtext);

        var bars = g.selectAll('.waterfall-bar')
          .data(stages)
          .enter()
          .append('g')
          .attr('class', 'waterfall-bar')
          .attr('data-search', function (d) { return d.stage; })
          .style('cursor', 'pointer');

        bars.append('rect')
          .attr('x', function (d) { return xScale(d.stage); })
          .attr('y', function (d) { return yScale(d.arr); })
          .attr('width', xScale.bandwidth())
          .attr('height', function (d) { return innerH - yScale(d.arr); })
          .attr('fill', function (d) { return d.isStalled ? alertColor : primaryColor; })
          .attr('rx', 4);

        if (config.labelDensity !== 'hidden') {
          bars.append('text')
            .attr('x', function (d) { return xScale(d.stage) + xScale.bandwidth() / 2; })
            .attr('y', function (d) { return yScale(d.arr) - 6; })
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('font-weight', '700')
            .attr('fill', theme.text)
            .text(function (d) { return formatValue(d.arr, valueFmt); });
        }

        bars
          .on('mouseover', function (event, d) {
            tooltip.style.display = 'block';
            tooltip.style.left = (event.clientX + 14) + 'px';
            tooltip.style.top = (event.clientY - 12) + 'px';
            tooltip.innerHTML = '<div style="font-weight:700;">' + d.stage + '</div>' +
              '<div>ARR: ' + formatValue(d.arr, valueFmt) + '</div>' +
              '<div>Days in Stage: ' + d.avgDays + 'd</div>';
          })
          .on('mouseout', function () {
            tooltip.style.display = 'none';
          })
          .on('click', function (event, d) {
            if (d.drillLinks && d.drillLinks.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: event });
            }
          });
      }

      // ==================================================================
      // LAYOUT 4: STAGE VS FORECAST CATEGORY CROSS-MATRIX
      // ==================================================================
      else if (layoutMode === 'forecast_category_cross_matrix') {
        var categoriesSet = {};
        stages.forEach(function (s) {
          s.categories.forEach(function (c) { categoriesSet[c.name] = true; });
        });
        var catList = Object.keys(categoriesSet);
        if (catList.length === 0) catList = ['All Categories'];

        var table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = '12px';

        var thead = '<thead><tr style="border-bottom:2px solid ' + theme.border + ';color:' + theme.subtext + ';text-align:left;">' +
          '<th style="padding:10px;">Sales Stage</th>';
        catList.forEach(function (c) {
          thead += '<th style="padding:10px;">' + c + '</th>';
        });
        thead += '<th style="padding:10px;">Total Stage ARR</th></tr></thead>';

        var tbody = '<tbody>';
        stages.forEach(function (s) {
          tbody += '<tr class="cross-cell" data-search="' + s.stage + '" style="border-bottom:1px solid ' + theme.border + ';">' +
            '<td style="padding:10px;font-weight:700;color:' + theme.text + ';">' + s.stage + '</td>';

          catList.forEach(function (cName) {
            var cMatch = s.categories.find(function (c) { return c.name === cName; });
            var cArr = cMatch ? cMatch.arr : 0;
            var isStaleCommit = (cName.toLowerCase().indexOf('forecast') !== -1 || cName.toLowerCase().indexOf('commit') !== -1) && s.isStalled;
            var bgTint = isStaleCommit ? '#fee2e2' : (cArr > 0 ? (theme.isDark ? '#1e293b' : '#f1f5f9') : 'transparent');
            var txtColor = isStaleCommit ? '#991b1b' : (cArr > 0 ? theme.text : theme.subtext);

            tbody += '<td style="padding:10px;background:' + bgTint + ';color:' + txtColor + ';font-weight:' + (cArr > 0 ? '600' : '400') + ';">' +
              (cArr > 0 ? formatValue(cArr, valueFmt) + (isStaleCommit ? ' ⚠️' : '') : '—') +
              '</td>';
          });

          tbody += '<td style="padding:10px;font-weight:700;color:' + primaryColor + ';">' + formatValue(s.arr, valueFmt) + '</td></tr>';
        });
        tbody += '</tbody>';

        table.innerHTML = thead + tbody;
        bodyContainer.appendChild(table);
      }

      if (typeof done === 'function') done();
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
