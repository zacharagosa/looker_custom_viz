/**
 * SaaS Customer Health & Churn Risk Matrix
 * Google Cloud Looker Custom Visualization
 * Built with D3.js v7
 *
 * Designed for B2B SaaS Executive Leadership, Customer Success (CSM), and RevOps.
 * Solves Buganizer Cloud Blockers b/494109285, b/398201951, and b/520194835.
 *
 * 4 Multi-Modal Layout Modes:
 * 1. risk_health_quadrant (Default): 2D Strategic Risk & Adoption Quadrant
 *    (Seat / License Usage Utilization % on X-axis vs Predictive Churn Risk Score on Y-axis,
 *    sized by Total Active ARR ($), with 4 strategic quadrant zones and configurable SLA crosshairs)
 * 2. arr_at_risk_waterfall: ARR at Risk Bridge Waterfall
 *    (Decomposes Total Active ARR -> Healthy Core ARR -> Watch List ARR -> High Risk ARR -> Net Protected ARR)
 * 3. account_health_treemap: Multi-Tier Account Health Treemap
 *    (Nested boxes grouped by Risk Band, sized by Active ARR, colored by Risk Score / Utilization)
 * 4. executive_csm_scorecard: High-Density Customer Success Scorecard Table
 *    (Executive operations table with Account Name, Risk Band pill, Active ARR, ARR at Risk,
 *    Risk Score meter, Utilization gauge, and Strategic Action Guidance Badges)
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
      critical: '#ef4444',     // Critical Red
      watch: '#f59e0b',        // Warning Amber
      thriving: '#10b981',     // Thriving Emerald
      mismatch: '#8b5cf6',     // Feature Mismatch Violet
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: '#e2e8f0',
      cardBg: '#f8fafc',
      grid: '#f1f5f9',
      zoneCritical: 'rgba(239, 68, 68, 0.07)',
      zoneWatch: 'rgba(245, 158, 11, 0.07)',
      zoneMismatch: 'rgba(139, 92, 246, 0.07)',
      zoneThriving: 'rgba(16, 185, 129, 0.07)'
    },
    google_enterprise: {
      name: 'Google Enterprise',
      primary: '#1a73e8',
      critical: '#d93025',
      watch: '#f9ab00',
      thriving: '#1e8e3e',
      mismatch: '#a142f4',
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      border: '#dadce0',
      cardBg: '#f8f9fa',
      grid: '#e8eaed',
      zoneCritical: 'rgba(217, 48, 37, 0.07)',
      zoneWatch: 'rgba(249, 171, 0, 0.07)',
      zoneMismatch: 'rgba(161, 66, 244, 0.07)',
      zoneThriving: 'rgba(30, 142, 62, 0.07)'
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark',
      primary: '#38bdf8',
      critical: '#f43f5e',
      watch: '#fbbf24',
      thriving: '#10b981',
      mismatch: '#c084fc',
      bg: '#090d16',
      text: '#f8fafc',
      subtext: '#94a3b8',
      border: '#1e293b',
      cardBg: '#0f172a',
      grid: '#1e293b',
      zoneCritical: 'rgba(244, 63, 94, 0.15)',
      zoneWatch: 'rgba(251, 191, 36, 0.12)',
      zoneMismatch: 'rgba(192, 132, 252, 0.14)',
      zoneThriving: 'rgba(16, 185, 129, 0.14)'
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      primary: '#065f46',
      critical: '#b91c1c',
      watch: '#d97706',
      thriving: '#059669',
      mismatch: '#4f46e5',
      bg: '#ffffff',
      text: '#064e3b',
      subtext: '#047857',
      border: '#a7f3d0',
      cardBg: '#ecfdf5',
      grid: '#d1fae5',
      zoneCritical: 'rgba(185, 28, 28, 0.07)',
      zoneWatch: 'rgba(217, 119, 6, 0.07)',
      zoneMismatch: 'rgba(79, 70, 229, 0.07)',
      zoneThriving: 'rgba(5, 150, 105, 0.08)'
    },
    sunset_media: {
      name: 'Sunset Media',
      primary: '#c2410c',
      critical: '#e11d48',
      watch: '#ea580c',
      thriving: '#15803d',
      mismatch: '#7c3aed',
      bg: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      border: '#fed7aa',
      cardBg: '#fff7ed',
      grid: '#ffedd5',
      zoneCritical: 'rgba(225, 29, 72, 0.07)',
      zoneWatch: 'rgba(234, 88, 12, 0.07)',
      zoneMismatch: 'rgba(124, 58, 237, 0.07)',
      zoneThriving: 'rgba(21, 128, 61, 0.07)'
    },
    executive_indigo: {
      name: 'Executive Indigo',
      primary: '#4338ca',
      critical: '#dc2626',
      watch: '#f59e0b',
      thriving: '#059669',
      mismatch: '#6366f1',
      bg: '#ffffff',
      text: '#1e1b4b',
      subtext: '#4338ca',
      border: '#c7d2fe',
      cardBg: '#eef2ff',
      grid: '#e0e7ff',
      zoneCritical: 'rgba(220, 38, 38, 0.07)',
      zoneWatch: 'rgba(245, 158, 11, 0.07)',
      zoneMismatch: 'rgba(99, 102, 241, 0.07)',
      zoneThriving: 'rgba(5, 150, 105, 0.07)'
    },
    wellverse_healthcare: {
      name: 'Wellverse Healthcare',
      primary: '#143359',
      critical: '#B42318',
      watch: '#B54708',
      thriving: '#006B40',
      mismatch: '#0284c7',
      bg: '#ffffff',
      text: '#143359',
      subtext: '#475467',
      border: '#D0D5DD',
      cardBg: '#F8F9FC',
      grid: '#EAECF0',
      zoneCritical: 'rgba(180, 35, 24, 0.07)',
      zoneWatch: 'rgba(181, 71, 8, 0.07)',
      zoneMismatch: 'rgba(2, 132, 199, 0.07)',
      zoneThriving: 'rgba(0, 107, 64, 0.07)'
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
    // If value is between 0 and 1, multiply by 100
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
    id: 'saas_customer_churn_risk_matrix',
    label: 'SaaS Customer Health & Churn Risk Matrix',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'Risk Matrix Layout Mode',
        display: 'select',
        values: [
          { '2D Strategic Risk & Adoption Quadrant': 'risk_health_quadrant' },
          { 'ARR at Risk Bridge Waterfall': 'arr_at_risk_waterfall' },
          { 'Account Health Tier Treemap': 'account_health_treemap' },
          { 'Executive Customer Success Scorecard Table': 'executive_csm_scorecard' }
        ],
        default: 'risk_health_quadrant',
        section: 'Display',
        order: 1
      },
      accountDimOverride: {
        type: 'string',
        label: 'Account / Customer Dimension',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 2
      },
      riskBandDimOverride: {
        type: 'string',
        label: 'Risk Band / Segment Dimension (Optional)',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 3
      },
      activeArrMeasOverride: {
        type: 'string',
        label: 'Total Active ARR ($) Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 4
      },
      arrAtRiskMeasOverride: {
        type: 'string',
        label: 'ARR at Risk ($) Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 5
      },
      riskScoreMeasOverride: {
        type: 'string',
        label: 'Churn Risk Score (0-100) Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 6
      },
      utilizationMeasOverride: {
        type: 'string',
        label: 'Seat / Usage Utilization % Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 7
      },
      targetCalculationMode: {
        type: 'string',
        label: 'Benchmark Crosshair Mode',
        display: 'select',
        values: [
          { 'Fixed Governance Thresholds (65% Util / 50 Risk)': 'fixed_threshold' },
          { 'Dataset Mean (Average Utilization & Risk)': 'dataset_mean' },
          { 'Dataset Median (Median Utilization & Risk)': 'dataset_median' },
          { 'P75 / Top Quartile Threshold': 'percentile_p75' },
          { 'None (Clean Scatter without Crosshairs)': 'none' }
        ],
        default: 'fixed_threshold',
        section: 'Display',
        order: 8
      },
      utilizationBenchmark: {
        type: 'number',
        label: 'Target Utilization % Threshold',
        default: 65,
        section: 'Display',
        order: 9
      },
      riskAlertThreshold: {
        type: 'number',
        label: 'Churn Risk Score Alert Threshold',
        default: 50,
        section: 'Display',
        order: 10
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Benchmark Reference Label Override',
        default: 'Adoption Benchmark',
        section: 'Display',
        order: 11
      },
      sortBy: {
        type: 'string',
        label: 'Account Sort Order',
        display: 'select',
        values: [
          { 'ARR at Risk (Highest First)': 'arr_risk_desc' },
          { 'Churn Risk Score (Highest First)': 'risk_desc' },
          { 'Total Active ARR (Largest First)': 'arr_desc' },
          { 'Seat Utilization (Lowest / Churn First)': 'utilization_asc' },
          { 'Alphabetical by Account Name': 'alphabetical' },
          { 'Natural Query Order': 'natural' }
        ],
        default: 'arr_risk_desc',
        section: 'Display',
        order: 12
      },
      topNLimit: {
        type: 'number',
        label: 'Top-N Accounts Display Limit (0 = All)',
        default: 0,
        section: 'Display',
        order: 13
      },
      enableOtherRollup: {
        type: 'boolean',
        label: "Group Tail Accounts into 'Other' Rollup",
        default: false,
        section: 'Display',
        order: 14
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Suppress Zero / Null ARR Accounts',
        default: true,
        section: 'Display',
        order: 15
      },
      hudMode: {
        type: 'string',
        label: 'Executive KPI HUD Mode',
        display: 'select',
        values: [
          { 'Full Scorecard HUD': 'scorecard' },
          { 'Compact Metric Strip': 'compact_strip' },
          { 'Hidden': 'hidden' }
        ],
        default: 'scorecard',
        section: 'Display',
        order: 16
      },
      labelDensity: {
        type: 'string',
        label: 'Account Bubble Labels Density',
        display: 'select',
        values: [
          { 'All Account Labels': 'all' },
          { 'Critical & Largest Accounts Only': 'peaks_only' },
          { 'Hidden (Tooltip on Hover Only)': 'hidden' }
        ],
        default: 'peaks_only',
        section: 'Display',
        order: 17
      },
      showSearch: {
        type: 'boolean',
        label: 'Enable Instant Account Search Filter',
        default: true,
        section: 'Display',
        order: 18
      },
      customTitle: {
        type: 'string',
        label: 'Custom Visualization Title Override',
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

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorTheme: {
        type: 'string',
        label: 'Brand Palette Preset',
        display: 'select',
        values: [
          { 'Modern Slate (Default)': 'modern_slate' },
          { 'Google Enterprise': 'google_enterprise' },
          { 'Cyberpunk Dark (Dark Mode)': 'cyberpunk_dark' },
          { 'Emerald FinOps': 'emerald_finops' },
          { 'Sunset Media': 'sunset_media' },
          { 'Executive Indigo': 'executive_indigo' },
          { 'Wellverse Healthcare': 'wellverse_healthcare' },
          { 'Custom Hex Override': 'custom_hex' }
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
        label: 'Custom Thriving / Low Risk Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 3
      },
      customNegativeHex: {
        type: 'string',
        label: 'Custom High Risk / Churn Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 4
      },
      customWarningHex: {
        type: 'string',
        label: 'Custom Watch / Adoption Gap Hex',
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
          { 'Lower Risk Score is Better (Standard Risk)': 'lower_is_better' },
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
        accountDimOverride: { role: 'dimension', defaultIdx: 0 },
        riskBandDimOverride: { role: 'dimension', defaultIdx: 1 },
        activeArrMeasOverride: { role: 'measure', defaultIdx: 0 },
        arrAtRiskMeasOverride: { role: 'measure', defaultIdx: 1 },
        riskScoreMeasOverride: { role: 'measure', defaultIdx: 2 },
        utilizationMeasOverride: { role: 'measure', defaultIdx: 3 }
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
        console.warn('[saas_customer_churn_risk_matrix] registerOptions warning:', e);
      }
    },

    create: function (element, config) {
      element.innerHTML = '';
      element.style.boxSizing = 'border-box';
      element.style.overflow = 'hidden';
      element.style.padding = '0';
      element.style.margin = '0';

      this._container = document.createElement('div');
      this._container.className = 'looker-saas-risk-matrix-container';
      this._container.style.width = '100%';
      this._container.style.height = '100%';
      this._container.style.display = 'flex';
      this._container.style.flexDirection = 'column';
      this._container.style.overflow = 'hidden';
      this._container.style.boxSizing = 'border-box';
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      this.searchTerm = '';
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
      }, 50);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      this._registerDynamicFieldOptions(queryResponse);
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

      if (!this._container || !element.contains(this._container)) {
        this.create(element, config);
      }

      if (!data || data.length === 0) {
        if (this.addError) {
          this.addError({
            title: 'No Data',
            message: 'This query returned 0 rows. Please check explore filters.'
          });
        }
        if (done) done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
          if (done) done();
        } catch (err) {
          console.error('[saas_customer_churn_risk_matrix] Render error:', err);
          if (self.addError) {
            self.addError({
              title: 'Render Error',
              message: err.message
            });
          }
          if (done) done();
        }
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;
      this._container.innerHTML = '';

      var dims = (queryResponse.fields.dimensions && queryResponse.fields.dimensions.length)
        ? queryResponse.fields.dimensions
        : (queryResponse.fields.dimension_like || []);
      var meas = (queryResponse.fields.measures && queryResponse.fields.measures.length)
        ? queryResponse.fields.measures
        : (queryResponse.fields.measure_like || []);
      if (!meas.length && queryResponse.fields.table_calculations) {
        meas = queryResponse.fields.table_calculations;
      }

      // Resolve fields
      var accountField = resolveField(dims, config.accountDimOverride, 0);
      var riskBandField = dims.length > 1 ? resolveField(dims, config.riskBandDimOverride, 1) : null;
      var activeArrField = resolveField(meas, config.activeArrMeasOverride, 0);
      var arrAtRiskField = meas.length > 1 ? resolveField(meas, config.arrAtRiskMeasOverride, 1) : activeArrField;
      var riskScoreField = meas.length > 2 ? resolveField(meas, config.riskScoreMeasOverride, 2) : null;
      var utilizationField = meas.length > 3 ? resolveField(meas, config.utilizationMeasOverride, 3) : null;

      if (!accountField || !activeArrField) {
        if (this.addError) {
          this.addError({
            title: 'Field Resolution Error',
            message: 'Please provide at least 1 Customer Account dimension and 1 ARR measure.'
          });
        }
        return;
      }

      // Theme resolution
      var themeKey = config.colorTheme || 'modern_slate';
      var theme = Object.assign({}, PALETTES[themeKey] || PALETTES.modern_slate);
      if (config.customPrimaryHex) theme.primary = config.customPrimaryHex;
      if (config.customPositiveHex) theme.thriving = config.customPositiveHex;
      if (config.customNegativeHex) theme.critical = config.customNegativeHex;
      if (config.customWarningHex) theme.watch = config.customWarningHex;

      this._container.style.backgroundColor = theme.bg;
      this._container.style.color = theme.text;

      // Extract & transform data rows
      var items = [];
      var totalActiveArr = 0;
      var totalArrAtRisk = 0;
      var sumRiskWeighted = 0;
      var highRiskCount = 0;

      data.forEach(function (row, idx) {
        var accCell = row[accountField.name];
        var accName = accCell ? (accCell.rendered || accCell.value) : ('Account ' + (idx + 1));
        var bandCell = riskBandField ? row[riskBandField.name] : null;
        var bandName = bandCell ? (bandCell.rendered || bandCell.value) : 'Standard';

        var activeArrCell = row[activeArrField.name];
        var activeArr = activeArrCell ? Number(activeArrCell.value) : 0;
        if (isNaN(activeArr)) activeArr = 0;

        var atRiskCell = arrAtRiskField ? row[arrAtRiskField.name] : null;
        var atRiskArr = atRiskCell ? Number(atRiskCell.value) : 0;
        if (isNaN(atRiskArr)) atRiskArr = 0;

        var riskScoreCell = riskScoreField ? row[riskScoreField.name] : null;
        var riskScore = riskScoreCell ? Number(riskScoreCell.value) : 40;
        if (isNaN(riskScore)) riskScore = 40;

        var utilCell = utilizationField ? row[utilizationField.name] : null;
        var utilVal = utilCell ? Number(utilCell.value) : 0.65;
        if (isNaN(utilVal)) utilVal = 0.65;
        // Normalize utilization to 0-100 scale if it is 0.0-1.0
        var utilPct = utilVal <= 1.0 && utilVal >= 0 ? utilVal * 100 : utilVal;

        if (config.suppressZeroNull && activeArr <= 0) return;

        // Determine category classification & action tier
        var isHighRisk = riskScore >= 50 || String(bandName).toLowerCase().includes('high');
        var isLowUtil = utilPct < (Number(config.utilizationBenchmark) || 65);

        var quadrantKey = 'thriving';
        var actionTag = 'EXPANSION READY';
        var actionClass = 'thriving';

        if (isHighRisk && isLowUtil) {
          quadrantKey = 'critical';
          actionTag = 'P1 CODE RED';
          actionClass = 'critical';
          highRiskCount++;
        } else if (isHighRisk && !isLowUtil) {
          quadrantKey = 'mismatch';
          actionTag = 'EXECUTIVE SPONSOR';
          actionClass = 'mismatch';
          highRiskCount++;
        } else if (!isHighRisk && isLowUtil) {
          quadrantKey = 'watch';
          actionTag = 'ADOPTION GAP';
          actionClass = 'watch';
        }

        totalActiveArr += activeArr;
        totalArrAtRisk += atRiskArr;
        sumRiskWeighted += (riskScore * activeArr);

        var links = [];
        if (accCell && accCell.links) links = links.concat(accCell.links);
        if (activeArrCell && activeArrCell.links) links = links.concat(activeArrCell.links);

        items.push({
          id: idx,
          name: accName,
          band: bandName,
          activeArr: activeArr,
          atRiskArr: atRiskArr,
          riskScore: riskScore,
          utilization: utilPct,
          quadrantKey: quadrantKey,
          actionTag: actionTag,
          actionClass: actionClass,
          links: links,
          rawRow: row
        });
      });

      var avgRiskScore = totalActiveArr > 0 ? (sumRiskWeighted / totalActiveArr) : 45;

      // Filter by search term
      if (this.searchTerm && this.searchTerm.trim() !== '') {
        var query = this.searchTerm.toLowerCase().trim();
        items = items.filter(function (it) {
          return it.name.toLowerCase().includes(query) || it.band.toLowerCase().includes(query);
        });
      }

      // Sort items
      var sortMode = config.sortBy || 'arr_risk_desc';
      if (sortMode === 'arr_risk_desc') {
        items.sort(function (a, b) { return b.atRiskArr - a.atRiskArr; });
      } else if (sortMode === 'risk_desc') {
        items.sort(function (a, b) { return b.riskScore - a.riskScore; });
      } else if (sortMode === 'arr_desc') {
        items.sort(function (a, b) { return b.activeArr - a.activeArr; });
      } else if (sortMode === 'utilization_asc') {
        items.sort(function (a, b) { return a.utilization - b.utilization; });
      } else if (sortMode === 'alphabetical') {
        items.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }

      // Top-N handling with optional Other rollup
      var topN = Number(config.topNLimit) || 0;
      if (topN > 0 && items.length > topN) {
        if (config.enableOtherRollup) {
          var topItems = items.slice(0, topN);
          var otherItems = items.slice(topN);
          var otherActive = 0, otherAtRisk = 0, otherRiskSum = 0, otherUtilSum = 0;
          otherItems.forEach(function (o) {
            otherActive += o.activeArr;
            otherAtRisk += o.atRiskArr;
            otherRiskSum += (o.riskScore * o.activeArr);
            otherUtilSum += (o.utilization * o.activeArr);
          });
          var otherAvgRisk = otherActive > 0 ? (otherRiskSum / otherActive) : 40;
          var otherAvgUtil = otherActive > 0 ? (otherUtilSum / otherActive) : 60;
          topItems.push({
            id: 99999,
            name: 'Other Accounts (' + otherItems.length + ' tail)',
            band: 'Consolidated',
            activeArr: otherActive,
            atRiskArr: otherAtRisk,
            riskScore: otherAvgRisk,
            utilization: otherAvgUtil,
            quadrantKey: 'watch',
            actionTag: 'MONITOR TAIL',
            actionClass: 'watch',
            links: [],
            isOther: true
          });
          items = topItems;
        } else {
          items = items.slice(0, topN);
        }
      }

      // ----------------------------------------------------
      // HEADER BAR: Title, Subtitle, HUD Scorecard & Search
      // ----------------------------------------------------
      var headerRow = document.createElement('div');
      headerRow.style.flex = '0 0 auto';
      headerRow.style.display = 'flex';
      headerRow.style.alignItems = 'center';
      headerRow.style.justifyContent = 'space-between';
      headerRow.style.padding = '8px 16px';
      headerRow.style.borderBottom = '1px solid ' + theme.border;
      headerRow.style.backgroundColor = theme.cardBg;
      headerRow.style.gap = '12px';
      headerRow.style.flexWrap = 'wrap';

      var titleDiv = document.createElement('div');
      var vizTitle = config.customTitle || 'SaaS Customer Health & Churn Risk Matrix';
      var vizSubtitle = config.customSubtitle || 'Strategic Seat Utilization vs Churn Risk Score with ARR at Risk Quadrants';
      titleDiv.innerHTML = '<div style="font-size:14px; font-weight:700; color:' + theme.text + ';">' + vizTitle + '</div>' +
        '<div style="font-size:11px; color:' + theme.subtext + '; margin-top:2px;">' + vizSubtitle + '</div>';
      headerRow.appendChild(titleDiv);

      // HUD Scorecard
      var hudMode = config.hudMode || 'scorecard';
      if (hudMode !== 'hidden') {
        var hudDiv = document.createElement('div');
        hudDiv.style.display = 'flex';
        hudDiv.style.alignItems = 'center';
        hudDiv.style.gap = '8px';
        hudDiv.style.flexWrap = 'wrap';

        var riskPct = totalActiveArr > 0 ? ((totalArrAtRisk / totalActiveArr) * 100).toFixed(1) : '0';

        var chipData = [
          { label: 'Total Active ARR', val: formatCurrency(totalActiveArr), color: theme.primary },
          { label: 'ARR at Risk', val: formatCurrency(totalArrAtRisk) + ' (' + riskPct + '%)', color: theme.critical },
          { label: 'Weighted Churn Risk', val: avgRiskScore.toFixed(1) + ' / 100', color: avgRiskScore >= 50 ? theme.critical : theme.watch },
          { label: 'Critical Accounts', val: highRiskCount + ' / ' + data.length, color: highRiskCount > 0 ? theme.critical : theme.thriving }
        ];

        chipData.forEach(function (c) {
          var chip = document.createElement('div');
          chip.style.backgroundColor = theme.bg;
          chip.style.border = '1px solid ' + theme.border;
          chip.style.borderRadius = '6px';
          chip.style.padding = hudMode === 'compact_strip' ? '3px 8px' : '5px 10px';
          chip.style.fontSize = '11px';
          chip.innerHTML = '<span style="color:' + theme.subtext + '; font-weight:500;">' + c.label + ':</span> ' +
            '<strong style="color:' + c.color + '; margin-left:3px;">' + c.val + '</strong>';
          hudDiv.appendChild(chip);
        });

        headerRow.appendChild(hudDiv);
      }

      // Search bar
      if (config.showSearch !== false) {
        var searchBox = document.createElement('input');
        searchBox.type = 'text';
        searchBox.placeholder = 'Search accounts...';
        searchBox.value = this.searchTerm;
        searchBox.style.padding = '4px 10px';
        searchBox.style.borderRadius = '6px';
        searchBox.style.border = '1px solid ' + theme.border;
        searchBox.style.backgroundColor = theme.bg;
        searchBox.style.color = theme.text;
        searchBox.style.fontSize = '12px';
        searchBox.style.outline = 'none';
        searchBox.style.width = '160px';
        searchBox.addEventListener('input', function (e) {
          self.searchTerm = e.target.value;
          self._render(d3, data, element, config, queryResponse);
        });
        headerRow.appendChild(searchBox);
      }

      this._container.appendChild(headerRow);

      // Main chart wrapper
      var chartWrapper = document.createElement('div');
      chartWrapper.style.flex = '1 1 0';
      chartWrapper.style.minHeight = '0';
      chartWrapper.style.position = 'relative';
      chartWrapper.style.overflow = 'hidden';
      this._container.appendChild(chartWrapper);

      // Dedicated Tooltip
      var tooltip = d3.select(chartWrapper)
        .append('div')
        .attr('class', 'saas-risk-tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('z-index', '9999')
        .style('background', theme.cardBg)
        .style('color', theme.text)
        .style('border', '1px solid ' + theme.border)
        .style('padding', '10px 14px')
        .style('border-radius', '8px')
        .style('box-shadow', '0 6px 20px rgba(0,0,0,0.15)')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('max-width', '280px');

      // ----------------------------------------------------
      // DISPATCH TO LAYOUT MODES
      // ----------------------------------------------------
      var mode = config.layoutMode || 'risk_health_quadrant';
      if (mode === 'arr_at_risk_waterfall') {
        this._renderWaterfall(d3, chartWrapper, items, theme, config, tooltip, totalActiveArr, totalArrAtRisk);
      } else if (mode === 'account_health_treemap') {
        this._renderTreemap(d3, chartWrapper, items, theme, config, tooltip);
      } else if (mode === 'executive_csm_scorecard') {
        this._renderScorecardTable(d3, chartWrapper, items, theme, config, totalActiveArr, totalArrAtRisk);
      } else {
        this._renderQuadrant(d3, chartWrapper, items, theme, config, tooltip);
      }
    },

    // ------------------------------------------------------------------
    // MODE 1: 2D Strategic Risk & Adoption Quadrant
    // ------------------------------------------------------------------
    _renderQuadrant: function (d3, wrapper, items, theme, config, tooltip) {
      var self = this;
      var width = wrapper.clientWidth || 800;
      var height = wrapper.clientHeight || 500;

      var margin = { top: 30, right: 35, bottom: 50, left: 60 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(100, height - margin.top - margin.bottom);

      var svg = d3.select(wrapper).append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('display', 'block');

      var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // Benchmarks
      var utilBench = Number(config.utilizationBenchmark) || 65;
      var riskAlert = Number(config.riskAlertThreshold) || 50;

      if (config.targetCalculationMode === 'dataset_mean') {
        utilBench = d3.mean(items, function (d) { return d.utilization; }) || 65;
        riskAlert = d3.mean(items, function (d) { return d.riskScore; }) || 50;
      } else if (config.targetCalculationMode === 'dataset_median') {
        utilBench = d3.median(items, function (d) { return d.utilization; }) || 65;
        riskAlert = d3.median(items, function (d) { return d.riskScore; }) || 50;
      }

      var xScale = d3.scaleLinear().domain([0, 100]).range([0, innerW]);
      var yScale = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

      var minR = Number(config.bubbleMinRadius) || 6;
      var maxR = Number(config.bubbleMaxRadius) || 28;
      var maxArr = d3.max(items, function (d) { return d.activeArr; }) || 100000;
      var rScale = d3.scaleSqrt().domain([0, maxArr]).range([minR, maxR]);

      // 4 Shaded Strategic Quadrant Zones
      var xCross = xScale(utilBench);
      var yCross = yScale(riskAlert);

      // Q1 Top-Left: Critical Churn Risk (Low Util, High Risk)
      g.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', Math.max(0, xCross))
        .attr('height', Math.max(0, yCross))
        .attr('fill', theme.zoneCritical);

      g.append('text')
        .attr('x', 14)
        .attr('y', 20)
        .attr('fill', theme.critical)
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('letter-spacing', '0.04em')
        .text('URGENT: CRITICAL CHURN RISK (Low Usage, High Risk)');

      // Q2 Top-Right: Feature / Satisfaction Mismatch (High Util, High Risk)
      g.append('rect')
        .attr('x', xCross)
        .attr('y', 0)
        .attr('width', Math.max(0, innerW - xCross))
        .attr('height', Math.max(0, yCross))
        .attr('fill', theme.zoneMismatch);

      g.append('text')
        .attr('x', xCross + 14)
        .attr('y', 20)
        .attr('fill', theme.mismatch)
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('letter-spacing', '0.04em')
        .text('EXECUTIVE INTERVENTION: SATISFACTION MISMATCH');

      // Q3 Bottom-Left: Adoption Gap / Sleeper (Low Util, Low Risk)
      g.append('rect')
        .attr('x', 0)
        .attr('y', yCross)
        .attr('width', Math.max(0, xCross))
        .attr('height', Math.max(0, innerH - yCross))
        .attr('fill', theme.zoneWatch);

      g.append('text')
        .attr('x', 14)
        .attr('y', yCross + 20)
        .attr('fill', theme.watch)
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('letter-spacing', '0.04em')
        .text('ONBOARDING / ADOPTION GAP (Low Usage, Low Risk)');

      // Q4 Bottom-Right: Healthy Core & Expansion (High Util, Low Risk)
      g.append('rect')
        .attr('x', xCross)
        .attr('y', yCross)
        .attr('width', Math.max(0, innerW - xCross))
        .attr('height', Math.max(0, innerH - yCross))
        .attr('fill', theme.zoneThriving);

      g.append('text')
        .attr('x', xCross + 14)
        .attr('y', yCross + 20)
        .attr('fill', theme.thriving)
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('letter-spacing', '0.04em')
        .text('HEALTHY CORE: EXPANSION & ADVOCACY');

      // Grid lines
      g.append('g')
        .attr('class', 'grid-x')
        .attr('transform', 'translate(0,' + innerH + ')')
        .call(d3.axisBottom(xScale).ticks(5).tickSize(-innerH).tickFormat(''))
        .selectAll('line').style('stroke', theme.grid);

      g.append('g')
        .attr('class', 'grid-y')
        .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW).tickFormat(''))
        .selectAll('line').style('stroke', theme.grid);

      // Axes
      var xAxis = d3.axisBottom(xScale).ticks(5).tickFormat(function (d) { return d + '%'; });
      var yAxis = d3.axisLeft(yScale).ticks(5);

      g.append('g')
        .attr('transform', 'translate(0,' + innerH + ')')
        .call(xAxis)
        .selectAll('text')
        .style('fill', theme.subtext)
        .style('font-size', '11px');

      g.append('g')
        .call(yAxis)
        .selectAll('text')
        .style('fill', theme.subtext)
        .style('font-size', '11px');

      // Axis Labels
      svg.append('text')
        .attr('x', margin.left + innerW / 2)
        .attr('y', height - 12)
        .attr('text-anchor', 'middle')
        .style('fill', theme.text)
        .style('font-size', '12px')
        .style('font-weight', '600')
        .text('Seat & Feature Usage Utilization Rate (%) -> Higher Adoption');

      svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -(margin.top + innerH / 2))
        .attr('y', 18)
        .attr('text-anchor', 'middle')
        .style('fill', theme.text)
        .style('font-size', '12px')
        .style('font-weight', '600')
        .text('Predictive Churn Risk Score (0-100) -> Higher Churn Hazard');

      // Benchmark Crosshairs
      if (config.targetCalculationMode !== 'none') {
        // Vertical Utilization Threshold
        g.append('line')
          .attr('x1', xCross).attr('x2', xCross)
          .attr('y1', 0).attr('y2', innerH)
          .attr('stroke', theme.subtext)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '5,5');

        g.append('text')
          .attr('x', xCross + 4)
          .attr('y', innerH - 8)
          .attr('fill', theme.subtext)
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .text('Util Target: ' + utilBench.toFixed(0) + '%');

        // Horizontal Risk Threshold
        g.append('line')
          .attr('x1', 0).attr('x2', innerW)
          .attr('y1', yCross).attr('y2', yCross)
          .attr('stroke', theme.subtext)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '5,5');

        g.append('text')
          .attr('x', innerW - 8)
          .attr('y', yCross - 6)
          .attr('text-anchor', 'end')
          .attr('fill', theme.subtext)
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .text('Risk Alert: ' + riskAlert.toFixed(0));
      }

      // Bubbles
      var bubbleColor = function (d) {
        if (d.quadrantKey === 'critical') return theme.critical;
        if (d.quadrantKey === 'mismatch') return theme.mismatch;
        if (d.quadrantKey === 'watch') return theme.watch;
        return theme.thriving;
      };

      var bubbles = g.selectAll('.risk-bubble')
        .data(items, function (d) { return d.id; })
        .enter()
        .append('g')
        .attr('class', 'risk-bubble')
        .attr('transform', function (d) {
          return 'translate(' + xScale(d.utilization) + ',' + yScale(d.riskScore) + ')';
        })
        .style('cursor', 'pointer');

      bubbles.append('circle')
        .attr('r', function (d) { return rScale(d.activeArr); })
        .attr('fill', bubbleColor)
        .attr('fill-opacity', 0.75)
        .attr('stroke', function (d) { return d3.rgb(bubbleColor(d)).darker(0.6); })
        .attr('stroke-width', 1.5)
        .style('transition', 'transform 0.15s ease, fill-opacity 0.15s ease')
        .on('mouseenter', function (event, d) {
          d3.select(this).attr('fill-opacity', 1.0).attr('stroke-width', 2.5);
          var html = '<div style="font-weight:700; font-size:13px; margin-bottom:4px; color:' + theme.text + ';">' + d.name + '</div>' +
            '<div style="font-size:11px; margin-bottom:6px;"><span style="padding:2px 6px; border-radius:4px; background:' + bubbleColor(d) + '; color:#ffffff; font-weight:600;">' + d.actionTag + '</span></div>' +
            '<div style="display:grid; grid-template-columns: auto auto; gap: 4px 10px; font-size:11.5px;">' +
            '<span style="color:' + theme.subtext + ';">Total Active ARR:</span><strong>' + formatCurrency(d.activeArr) + '</strong>' +
            '<span style="color:' + theme.subtext + ';">ARR at Risk:</span><strong style="color:' + theme.critical + ';">' + formatCurrency(d.atRiskArr) + '</strong>' +
            '<span style="color:' + theme.subtext + ';">Churn Risk Score:</span><strong>' + d.riskScore.toFixed(1) + ' / 100</strong>' +
            '<span style="color:' + theme.subtext + ';">Seat Utilization:</span><strong>' + d.utilization.toFixed(1) + '%</strong>' +
            '<span style="color:' + theme.subtext + ';">Risk Tier:</span><strong>' + d.band + '</strong>' +
            '</div>';
          tooltip.html(html).style('visibility', 'visible');
        })
        .on('mousemove', function (event) {
          var coords = d3.pointer(event, wrapper);
          tooltip.style('top', (coords[1] + 15) + 'px').style('left', (coords[0] + 15) + 'px');
        })
        .on('mouseleave', function () {
          d3.select(this).attr('fill-opacity', 0.75).attr('stroke-width', 1.5);
          tooltip.style('visibility', 'hidden');
        })
        .on('click', function (event, d) {
          if (d.links && d.links.length > 0 && typeof LookerCharts !== 'undefined' && LookerCharts.Utils) {
            LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
          } else if (self.drill && d.rawRow) {
            self.drill(event, d.rawRow);
          }
        });

      // Labels
      var labelMode = config.labelDensity || 'peaks_only';
      if (labelMode !== 'hidden') {
        bubbles.each(function (d) {
          var showThisLabel = false;
          if (labelMode === 'all') {
            showThisLabel = true;
          } else if (labelMode === 'peaks_only') {
            // Show for high ARR or critical churn accounts
            showThisLabel = d.quadrantKey === 'critical' || d.activeArr >= (maxArr * 0.4);
          }
          if (showThisLabel) {
            var rad = rScale(d.activeArr);
            d3.select(this).append('text')
              .attr('x', 0)
              .attr('y', -rad - 4)
              .attr('text-anchor', 'middle')
              .attr('fill', theme.text)
              .attr('font-size', '10px')
              .attr('font-weight', '600')
              .style('pointer-events', 'none')
              .style('text-shadow', '0 1px 3px rgba(255,255,255,0.8)')
              .text(d.name.length > 16 ? d.name.substring(0, 15) + '…' : d.name);
          }
        });
      }
    },

    // ------------------------------------------------------------------
    // MODE 2: ARR at Risk Bridge Waterfall
    // ------------------------------------------------------------------
    _renderWaterfall: function (d3, wrapper, items, theme, config, tooltip, totalActive, totalAtRisk) {
      var self = this;
      var width = wrapper.clientWidth || 800;
      var height = wrapper.clientHeight || 500;

      var margin = { top: 35, right: 30, bottom: 50, left: 75 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(100, height - margin.top - margin.bottom);

      var svg = d3.select(wrapper).append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('display', 'block');

      var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // Segment ARR into Waterfall buckets
      var criticalArr = d3.sum(items.filter(function (d) { return d.quadrantKey === 'critical'; }), function (d) { return d.atRiskArr; }) || 0;
      var mismatchArr = d3.sum(items.filter(function (d) { return d.quadrantKey === 'mismatch'; }), function (d) { return d.atRiskArr; }) || 0;
      var watchArr = d3.sum(items.filter(function (d) { return d.quadrantKey === 'watch'; }), function (d) { return d.atRiskArr; }) || 0;
      var protectedArr = Math.max(0, totalActive - totalAtRisk);

      var steps = [
        { label: 'Total Active ARR', val: totalActive, type: 'start', base: 0, top: totalActive, color: theme.primary },
        { label: 'Healthy Protected ARR', val: protectedArr, type: 'delta', base: 0, top: protectedArr, color: theme.thriving },
        { label: 'Adoption Gap (Watch)', val: -watchArr, type: 'delta', base: protectedArr, top: protectedArr + watchArr, color: theme.watch },
        { label: 'Satisfaction Mismatch', val: -mismatchArr, type: 'delta', base: protectedArr + watchArr, top: protectedArr + watchArr + mismatchArr, color: theme.mismatch },
        { label: 'Critical Churn Hazard', val: -criticalArr, type: 'delta', base: protectedArr + watchArr + mismatchArr, top: totalActive, color: theme.critical },
        { label: 'Net Safe ARR Baseline', val: protectedArr, type: 'end', base: 0, top: protectedArr, color: theme.primary }
      ];

      var xScale = d3.scaleBand().domain(steps.map(function (s) { return s.label; })).range([0, innerW]).padding(0.25);
      var yScale = d3.scaleLinear().domain([0, totalActive * 1.1]).range([innerH, 0]);

      // Grid lines
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW).tickFormat(''))
        .selectAll('line').style('stroke', theme.grid);

      // Bars
      var bars = g.selectAll('.waterfall-bar')
        .data(steps)
        .enter()
        .append('g')
        .attr('class', 'waterfall-bar');

      bars.append('rect')
        .attr('x', function (d) { return xScale(d.label); })
        .attr('y', function (d) { return yScale(d.top); })
        .attr('width', xScale.bandwidth())
        .attr('height', function (d) { return Math.max(4, Math.abs(yScale(d.base) - yScale(d.top))); })
        .attr('fill', function (d) { return d.color; })
        .attr('rx', 4)
        .attr('fill-opacity', 0.85);

      // Connectors between steps
      for (var i = 0; i < steps.length - 1; i++) {
        var s1 = steps[i];
        var s2 = steps[i + 1];
        var yConn = (s2.type === 'delta') ? yScale(s2.base) : yScale(s1.base);
        g.append('line')
          .attr('x1', xScale(s1.label) + xScale.bandwidth())
          .attr('x2', xScale(s2.label))
          .attr('y1', yConn)
          .attr('y2', yConn)
          .attr('stroke', theme.subtext)
          .attr('stroke-dasharray', '3,3');
      }

      // Bar Value Readouts
      bars.append('text')
        .attr('x', function (d) { return xScale(d.label) + xScale.bandwidth() / 2; })
        .attr('y', function (d) { return yScale(d.top) - 6; })
        .attr('text-anchor', 'middle')
        .attr('fill', theme.text)
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .text(function (d) { return formatCurrency(Math.abs(d.val)); });

      // Axes
      g.append('g')
        .attr('transform', 'translate(0,' + innerH + ')')
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .style('fill', theme.text)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .call(function (text) {
          text.each(function () {
            var selfNode = d3.select(this);
            var words = selfNode.text().split(/\s+/);
            if (words.length > 2) {
              selfNode.text('').append('tspan').attr('x', 0).attr('dy', '0.8em').text(words.slice(0, 2).join(' '));
              selfNode.append('tspan').attr('x', 0).attr('dy', '1.1em').text(words.slice(2).join(' '));
            }
          });
        });

      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(function (d) { return formatCurrency(d); }))
        .selectAll('text')
        .style('fill', theme.subtext)
        .style('font-size', '11px');
    },

    // ------------------------------------------------------------------
    // MODE 3: Multi-Tier Account Health Treemap
    // ------------------------------------------------------------------
    _renderTreemap: function (d3, wrapper, items, theme, config, tooltip) {
      var self = this;
      var width = wrapper.clientWidth || 800;
      var height = wrapper.clientHeight || 500;

      var margin = { top: 15, right: 15, bottom: 15, left: 15 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(100, height - margin.top - margin.bottom);

      var svg = d3.select(wrapper).append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('display', 'block');

      var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // Nest data by Risk Category
      var rootObj = {
        name: 'All Accounts',
        children: [
          { name: 'Critical Churn Hazard', color: theme.critical, children: items.filter(function (d) { return d.quadrantKey === 'critical'; }) },
          { name: 'Satisfaction Mismatch', color: theme.mismatch, children: items.filter(function (d) { return d.quadrantKey === 'mismatch'; }) },
          { name: 'Adoption Gap', color: theme.watch, children: items.filter(function (d) { return d.quadrantKey === 'watch'; }) },
          { name: 'Healthy Expansion Core', color: theme.thriving, children: items.filter(function (d) { return d.quadrantKey === 'thriving'; }) }
        ].filter(function (grp) { return grp.children && grp.children.length > 0; })
      };

      var hierarchy = d3.hierarchy(rootObj)
        .sum(function (d) { return d.activeArr || 0; })
        .sort(function (a, b) { return b.value - a.value; });

      d3.treemap()
        .size([innerW, innerH])
        .paddingTop(22)
        .paddingInner(3)
        .round(true)(hierarchy);

      // Render Category Containers
      var groups = g.selectAll('.treemap-grp')
        .data(hierarchy.children || [])
        .enter()
        .append('g')
        .attr('class', 'treemap-grp');

      groups.append('rect')
        .attr('x', function (d) { return d.x0; })
        .attr('y', function (d) { return d.y0; })
        .attr('width', function (d) { return d.x1 - d.x0; })
        .attr('height', function (d) { return d.y1 - d.y0; })
        .attr('fill', function (d) { return d.data.color; })
        .attr('fill-opacity', 0.12)
        .attr('stroke', function (d) { return d.data.color; })
        .attr('stroke-width', 1.5)
        .attr('rx', 6);

      groups.append('text')
        .attr('x', function (d) { return d.x0 + 8; })
        .attr('y', function (d) { return d.y0 + 15; })
        .attr('fill', function (d) { return d.data.color; })
        .attr('font-size', '11.5px')
        .attr('font-weight', '700')
        .text(function (d) { return d.data.name + ' (' + formatCurrency(d.value) + ')'; });

      // Render Leaf Nodes (Accounts)
      var leaves = g.selectAll('.treemap-leaf')
        .data(hierarchy.leaves())
        .enter()
        .append('g')
        .attr('class', 'treemap-leaf')
        .attr('transform', function (d) { return 'translate(' + d.x0 + ',' + d.y0 + ')'; })
        .style('cursor', 'pointer');

      leaves.append('rect')
        .attr('width', function (d) { return Math.max(0, d.x1 - d.x0); })
        .attr('height', function (d) { return Math.max(0, d.y1 - d.y0); })
        .attr('fill', function (d) { return d.parent.data.color; })
        .attr('fill-opacity', 0.7)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1)
        .attr('rx', 4)
        .on('mouseenter', function (event, d) {
          d3.select(this).attr('fill-opacity', 1.0);
          var it = d.data;
          var html = '<div style="font-weight:700; font-size:13px; margin-bottom:4px; color:' + theme.text + ';">' + it.name + '</div>' +
            '<div style="font-size:11px; margin-bottom:6px;"><span style="padding:2px 6px; border-radius:4px; background:' + d.parent.data.color + '; color:#ffffff; font-weight:600;">' + it.actionTag + '</span></div>' +
            '<div style="font-size:11.5px; display:grid; grid-template-columns:auto auto; gap:3px 8px;">' +
            '<span>Active ARR:</span><strong>' + formatCurrency(it.activeArr) + '</strong>' +
            '<span>ARR at Risk:</span><strong>' + formatCurrency(it.atRiskArr) + '</strong>' +
            '<span>Risk Score:</span><strong>' + it.riskScore.toFixed(1) + ' / 100</strong>' +
            '<span>Utilization:</span><strong>' + it.utilization.toFixed(1) + '%</strong>' +
            '</div>';
          tooltip.html(html).style('visibility', 'visible');
        })
        .on('mousemove', function (event) {
          var coords = d3.pointer(event, wrapper);
          tooltip.style('top', (coords[1] + 15) + 'px').style('left', (coords[0] + 15) + 'px');
        })
        .on('mouseleave', function () {
          d3.select(this).attr('fill-opacity', 0.7);
          tooltip.style('visibility', 'hidden');
        })
        .on('click', function (event, d) {
          if (d.data.links && d.data.links.length > 0 && typeof LookerCharts !== 'undefined' && LookerCharts.Utils) {
            LookerCharts.Utils.openDrillMenu({ links: d.data.links, event: event });
          } else if (self.drill && d.data.rawRow) {
            self.drill(event, d.data.rawRow);
          }
        });

      leaves.each(function (d) {
        var boxW = d.x1 - d.x0;
        var boxH = d.y1 - d.y0;
        if (boxW > 60 && boxH > 30) {
          var node = d3.select(this);
          node.append('text')
            .attr('x', 6)
            .attr('y', 15)
            .attr('fill', '#ffffff')
            .attr('font-size', '10.5px')
            .attr('font-weight', '600')
            .style('pointer-events', 'none')
            .text(function () {
              var txt = d.data.name;
              return txt.length > 15 ? txt.substring(0, 14) + '…' : txt;
            });

          if (boxH > 45) {
            node.append('text')
              .attr('x', 6)
              .attr('y', 29)
              .attr('fill', '#ffffff')
              .attr('font-size', '9.5px')
              .attr('font-weight', '500')
              .style('pointer-events', 'none')
              .text(formatCurrency(d.data.activeArr));
          }
        }
      });
    },

    // ------------------------------------------------------------------
    // MODE 4: High-Density Executive Customer Success Scorecard Table
    // ------------------------------------------------------------------
    _renderScorecardTable: function (d3, wrapper, items, theme, config, totalActive, totalAtRisk) {
      var self = this;
      var container = document.createElement('div');
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.overflow = 'auto';
      container.style.padding = '12px 16px';
      container.style.boxSizing = 'border-box';
      wrapper.appendChild(container);

      var table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '12px';

      var thead = document.createElement('thead');
      thead.innerHTML = '<tr style="border-bottom: 2px solid ' + theme.border + '; color:' + theme.subtext + '; text-align:left;">' +
        '<th style="padding:8px 10px; font-weight:600;">Customer Account</th>' +
        '<th style="padding:8px 10px; font-weight:600;">Risk Band</th>' +
        '<th style="padding:8px 10px; font-weight:600; text-align:right;">Active ARR</th>' +
        '<th style="padding:8px 10px; font-weight:600; text-align:right;">ARR at Risk</th>' +
        '<th style="padding:8px 10px; font-weight:600; text-align:center;">Churn Risk Score</th>' +
        '<th style="padding:8px 10px; font-weight:600; text-align:center;">Seat Utilization</th>' +
        '<th style="padding:8px 10px; font-weight:600; text-align:center;">Recommended Action</th>' +
        '</tr>';
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      items.forEach(function (it, i) {
        var tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid ' + theme.border;
        tr.style.backgroundColor = (i % 2 === 0) ? theme.bg : theme.cardBg;
        tr.style.cursor = 'pointer';

        tr.addEventListener('mouseenter', function () {
          tr.style.backgroundColor = theme.zoneWatch;
        });
        tr.addEventListener('mouseleave', function () {
          tr.style.backgroundColor = (i % 2 === 0) ? theme.bg : theme.cardBg;
        });
        tr.addEventListener('click', function (e) {
          if (it.links && it.links.length > 0 && typeof LookerCharts !== 'undefined' && LookerCharts.Utils) {
            LookerCharts.Utils.openDrillMenu({ links: it.links, event: e });
          } else if (self.drill && it.rawRow) {
            self.drill(e, it.rawRow);
          }
        });

        // Pill Color
        var pillColor = theme.thriving;
        if (it.actionClass === 'critical') pillColor = theme.critical;
        else if (it.actionClass === 'mismatch') pillColor = theme.mismatch;
        else if (it.actionClass === 'watch') pillColor = theme.watch;

        var riskBarW = Math.min(100, Math.max(0, it.riskScore));
        var utilBarW = Math.min(100, Math.max(0, it.utilization));

        tr.innerHTML = '<td style="padding:8px 10px; font-weight:600; color:' + theme.text + ';">' + it.name + '</td>' +
          '<td style="padding:8px 10px;"><span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:10.5px; font-weight:600; background:' + theme.cardBg + '; border:1px solid ' + theme.border + '; color:' + theme.subtext + ';">' + it.band + '</span></td>' +
          '<td style="padding:8px 10px; text-align:right; font-weight:700; color:' + theme.text + ';">' + formatCurrency(it.activeArr) + '</td>' +
          '<td style="padding:8px 10px; text-align:right; font-weight:700; color:' + (it.atRiskArr > 0 ? theme.critical : theme.subtext) + ';">' + formatCurrency(it.atRiskArr) + '</td>' +
          '<td style="padding:8px 10px; text-align:center;">' +
            '<div style="display:inline-flex; align-items:center; gap:6px;">' +
              '<div style="width:60px; height:6px; border-radius:3px; background:' + theme.border + '; overflow:hidden;">' +
                '<div style="width:' + riskBarW + '%; height:100%; background:' + (it.riskScore >= 50 ? theme.critical : theme.watch) + ';"></div>' +
              '</div>' +
              '<span style="font-weight:600; font-size:11px;">' + it.riskScore.toFixed(0) + '</span>' +
            '</div>' +
          '</td>' +
          '<td style="padding:8px 10px; text-align:center;">' +
            '<div style="display:inline-flex; align-items:center; gap:6px;">' +
              '<div style="width:60px; height:6px; border-radius:3px; background:' + theme.border + '; overflow:hidden;">' +
                '<div style="width:' + utilBarW + '%; height:100%; background:' + (it.utilization < 65 ? theme.watch : theme.thriving) + ';"></div>' +
              '</div>' +
              '<span style="font-weight:600; font-size:11px;">' + it.utilization.toFixed(0) + '%</span>' +
            '</div>' +
          '</td>' +
          '<td style="padding:8px 10px; text-align:center;">' +
            '<span style="display:inline-block; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:700; background:' + pillColor + '; color:#ffffff;">' + it.actionTag + '</span>' +
          '</td>';

        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      container.appendChild(table);
    }
  });
})();
