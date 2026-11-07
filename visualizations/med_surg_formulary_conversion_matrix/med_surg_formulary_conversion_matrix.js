/**
 * Med-Surg Formulary Compliance & Brand Conversion Matrix
 * Google Cloud Looker Custom Visualization
 * Built with D3.js v7
 *
 * Implements an executive-grade clinical supply procurement & formulary optimization matrix:
 * 1. conversion_opportunity_bridge: Multi-stage Spend & Savings Waterfall Bridge
 *    (Total Spend -> Off-Contract Leakage -> National Brand Spend -> Formulary Conversion Opportunity -> Optimized Spend)
 * 2. penetration_scatter_quadrant: 2D Strategic Opportunity Quadrant
 *    (Wellverse Brand Penetration Rate % vs Conversion Opportunity $ with bubble sizing by Total Spend and priority shading)
 * 3. brand_mix_stacked_spectrum: 100% Normalized Brand Mix & Conversion Spectrum
 *    (National Brand Spend % vs Wellverse Brand Spend % per category with savings opportunity callouts)
 * 4. executive_procurement_scorecard: High-density Executive Materials Management Scorecard
 *    (Complete category breakdown with total spend, brand penetration %, leakage $, opportunity $, and clinical action badges)
 *
 * Resolves Buganizer Cloud Blockers b/493019482, b/398201945, and b/510294825.
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
      national: '#ea580c',     // National Brand Amber/Orange
      wellverse: '#059669',    // Wellverse Private Brand Emerald
      leakage: '#dc2626',      // Off-Contract Leakage Red
      opportunity: '#0d9488',  // Conversion Savings Teal
      optimized: '#2563eb',    // Optimized Spend Blue
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
      national: '#64748b',
      wellverse: '#10b981',
      leakage: '#ef4444',
      opportunity: '#0284c7',
      optimized: '#3b82f6',
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
      national: '#f29900',
      wellverse: '#34a853',
      leakage: '#ea4335',
      opportunity: '#4285f4',
      optimized: '#1a73e8',
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
      national: '#fb923c',
      wellverse: '#10b981',
      leakage: '#f43f5e',
      opportunity: '#38bdf8',
      optimized: '#6366f1',
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
      national: '#fb923c',
      wellverse: '#10b981',
      leakage: '#f43f5e',
      opportunity: '#818cf8',
      optimized: '#38bdf8',
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
      national: '#d97706',
      wellverse: '#059669',
      leakage: '#dc2626',
      opportunity: '#0d9488',
      optimized: '#047857',
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
      national: '#ea580c',
      wellverse: '#059669',
      leakage: '#be123c',
      opportunity: '#4338ca',
      optimized: '#7c3aed',
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
    return defaultIdx >= 0 && defaultIdx < list.length ? list[defaultIdx] : (defaultIdx === -1 ? null : list[0]);
  }

  function formatValue(val, fmt, rendered) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    if (fmt === 'auto' && rendered) return rendered;
    var abs = Math.abs(val);
    var sign = val < 0 ? '-' : '';

    switch (fmt) {
      case 'compact_currency':
        if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
        if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
        if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
        return sign + '$' + abs.toFixed(abs % 1 === 0 ? 0 : 2);
      case 'full_currency':
        return sign + '$' + Math.round(abs).toLocaleString();
      case 'percentage':
        var pVal = abs <= 1.0 ? val * 100 : val;
        return sign + pVal.toFixed(1) + '%';
      case 'compact_number':
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + 'B';
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + 'M';
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
        return sign + (abs >= 10 ? Math.round(abs).toLocaleString() : abs.toFixed(1));
      case 'decimal_2':
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'raw':
        return String(val);
      default:
        if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
        if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
        return sign + '$' + Math.round(abs).toLocaleString();
    }
  }

  var visObject = {
    id: 'med_surg_formulary_conversion_matrix',
    label: 'Med-Surg Formulary Compliance & Brand Conversion Matrix',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'Clinical Procurement Paradigm',
        display: 'select',
        values: [
          { 'Formulary Conversion Opportunity Bridge (Waterfall)': 'conversion_opportunity_bridge' },
          { 'Brand Penetration vs Savings Opportunity Quadrant': 'penetration_scatter_quadrant' },
          { '100% Brand Mix & Conversion Spectrum': 'brand_mix_stacked_spectrum' },
          { 'Executive Procurement Scorecard Table': 'executive_procurement_scorecard' }
        ],
        default: 'conversion_opportunity_bridge',
        section: 'Display',
        order: 1
      },
      categoryDimOverride: {
        type: 'string',
        label: 'Product Category Dimension',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 2
      },
      secDimOverride: {
        type: 'string',
        label: 'Care Setting / Facility Dimension (Optional)',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 3
      },
      totalSpendMeasOverride: {
        type: 'string',
        label: 'Total Spend Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 4
      },
      nationalSpendMeasOverride: {
        type: 'string',
        label: 'National Brand Spend Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 5
      },
      formularySpendMeasOverride: {
        type: 'string',
        label: 'Wellverse / Formulary Brand Spend Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 6
      },
      opportunityMeasOverride: {
        type: 'string',
        label: 'Conversion Opportunity Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 7
      },
      leakageMeasOverride: {
        type: 'string',
        label: 'Off-Contract Leakage Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 8
      },
      penetrationMeasOverride: {
        type: 'string',
        label: 'Brand Penetration % Measure (Optional)',
        display: 'select',
        values: [{ 'Auto (Calculated from Spend)': '' }],
        default: '',
        section: 'Display',
        order: 9
      },
      targetCalculationMode: {
        type: 'string',
        label: 'Formulary Benchmark Calculation Mode',
        display: 'select',
        values: [
          { 'Dataset Mean (Average Opportunity)': 'dataset_mean' },
          { 'Dataset Median (Median Opportunity)': 'dataset_median' },
          { 'Top Percentile P75 Target': 'percentile_p75' },
          { 'Top Percentile P90 Target': 'percentile_p90' },
          { 'Fixed Static Target Value': 'fixed_value' },
          { 'None': 'none' }
        ],
        default: 'dataset_mean',
        section: 'Display',
        order: 10
      },
      fixedTargetValue: {
        type: 'number',
        label: 'Fixed Target Value (when Mode is Fixed)',
        default: 1000000,
        section: 'Display',
        order: 11
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Formulary Benchmark Reference Label',
        default: 'Executive Savings Target',
        section: 'Display',
        order: 12
      },
      targetPenetrationPct: {
        type: 'number',
        label: 'Formulary Target Penetration Rate (%)',
        default: 35,
        section: 'Display',
        order: 13
      },
      anomalyThresholdPct: {
        type: 'number',
        label: 'Leakage Anomaly Alert Threshold (%)',
        default: 15,
        section: 'Display',
        order: 14
      },
      sortBy: {
        type: 'string',
        label: 'Sort Categories By',
        display: 'select',
        values: [
          { 'Total Spend Descending': 'spend_desc' },
          { 'Conversion Opportunity Descending': 'opp_desc' },
          { 'Off-Contract Leakage Descending': 'leakage_desc' },
          { 'Brand Penetration Ascending (Urgent First)': 'pen_asc' },
          { 'Category Name (Alphabetical A-Z)': 'alphabetical' },
          { 'Query Natural Order': 'natural' }
        ],
        default: 'opp_desc',
        section: 'Display',
        order: 15
      },
      topNLimit: {
        type: 'number',
        label: 'Top-N Categories Limit (0 = All, Max 50)',
        default: 0,
        section: 'Display',
        order: 16
      },
      enableOtherRollup: {
        type: 'boolean',
        label: 'Group Remaining into "Other Categories" Rollup',
        default: false,
        section: 'Display',
        order: 17
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Suppress Zero / Null Spend Categories',
        default: true,
        section: 'Display',
        order: 18
      },
      hudMode: {
        type: 'string',
        label: 'Executive Procurement HUD Mode',
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
      showValueLabels: {
        type: 'string',
        label: 'Data Value Readouts',
        display: 'select',
        values: [
          { 'Show All Numbers': 'all' },
          { 'Top Opportunities & Alerts Only': 'peaks_only' },
          { 'Hidden': 'hidden' }
        ],
        default: 'all',
        section: 'Display',
        order: 20
      },
      customTitle: {
        type: 'string',
        label: 'Custom Scorecard Title Override',
        default: '',
        section: 'Display',
        order: 21
      },
      customSubtitle: {
        type: 'string',
        label: 'Custom Scorecard Subtitle Override',
        default: '',
        section: 'Display',
        order: 22
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Category Search Filter Bar',
        default: true,
        section: 'Display',
        order: 23
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorPalette: {
        type: 'string',
        label: 'Formulary Brand Theme',
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
        label: 'Custom Primary Accent Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 2
      },
      customPositiveColor: {
        type: 'string',
        label: 'Custom Opportunity / Savings Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 3
      },
      customNegativeColor: {
        type: 'string',
        label: 'Custom Leakage / Risk Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 4
      },
      metricPolarity: {
        type: 'string',
        label: 'Metric Polarity (Savings & Attainment)',
        display: 'select',
        values: [
          { 'Higher is Better (Brand Penetration, Savings)': 'higher_is_better' },
          { 'Lower is Better (Off-Contract Leakage, Unit Cost)': 'lower_is_better' }
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
          { 'Standard (Balanced)': 'standard' },
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
          { 'Compact Currency ($1.2M, $450K)': 'compact_currency' },
          { 'Full Currency ($1,240,000)': 'full_currency' },
          { 'Percentage (35.2%)': 'percentage' },
          { 'Compact Number (1.2M, 450K)': 'compact_number' },
          { 'Decimal (1,234.56)': 'decimal_2' },
          { 'Raw Unformatted': 'raw' }
        ],
        default: 'compact_currency',
        section: 'Style',
        order: 7
      },
      bubbleScale: {
        type: 'number',
        label: 'Marker / Bubble Scale (0.5 to 2.0)',
        default: 1.0,
        section: 'Style',
        order: 8
      },
      enableAnimation: {
        type: 'boolean',
        label: 'Enable Smooth Render Transitions',
        default: true,
        section: 'Style',
        order: 9
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        categoryDimOverride: { role: 'dimension', defaultIdx: 0 },
        secDimOverride: { role: 'dimension', defaultIdx: -1 },
        totalSpendMeasOverride: { role: 'measure', defaultIdx: 0 },
        nationalSpendMeasOverride: { role: 'measure', defaultIdx: 1 },
        formularySpendMeasOverride: { role: 'measure', defaultIdx: 2 },
        penetrationMeasOverride: { role: 'measure', defaultIdx: 3 },
        opportunityMeasOverride: { role: 'measure', defaultIdx: 4 },
        leakageMeasOverride: { role: 'measure', defaultIdx: 5 }
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
        var autoField = spec.defaultIdx >= 0 && spec.defaultIdx < list.length ? list[spec.defaultIdx] : null;
        var autoLabel = autoField ? ('Auto \u2192 ' + fieldLabel(autoField)) : 'Auto / None';
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
        console.warn('registerOptions unavailable in this host:', e);
      }
    },

    create: function (element, config) {
      element.style.boxSizing = 'border-box';
      element.style.padding = '0';
      element.style.margin = '0';
      element.style.overflow = 'hidden';

      var container = document.createElement('div');
      container.className = 'looker-med-surg-matrix-root';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.boxSizing = 'border-box';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.overflow = 'hidden';
      container.style.fontFamily = 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif';

      element.appendChild(container);
      this._container = container;
      this._searchTerm = '';

      var tooltip = document.createElement('div');
      tooltip.className = 'med-surg-matrix-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.display = 'none';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.zIndex = '999999';
      tooltip.style.padding = '10px 14px';
      tooltip.style.borderRadius = '8px';
      tooltip.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.18)';
      tooltip.style.fontSize = '12px';
      tooltip.style.lineHeight = '1.4';
      tooltip.style.maxWidth = '340px';
      document.body.appendChild(tooltip);
      this._tooltip = tooltip;
    },

    _setupResizeObserver: function (element) {
      var self = this;
      if (typeof ResizeObserver === 'undefined') return;

      var resizeTimeout;
      this._resizeObserver = new ResizeObserver(function (entries) {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
          var entry = entries[0];
          if (!entry) return;
          var w = element.clientWidth || (entry.contentRect && entry.contentRect.width);
          var h = element.clientHeight || (entry.contentRect && entry.contentRect.height);
          if (!w || !h) return;

          var dw = Math.abs(w - (self._lastRenderW || 0));
          var dh = Math.abs(h - (self._lastRenderH || 0));
          if (dw < 4 && dh < 4) return;

          if (self._lastData && self._lastQueryResponse) {
            self.updateAsync(
              self._lastData,
              element,
              self._lastConfig,
              self._lastQueryResponse,
              self._lastDetails,
              function () {}
            );
          }
        }, 50);
      });
      this._resizeObserver.observe(element);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      this._registerDynamicFieldOptions(queryResponse);
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
      if (!data || data.length === 0) {
        if (this.addError) {
          this.addError({
            title: 'No Data Available',
            message: 'The query returned 0 rows for medical-surgical formulary conversion analysis.'
          });
        }
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dims = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
      var meas = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
      if (!meas.length && fields.table_calculations) meas = fields.table_calculations;

      if (dims.length === 0 || meas.length === 0) {
        if (this.addError) {
          this.addError({
            title: 'Fields Required',
            message: 'Visualization requires at least 1 Dimension (Product Category) and 1 Measure (Spend or Opportunity).'
          });
        }
        done();
        return;
      }

      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
        } catch (err) {
          console.error('Med-Surg Formulary Matrix render error:', err);
          if (self.addError) {
            self.addError({
              title: 'Rendering Error',
              message: err.message || 'An unexpected error occurred while rendering the visualization.'
            });
          }
        }
        done();
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;
      var container = this._container || element.querySelector('.looker-med-surg-matrix-root');
      if (!container) return;
      container.innerHTML = '';

      var themeKey = config.colorPalette || 'wellverse_healthcare';
      var theme = PALETTES[themeKey] || PALETTES.wellverse_healthcare;
      var isDark = themeKey === 'cyberpunk_dark';

      if (themeKey === 'custom' && config.customPrimaryColor) {
        theme = {
          name: 'Custom Theme',
          primary: config.customPrimaryColor,
          national: '#ea580c',
          wellverse: config.customPositiveColor || '#059669',
          leakage: config.customNegativeColor || '#dc2626',
          opportunity: config.customPositiveColor || '#0d9488',
          optimized: config.customPrimaryColor,
          bg: '#ffffff',
          text: '#0f172a',
          subtext: '#64748b',
          border: '#e2e8f0',
          track: '#f8fafc',
          cardBg: '#ffffff',
          grid: '#f1f5f9',
          refLine: '#94a3b8'
        };
      }

      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      var fontScale = config.fontScale || 'standard';
      var baseFontSize = fontScale === 'compact' ? 11 : fontScale === 'large' ? 14 : 12;
      container.style.fontSize = baseFontSize + 'px';

      var fields = queryResponse.fields;
      var dims = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
      var meas = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
      if (!meas.length && fields.table_calculations) meas = fields.table_calculations;

      var catDim = resolveField(dims, config.categoryDimOverride, 0);
      var secDim = dims.length > 1 ? resolveField(dims, config.secDimOverride, -1) : null;

      // Smart measure detection by name keywords if user leaves auto
      function findMeas(preferredIdx, keywords) {
        for (var i = 0; i < meas.length; i++) {
          var name = (meas[i].name || '').toLowerCase();
          var lbl = (meas[i].label || '').toLowerCase();
          for (var k = 0; k < keywords.length; k++) {
            if (name.indexOf(keywords[k]) !== -1 || lbl.indexOf(keywords[k]) !== -1) {
              return meas[i];
            }
          }
        }
        return meas[preferredIdx] || meas[0];
      }

      var totalSpendMeas = config.totalSpendMeasOverride ? resolveField(meas, config.totalSpendMeasOverride, 0) : findMeas(0, ['total_spend', 'spend', 'amount']);
      var nationalSpendMeas = config.nationalSpendMeasOverride ? resolveField(meas, config.nationalSpendMeasOverride, 1) : findMeas(1, ['national_brand_spend', 'national', 'brand_spend']);
      var formularySpendMeas = config.formularySpendMeasOverride ? resolveField(meas, config.formularySpendMeasOverride, 2) : findMeas(2, ['wellverse_brand_spend', 'formulary_spend', 'private_spend']);
      var opportunityMeas = config.opportunityMeasOverride ? resolveField(meas, config.opportunityMeasOverride, 3) : findMeas(3, ['conversion_opportunity', 'savings_opportunity', 'opportunity', 'savings']);
      var leakageMeas = config.leakageMeasOverride ? resolveField(meas, config.leakageMeasOverride, 4) : findMeas(4, ['off_contract_leakage', 'leakage', 'off_contract']);
      var penetrationMeas = config.penetrationMeasOverride ? resolveField(meas, config.penetrationMeasOverride, -1) : findMeas(-1, ['penetration', 'adherence', 'compliance']);

      var valueFmt = config.valueFormat || 'compact_currency';
      var layoutMode = config.layoutMode || 'conversion_opportunity_bridge';
      var targetPenetration = Number(config.targetPenetrationPct) || 35;
      var anomalyThreshold = Number(config.anomalyThresholdPct) || 15;

      // O(N) client-side aggregation by Category
      var catMap = {};
      var totalSpendSum = 0;
      var nationalSpendSum = 0;
      var formularySpendSum = 0;
      var opportunitySum = 0;
      var leakageSum = 0;

      data.forEach(function (row) {
        var rawCat = row[catDim.name] ? (row[catDim.name].rendered || row[catDim.name].value) : 'Unknown Category';
        var catKey = String(rawCat).trim();

        var secVal = secDim && row[secDim.name] ? (row[secDim.name].rendered || row[secDim.name].value) : null;
        var links = (row[catDim.name] && row[catDim.name].links) || (row[totalSpendMeas.name] && row[totalSpendMeas.name].links) || [];

        function extractVal(fld) {
          if (!fld || !row[fld.name]) return 0;
          var v = row[fld.name].value;
          return (v !== null && v !== undefined && !isNaN(v)) ? Number(v) : 0;
        }

        var tSpend = extractVal(totalSpendMeas);
        var nSpend = extractVal(nationalSpendMeas);
        var fSpend = extractVal(formularySpendMeas);
        var opp = extractVal(opportunityMeas);
        var lkg = extractVal(leakageMeas);
        var pen = penetrationMeas ? extractVal(penetrationMeas) : (tSpend > 0 ? (fSpend / tSpend) : 0);
        if (pen > 1.0) pen = pen / 100.0; // normalize percentage

        if (!catMap[catKey]) {
          catMap[catKey] = {
            category: catKey,
            secLabel: secVal,
            totalSpend: 0,
            nationalSpend: 0,
            formularySpend: 0,
            opportunity: 0,
            leakage: 0,
            penetration: 0,
            links: links,
            count: 0
          };
        }

        catMap[catKey].totalSpend += tSpend;
        catMap[catKey].nationalSpend += nSpend;
        catMap[catKey].formularySpend += fSpend;
        catMap[catKey].opportunity += opp;
        catMap[catKey].leakage += lkg;
        catMap[catKey].count += 1;

        totalSpendSum += tSpend;
        nationalSpendSum += nSpend;
        formularySpendSum += fSpend;
        opportunitySum += opp;
        leakageSum += lkg;
      });

      var categories = Object.keys(catMap).map(function (k) {
        var item = catMap[k];
        item.penetrationRate = item.totalSpend > 0 ? (item.formularySpend / item.totalSpend) : 0;
        item.leakageRate = item.totalSpend > 0 ? (item.leakage / item.totalSpend) : 0;
        item.opportunityPct = item.totalSpend > 0 ? (item.opportunity / item.totalSpend) : 0;

        // Clinical action prioritization badge
        var isHighOpportunity = item.opportunity > 1000000;
        var isLowPenetration = (item.penetrationRate * 100) < targetPenetration;
        var isHighLeakage = (item.leakageRate * 100) >= anomalyThreshold;

        if (isHighOpportunity && isLowPenetration) {
          item.statusBadge = 'P1 Urgent Action';
          item.statusClass = 'urgent';
          item.statusColor = theme.leakage;
        } else if (isHighLeakage || isLowPenetration) {
          item.statusBadge = 'P2 Standardize';
          item.statusClass = 'standardize';
          item.statusColor = theme.national;
        } else {
          item.statusBadge = 'Formulary Optimal';
          item.statusClass = 'optimal';
          item.statusColor = theme.wellverse;
        }

        return item;
      });

      // Filter null/zero if requested
      if (config.suppressZeroNull) {
        categories = categories.filter(function (c) {
          return c.totalSpend > 0 || c.opportunity > 0;
        });
      }

      // Search filtering
      if (self._searchTerm && self._searchTerm.length > 0) {
        var q = self._searchTerm.toLowerCase();
        categories = categories.filter(function (c) {
          return c.category.toLowerCase().indexOf(q) !== -1 || (c.secLabel && c.secLabel.toLowerCase().indexOf(q) !== -1);
        });
      }

      // Sorting
      var sortBy = config.sortBy || 'opp_desc';
      categories.sort(function (a, b) {
        switch (sortBy) {
          case 'spend_desc': return b.totalSpend - a.totalSpend;
          case 'opp_desc': return b.opportunity - a.opportunity;
          case 'leakage_desc': return b.leakage - a.leakage;
          case 'pen_asc': return a.penetrationRate - b.penetrationRate;
          case 'alphabetical': return a.category.localeCompare(b.category);
          case 'natural': default: return 0;
        }
      });

      // Top-N handling with 'Other' rollup
      var topN = Number(config.topNLimit) || 0;
      if (topN > 0 && categories.length > topN) {
        var topItems = categories.slice(0, topN);
        if (config.enableOtherRollup) {
          var otherItems = categories.slice(topN);
          var otherRollup = {
            category: 'Other Categories (' + otherItems.length + ')',
            secLabel: 'Aggregated',
            totalSpend: 0,
            nationalSpend: 0,
            formularySpend: 0,
            opportunity: 0,
            leakage: 0,
            links: [],
            statusBadge: 'Aggregated',
            statusColor: theme.subtext
          };
          otherItems.forEach(function (oi) {
            otherRollup.totalSpend += oi.totalSpend;
            otherRollup.nationalSpend += oi.nationalSpend;
            otherRollup.formularySpend += oi.formularySpend;
            otherRollup.opportunity += oi.opportunity;
            otherRollup.leakage += oi.leakage;
          });
          otherRollup.penetrationRate = otherRollup.totalSpend > 0 ? (otherRollup.formularySpend / otherRollup.totalSpend) : 0;
          otherRollup.leakageRate = otherRollup.totalSpend > 0 ? (otherRollup.leakage / otherRollup.totalSpend) : 0;
          topItems.push(otherRollup);
        }
        categories = topItems;
      }

      var globalPenetrationRate = totalSpendSum > 0 ? (formularySpendSum / totalSpendSum) : 0;
      var globalLeakageRate = totalSpendSum > 0 ? (leakageSum / totalSpendSum) : 0;

      // -----------------------------------------------------------
      // 1. HEADER BAR & INTERACTIVE SEARCH
      // -----------------------------------------------------------
      var headerBar = document.createElement('div');
      headerBar.className = 'matrix-header-bar';
      headerBar.style.flex = '0 0 auto';
      headerBar.style.display = 'flex';
      headerBar.style.justifyContent = 'space-between';
      headerBar.style.alignItems = 'center';
      headerBar.style.flexWrap = 'wrap';
      headerBar.style.gap = '10px';
      headerBar.style.padding = '8px 14px';
      headerBar.style.borderBottom = '1px solid ' + theme.border;

      var titleGroup = document.createElement('div');
      titleGroup.style.display = 'flex';
      titleGroup.style.flexDirection = 'column';

      var chartTitle = config.customTitle || 'Med-Surg Formulary Compliance & Brand Conversion Matrix';
      var titleEl = document.createElement('div');
      titleEl.style.fontWeight = '700';
      titleEl.style.fontSize = (baseFontSize + 3) + 'px';
      titleEl.style.color = theme.text;
      titleEl.textContent = chartTitle;
      titleGroup.appendChild(titleEl);

      var chartSub = config.customSubtitle || 'Formulary Adherence, Contract Leakage & Conversion Opportunity Analytics';
      var subEl = document.createElement('div');
      subEl.style.fontSize = (baseFontSize - 1) + 'px';
      subEl.style.color = theme.subtext;
      subEl.textContent = chartSub;
      titleGroup.appendChild(subEl);
      headerBar.appendChild(titleGroup);

      if (config.showSearch !== false) {
        var searchGroup = document.createElement('div');
        searchGroup.style.display = 'flex';
        searchGroup.style.alignItems = 'center';
        searchGroup.style.gap = '6px';
        searchGroup.style.backgroundColor = isDark ? '#1e293b' : '#f1f5f9';
        searchGroup.style.border = '1px solid ' + (isDark ? '#334155' : '#cbd5e1');
        searchGroup.style.borderRadius = '16px';
        searchGroup.style.padding = '4px 10px';

        var searchIcon = document.createElement('span');
        searchIcon.innerHTML = '&#128269;';
        searchIcon.style.fontSize = '11px';
        searchGroup.appendChild(searchIcon);

        var searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Filter category...';
        searchInput.value = self._searchTerm || '';
        searchInput.style.border = 'none';
        searchInput.style.background = 'transparent';
        searchInput.style.outline = 'none';
        searchInput.style.fontSize = '11px';
        searchInput.style.color = theme.text;
        searchInput.style.width = '130px';

        searchInput.addEventListener('input', function (e) {
          self._searchTerm = e.target.value.trim();
          self.updateAsync(self._lastData, element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
        });

        searchGroup.appendChild(searchInput);
        headerBar.appendChild(searchGroup);
      }
      container.appendChild(headerBar);

      // -----------------------------------------------------------
      // 2. EXECUTIVE SCORECARD HUD (Top Band)
      // -----------------------------------------------------------
      var hudMode = config.hudMode || 'scorecard';
      if (hudMode !== 'hidden') {
        var hud = document.createElement('div');
        hud.className = 'matrix-hud-bar';
        hud.style.flex = '0 0 auto';
        hud.style.display = 'grid';
        hud.style.gridTemplateColumns = hudMode === 'compact_strip' ? 'repeat(auto-fit, minmax(130px, 1fr))' : 'repeat(auto-fit, minmax(160px, 1fr))';
        hud.style.gap = '8px';
        hud.style.padding = '8px 14px';
        hud.style.backgroundColor = isDark ? '#0f172a' : theme.track;
        hud.style.borderBottom = '1px solid ' + theme.border;

        function addKpiCard(label, valStr, subStr, accentColor) {
          var card = document.createElement('div');
          card.style.backgroundColor = theme.cardBg;
          card.style.border = '1px solid ' + theme.border;
          card.style.borderLeft = '3px solid ' + accentColor;
          card.style.borderRadius = '6px';
          card.style.padding = hudMode === 'compact_strip' ? '4px 8px' : '6px 10px';

          var kLabel = document.createElement('div');
          kLabel.style.fontSize = (baseFontSize - 2) + 'px';
          kLabel.style.fontWeight = '600';
          kLabel.style.textTransform = 'uppercase';
          kLabel.style.letterSpacing = '0.5px';
          kLabel.style.color = theme.subtext;
          kLabel.textContent = label;
          card.appendChild(kLabel);

          var kVal = document.createElement('div');
          kVal.style.fontSize = (baseFontSize + 4) + 'px';
          kVal.style.fontWeight = '700';
          kVal.style.color = theme.text;
          kVal.textContent = valStr;
          card.appendChild(kVal);

          if (hudMode !== 'compact_strip' && subStr) {
            var kSub = document.createElement('div');
            kSub.style.fontSize = (baseFontSize - 2) + 'px';
            kSub.style.color = theme.subtext;
            kSub.textContent = subStr;
            card.appendChild(kSub);
          }
          hud.appendChild(card);
        }

        addKpiCard('Total Med-Surg Spend', formatValue(totalSpendSum, valueFmt), categories.length + ' Active Product Categories', theme.primary);
        addKpiCard('Formulary Penetration', (globalPenetrationRate * 100).toFixed(1) + '%', 'Goal: ' + targetPenetration + '% Target', globalPenetrationRate * 100 >= targetPenetration ? theme.wellverse : theme.national);
        addKpiCard('Conversion Opportunity', formatValue(opportunitySum, valueFmt), 'Annual Identified Savings', theme.wellverse);
        addKpiCard('Off-Contract Leakage', formatValue(leakageSum, valueFmt), (globalLeakageRate * 100).toFixed(1) + '% of Total Spend', theme.leakage);

        container.appendChild(hud);
      }

      // -----------------------------------------------------------
      // 3. MAIN VISUALIZATION WRAPPER
      // -----------------------------------------------------------
      var chartWrapper = document.createElement('div');
      chartWrapper.className = 'matrix-chart-wrapper';
      chartWrapper.style.flex = '1 1 0';
      chartWrapper.style.minHeight = '0';
      chartWrapper.style.position = 'relative';
      chartWrapper.style.width = '100%';
      chartWrapper.style.overflow = layoutMode === 'executive_procurement_scorecard' ? 'auto' : 'hidden';
      container.appendChild(chartWrapper);

      // Render Selected Layout Paradigm
      if (layoutMode === 'conversion_opportunity_bridge') {
        self._renderWaterfallBridge(d3, categories, chartWrapper, theme, config, valueFmt, totalSpendSum, nationalSpendSum, formularySpendSum, opportunitySum, leakageSum);
      } else if (layoutMode === 'penetration_scatter_quadrant') {
        self._renderScatterQuadrant(d3, categories, chartWrapper, theme, config, valueFmt, targetPenetration);
      } else if (layoutMode === 'brand_mix_stacked_spectrum') {
        self._renderStackedSpectrum(d3, categories, chartWrapper, theme, config, valueFmt);
      } else if (layoutMode === 'executive_procurement_scorecard') {
        self._renderScorecardTable(categories, chartWrapper, theme, config, valueFmt);
      }
    },

    // ------------------------------------------------------------------
    // LAYOUT 1: Conversion Opportunity Waterfall Bridge
    // ------------------------------------------------------------------
    _renderWaterfallBridge: function (d3, categories, wrapper, theme, config, valueFmt, totalSpend, nationalSpend, formularySpend, opportunity, leakage) {
      var self = this;
      var w = wrapper.clientWidth || 800;
      var h = wrapper.clientHeight || 450;
      if (w < 100 || h < 100) return;

      var optimizedSpend = totalSpend - opportunity - leakage;

      var steps = [
        { label: 'Total Spend', val: totalSpend, delta: totalSpend, start: 0, end: totalSpend, type: 'total', color: theme.primary },
        { label: 'Off-Contract Leakage', val: leakage, delta: -leakage, start: totalSpend - leakage, end: totalSpend, type: 'leakage', color: theme.leakage },
        { label: 'National Brand Spend', val: nationalSpend, delta: 0, start: 0, end: nationalSpend, type: 'subtotal', color: theme.national },
        { label: 'Formulary Conversion Opp', val: opportunity, delta: -opportunity, start: nationalSpend - opportunity, end: nationalSpend, type: 'savings', color: theme.wellverse },
        { label: 'Optimized Target Spend', val: optimizedSpend, delta: optimizedSpend, start: 0, end: optimizedSpend, type: 'optimized', color: theme.optimized }
      ];

      var margin = { top: 30, right: 30, bottom: 50, left: 70 };
      var innerW = Math.max(100, w - margin.left - margin.right);
      var innerH = Math.max(100, h - margin.top - margin.bottom);

      var svg = d3.select(wrapper).append('svg')
        .attr('width', w)
        .attr('height', h);

      var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var x = d3.scaleBand()
        .domain(steps.map(function (d) { return d.label; }))
        .range([0, innerW])
        .padding(0.35);

      var maxVal = totalSpend * 1.15;
      var y = d3.scaleLinear()
        .domain([0, maxVal])
        .range([innerH, 0]);

      // Gridlines
      g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat(''))
        .selectAll('line')
        .attr('stroke', theme.grid)
        .attr('stroke-dasharray', '3,3');

      // Bars
      var bars = g.selectAll('.bridge-bar')
        .data(steps)
        .enter()
        .append('g')
        .attr('class', 'bridge-bar')
        .style('cursor', 'pointer');

      bars.append('rect')
        .attr('x', function (d) { return x(d.label); })
        .attr('y', function (d) { return y(Math.max(d.start, d.end)); })
        .attr('width', x.bandwidth())
        .attr('height', function (d) { return Math.max(4, Math.abs(y(d.start) - y(d.end))); })
        .attr('rx', 4)
        .attr('fill', function (d) { return d.color; })
        .attr('opacity', 0.92);

      // Connecting step lines
      for (var i = 0; i < steps.length - 1; i++) {
        var curr = steps[i];
        var next = steps[i + 1];
        var connectY = curr.type === 'leakage' ? y(curr.start) : (curr.type === 'savings' ? y(curr.start) : y(curr.end));
        g.append('line')
          .attr('x1', x(curr.label) + x.bandwidth())
          .attr('y1', connectY)
          .attr('x2', x(next.label))
          .attr('y2', connectY)
          .attr('stroke', theme.subtext)
          .attr('stroke-dasharray', '2,2')
          .attr('stroke-width', 1.5);
      }

      // Value labels
      if (config.showValueLabels !== 'hidden') {
        bars.append('text')
          .attr('x', function (d) { return x(d.label) + x.bandwidth() / 2; })
          .attr('y', function (d) { return y(Math.max(d.start, d.end)) - 8; })
          .attr('text-anchor', 'middle')
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .attr('fill', theme.text)
          .text(function (d) { return formatValue(d.val, valueFmt); });
      }

      // X Axis
      g.append('g')
        .attr('transform', 'translate(0,' + innerH + ')')
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('fill', theme.text)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .call(self._wrapLabels, x.bandwidth());

      // Y Axis
      g.append('g')
        .call(d3.axisLeft(y).ticks(6).tickFormat(function (d) { return formatValue(d, valueFmt); }))
        .selectAll('text')
        .attr('fill', theme.subtext)
        .attr('font-size', '10px');

      // Tooltip handling
      bars.on('mouseenter', function (event, d) {
        d3.select(this).select('rect').attr('opacity', 1.0).attr('stroke', theme.text).attr('stroke-width', 1.5);
        if (!self._tooltip) return;
        self._tooltip.style.display = 'block';
        self._tooltip.style.backgroundColor = theme.cardBg;
        self._tooltip.style.border = '1px solid ' + theme.border;
        self._tooltip.style.color = theme.text;
        self._tooltip.innerHTML = '<div style="font-weight:700;font-size:13px;margin-bottom:4px;">' + d.label + '</div>' +
          '<div style="font-size:12px;color:' + d.color + ';font-weight:700;">' + formatValue(d.val, valueFmt) + '</div>' +
          '<div style="font-size:11px;color:' + theme.subtext + ';margin-top:3px;">Formulary Waterfall Component</div>';
      })
      .on('mousemove', function (event) {
        if (!self._tooltip) return;
        self._tooltip.style.left = (event.clientX + 14) + 'px';
        self._tooltip.style.top = (event.clientY - 14) + 'px';
      })
      .on('mouseleave', function () {
        d3.select(this).select('rect').attr('opacity', 0.92).attr('stroke', null);
        if (self._tooltip) self._tooltip.style.display = 'none';
      });
    },

    // ------------------------------------------------------------------
    // LAYOUT 2: 2D Strategic Opportunity Quadrant
    // ------------------------------------------------------------------
    _renderScatterQuadrant: function (d3, categories, wrapper, theme, config, valueFmt, targetPenetration) {
      var self = this;
      var w = wrapper.clientWidth || 800;
      var h = wrapper.clientHeight || 450;
      if (w < 100 || h < 100) return;

      var margin = { top: 30, right: 30, bottom: 50, left: 75 };
      var innerW = Math.max(100, w - margin.left - margin.right);
      var innerH = Math.max(100, h - margin.top - margin.bottom);

      var svg = d3.select(wrapper).append('svg')
        .attr('width', w)
        .attr('height', h);

      var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var maxPen = Math.max(0.6, d3.max(categories, function (d) { return d.penetrationRate; }) * 1.25);
      var x = d3.scaleLinear()
        .domain([0, maxPen])
        .range([0, innerW]);

      var maxOpp = Math.max(500000, d3.max(categories, function (d) { return d.opportunity; }) * 1.2);
      var y = d3.scaleLinear()
        .domain([0, maxOpp])
        .range([innerH, 0]);

      var maxSpend = d3.max(categories, function (d) { return d.totalSpend; }) || 1;
      var rScale = d3.scaleSqrt()
        .domain([0, maxSpend])
        .range([6, 32]);

      var bubbleMultiplier = Number(config.bubbleScale) || 1.0;

      // Benchmark thresholds for quadrants
      var targetPenRatio = targetPenetration / 100.0;
      var medianOpp = d3.median(categories, function (d) { return d.opportunity; }) || (maxOpp / 2);

      // Quadrant Background Shading
      var xSplit = x(targetPenRatio);
      var ySplit = y(medianOpp);

      // Top-Left: Urgent Conversion Target (High Opp / Low Pen)
      g.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', xSplit)
        .attr('height', ySplit)
        .attr('fill', theme.leakage)
        .attr('opacity', 0.05);

      // Top-Right: Established Core Volume (High Opp / High Pen)
      g.append('rect')
        .attr('x', xSplit)
        .attr('y', 0)
        .attr('width', innerW - xSplit)
        .attr('height', ySplit)
        .attr('fill', theme.wellverse)
        .attr('opacity', 0.05);

      // Quadrant Reference Lines
      g.append('line')
        .attr('x1', xSplit).attr('y1', 0)
        .attr('x2', xSplit).attr('y2', innerH)
        .attr('stroke', theme.national)
        .attr('stroke-dasharray', '4,4')
        .attr('stroke-width', 1.5);

      g.append('line')
        .attr('x1', 0).attr('y1', ySplit)
        .attr('x2', innerW).attr('y2', ySplit)
        .attr('stroke', theme.refLine)
        .attr('stroke-dasharray', '4,4')
        .attr('stroke-width', 1.5);

      // Quadrant Callout Labels
      g.append('text')
        .attr('x', 12)
        .attr('y', 20)
        .attr('font-size', '10.5px')
        .attr('font-weight', '700')
        .attr('fill', theme.leakage)
        .text('P1 URGENT CONVERSION TARGETS (HIGH ROI)');

      g.append('text')
        .attr('x', innerW - 12)
        .attr('y', 20)
        .attr('text-anchor', 'end')
        .attr('font-size', '10.5px')
        .attr('font-weight', '700')
        .attr('fill', theme.wellverse)
        .text('ESTABLISHED CORE VOLUME');

      g.append('text')
        .attr('x', innerW - 12)
        .attr('y', innerH - 12)
        .attr('text-anchor', 'end')
        .attr('font-size', '10.5px')
        .attr('font-weight', '700')
        .attr('fill', theme.wellverse)
        .text('OPTIMAL FORMULARY COMPLIANCE');

      // Gridlines
      g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat(''))
        .selectAll('line')
        .attr('stroke', theme.grid);

      // Bubbles
      var bubbles = g.selectAll('.quadrant-bubble')
        .data(categories)
        .enter()
        .append('g')
        .attr('class', 'quadrant-bubble')
        .style('cursor', 'pointer');

      bubbles.append('circle')
        .attr('cx', function (d) { return x(d.penetrationRate); })
        .attr('cy', function (d) { return y(d.opportunity); })
        .attr('r', function (d) { return rScale(d.totalSpend) * bubbleMultiplier; })
        .attr('fill', function (d) { return d.statusColor; })
        .attr('opacity', 0.85)
        .attr('stroke', theme.border)
        .attr('stroke-width', 1.5);

      // Bubble text labels
      if (config.showValueLabels !== 'hidden') {
        bubbles.append('text')
          .attr('x', function (d) { return x(d.penetrationRate); })
          .attr('y', function (d) { return y(d.opportunity) - (rScale(d.totalSpend) * bubbleMultiplier) - 4; })
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .attr('fill', theme.text)
          .text(function (d) { return d.category; });
      }

      // X Axis
      g.append('g')
        .attr('transform', 'translate(0,' + innerH + ')')
        .call(d3.axisBottom(x).ticks(6).tickFormat(function (d) { return (d * 100).toFixed(0) + '%'; }))
        .selectAll('text')
        .attr('fill', theme.text)
        .attr('font-size', '10.5px');

      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 38)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('fill', theme.subtext)
        .text('Formulary / Private Brand Penetration Rate (%) \u2192 Target: ' + targetPenetration + '%');

      // Y Axis
      g.append('g')
        .call(d3.axisLeft(y).ticks(6).tickFormat(function (d) { return formatValue(d, valueFmt); }))
        .selectAll('text')
        .attr('fill', theme.subtext)
        .attr('font-size', '10px');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2)
        .attr('y', -55)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('fill', theme.subtext)
        .text('Annual Conversion Savings Opportunity ($)');

      // Interactions & Drill Menu
      bubbles.on('mouseenter', function (event, d) {
        d3.select(this).select('circle').attr('opacity', 1.0).attr('stroke', theme.text).attr('stroke-width', 2.5);
        if (!self._tooltip) return;
        self._tooltip.style.display = 'block';
        self._tooltip.style.backgroundColor = theme.cardBg;
        self._tooltip.style.border = '1px solid ' + theme.border;
        self._tooltip.style.color = theme.text;
        self._tooltip.innerHTML = '<div style="font-weight:700;font-size:13px;margin-bottom:2px;">' + d.category + '</div>' +
          (d.secLabel ? '<div style="font-size:11px;color:' + theme.subtext + ';margin-bottom:4px;">' + d.secLabel + '</div>' : '') +
          '<div style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:' + d.statusColor + '20;color:' + d.statusColor + ';margin-bottom:6px;">' + d.statusBadge + '</div>' +
          '<div style="font-size:11.5px;display:flex;justify-content:space-between;gap:12px;"><span>Total Spend:</span><span style="font-weight:700;">' + formatValue(d.totalSpend, valueFmt) + '</span></div>' +
          '<div style="font-size:11.5px;display:flex;justify-content:space-between;gap:12px;"><span>Conversion Opp:</span><span style="font-weight:700;color:' + theme.wellverse + ';">' + formatValue(d.opportunity, valueFmt) + '</span></div>' +
          '<div style="font-size:11.5px;display:flex;justify-content:space-between;gap:12px;"><span>Brand Penetration:</span><span style="font-weight:700;">' + (d.penetrationRate * 100).toFixed(1) + '%</span></div>' +
          '<div style="font-size:11.5px;display:flex;justify-content:space-between;gap:12px;"><span>Off-Contract Leakage:</span><span style="font-weight:700;color:' + theme.leakage + ';">' + formatValue(d.leakage, valueFmt) + '</span></div>' +
          (d.links && d.links.length > 0 ? '<div style="margin-top:6px;font-size:10.5px;color:#2563eb;font-weight:600;">\u2935 Click bubble to open Looker drill-down menu</div>' : '');
      })
      .on('mousemove', function (event) {
        if (!self._tooltip) return;
        self._tooltip.style.left = (event.clientX + 14) + 'px';
        self._tooltip.style.top = (event.clientY - 14) + 'px';
      })
      .on('mouseleave', function () {
        d3.select(this).select('circle').attr('opacity', 0.85).attr('stroke', theme.border).attr('stroke-width', 1.5);
        if (self._tooltip) self._tooltip.style.display = 'none';
      })
      .on('click', function (event, d) {
        if (d.links && d.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils && window.LookerCharts.Utils.openDrillMenu) {
          window.LookerCharts.Utils.openDrillMenu({
            links: d.links,
            event: event
          });
        }
      });
    },

    // ------------------------------------------------------------------
    // LAYOUT 3: 100% Normalized Brand Mix & Conversion Spectrum
    // ------------------------------------------------------------------
    _renderStackedSpectrum: function (d3, categories, wrapper, theme, config, valueFmt) {
      var self = this;
      var w = wrapper.clientWidth || 800;
      var h = wrapper.clientHeight || 450;
      if (w < 100 || h < 100) return;

      var margin = { top: 20, right: 140, bottom: 40, left: 160 };
      var innerW = Math.max(100, w - margin.left - margin.right);
      var innerH = Math.max(100, h - margin.top - margin.bottom);

      var svg = d3.select(wrapper).append('svg')
        .attr('width', w)
        .attr('height', h);

      var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var y = d3.scaleBand()
        .domain(categories.map(function (d) { return d.category; }))
        .range([0, innerH])
        .padding(0.28);

      var x = d3.scaleLinear()
        .domain([0, 100])
        .range([0, innerW]);

      var rows = g.selectAll('.spectrum-row')
        .data(categories)
        .enter()
        .append('g')
        .attr('class', 'spectrum-row')
        .style('cursor', 'pointer');

      // National Brand bar (left segment)
      rows.append('rect')
        .attr('x', 0)
        .attr('y', function (d) { return y(d.category); })
        .attr('width', function (d) { return x((1 - d.penetrationRate) * 100); })
        .attr('height', y.bandwidth())
        .attr('fill', theme.national)
        .attr('rx', 2);

      // Wellverse Brand bar (right segment)
      rows.append('rect')
        .attr('x', function (d) { return x((1 - d.penetrationRate) * 100); })
        .attr('y', function (d) { return y(d.category); })
        .attr('width', function (d) { return x(d.penetrationRate * 100); })
        .attr('height', y.bandwidth())
        .attr('fill', theme.wellverse)
        .attr('rx', 2);

      // Category Y Axis
      g.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .attr('fill', theme.text)
        .attr('font-size', '11px')
        .attr('font-weight', '600');

      // X Axis (0 to 100%)
      g.append('g')
        .attr('transform', 'translate(0,' + innerH + ')')
        .call(d3.axisBottom(x).ticks(5).tickFormat(function (d) { return d + '%'; }))
        .selectAll('text')
        .attr('fill', theme.subtext);

      // Side opportunity badges
      rows.append('text')
        .attr('x', innerW + 10)
        .attr('y', function (d) { return y(d.category) + y.bandwidth() / 2 + 4; })
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('fill', theme.wellverse)
        .text(function (d) { return '+' + formatValue(d.opportunity, valueFmt) + ' opp'; });

      // Target reference line across all bars
      var targetPenPct = Number(config.targetPenetrationPct) || 35;
      g.append('line')
        .attr('x1', x(100 - targetPenPct)).attr('y1', 0)
        .attr('x2', x(100 - targetPenPct)).attr('y2', innerH)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '3,3');

      // Tooltip handling
      rows.on('mouseenter', function (event, d) {
        if (!self._tooltip) return;
        self._tooltip.style.display = 'block';
        self._tooltip.style.backgroundColor = theme.cardBg;
        self._tooltip.style.border = '1px solid ' + theme.border;
        self._tooltip.style.color = theme.text;
        self._tooltip.innerHTML = '<div style="font-weight:700;font-size:13px;margin-bottom:3px;">' + d.category + '</div>' +
          '<div style="font-size:11.5px;color:' + theme.national + ';">National Brand: ' + ((1 - d.penetrationRate) * 100).toFixed(1) + '% (' + formatValue(d.nationalSpend, valueFmt) + ')</div>' +
          '<div style="font-size:11.5px;color:' + theme.wellverse + ';">Wellverse Formulary: ' + (d.penetrationRate * 100).toFixed(1) + '% (' + formatValue(d.formularySpend, valueFmt) + ')</div>' +
          '<div style="font-size:11.5px;font-weight:700;color:' + theme.wellverse + ';margin-top:4px;">Savings Opportunity: ' + formatValue(d.opportunity, valueFmt) + '</div>';
      })
      .on('mousemove', function (event) {
        if (!self._tooltip) return;
        self._tooltip.style.left = (event.clientX + 14) + 'px';
        self._tooltip.style.top = (event.clientY - 14) + 'px';
      })
      .on('mouseleave', function () {
        if (self._tooltip) self._tooltip.style.display = 'none';
      })
      .on('click', function (event, d) {
        if (d.links && d.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils && window.LookerCharts.Utils.openDrillMenu) {
          window.LookerCharts.Utils.openDrillMenu({
            links: d.links,
            event: event
          });
        }
      });
    },

    // ------------------------------------------------------------------
    // LAYOUT 4: Executive Procurement Scorecard Table
    // ------------------------------------------------------------------
    _renderScorecardTable: function (categories, wrapper, theme, config, valueFmt) {
      var self = this;
      var table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '12px';
      table.style.textAlign = 'left';

      var thead = document.createElement('thead');
      var trH = document.createElement('tr');
      trH.style.backgroundColor = theme.track;
      trH.style.borderBottom = '2px solid ' + theme.border;

      var cols = [
        { label: 'Product Category', align: 'left' },
        { label: 'Total Spend', align: 'right' },
        { label: 'National Brand Spend', align: 'right' },
        { label: 'Wellverse Brand Spend', align: 'right' },
        { label: 'Formulary Penetration', align: 'right' },
        { label: 'Off-Contract Leakage', align: 'right' },
        { label: 'Conversion Opportunity', align: 'right' },
        { label: 'Action Priority', align: 'center' }
      ];

      cols.forEach(function (col) {
        var th = document.createElement('th');
        th.textContent = col.label;
        th.style.padding = '10px 12px';
        th.style.fontWeight = '700';
        th.style.color = theme.text;
        th.style.textAlign = col.align;
        trH.appendChild(th);
      });
      thead.appendChild(trH);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      categories.forEach(function (d, i) {
        var tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid ' + theme.border;
        tr.style.backgroundColor = i % 2 === 0 ? theme.cardBg : theme.track;
        tr.style.cursor = 'pointer';

        function addTd(txt, align, color, isBold) {
          var td = document.createElement('td');
          td.textContent = txt;
          td.style.padding = '8px 12px';
          td.style.textAlign = align;
          if (color) td.style.color = color;
          if (isBold) td.style.fontWeight = '700';
          tr.appendChild(td);
          return td;
        }

        addTd(d.category, 'left', theme.text, true);
        addTd(formatValue(d.totalSpend, valueFmt), 'right', theme.text, false);
        addTd(formatValue(d.nationalSpend, valueFmt), 'right', theme.national, false);
        addTd(formatValue(d.formularySpend, valueFmt), 'right', theme.wellverse, false);
        addTd((d.penetrationRate * 100).toFixed(1) + '%', 'right', d.penetrationRate * 100 < 35 ? theme.leakage : theme.wellverse, true);
        addTd(formatValue(d.leakage, valueFmt), 'right', d.leakage > 0 ? theme.leakage : theme.subtext, false);
        addTd(formatValue(d.opportunity, valueFmt), 'right', theme.wellverse, true);

        // Status badge
        var tdBadge = document.createElement('td');
        tdBadge.style.textAlign = 'center';
        tdBadge.style.padding = '8px 12px';
        var badge = document.createElement('span');
        badge.textContent = d.statusBadge;
        badge.style.display = 'inline-block';
        badge.style.padding = '3px 8px';
        badge.style.borderRadius = '12px';
        badge.style.fontSize = '10.5px';
        badge.style.fontWeight = '700';
        badge.style.backgroundColor = d.statusColor + '20';
        badge.style.color = d.statusColor;
        tdBadge.appendChild(badge);
        tr.appendChild(tdBadge);

        tr.addEventListener('mouseenter', function () {
          tr.style.backgroundColor = theme.grid;
        });
        tr.addEventListener('mouseleave', function () {
          tr.style.backgroundColor = i % 2 === 0 ? theme.cardBg : theme.track;
        });

        tr.addEventListener('click', function (event) {
          if (d.links && d.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils && window.LookerCharts.Utils.openDrillMenu) {
            window.LookerCharts.Utils.openDrillMenu({
              links: d.links,
              event: event
            });
          }
        });

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      wrapper.appendChild(table);
    },

    _wrapLabels: function (text, width) {
      text.each(function () {
        var textNode = d3.select(this);
        var words = textNode.text().split(/\s+/).reverse();
        var word;
        var line = [];
        var lineNumber = 0;
        var lineHeight = 1.1; // ems
        var y = textNode.attr('y');
        var dy = parseFloat(textNode.attr('dy') || 0);
        var tspan = textNode.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', dy + 'em');
        while ((word = words.pop())) {
          line.push(word);
          tspan.text(line.join(' '));
          if (tspan.node().getComputedTextLength() > width && line.length > 1) {
            line.pop();
            tspan.text(line.join(' '));
            line = [word];
            tspan = textNode.append('tspan').attr('x', 0).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text(word);
          }
        }
      });
    }
  };

  looker.plugins.visualizations.add(visObject);
}());
