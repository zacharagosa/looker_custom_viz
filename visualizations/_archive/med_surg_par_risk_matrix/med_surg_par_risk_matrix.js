/**
 * Med-Surg Par Level & Inventory Expiration Risk Matrix
 * Google Cloud Looker Custom Visualization
 * Built with D3.js v7
 *
 * Implements an executive-grade clinical supply chain optimization matrix for hospital materials management:
 * 1. par_risk_quadrant: Par Attainment Ratio (Y) vs Days on Hand (X) Scatter/Bubble Matrix
 *    with quadrant risk shading (Under-Par Stockout Risk, Optimal Par Buffer, Capital Locked Overstock, Expiration Hazard),
 *    min/max DOH reference lines, bubble magnitude scaling by On-Hand $, and drill-down links.
 * 2. par_actual_dumbbell: Paired Par Target vs On-Hand Divergence Dumbbells
 *    with variance bridges, directional delta badges, and stockout incident alert tags.
 * 3. expiration_waste_grid: 2D Care Setting × Product Category Expiration Hazard Matrix
 *    mapping expired inventory waste, at-risk capital, and par attainment percentages.
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
    wellverse_healthcare: {
      name: 'Wellverse Healthcare',
      primary: '#143359',
      critical: '#b91c1c', // Stockout Red
      high: '#ea580c',     // Critical Shortage Orange
      medium: '#d97706',   // Warning Amber
      optimal: '#059669',  // Balanced Par Green
      excess: '#0284c7',   // Overstock Blue
      waste: '#9333ea',    // Expired Waste Purple
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: '#e2e8f0',
      track: '#f8fafc',
      cardBg: '#ffffff',
      grid: '#f1f5f9',
      refLine: '#94a3b8'
    },
    executive_slate: {
      name: 'Executive Slate (Classic Few)',
      primary: '#1e40af',
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      optimal: '#10b981',
      excess: '#64748b',
      waste: '#8b5cf6',
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: '#e2e8f0',
      track: '#f8fafc',
      cardBg: '#f8fafc',
      grid: '#f1f5f9',
      refLine: '#64748b'
    },
    google_enterprise: {
      name: 'Google Enterprise',
      primary: '#1a73e8',
      critical: '#ea4335',
      high: '#f29900',
      medium: '#f9ab00',
      optimal: '#34a853',
      excess: '#4285f4',
      waste: '#a142f4',
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      border: '#dadce0',
      track: '#f8f9fa',
      cardBg: '#ffffff',
      grid: '#f1f3f4',
      refLine: '#fbbc04'
    },
    modern_slate: {
      name: 'Modern Slate',
      primary: '#0f172a',
      critical: '#f43f5e',
      high: '#fb923c',
      medium: '#facc15',
      optimal: '#10b981',
      excess: '#38bdf8',
      waste: '#c084fc',
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: '#cbd5e1',
      track: '#f1f5f9',
      cardBg: '#f8fafc',
      grid: '#e2e8f0',
      refLine: '#94a3b8'
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark (Midnight)',
      primary: '#38bdf8',
      critical: '#f43f5e',
      high: '#fb923c',
      medium: '#facc15',
      optimal: '#10b981',
      excess: '#818cf8',
      waste: '#e879f9',
      bg: '#0f172a',
      text: '#f8fafc',
      subtext: '#94a3b8',
      border: '#334155',
      track: '#1e293b',
      cardBg: '#1e293b',
      grid: '#1e293b',
      refLine: '#38bdf8'
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      primary: '#065f46',
      critical: '#dc2626',
      high: '#d97706',
      medium: '#ca8a04',
      optimal: '#059669',
      excess: '#0d9488',
      waste: '#7c3aed',
      bg: '#ffffff',
      text: '#064e3b',
      subtext: '#047857',
      border: '#a7f3d0',
      track: '#f0fdf4',
      cardBg: '#f0fdf4',
      grid: '#d1fae5',
      refLine: '#059669'
    },
    sunset_media: {
      name: 'Sunset Media',
      primary: '#c2410c',
      critical: '#be123c',
      high: '#ea580c',
      medium: '#d97706',
      optimal: '#059669',
      excess: '#4338ca',
      waste: '#a21caf',
      bg: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      border: '#fed7aa',
      track: '#fff7ed',
      cardBg: '#fff7ed',
      grid: '#ffedd5',
      refLine: '#ea580c'
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
    return (defaultIdx >= 0 && defaultIdx < list.length) ? list[defaultIdx] : (list[0] || null);
  }

  function formatValue(val, fmt, lookerRendered) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    if (fmt === 'auto' && lookerRendered) return lookerRendered;
    var abs = Math.abs(val);
    var sign = val < 0 ? '-' : '';

    switch (fmt) {
      case 'compact_currency':
        if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
        if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
        if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
        return sign + '$' + abs.toFixed(abs % 1 === 0 ? 0 : 2);
      case 'full_currency':
        return sign + '$' + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      case 'compact_number':
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + 'B';
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + 'M';
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
        return sign + (abs >= 10 ? Math.round(abs).toLocaleString() : abs.toFixed(1));
      case 'percentage':
        return (val * (abs <= 1.0 ? 100 : 1)).toFixed(1) + '%';
      case 'decimal_2':
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'raw':
        return String(val);
      case 'auto':
      default:
        if (lookerRendered) return lookerRendered;
        if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
        if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
        if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
        return sign + abs.toLocaleString();
    }
  }

  var visObject = {
    id: 'med_surg_par_risk_matrix',
    label: 'Med-Surg Par Level & Inventory Expiration Risk Matrix',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'Clinical Supply Paradigm Mode',
        display: 'select',
        values: [
          { 'Par Attainment vs DOH Risk Quadrant (Scatter/Bubble)': 'par_risk_quadrant' },
          { 'Paired Par Target vs On-Hand Divergence Dumbbells': 'par_actual_dumbbell' },
          { 'Care Setting × Category Expiration Hazard Heat Matrix': 'expiration_waste_grid' }
        ],
        default: 'par_risk_quadrant',
        section: 'Display',
        order: 1
      },
      primDimOverride: {
        type: 'string',
        label: 'Primary Dimension (Care Setting / Facility)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 2
      },
      secDimOverride: {
        type: 'string',
        label: 'Secondary Dimension (Product Category)',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 3
      },
      onHandMeasureOverride: {
        type: 'string',
        label: 'On-Hand Inventory Value ($)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 4
      },
      parMeasureOverride: {
        type: 'string',
        label: 'Par Level Target Value ($)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 5
      },
      dohMeasureOverride: {
        type: 'string',
        label: 'Days on Hand (DOH) Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 6
      },
      expiredMeasureOverride: {
        type: 'string',
        label: 'Expired Inventory Waste ($)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 7
      },
      stockoutMeasureOverride: {
        type: 'string',
        label: 'Stockout Incidents / Events Count',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 8
      },
      targetMode: {
        type: 'string',
        label: 'Par Attainment Benchmark Mode',
        display: 'select',
        values: [
          { 'Par Measure from Query (100% Target)': 'second_measure' },
          { 'Fixed Static Par Target %': 'fixed' },
          { 'Dataset Mean (Group Average Par Attainment)': 'dataset_mean' },
          { 'Dataset Median (Group Median)': 'dataset_median' },
          { 'Top Percentile P75 Target': 'percentile_p75' },
          { 'Top Percentile P90 Target': 'percentile_p90' }
        ],
        default: 'second_measure',
        section: 'Display',
        order: 9
      },
      fixedParTarget: {
        type: 'number',
        label: 'Fixed Par Attainment Target (%)',
        default: 100,
        section: 'Display',
        order: 10
      },
      minSafeDoh: {
        type: 'number',
        label: 'Minimum Safe DOH Horizon (Days)',
        default: 14,
        section: 'Display',
        order: 11
      },
      maxBufferDoh: {
        type: 'number',
        label: 'Maximum Par Buffer DOH (Days)',
        default: 30,
        section: 'Display',
        order: 12
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Benchmark Reference Line Label',
        default: 'Par Target Buffer',
        section: 'Display',
        order: 13
      },
      sortBy: {
        type: 'string',
        label: 'Sort Items By',
        display: 'select',
        values: [
          { 'Highest On-Hand Inventory Value ($)': 'on_hand_desc' },
          { 'Highest Over-Par Dollar Variance ($)': 'variance_desc' },
          { 'Lowest Par Attainment (Stockout Danger)': 'par_ratio_asc' },
          { 'Most Stockout Incidents First': 'stockouts_desc' },
          { 'Highest Expired Waste ($)': 'expired_desc' },
          { 'Lowest Days on Hand (DOH)': 'doh_asc' },
          { 'Alphabetical A-Z': 'alphabetical' }
        ],
        default: 'on_hand_desc',
        section: 'Display',
        order: 14
      },
      topNLimit: {
        type: 'number',
        label: 'Top-N Items Limit (0 = All, Max 50)',
        default: 0,
        section: 'Display',
        order: 15
      },
      enableOtherRollup: {
        type: 'boolean',
        label: 'Group Remaining into "Other" Rollup Item',
        default: false,
        section: 'Display',
        order: 16
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Suppress Zero / Null Inventory Items',
        default: false,
        section: 'Display',
        order: 17
      },
      hudMode: {
        type: 'string',
        label: 'Executive KPI Scorecard HUD',
        display: 'select',
        values: [
          { 'Full Scorecard HUD (Top Band)': 'scorecard' },
          { 'Compact Metric Strip': 'compact_strip' },
          { 'Hidden': 'hidden' }
        ],
        default: 'scorecard',
        section: 'Display',
        order: 18
      },
      showValueLabels: {
        type: 'string',
        label: 'Data Value Readouts',
        display: 'select',
        values: [
          { 'Show All Numbers': 'all' },
          { 'Critical Peaks & Shortages Only': 'peaks_only' },
          { 'Hidden': 'hidden' }
        ],
        default: 'all',
        section: 'Display',
        order: 19
      },
      customTitle: {
        type: 'string',
        label: 'Custom Scorecard Title Override',
        default: '',
        section: 'Display',
        order: 20
      },
      customSubtitle: {
        type: 'string',
        label: 'Custom Scorecard Subtitle Override',
        default: '',
        section: 'Display',
        order: 21
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Search Filter Bar',
        default: true,
        section: 'Display',
        order: 22
      },
      showLegend: {
        type: 'boolean',
        label: 'Show Legend & Risk Range Indicators',
        default: true,
        section: 'Display',
        order: 23
      },
      showGridLines: {
        type: 'boolean',
        label: 'Show Coordinate Grid Lines',
        default: true,
        section: 'Display',
        order: 24
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorPalette: {
        type: 'string',
        label: 'Clinical Brand Theme',
        display: 'select',
        values: [
          { 'Wellverse Healthcare': 'wellverse_healthcare' },
          { 'Executive Slate (Classic Few)': 'executive_slate' },
          { 'Google Enterprise': 'google_enterprise' },
          { 'Modern Slate': 'modern_slate' },
          { 'Cyberpunk Dark (Midnight)': 'cyberpunk_dark' },
          { 'Emerald FinOps': 'emerald_finops' },
          { 'Sunset Media': 'sunset_media' },
          { 'Custom Hex Override': 'custom' }
        ],
        default: 'wellverse_healthcare',
        section: 'Style',
        order: 1
      },
      customPrimaryColor: {
        type: 'string',
        label: 'Custom Primary Accent Color (Hex)',
        display: 'color',
        default: '',
        section: 'Style',
        order: 2
      },
      customAlertColor: {
        type: 'string',
        label: 'Custom Shortage Alert Color (Hex)',
        display: 'color',
        default: '',
        section: 'Style',
        order: 3
      },
      customExcessColor: {
        type: 'string',
        label: 'Custom Overstock / Excess Color (Hex)',
        display: 'color',
        default: '',
        section: 'Style',
        order: 4
      },
      metricPolarity: {
        type: 'string',
        label: 'Par Variance Polarity',
        display: 'select',
        values: [
          { 'Balanced Par is Better (Near 100% Target)': 'balanced_is_better' },
          { 'Higher On-Hand is Better (Surplus Safety)': 'higher_is_better' },
          { 'Lean Low Inventory is Better (Just-in-Time)': 'lower_is_better' }
        ],
        default: 'balanced_is_better',
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
        label: 'Value Formatting Style',
        display: 'select',
        values: [
          { 'Auto (from Looker Field Format)': 'auto' },
          { 'Compact Currency ($1.2M, $450K)': 'compact_currency' },
          { 'Full Currency ($1,234,567)': 'full_currency' },
          { 'Compact Number (1.2M, 450K)': 'compact_number' },
          { 'Percentage (100.0%)': 'percentage' },
          { 'Decimal (1,234.56)': 'decimal_2' },
          { 'Raw Unformatted': 'raw' }
        ],
        default: 'compact_currency',
        section: 'Style',
        order: 7
      },
      bubbleMinRadius: {
        type: 'number',
        label: 'Bubble Minimum Radius (px)',
        default: 6,
        section: 'Style',
        order: 8
      },
      bubbleMaxRadius: {
        type: 'number',
        label: 'Bubble Maximum Radius (px)',
        default: 26,
        section: 'Style',
        order: 9
      },
      rowHeight: {
        type: 'number',
        label: 'Row / Item Height in Dumbbell Mode (px)',
        default: 54,
        section: 'Style',
        order: 10
      },
      enableAnimation: {
        type: 'boolean',
        label: 'Enable Smooth Render Transitions',
        default: true,
        section: 'Style',
        order: 11
      }
    },

    // ------------------------------------------------------------------
    // Dynamic Field-Role Dropdowns
    // ------------------------------------------------------------------
    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        primDimOverride: { role: 'dimension', defaultIdx: 0 },
        secDimOverride: { role: 'dimension', defaultIdx: 1 },
        onHandMeasureOverride: { role: 'measure', defaultIdx: 0 },
        parMeasureOverride: { role: 'measure', defaultIdx: 1 },
        dohMeasureOverride: { role: 'measure', defaultIdx: 2 },
        expiredMeasureOverride: { role: 'measure', defaultIdx: 3 },
        stockoutMeasureOverride: { role: 'measure', defaultIdx: 4 }
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
        var list = spec.role === 'measure' ? meas : dims;
        var autoField = (spec.defaultIdx >= 0 && spec.defaultIdx < list.length) ? list[spec.defaultIdx] : null;
        var autoLabel = autoField ? ('Auto \u2192 ' + fieldLabel(autoField)) : (spec.defaultIdx === -1 ? 'Auto / None' : 'Auto');

        var vals = [{ [autoLabel]: '' }];
        list.forEach(function (fld) {
          vals.push({ [fieldLabel(fld)]: fld.name });
        });
        newOptions[key].values = vals;
      });

      try {
        self.trigger('registerOptions', newOptions);
      } catch (e) {
        console.warn('med_surg_par_risk_matrix registerOptions warning:', e);
      }
    },

    create: function (element, config) {
      element.style.boxSizing = 'border-box';
      element.style.padding = '0';
      element.style.margin = '0';
      element.style.overflow = 'hidden';
      element.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

      var container = document.createElement('div');
      container.className = 'looker-par-matrix-container';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.boxSizing = 'border-box';
      container.style.overflow = 'hidden';
      element.appendChild(container);

      this._searchTerm = '';
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      this._registerDynamicFieldOptions(queryResponse);

      var self = this;
      self._lastData = data;
      self._lastElement = element;
      self._lastConfig = config;
      self._lastQueryResponse = queryResponse;
      self._lastDetails = details;

      if (!self._resizeObserver && typeof ResizeObserver !== 'undefined') {
        var lastH = element.clientHeight;
        var lastW = element.clientWidth;
        self._resizeObserver = new ResizeObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            var cr = entries[i].contentRect;
            if (Math.abs(cr.height - lastH) >= 4 || Math.abs(cr.width - lastW) >= 4) {
              lastH = cr.height;
              lastW = cr.width;
              if (self._lastData && self._lastQueryResponse) {
                self.updateAsync(self._lastData, self._lastElement, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
              }
            }
          }
        });
        self._resizeObserver.observe(element);
      }

      if (!data || data.length === 0) {
        this.addError({
          title: 'No Data',
          message: 'The query returned no data rows to visualize.'
        });
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var measures = fields.measures || [];

      if (dims.length === 0) {
        this.addError({
          title: 'Dimension Required',
          message: 'Med-Surg Par Risk Matrix requires at least 1 Dimension (e.g. Care Setting or Facility Name).'
        });
        done();
        return;
      }

      if (measures.length === 0) {
        this.addError({
          title: 'Measure Required',
          message: 'Med-Surg Par Risk Matrix requires at least 1 Measure (On-Hand Value, Par Value, or Days on Hand).'
        });
        done();
        return;
      }

      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
        } catch (err) {
          console.error('Med-Surg Par Risk Matrix render error:', err);
          self.addError({
            title: 'Rendering Error',
            message: err.message || 'An unexpected error occurred while rendering the visualization.'
          });
        }
        done();
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;
      var container = element.querySelector('.looker-par-matrix-container');
      if (!container) return;
      container.innerHTML = '';

      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var measures = fields.measures || [];

      // 1. RESOLVE FIELDS
      var primDim = resolveField(dims, config.primDimOverride, 0);
      var secDim = config.secDimOverride ? resolveField(dims, config.secDimOverride, 1) : (dims.length > 1 ? dims[1] : null);

      var onHandField = resolveField(measures, config.onHandMeasureOverride, 0);
      var parField = config.parMeasureOverride ? resolveField(measures, config.parMeasureOverride, 1) : (measures.length > 1 ? measures[1] : null);
      var dohField = config.dohMeasureOverride ? resolveField(measures, config.dohMeasureOverride, 2) : (measures.length > 2 ? measures[2] : null);
      var expiredField = config.expiredMeasureOverride ? resolveField(measures, config.expiredMeasureOverride, 3) : (measures.length > 3 ? measures[3] : null);
      var stockoutField = config.stockoutMeasureOverride ? resolveField(measures, config.stockoutMeasureOverride, 4) : (measures.length > 4 ? measures[4] : null);

      // 2. THEMES & COLORING
      var themeKey = config.colorPalette || 'wellverse_healthcare';
      var theme = PALETTES[themeKey] ? Object.assign({}, PALETTES[themeKey]) : Object.assign({}, PALETTES.wellverse_healthcare);

      if (themeKey === 'custom' || config.customPrimaryColor || config.customAlertColor || config.customExcessColor) {
        if (config.customPrimaryColor) theme.primary = config.customPrimaryColor;
        if (config.customAlertColor) theme.critical = config.customAlertColor;
        if (config.customExcessColor) theme.excess = config.customExcessColor;
      }

      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      // Font Scaling
      var fontScale = config.fontScale || 'standard';
      var fontScaleMap = {
        compact: { title: '13px', subtitle: '11px', statNum: '13px', statLbl: '9px', label: '11px', badge: '10px' },
        standard: { title: '15px', subtitle: '12px', statNum: '15px', statLbl: '10px', label: '12px', badge: '11px' },
        large: { title: '18px', subtitle: '13px', statNum: '18px', statLbl: '11px', label: '14px', badge: '12px' }
      };
      var fSizes = fontScaleMap[fontScale] || fontScaleMap.standard;

      var valFmt = config.valueFormat || 'compact_currency';
      function fmtVal(v, r) { return formatValue(v, valFmt, r); }

      // 3. PARSE ROWS & COMPUTE DERIVED METRICS
      var rawItems = [];
      var totalOnHand = 0;
      var totalPar = 0;
      var totalExpired = 0;
      var totalStockouts = 0;

      data.forEach(function (row, idx) {
        var primVal = primDim && row[primDim.name] ? (row[primDim.name].rendered || row[primDim.name].value) : ('Facility ' + (idx + 1));
        var secVal = secDim && row[secDim.name] ? (row[secDim.name].rendered || row[secDim.name].value) : '';

        var onHandVal = onHandField && row[onHandField.name] && row[onHandField.name].value !== null ? Number(row[onHandField.name].value) : 0;
        var parVal = parField && row[parField.name] && row[parField.name].value !== null ? Number(row[parField.name].value) : (onHandVal * 0.85);
        var dohVal = dohField && row[dohField.name] && row[dohField.name].value !== null ? Number(row[dohField.name].value) : 21.0;
        var expiredVal = expiredField && row[expiredField.name] && row[expiredField.name].value !== null ? Number(row[expiredField.name].value) : 0;
        var stockoutVal = stockoutField && row[stockoutField.name] && row[stockoutField.name].value !== null ? Number(row[stockoutField.name].value) : 0;

        if (config.suppressZeroNull && onHandVal === 0 && parVal === 0) return;

        var parRatio = parVal > 0 ? (onHandVal / parVal) : 1.0;
        var parVariance = onHandVal - parVal;

        totalOnHand += onHandVal;
        totalPar += parVal;
        totalExpired += expiredVal;
        totalStockouts += stockoutVal;

        // Drill links
        var links = [];
        if (primDim && row[primDim.name] && row[primDim.name].links) {
          links = links.concat(row[primDim.name].links);
        }
        if (onHandField && row[onHandField.name] && row[onHandField.name].links) {
          links = links.concat(row[onHandField.name].links);
        }

        // Determine Risk Tier
        // Critical: Par Ratio < 80% or DOH < minSafeDoh
        // Optimal: 80% - 120% Par
        // Overstock: 120% - 160% Par
        // Waste/Danger: > 160% Par or high expired value
        var minSafeDoh = Number(config.minSafeDoh) || 14;
        var maxBufferDoh = Number(config.maxBufferDoh) || 30;

        var riskTier = 'optimal';
        var riskLabel = 'Balanced Par';
        var riskColor = theme.optimal;

        if (parRatio < 0.8 || dohVal < minSafeDoh || stockoutVal > 2) {
          riskTier = 'critical';
          riskLabel = 'Stockout Danger';
          riskColor = theme.critical;
        } else if (expiredVal > 1500 || parRatio > 1.6 || dohVal > maxBufferDoh * 1.5) {
          riskTier = 'waste';
          riskLabel = 'Expiration Hazard';
          riskColor = theme.waste;
        } else if (parRatio > 1.2 || dohVal > maxBufferDoh) {
          riskTier = 'excess';
          riskLabel = 'Overstocked Capital';
          riskColor = theme.excess;
        }

        rawItems.push({
          rawRow: row,
          primary: primVal,
          secondary: secVal,
          displayName: secVal ? (primVal + ' \u2014 ' + secVal) : primVal,
          onHand: onHandVal,
          onHandRendered: onHandField && row[onHandField.name] ? row[onHandField.name].rendered : null,
          par: parVal,
          parRendered: parField && row[parField.name] ? row[parField.name].rendered : null,
          doh: dohVal,
          expired: expiredVal,
          expiredRendered: expiredField && row[expiredField.name] ? row[expiredField.name].rendered : null,
          stockouts: stockoutVal,
          parRatio: parRatio,
          parVariance: parVariance,
          riskTier: riskTier,
          riskLabel: riskLabel,
          riskColor: riskColor,
          links: links
        });
      });

      // 4. SORTING & TOP-N FILTERING
      var sortBy = config.sortBy || 'on_hand_desc';
      rawItems.sort(function (a, b) {
        switch (sortBy) {
          case 'variance_desc': return b.parVariance - a.parVariance;
          case 'par_ratio_asc': return a.parRatio - b.parRatio;
          case 'stockouts_desc': return b.stockouts - a.stockouts;
          case 'expired_desc': return b.expired - a.expired;
          case 'doh_asc': return a.doh - b.doh;
          case 'alphabetical': return a.displayName.localeCompare(b.displayName);
          case 'on_hand_desc':
          default:
            return b.onHand - a.onHand;
        }
      });

      var displayItems = rawItems;
      var topN = Number(config.topNLimit) || 0;
      if (topN > 0 && rawItems.length > topN) {
        displayItems = rawItems.slice(0, topN);
        if (config.enableOtherRollup) {
          var otherSlice = rawItems.slice(topN);
          var otherOnHand = otherSlice.reduce(function (s, r) { return s + r.onHand; }, 0);
          var otherPar = otherSlice.reduce(function (s, r) { return s + r.par; }, 0);
          var otherExpired = otherSlice.reduce(function (s, r) { return s + r.expired; }, 0);
          var otherStockouts = otherSlice.reduce(function (s, r) { return s + r.stockouts; }, 0);
          var otherDoh = otherSlice.reduce(function (s, r) { return s + r.doh; }, 0) / otherSlice.length;

          displayItems.push({
            primary: 'Other Categories (' + otherSlice.length + ' Rollup)',
            secondary: '',
            displayName: 'Other Categories (' + otherSlice.length + ' Rollup)',
            onHand: otherOnHand,
            par: otherPar,
            doh: otherDoh,
            expired: otherExpired,
            stockouts: otherStockouts,
            parRatio: otherPar > 0 ? (otherOnHand / otherPar) : 1.0,
            parVariance: otherOnHand - otherPar,
            riskTier: 'excess',
            riskLabel: 'Aggregate Rollup',
            riskColor: theme.excess,
            links: []
          });
        }
      }

      // Live Search Filter
      var filteredItems = displayItems;
      if (self._searchTerm) {
        var term = self._searchTerm.toLowerCase();
        filteredItems = displayItems.filter(function (it) {
          return it.displayName.toLowerCase().indexOf(term) !== -1 || it.riskLabel.toLowerCase().indexOf(term) !== -1;
        });
      }

      // 5. EXECUTIVE KPI SCORECARD HUD
      var hudMode = config.hudMode || 'scorecard';
      if (hudMode !== 'hidden') {
        var hudHeader = document.createElement('div');
        hudHeader.className = 'par-matrix-hud';
        hudHeader.style.display = 'flex';
        hudHeader.style.flexWrap = 'wrap';
        hudHeader.style.alignItems = 'center';
        hudHeader.style.justifyContent = 'space-between';
        hudHeader.style.gap = '10px';
        hudHeader.style.padding = hudMode === 'compact_strip' ? '6px 14px' : '10px 16px';
        hudHeader.style.borderBottom = '1px solid ' + (themeKey === 'cyberpunk_dark' ? '#334155' : theme.grid);
        hudHeader.style.backgroundColor = hudMode === 'compact_strip' ? (themeKey === 'cyberpunk_dark' ? '#1e293b' : '#f8fafc') : (themeKey === 'cyberpunk_dark' ? '#0f172a' : theme.cardBg);

        var titleBlock = document.createElement('div');
        var mainTitle = document.createElement('div');
        mainTitle.style.fontSize = fSizes.title;
        mainTitle.style.fontWeight = '700';
        mainTitle.style.color = theme.text;
        mainTitle.textContent = config.customTitle || ((primDim ? (primDim.label_short || primDim.label) : 'Med-Surg Supply') + ' \u2014 Par Attainment & Expiration Risk');

        var subTitle = document.createElement('div');
        subTitle.style.fontSize = fSizes.subtitle;
        subTitle.style.color = theme.subtext;
        subTitle.style.marginTop = '2px';
        var criticalCount = rawItems.filter(function (r) { return r.riskTier === 'critical'; }).length;
        var wasteCount = rawItems.filter(function (r) { return r.riskTier === 'waste'; }).length;
        subTitle.textContent = config.customSubtitle ? config.customSubtitle : (rawItems.length + ' Categories Evaluated \u2022 ' + criticalCount + ' Critical Shortages \u2022 ' + wasteCount + ' Expiration Hazards');

        titleBlock.appendChild(mainTitle);
        titleBlock.appendChild(subTitle);
        hudHeader.appendChild(titleBlock);

        var statsBox = document.createElement('div');
        statsBox.style.display = 'flex';
        statsBox.style.gap = '8px';
        statsBox.style.flexWrap = 'wrap';
        statsBox.style.alignItems = 'center';

        function makeHudCard(lbl, val, color) {
          var card = document.createElement('div');
          card.style.background = themeKey === 'cyberpunk_dark' ? '#1e293b' : '#ffffff';
          card.style.border = '1px solid ' + (themeKey === 'cyberpunk_dark' ? '#334155' : theme.border);
          card.style.borderRadius = '6px';
          card.style.padding = hudMode === 'compact_strip' ? '4px 8px' : '5px 10px';
          card.style.display = 'flex';
          card.style.flexDirection = 'column';

          var l = document.createElement('span');
          l.style.fontSize = fSizes.statLbl;
          l.style.textTransform = 'uppercase';
          l.style.letterSpacing = '0.04em';
          l.style.color = theme.subtext;
          l.textContent = lbl;

          var v = document.createElement('span');
          v.style.fontSize = fSizes.statNum;
          v.style.fontWeight = '700';
          v.style.color = color || theme.text;
          v.textContent = val;

          card.appendChild(l);
          card.appendChild(v);
          return card;
        }

        statsBox.appendChild(makeHudCard('Total On-Hand', fmtVal(totalOnHand), theme.primary));
        statsBox.appendChild(makeHudCard('Par Target', fmtVal(totalPar), theme.optimal));
        var overallParPct = totalPar > 0 ? ((totalOnHand / totalPar) * 100).toFixed(1) + '%' : '100%';
        statsBox.appendChild(makeHudCard('Par Attainment', overallParPct, (totalOnHand >= totalPar ? theme.optimal : theme.critical)));
        statsBox.appendChild(makeHudCard('Expired Waste', fmtVal(totalExpired), theme.waste));
        statsBox.appendChild(makeHudCard('Stockout Events', totalStockouts.toLocaleString(), (totalStockouts > 0 ? theme.critical : theme.optimal)));

        hudHeader.appendChild(statsBox);
        container.appendChild(hudHeader);
      }

      // Search & Controls Bar
      if (config.showSearch) {
        var searchRow = document.createElement('div');
        searchRow.style.display = 'flex';
        searchRow.style.alignItems = 'center';
        searchRow.style.justifyContent = 'space-between';
        searchRow.style.padding = '6px 16px';
        searchRow.style.borderBottom = '1px solid ' + (themeKey === 'cyberpunk_dark' ? '#334155' : theme.grid);
        searchRow.style.backgroundColor = themeKey === 'cyberpunk_dark' ? '#0f172a' : '#fafafa';

        var searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '\ud83d\udd0d Filter hospital facility or category...';
        searchInput.value = self._searchTerm || '';
        searchInput.style.padding = '4px 10px';
        searchInput.style.fontSize = '12px';
        searchInput.style.border = '1px solid ' + theme.border;
        searchInput.style.borderRadius = '4px';
        searchInput.style.outline = 'none';
        searchInput.style.width = '240px';
        searchInput.style.background = themeKey === 'cyberpunk_dark' ? '#1e293b' : '#ffffff';
        searchInput.style.color = theme.text;

        searchInput.addEventListener('input', function (e) {
          self._searchTerm = e.target.value;
          self._render(d3, data, element, config, queryResponse);
        });

        searchRow.appendChild(searchInput);

        // Legend Pills
        if (config.showLegend) {
          var legendBox = document.createElement('div');
          legendBox.style.display = 'flex';
          legendBox.style.gap = '8px';
          legendBox.style.alignItems = 'center';

          function makeLegendPill(label, color) {
            var pill = document.createElement('span');
            pill.style.display = 'inline-flex';
            pill.style.alignItems = 'center';
            pill.style.gap = '4px';
            pill.style.fontSize = '11px';
            pill.style.color = theme.subtext;

            var dot = document.createElement('span');
            dot.style.width = '8px';
            dot.style.height = '8px';
            dot.style.borderRadius = '50%';
            dot.style.backgroundColor = color;

            pill.appendChild(dot);
            pill.appendChild(document.createTextNode(label));
            return pill;
          }

          legendBox.appendChild(makeLegendPill('Critical Stockout Danger', theme.critical));
          legendBox.appendChild(makeLegendPill('Balanced Par', theme.optimal));
          legendBox.appendChild(makeLegendPill('Overstock Capital', theme.excess));
          legendBox.appendChild(makeLegendPill('Expiration Hazard', theme.waste));

          searchRow.appendChild(legendBox);
        }

        container.appendChild(searchRow);
      }

      // Visualization Content Body
      var chartWrapper = document.createElement('div');
      chartWrapper.className = 'par-matrix-chart-wrapper';
      chartWrapper.style.flex = '1 1 0';
      chartWrapper.style.minHeight = '0';
      chartWrapper.style.position = 'relative';
      chartWrapper.style.overflow = 'auto';
      container.appendChild(chartWrapper);

      var width = chartWrapper.clientWidth || container.clientWidth || 800;
      var height = chartWrapper.clientHeight || (element.clientHeight - (hudMode !== 'hidden' ? 80 : 0) - (config.showSearch ? 40 : 0)) || 500;
      if (height < 250) height = 450;

      // Tooltip Element
      var tooltip = d3.select(element).select('.looker-par-matrix-tooltip');
      if (tooltip.empty()) {
        tooltip = d3.select(element).append('div')
          .attr('class', 'looker-par-matrix-tooltip')
          .style('position', 'absolute')
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .style('padding', '8px 12px')
          .style('border-radius', '6px')
          .style('box-shadow', '0 4px 16px rgba(0,0,0,0.15)')
          .style('z-index', 9999)
          .style('font-size', '12px')
          .style('line-height', '1.4');
      }

      tooltip
        .style('background', themeKey === 'cyberpunk_dark' ? '#1e293b' : '#ffffff')
        .style('color', theme.text)
        .style('border', '1px solid ' + (themeKey === 'cyberpunk_dark' ? '#334155' : theme.border));

      var layoutMode = config.layoutMode || 'par_risk_quadrant';

      // ==============================================================
      // MODE 1: PAR RISK QUADRANT (DOH vs Par Ratio Scatter / Bubble)
      // ==============================================================
      if (layoutMode === 'par_risk_quadrant') {
        var margin = { top: 30, right: 30, bottom: 50, left: 65 };
        var innerW = Math.max(width - margin.left - margin.right, 300);
        var innerH = Math.max(height - margin.top - margin.bottom, 250);

        var svg = d3.select(chartWrapper).append('svg')
          .attr('width', innerW + margin.left + margin.right)
          .attr('height', innerH + margin.top + margin.bottom)
          .append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var maxDohVal = d3.max(filteredItems, function (d) { return d.doh; }) || 45;
        var maxDohAxis = Math.max(maxDohVal * 1.15, Number(config.maxBufferDoh) * 1.4);

        var maxParRatioVal = d3.max(filteredItems, function (d) { return d.parRatio; }) || 2.0;
        var maxParAxis = Math.max(maxParRatioVal * 1.15, 2.0);

        var xScale = d3.scaleLinear()
          .domain([0, maxDohAxis])
          .range([0, innerW]);

        var yScale = d3.scaleLinear()
          .domain([0, maxParAxis])
          .range([innerH, 0]);

        var minR = Number(config.bubbleMinRadius) || 6;
        var maxR = Number(config.bubbleMaxRadius) || 26;
        var maxOnHandVal = d3.max(filteredItems, function (d) { return d.onHand; }) || 1;
        var rScale = d3.scaleSqrt()
          .domain([0, maxOnHandVal])
          .range([minR, maxR]);

        // Background Quadrant Shading
        var minSafeDoh = Number(config.minSafeDoh) || 14;
        var maxBufferDoh = Number(config.maxBufferDoh) || 30;

        // Stockout Danger Zone (X < minSafeDoh, Y < 1.0)
        svg.append('rect')
          .attr('x', 0)
          .attr('y', yScale(1.0))
          .attr('width', xScale(minSafeDoh))
          .attr('height', innerH - yScale(1.0))
          .attr('fill', theme.critical)
          .attr('opacity', 0.05);

        // Optimal Par Target Zone (minSafeDoh <= X <= maxBufferDoh, 0.8 <= Y <= 1.2)
        svg.append('rect')
          .attr('x', xScale(minSafeDoh))
          .attr('y', yScale(1.2))
          .attr('width', xScale(maxBufferDoh) - xScale(minSafeDoh))
          .attr('height', yScale(0.8) - yScale(1.2))
          .attr('fill', theme.optimal)
          .attr('opacity', 0.07);

        // Grid Lines
        if (config.showGridLines) {
          svg.append('g')
            .attr('class', 'grid x-grid')
            .attr('transform', 'translate(0,' + innerH + ')')
            .call(d3.axisBottom(xScale).ticks(6).tickSize(-innerH).tickFormat(''))
            .selectAll('line').style('stroke', theme.grid);

          svg.append('g')
            .attr('class', 'grid y-grid')
            .call(d3.axisLeft(yScale).ticks(6).tickSize(-innerW).tickFormat(''))
            .selectAll('line').style('stroke', theme.grid);
        }

        // Target Reference Lines
        // Y = 1.0 (100% Par Target)
        svg.append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', yScale(1.0))
          .attr('y2', yScale(1.0))
          .attr('stroke', theme.refLine)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,4');

        svg.append('text')
          .attr('x', innerW - 6)
          .attr('y', yScale(1.0) - 6)
          .attr('text-anchor', 'end')
          .attr('fill', theme.subtext)
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .text(config.referenceLineLabel || 'Par Level Target (100%)');

        // X = minSafeDoh Reference Line
        svg.append('line')
          .attr('x1', xScale(minSafeDoh))
          .attr('x2', xScale(minSafeDoh))
          .attr('y1', 0)
          .attr('y2', innerH)
          .attr('stroke', theme.critical)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '3,3');

        svg.append('text')
          .attr('x', xScale(minSafeDoh) + 4)
          .attr('y', 14)
          .attr('fill', theme.critical)
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .text('Min Safe DOH (' + minSafeDoh + 'd)');

        // X = maxBufferDoh Reference Line
        svg.append('line')
          .attr('x1', xScale(maxBufferDoh))
          .attr('x2', xScale(maxBufferDoh))
          .attr('y1', 0)
          .attr('y2', innerH)
          .attr('stroke', theme.excess)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '3,3');

        svg.append('text')
          .attr('x', xScale(maxBufferDoh) + 4)
          .attr('y', 14)
          .attr('fill', theme.excess)
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .text('Buffer Ceiling (' + maxBufferDoh + 'd)');

        // Axes
        var xAxis = d3.axisBottom(xScale).ticks(8).tickFormat(function (d) { return d + 'd'; });
        var yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return (d * 100).toFixed(0) + '%'; });

        svg.append('g')
          .attr('transform', 'translate(0,' + innerH + ')')
          .call(xAxis)
          .selectAll('text')
          .style('fill', theme.subtext)
          .style('font-size', fSizes.label);

        svg.append('g')
          .call(yAxis)
          .selectAll('text')
          .style('fill', theme.subtext)
          .style('font-size', fSizes.label);

        // Axis Titles
        svg.append('text')
          .attr('x', innerW / 2)
          .attr('y', innerH + 40)
          .attr('text-anchor', 'middle')
          .attr('fill', theme.subtext)
          .attr('font-size', '12px')
          .attr('font-weight', '600')
          .text('Days on Hand (DOH) Buffer Horizon (Days)');

        svg.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', -innerH / 2)
          .attr('y', -48)
          .attr('text-anchor', 'middle')
          .attr('fill', theme.subtext)
          .attr('font-size', '12px')
          .attr('font-weight', '600')
          .text('Par Attainment Ratio (On-Hand Value / Par Value %)');

        // Render Bubbles
        var bubbles = svg.selectAll('.par-bubble')
          .data(filteredItems)
          .enter()
          .append('g')
          .attr('class', 'par-bubble')
          .style('cursor', function (d) { return (d.links && d.links.length) ? 'pointer' : 'default'; });

        bubbles.append('circle')
          .attr('cx', function (d) { return xScale(d.doh); })
          .attr('cy', function (d) { return yScale(d.parRatio); })
          .attr('r', function (d) { return rScale(d.onHand); })
          .attr('fill', function (d) { return d.riskColor; })
          .attr('fill-opacity', 0.72)
          .attr('stroke', function (d) { return d.riskColor; })
          .attr('stroke-width', 2);

        // Bubble Value Labels
        if (config.showValueLabels !== 'hidden') {
          bubbles.each(function (d) {
            var showLbl = config.showValueLabels === 'all' || (config.showValueLabels === 'peaks_only' && (d.riskTier === 'critical' || d.riskTier === 'waste'));
            if (!showLbl) return;

            var g = d3.select(this);
            var cx = xScale(d.doh);
            var cy = yScale(d.parRatio);
            var r = rScale(d.onHand);

            g.append('text')
              .attr('x', cx)
              .attr('y', cy - r - 4)
              .attr('text-anchor', 'middle')
              .attr('fill', theme.text)
              .attr('font-size', fSizes.badge)
              .attr('font-weight', '600')
              .text(d.displayName.length > 20 ? d.displayName.slice(0, 18) + '...' : d.displayName);
          });
        }

        // Hover & Drill Interactions
        bubbles
          .on('mouseover', function (event, d) {
            d3.select(this).select('circle')
              .attr('stroke', theme.text)
              .attr('stroke-width', 3)
              .attr('fill-opacity', 0.95);

            tooltip.transition().duration(100).style('opacity', 1);
            tooltip.html(
              '<div style="font-weight:700;margin-bottom:4px;color:' + d.riskColor + ';">' + d.displayName + '</div>' +
              '<div style="font-size:11px;color:' + theme.subtext + ';margin-bottom:6px;">Status: <b>' + d.riskLabel + '</b></div>' +
              '<table style="width:100%;font-size:11px;border-collapse:collapse;">' +
                '<tr><td style="color:' + theme.subtext + ';padding:2px 6px 2px 0;">On-Hand Value:</td><td style="font-weight:600;text-align:right;">' + fmtVal(d.onHand, d.onHandRendered) + '</td></tr>' +
                '<tr><td style="color:' + theme.subtext + ';padding:2px 6px 2px 0;">Par Level Target:</td><td style="font-weight:600;text-align:right;">' + fmtVal(d.par, d.parRendered) + '</td></tr>' +
                '<tr><td style="color:' + theme.subtext + ';padding:2px 6px 2px 0;">Par Variance:</td><td style="font-weight:600;text-align:right;color:' + (d.parVariance >= 0 ? theme.excess : theme.critical) + ';">' + (d.parVariance >= 0 ? '+' : '') + fmtVal(d.parVariance) + '</td></tr>' +
                '<tr><td style="color:' + theme.subtext + ';padding:2px 6px 2px 0;">Par Attainment:</td><td style="font-weight:600;text-align:right;">' + (d.parRatio * 100).toFixed(1) + '%</td></tr>' +
                '<tr><td style="color:' + theme.subtext + ';padding:2px 6px 2px 0;">Days on Hand (DOH):</td><td style="font-weight:600;text-align:right;">' + d.doh.toFixed(1) + ' days</td></tr>' +
                '<tr><td style="color:' + theme.subtext + ';padding:2px 6px 2px 0;">Expired Inventory Waste:</td><td style="font-weight:600;text-align:right;color:' + theme.waste + ';">' + fmtVal(d.expired, d.expiredRendered) + '</td></tr>' +
                '<tr><td style="color:' + theme.subtext + ';padding:2px 6px 2px 0;">Stockout Events:</td><td style="font-weight:600;text-align:right;color:' + (d.stockouts > 0 ? theme.critical : theme.optimal) + ';">' + d.stockouts + '</td></tr>' +
              '</table>' +
              (d.links && d.links.length ? '<div style="margin-top:6px;font-size:10px;color:' + theme.primary + ';font-weight:600;">\ud83d\udd0d Click to open Looker drill menu</div>' : '')
            );
          })
          .on('mousemove', function (event) {
            var m = d3.pointer(event, element);
            tooltip
              .style('left', (m[0] + 16) + 'px')
              .style('top', (m[1] - 30) + 'px');
          })
          .on('mouseout', function () {
            d3.select(this).select('circle')
              .attr('stroke', function (d) { return d.riskColor; })
              .attr('stroke-width', 2)
              .attr('fill-opacity', 0.72);

            tooltip.transition().duration(200).style('opacity', 0);
          })
          .on('click', function (event, d) {
            if (d.links && d.links.length && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({
                links: d.links,
                event: event
              });
            }
          });
      }

      // ==============================================================
      // MODE 2: PAIRED PAR TARGET VS ON-HAND DUMBBELL
      // ==============================================================
      else if (layoutMode === 'par_actual_dumbbell') {
        var rowH = Number(config.rowHeight) || 54;
        var totalChartH = Math.max(filteredItems.length * rowH + 60, height);
        var margin = { top: 30, right: 180, bottom: 40, left: 180 };
        var innerW = Math.max(width - margin.left - margin.right, 280);

        var svg = d3.select(chartWrapper).append('svg')
          .attr('width', innerW + margin.left + margin.right)
          .attr('height', totalChartH)
          .append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var maxVal = d3.max(filteredItems, function (d) { return Math.max(d.onHand, d.par); }) || 1000;
        var xScale = d3.scaleLinear()
          .domain([0, maxVal * 1.1])
          .range([0, innerW]);

        var yScale = d3.scaleBand()
          .domain(filteredItems.map(function (d) { return d.displayName; }))
          .range([0, filteredItems.length * rowH])
          .padding(0.3);

        // Vertical Grid Lines
        if (config.showGridLines) {
          svg.append('g')
            .attr('class', 'grid')
            .call(d3.axisTop(xScale).ticks(6).tickSize(-filteredItems.length * rowH).tickFormat(''))
            .selectAll('line').style('stroke', theme.grid);
        }

        // Rows
        var rows = svg.selectAll('.dumbbell-row')
          .data(filteredItems)
          .enter()
          .append('g')
          .attr('class', 'dumbbell-row')
          .attr('transform', function (d) { return 'translate(0,' + yScale(d.displayName) + ')'; })
          .style('cursor', function (d) { return (d.links && d.links.length) ? 'pointer' : 'default'; });

        var bandH = yScale.bandwidth();

        // Row background hover
        rows.append('rect')
          .attr('x', -margin.left + 10)
          .attr('y', -4)
          .attr('width', innerW + margin.left + margin.right - 20)
          .attr('height', rowH)
          .attr('fill', 'transparent')
          .attr('rx', 4)
          .on('mouseover', function () {
            d3.select(this).attr('fill', themeKey === 'cyberpunk_dark' ? 'rgba(51, 65, 85, 0.4)' : 'rgba(241, 245, 249, 0.7)');
          })
          .on('mouseout', function () {
            d3.select(this).attr('fill', 'transparent');
          });

        // Category Label
        rows.append('text')
          .attr('x', -12)
          .attr('y', bandH / 2 + 4)
          .attr('text-anchor', 'end')
          .attr('fill', theme.text)
          .attr('font-size', fSizes.label)
          .attr('font-weight', '600')
          .text(function (d) { return d.displayName.length > 24 ? d.displayName.slice(0, 22) + '...' : d.displayName; })
          .append('title').text(function (d) { return d.displayName; });

        // Connecting Variance Bridge
        rows.append('line')
          .attr('x1', function (d) { return xScale(Math.min(d.onHand, d.par)); })
          .attr('x2', function (d) { return xScale(Math.max(d.onHand, d.par)); })
          .attr('y1', bandH / 2)
          .attr('y2', bandH / 2)
          .attr('stroke', function (d) { return d.riskColor; })
          .attr('stroke-width', 4)
          .attr('stroke-linecap', 'round')
          .attr('opacity', 0.85);

        // Point A: Par Level Target Marker (Square / Pipe)
        rows.append('rect')
          .attr('x', function (d) { return xScale(d.par) - 3; })
          .attr('y', bandH / 2 - 8)
          .attr('width', 6)
          .attr('height', 16)
          .attr('fill', theme.optimal)
          .attr('rx', 2);

        // Point B: On-Hand Value Circle Dot
        rows.append('circle')
          .attr('cx', function (d) { return xScale(d.onHand); })
          .attr('cy', bandH / 2)
          .attr('r', 7)
          .attr('fill', function (d) { return d.riskColor; })
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);

        // Right-Side Badges & Readouts
        rows.append('text')
          .attr('x', innerW + 12)
          .attr('y', bandH / 2 - 2)
          .attr('fill', theme.text)
          .attr('font-size', fSizes.badge)
          .attr('font-weight', '700')
          .text(function (d) { return fmtVal(d.onHand) + ' on-hand'; });

        rows.append('text')
          .attr('x', innerW + 12)
          .attr('y', bandH / 2 + 12)
          .attr('fill', function (d) { return d.riskColor; })
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .text(function (d) {
            return (d.parVariance >= 0 ? '+' : '') + fmtVal(d.parVariance) + ' vs par (' + (d.parRatio * 100).toFixed(0) + '%) \u2022 ' + d.doh.toFixed(0) + 'd DOH';
          });

        // Top Axis
        var topAxis = d3.axisTop(xScale).ticks(6).tickFormat(function (d) { return fmtVal(d); });
        svg.append('g')
          .call(topAxis)
          .selectAll('text')
          .style('fill', theme.subtext)
          .style('font-size', fSizes.label);

        // Interactions
        rows
          .on('mouseover', function (event, d) {
            tooltip.transition().duration(100).style('opacity', 1);
            tooltip.html(
              '<div style="font-weight:700;margin-bottom:4px;color:' + d.riskColor + ';">' + d.displayName + '</div>' +
              '<table style="width:100%;font-size:11px;border-collapse:collapse;">' +
                '<tr><td style="color:' + theme.subtext + ';padding:2px 6px 2px 0;">On-Hand Value:</td><td style="font-weight:600;text-align:right;">' + fmtVal(d.onHand) + '</td></tr>' +
                '<tr><td style="color:' + theme.subtext + ';padding:2px 6px 2px 0;">Par Level Target:</td><td style="font-weight:600;text-align:right;">' + fmtVal(d.par) + '</td></tr>' +
                '<tr><td style="color:' + theme.subtext + ';padding:2px 6px 2px 0;">Variance:</td><td style="font-weight:600;text-align:right;color:' + (d.parVariance >= 0 ? theme.excess : theme.critical) + ';">' + (d.parVariance >= 0 ? '+' : '') + fmtVal(d.parVariance) + '</td></tr>' +
                '<tr><td style="color:' + theme.subtext + ';padding:2px 6px 2px 0;">Days on Hand (DOH):</td><td style="font-weight:600;text-align:right;">' + d.doh.toFixed(1) + ' days</td></tr>' +
                '<tr><td style="color:' + theme.subtext + ';padding:2px 6px 2px 0;">Expired Waste:</td><td style="font-weight:600;text-align:right;color:' + theme.waste + ';">' + fmtVal(d.expired) + '</td></tr>' +
              '</table>' +
              (d.links && d.links.length ? '<div style="margin-top:6px;font-size:10px;color:' + theme.primary + ';font-weight:600;">\ud83d\udd0d Click to open Looker drill menu</div>' : '')
            );
          })
          .on('mousemove', function (event) {
            var m = d3.pointer(event, element);
            tooltip
              .style('left', (m[0] + 16) + 'px')
              .style('top', (m[1] - 30) + 'px');
          })
          .on('mouseout', function () {
            tooltip.transition().duration(200).style('opacity', 0);
          })
          .on('click', function (event, d) {
            if (d.links && d.links.length && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({
                links: d.links,
                event: event
              });
            }
          });
      }

      // ==============================================================
      // MODE 3: CARE SETTING × CATEGORY EXPIRATION & WASTE MATRIX
      // ==============================================================
      else if (layoutMode === 'expiration_waste_grid') {
        var primCategories = Array.from(new Set(filteredItems.map(function (d) { return d.primary; })));
        var secCategories = Array.from(new Set(filteredItems.map(function (d) { return d.secondary || 'All Products'; })));

        var cellW = Math.max(Math.floor((width - 180) / Math.max(secCategories.length, 1)), 110);
        var cellH = Math.max(Math.floor((height - 80) / Math.max(primCategories.length, 1)), 60);

        var totalW = cellW * secCategories.length + 200;
        var totalH = cellH * primCategories.length + 80;

        var svg = d3.select(chartWrapper).append('svg')
          .attr('width', totalW)
          .attr('height', totalH)
          .append('g')
          .attr('transform', 'translate(180, 50)');

        // Column Headers (Secondary Categories)
        svg.selectAll('.col-header')
          .data(secCategories)
          .enter()
          .append('text')
          .attr('x', function (d, i) { return i * cellW + cellW / 2; })
          .attr('y', -12)
          .attr('text-anchor', 'middle')
          .attr('fill', theme.subtext)
          .attr('font-size', '11px')
          .attr('font-weight', '600')
          .text(function (d) { return d.length > 16 ? d.slice(0, 14) + '...' : d; })
          .append('title').text(function (d) { return d; });

        // Row Headers (Primary Settings)
        svg.selectAll('.row-header')
          .data(primCategories)
          .enter()
          .append('text')
          .attr('x', -12)
          .attr('y', function (d, i) { return i * cellH + cellH / 2 + 4; })
          .attr('text-anchor', 'end')
          .attr('fill', theme.text)
          .attr('font-size', '12px')
          .attr('font-weight', '600')
          .text(function (d) { return d.length > 20 ? d.slice(0, 18) + '...' : d; })
          .append('title').text(function (d) { return d; });

        // Cells Map
        var matrixMap = {};
        filteredItems.forEach(function (it) {
          var k = it.primary + '::' + (it.secondary || 'All Products');
          matrixMap[k] = it;
        });

        primCategories.forEach(function (pCat, rIdx) {
          secCategories.forEach(function (sCat, cIdx) {
            var k = pCat + '::' + sCat;
            var item = matrixMap[k];

            var cellG = svg.append('g')
              .attr('transform', 'translate(' + (cIdx * cellW) + ',' + (rIdx * cellH) + ')')
              .style('cursor', item && item.links && item.links.length ? 'pointer' : 'default');

            var fillColor = themeKey === 'cyberpunk_dark' ? '#1e293b' : '#f8fafc';
            var strokeColor = themeKey === 'cyberpunk_dark' ? '#334155' : theme.grid;

            if (item) {
              if (item.riskTier === 'critical') fillColor = themeKey === 'cyberpunk_dark' ? 'rgba(239, 68, 68, 0.25)' : '#fee2e2';
              else if (item.riskTier === 'waste') fillColor = themeKey === 'cyberpunk_dark' ? 'rgba(147, 51, 234, 0.25)' : '#f3e8ff';
              else if (item.riskTier === 'excess') fillColor = themeKey === 'cyberpunk_dark' ? 'rgba(2, 132, 199, 0.25)' : '#e0f2fe';
              else fillColor = themeKey === 'cyberpunk_dark' ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7';
            }

            cellG.append('rect')
              .attr('width', cellW - 6)
              .attr('height', cellH - 6)
              .attr('rx', 4)
              .attr('fill', fillColor)
              .attr('stroke', strokeColor);

            if (item) {
              cellG.append('text')
                .attr('x', (cellW - 6) / 2)
                .attr('y', (cellH - 6) / 2 - 4)
                .attr('text-anchor', 'middle')
                .attr('fill', theme.text)
                .attr('font-size', '11px')
                .attr('font-weight', '700')
                .text(fmtVal(item.onHand));

              cellG.append('text')
                .attr('x', (cellW - 6) / 2)
                .attr('y', (cellH - 6) / 2 + 10)
                .attr('text-anchor', 'middle')
                .attr('fill', item.riskColor)
                .attr('font-size', '9px')
                .attr('font-weight', '600')
                .text((item.parRatio * 100).toFixed(0) + '% Par \u2022 ' + item.doh.toFixed(0) + 'd');

              // Hover & Click
              cellG
                .on('mouseover', function (event) {
                  tooltip.transition().duration(100).style('opacity', 1);
                  tooltip.html(
                    '<div style="font-weight:700;margin-bottom:4px;color:' + item.riskColor + ';">' + item.primary + ' \u2014 ' + item.secondary + '</div>' +
                    '<div style="font-size:11px;color:' + theme.subtext + ';margin-bottom:6px;">Status: <b>' + item.riskLabel + '</b></div>' +
                    '<table style="width:100%;font-size:11px;border-collapse:collapse;">' +
                      '<tr><td style="color:' + theme.subtext + ';padding:2px 6px 2px 0;">On-Hand Value:</td><td style="font-weight:600;text-align:right;">' + fmtVal(item.onHand) + '</td></tr>' +
                      '<tr><td style="color:' + theme.subtext + ';padding:2px 6px 2px 0;">Par Target:</td><td style="font-weight:600;text-align:right;">' + fmtVal(item.par) + '</td></tr>' +
                      '<tr><td style="color:' + theme.subtext + ';padding:2px 6px 2px 0;">Days on Hand (DOH):</td><td style="font-weight:600;text-align:right;">' + item.doh.toFixed(1) + ' days</td></tr>' +
                      '<tr><td style="color:' + theme.subtext + ';padding:2px 6px 2px 0;">Expired Waste:</td><td style="font-weight:600;text-align:right;color:' + theme.waste + ';">' + fmtVal(item.expired) + '</td></tr>' +
                      '<tr><td style="color:' + theme.subtext + ';padding:2px 6px 2px 0;">Stockouts:</td><td style="font-weight:600;text-align:right;color:' + (item.stockouts > 0 ? theme.critical : theme.optimal) + ';">' + item.stockouts + '</td></tr>' +
                    '</table>' +
                    (item.links && item.links.length ? '<div style="margin-top:6px;font-size:10px;color:' + theme.primary + ';font-weight:600;">\ud83d\udd0d Click to open Looker drill menu</div>' : '')
                  );
                })
                .on('mousemove', function (event) {
                  var m = d3.pointer(event, element);
                  tooltip
                    .style('left', (m[0] + 16) + 'px')
                    .style('top', (m[1] - 30) + 'px');
                })
                .on('mouseout', function () {
                  tooltip.transition().duration(200).style('opacity', 0);
                })
                .on('click', function (event) {
                  if (item.links && item.links.length && window.LookerCharts && window.LookerCharts.Utils) {
                    window.LookerCharts.Utils.openDrillMenu({
                      links: item.links,
                      event: event
                    });
                  }
                });
            }
          });
        });
      }
    }
  };

  looker.plugins.visualizations.add(visObject);
}());
