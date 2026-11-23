/**
 * Surgical Procedure Supply Variance & Cost Optimization Matrix
 * Google Cloud Looker Custom Visualization
 * Built with D3.js v7
 *
 * Implements a multi-modal clinical analytics experience for hospital OR suites:
 * 1. variance_dumbbell_quadrant: Dumbbell plot comparing Cost/Case vs Benchmark Cost/Case,
 *    sized by case volume and colored by variance severity (favorable vs adverse).
 * 2. service_line_waterfall: Service line supply cost variance decomposition waterfall
 *    aggregating net excess supply expenditures to the health system bottom line.
 * 3. case_volume_opportunity_matrix: 2D Strategic Opportunity Quadrant (Case Count vs Excess Supply Cost)
 *    isolating Priority 1 standardization opportunities and best-practice surgical anchors.
 * 4. clinical_scorecard_hud: High-density Executive OR standardization table with status badges,
 *    variance pills, and drill-down links.
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
      favorable: '#00af68',
      adverse: '#e5484d',
      benchmark: '#64748b',
      neutral: '#94a3b8',
      colors: ['#143359', '#00af68', '#2e7cf6', '#ffb500', '#7c5cfc', '#14b8a6', '#e5484d', '#0284c7'],
      bg: '#ffffff',
      text: '#143359',
      subtext: '#64748b',
      border: '#e2e8f0',
      track: '#f1f5f9'
    },
    google_enterprise: {
      name: 'Google Enterprise',
      primary: '#1a73e8',
      favorable: '#34a853',
      adverse: '#ea4335',
      benchmark: '#5f6368',
      neutral: '#dadce0',
      colors: ['#1a73e8', '#34a853', '#f9ab00', '#ea4335', '#8ab4f8', '#137333', '#c5221f', '#7c3aed'],
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      border: '#e8eaed',
      track: '#f8f9fa'
    },
    modern_slate: {
      name: 'Modern Slate',
      primary: '#0284c7',
      favorable: '#10b981',
      adverse: '#ef4444',
      benchmark: '#64748b',
      neutral: '#cbd5e1',
      colors: ['#0284c7', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#059669', '#dc2626', '#8b5cf6'],
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: '#e2e8f0',
      track: '#f8fafc'
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark',
      primary: '#00F5D4',
      favorable: '#06D6A0',
      adverse: '#F72585',
      benchmark: '#94a3b8',
      neutral: '#334155',
      colors: ['#00F5D4', '#7B2CBF', '#F72585', '#4CC9F0', '#FFBE0B', '#3A0CA3', '#9D4EDD', '#06D6A0'],
      bg: '#0f172a',
      text: '#f8fafc',
      subtext: '#94a3b8',
      border: 'rgba(255,255,255,0.12)',
      track: '#1e293b'
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      primary: '#059669',
      favorable: '#10b981',
      adverse: '#e11d48',
      benchmark: '#047857',
      neutral: '#a7f3d0',
      colors: ['#059669', '#10b981', '#34d399', '#0284c7', '#0d9488', '#047857', '#0f766e', '#0369a1'],
      bg: '#ffffff',
      text: '#064e3b',
      subtext: '#047857',
      border: '#d1fae5',
      track: '#f0fdf4'
    },
    sunset_media: {
      name: 'Sunset Media',
      primary: '#f97316',
      favorable: '#10b981',
      adverse: '#f43f5e',
      benchmark: '#9a3412',
      neutral: '#fdba74',
      colors: ['#f43f5e', '#fb7185', '#f97316', '#fb923c', '#facc15', '#a855f7', '#d97706', '#ec4899'],
      bg: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      border: '#fed7aa',
      track: '#fff7ed'
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
      return sign + '$' + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (formatType === 'raw') {
      return String(num);
    }
    // auto fallback
    if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
    return sign + '$' + (abs < 10 && abs > 0 && Math.floor(abs) !== abs ? abs.toFixed(2) : abs.toLocaleString());
  }

  var visObject = {
    id: 'surgical_procedure_variance_matrix',
    label: 'Surgical Procedure Supply Variance Matrix',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'Clinical Layout Mode',
        display: 'select',
        values: [
          { 'Surgical Cost vs Benchmark Dumbbell Plot': 'variance_dumbbell_quadrant' },
          { 'Service Line Variance Decomposition Waterfall': 'service_line_waterfall' },
          { '2D Case Volume vs Cost Opportunity Matrix': 'case_volume_opportunity_matrix' },
          { 'Clinical OR Standardization Scorecard': 'clinical_scorecard_hud' }
        ],
        default: 'variance_dumbbell_quadrant',
        section: 'Display',
        order: 1
      },
      serviceLineDimOverride: {
        type: 'string',
        label: 'Service Line Dimension',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 2
      },
      procedureDimOverride: {
        type: 'string',
        label: 'Procedure Name Dimension',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 3
      },
      caseCountMeasOverride: {
        type: 'string',
        label: 'Case Volume Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 4
      },
      actualCostMeasOverride: {
        type: 'string',
        label: 'Actual Cost per Case Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 5
      },
      benchmarkCostMeasOverride: {
        type: 'string',
        label: 'Benchmark Cost per Case Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 6
      },
      excessCostMeasOverride: {
        type: 'string',
        label: 'Excess Supply Cost Variance Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 7
      },
      targetMode: {
        type: 'string',
        label: 'Benchmark Target Mode',
        display: 'select',
        values: [
          { 'Benchmark Measure Column (from Query)': 'measure_column' },
          { 'Fixed Target Cost per Case': 'fixed_value' },
          { 'Dataset Mean Cost Baseline': 'dataset_mean' },
          { 'Dataset Median Cost Baseline': 'dataset_median' },
          { 'Top Percentile P75 Target': 'percentile_p75' }
        ],
        default: 'measure_column',
        section: 'Display',
        order: 8
      },
      fixedTargetValue: {
        type: 'number',
        label: 'Fixed Target Value ($ when Fixed Mode)',
        default: 500,
        section: 'Display',
        order: 9
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Benchmark Reference Line Label',
        default: 'Clinical Target',
        section: 'Display',
        order: 10
      },
      toleranceThresholdPct: {
        type: 'number',
        label: 'Tolerance Threshold (%)',
        default: 5,
        section: 'Display',
        order: 11
      },
      sortBy: {
        type: 'string',
        label: 'Sorting & Ordering',
        display: 'select',
        values: [
          { 'Net Excess Cost Descending (Adverse First)': 'excess_desc' },
          { 'Net Excess Cost Ascending (Favorable First)': 'excess_asc' },
          { 'Case Volume Descending': 'volume_desc' },
          { 'Variance % Descending': 'variance_desc' },
          { 'Alphabetical by Procedure': 'alpha' },
          { 'Natural / Query Order': 'natural' }
        ],
        default: 'volume_desc',
        section: 'Display',
        order: 12
      },
      topNLimit: {
        type: 'number',
        label: 'Top-N Procedures Limit (0 = All)',
        default: 15,
        section: 'Display',
        order: 13
      },
      enableOtherRollup: {
        type: 'boolean',
        label: 'Group Remaining into "Other Procedures"',
        default: false,
        section: 'Display',
        order: 14
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Suppress Zero / Null Cases',
        default: true,
        section: 'Display',
        order: 15
      },
      hudMode: {
        type: 'string',
        label: 'Executive Scorecard HUD Mode',
        display: 'select',
        values: [
          { 'Full Executive Scorecard HUD': 'scorecard' },
          { 'Compact Metric Strip': 'compact_strip' },
          { 'Hidden': 'hidden' }
        ],
        default: 'scorecard',
        section: 'Display',
        order: 16
      },
      showValueLabels: {
        type: 'string',
        label: 'Data Value Labels',
        display: 'select',
        values: [
          { 'Show All Value Labels': 'all' },
          { 'Outliers & Peaks Only': 'peaks_only' },
          { 'Hidden': 'hidden' }
        ],
        default: 'all',
        section: 'Display',
        order: 17
      },
      customTitle: {
        type: 'string',
        label: 'Custom Chart Title Override',
        default: '',
        section: 'Display',
        order: 18
      },
      customSubtitle: {
        type: 'string',
        label: 'Custom Chart Subtitle Override',
        default: '',
        section: 'Display',
        order: 19
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Procedure & Service Line Search Bar',
        default: true,
        section: 'Display',
        order: 20
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorPalette: {
        type: 'string',
        label: 'Brand Palette Preset',
        display: 'select',
        values: [
          { 'Wellverse Healthcare': 'wellverse_healthcare' },
          { 'Google Enterprise': 'google_enterprise' },
          { 'Modern Slate': 'modern_slate' },
          { 'Cyberpunk Dark': 'cyberpunk_dark' },
          { 'Emerald FinOps': 'emerald_finops' },
          { 'Sunset Media': 'sunset_media' },
          { 'Custom Hex Override': 'custom_override' }
        ],
        default: 'wellverse_healthcare',
        section: 'Style',
        order: 1
      },
      customPrimaryHex: {
        type: 'string',
        label: 'Custom Primary / Accent Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 2
      },
      customPositiveHex: {
        type: 'string',
        label: 'Custom Favorable / Under-Benchmark Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 3
      },
      customNegativeHex: {
        type: 'string',
        label: 'Custom Adverse / Over-Benchmark Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 4
      },
      metricPolarity: {
        type: 'string',
        label: 'Metric Polarity',
        display: 'select',
        values: [
          { 'Lower Cost is Better (Clinical Best Practice)': 'lower_is_better' },
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
          { 'Compact (High Density Dashboard)': 'compact' },
          { 'Standard (Default)': 'standard' },
          { 'Large Presentation': 'large' }
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
          { 'Compact Currency ($1.2M, $450K)': 'compact_currency' },
          { 'Compact Number (1.2M, 450K)': 'compact_number' },
          { 'Percentage (12.4%)': 'percentage' },
          { 'Decimal ($1,234.56)': 'decimal_2' },
          { 'Raw Unformatted': 'raw' }
        ],
        default: 'compact_currency',
        section: 'Style',
        order: 7
      },
      bubbleMaxRadius: {
        type: 'number',
        label: 'Case Volume Bubble Max Radius (px)',
        display: 'range',
        min: 8,
        max: 36,
        step: 2,
        default: 18,
        section: 'Style',
        order: 8
      },
      dumbbellLineWidth: {
        type: 'number',
        label: 'Dumbbell Connector Stroke Width (px)',
        display: 'range',
        min: 1,
        max: 6,
        step: 1,
        default: 3,
        section: 'Style',
        order: 9
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        serviceLineDimOverride: { role: 'dimension', defaultIdx: 0 },
        procedureDimOverride: { role: 'dimension', defaultIdx: 1 },
        caseCountMeasOverride: { role: 'measure', defaultIdx: 0 },
        actualCostMeasOverride: { role: 'measure', defaultIdx: 1 },
        benchmarkCostMeasOverride: { role: 'measure', defaultIdx: 2 },
        excessCostMeasOverride: { role: 'measure', defaultIdx: 3 }
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
      element.style.overflow = 'hidden';

      var container = document.createElement('div');
      container.className = 'surgical-variance-container';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.overflow = 'hidden';
      container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      element.appendChild(container);

      var tooltip = document.createElement('div');
      tooltip.className = 'surgical-variance-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.display = 'none';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.zIndex = '9999';
      tooltip.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
      tooltip.style.color = '#ffffff';
      tooltip.style.padding = '10px 14px';
      tooltip.style.borderRadius = '8px';
      tooltip.style.fontSize = '12px';
      tooltip.style.lineHeight = '1.45';
      tooltip.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)';
      tooltip.style.border = '1px solid rgba(255, 255, 255, 0.15)';
      tooltip.style.backdropFilter = 'blur(6px)';
      document.body.appendChild(tooltip);

      this._container = container;
      this._tooltip = tooltip;
      this._searchQuery = '';
      this._lastDimensions = { w: 0, h: 0 };
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      var self = this;
      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      this._registerDynamicFieldOptions(queryResponse);

      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      if (!this._resizeObserverAttached && element && typeof ResizeObserver !== 'undefined') {
        var ro = new ResizeObserver(function (entries) {
          if (!entries || !entries.length) return;
          var cr = entries[0].contentRect;
          var dw = Math.abs(cr.width - self._lastDimensions.w);
          var dh = Math.abs(cr.height - self._lastDimensions.h);
          if (dw >= 4 || dh >= 4) {
            self._lastDimensions = { w: cr.width, h: cr.height };
            if (self._lastData && self._lastQueryResponse) {
              ensureD3(function (d3) {
                self.render(d3, self._lastData, element, self._lastConfig, self._lastQueryResponse, function () {});
              });
            }
          }
        });
        ro.observe(element);
        this._resizeObserverAttached = true;
      }

      ensureD3(function (d3) {
        self.render(d3, data, element, config, queryResponse, done);
      });
    },

    render: function (d3, data, element, config, queryResponse, done) {
      var self = this;
      var container = this._container || element.querySelector('.surgical-variance-container');
      var tooltip = this._tooltip;
      if (!container) {
        done();
        return;
      }
      container.innerHTML = '';

      if (!data || data.length === 0) {
        if (this.addError) {
          this.addError({
            title: 'No Data',
            message: 'The query returned no surgical procedure records.'
          });
        }
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var meas = fields.measures || [];
      if (!meas.length && fields.table_calculations) meas = fields.table_calculations;

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

      var fldServiceLine = resolveField(dims, config.serviceLineDimOverride, 0);
      var fldProcedure = resolveField(dims, config.procedureDimOverride, dims.length > 1 ? 1 : 0);
      var fldCaseCount = resolveField(meas, config.caseCountMeasOverride, 0);
      var fldActualCost = resolveField(meas, config.actualCostMeasOverride, meas.length > 1 ? 1 : 0);
      var fldBenchmarkCost = resolveField(meas, config.benchmarkCostMeasOverride, meas.length > 2 ? 2 : (meas.length > 1 ? 1 : 0));
      var fldExcessCost = resolveField(meas, config.excessCostMeasOverride, meas.length > 3 ? 3 : (meas.length > 2 ? 2 : 0));

      // Resolve theme & colors
      var paletteKey = config.colorPalette || 'wellverse_healthcare';
      var theme = PALETTES[paletteKey] || PALETTES.wellverse_healthcare;
      var primaryColor = config.customPrimaryHex || theme.primary;
      var favorableColor = config.customPositiveHex || theme.favorable;
      var adverseColor = config.customNegativeHex || theme.adverse;
      var benchmarkColor = theme.benchmark;
      var isLowerBetter = config.metricPolarity !== 'higher_is_better';

      // Parse & transform rows
      var rawItems = [];
      data.forEach(function (row, idx) {
        var sLine = fldServiceLine && row[fldServiceLine.name] ? String(row[fldServiceLine.name].value || '') : 'General Surgery';
        var proc = fldProcedure && row[fldProcedure.name] ? String(row[fldProcedure.name].value || '') : ('Procedure #' + (idx + 1));
        var count = fldCaseCount && row[fldCaseCount.name] && row[fldCaseCount.name].value !== null ? Number(row[fldCaseCount.name].value) : 1;
        var actual = fldActualCost && row[fldActualCost.name] && row[fldActualCost.name].value !== null ? Number(row[fldActualCost.name].value) : 0;
        var bench = fldBenchmarkCost && row[fldBenchmarkCost.name] && row[fldBenchmarkCost.name].value !== null ? Number(row[fldBenchmarkCost.name].value) : actual;
        var excess = fldExcessCost && row[fldExcessCost.name] && row[fldExcessCost.name].value !== null ? Number(row[fldExcessCost.name].value) : ((actual - bench) * count);

        if (config.suppressZeroNull && count <= 0) return;

        var varCost = actual - bench;
        var varPct = bench > 0 ? (varCost / bench) : 0;

        // Drill links
        var links = [];
        if (fldProcedure && row[fldProcedure.name] && row[fldProcedure.name].links) {
          links = row[fldProcedure.name].links;
        } else if (fldServiceLine && row[fldServiceLine.name] && row[fldServiceLine.name].links) {
          links = row[fldServiceLine.name].links;
        } else if (fldActualCost && row[fldActualCost.name] && row[fldActualCost.name].links) {
          links = row[fldActualCost.name].links;
        }

        rawItems.push({
          id: idx,
          serviceLine: sLine,
          procedure: proc,
          caseCount: count,
          actualCost: actual,
          benchmarkCost: bench,
          excessCost: excess,
          unitVariance: varCost,
          variancePct: varPct,
          links: links,
          rawRow: row
        });
      });

      // Target mode overrides for benchmark
      var targetMode = config.targetMode || 'measure_column';
      if (targetMode === 'fixed_value') {
        var fixedVal = Number(config.fixedTargetValue) || 500;
        rawItems.forEach(function (d) {
          d.benchmarkCost = fixedVal;
          d.unitVariance = d.actualCost - fixedVal;
          d.variancePct = fixedVal > 0 ? (d.unitVariance / fixedVal) : 0;
          d.excessCost = d.unitVariance * d.caseCount;
        });
      } else if (targetMode === 'dataset_mean') {
        var meanActual = d3.mean(rawItems, function (d) { return d.actualCost; }) || 1;
        rawItems.forEach(function (d) {
          d.benchmarkCost = meanActual;
          d.unitVariance = d.actualCost - meanActual;
          d.variancePct = meanActual > 0 ? (d.unitVariance / meanActual) : 0;
          d.excessCost = d.unitVariance * d.caseCount;
        });
      } else if (targetMode === 'dataset_median') {
        var medActual = d3.median(rawItems, function (d) { return d.actualCost; }) || 1;
        rawItems.forEach(function (d) {
          d.benchmarkCost = medActual;
          d.unitVariance = d.actualCost - medActual;
          d.variancePct = medActual > 0 ? (d.unitVariance / medActual) : 0;
          d.excessCost = d.unitVariance * d.caseCount;
        });
      } else if (targetMode === 'percentile_p75') {
        var p75Actual = d3.quantile(rawItems.map(function (d) { return d.actualCost; }).sort(d3.ascending), 0.75) || 1;
        rawItems.forEach(function (d) {
          d.benchmarkCost = p75Actual;
          d.unitVariance = d.actualCost - p75Actual;
          d.variancePct = p75Actual > 0 ? (d.unitVariance / p75Actual) : 0;
          d.excessCost = d.unitVariance * d.caseCount;
        });
      }

      // Filter by Search Query
      var searchQ = (this._searchQuery || '').toLowerCase().trim();
      var filteredItems = rawItems;
      if (searchQ) {
        filteredItems = rawItems.filter(function (d) {
          return d.procedure.toLowerCase().indexOf(searchQ) !== -1 ||
                 d.serviceLine.toLowerCase().indexOf(searchQ) !== -1;
        });
      }

      // Sort
      var sortBy = config.sortBy || 'volume_desc';
      if (sortBy === 'excess_desc') {
        filteredItems.sort(function (a, b) { return b.excessCost - a.excessCost; });
      } else if (sortBy === 'excess_asc') {
        filteredItems.sort(function (a, b) { return a.excessCost - b.excessCost; });
      } else if (sortBy === 'volume_desc') {
        filteredItems.sort(function (a, b) { return b.caseCount - a.caseCount; });
      } else if (sortBy === 'variance_desc') {
        filteredItems.sort(function (a, b) { return b.variancePct - a.variancePct; });
      } else if (sortBy === 'alpha') {
        filteredItems.sort(function (a, b) { return a.procedure.localeCompare(b.procedure); });
      }

      // Top N & Other Rollup
      var topN = Number(config.topNLimit) || 15;
      var finalItems = filteredItems;
      if (topN > 0 && filteredItems.length > topN) {
        var topSlice = filteredItems.slice(0, topN);
        if (config.enableOtherRollup) {
          var otherSlice = filteredItems.slice(topN);
          var totCases = d3.sum(otherSlice, function (d) { return d.caseCount; });
          var totExcess = d3.sum(otherSlice, function (d) { return d.excessCost; });
          var wtActual = d3.sum(otherSlice, function (d) { return d.actualCost * d.caseCount; }) / (totCases || 1);
          var wtBench = d3.sum(otherSlice, function (d) { return d.benchmarkCost * d.caseCount; }) / (totCases || 1);
          topSlice.push({
            id: 99999,
            serviceLine: 'Various Specialties',
            procedure: 'Other Procedures (' + otherSlice.length + ')',
            caseCount: totCases,
            actualCost: wtActual,
            benchmarkCost: wtBench,
            excessCost: totExcess,
            unitVariance: wtActual - wtBench,
            variancePct: wtBench > 0 ? ((wtActual - wtBench) / wtBench) : 0,
            links: []
          });
        }
        finalItems = topSlice;
      }

      // Compute summary stats
      var totalCases = d3.sum(finalItems, function (d) { return d.caseCount; });
      var totalActualCost = d3.sum(finalItems, function (d) { return d.actualCost * d.caseCount; });
      var totalBenchCost = d3.sum(finalItems, function (d) { return d.benchmarkCost * d.caseCount; });
      var netExcessCost = d3.sum(finalItems, function (d) { return d.excessCost; });
      var overallVariancePct = totalBenchCost > 0 ? (netExcessCost / totalBenchCost) : 0;
      var adverseProcedures = finalItems.filter(function (d) { return d.unitVariance > 0; });
      var pctAdverse = finalItems.length ? Math.round((adverseProcedures.length / finalItems.length) * 100) : 0;

      // Top opportunity
      var sortedByExcess = finalItems.slice().sort(function (a, b) { return b.excessCost - a.excessCost; });
      var topOpp = sortedByExcess.length ? sortedByExcess[0] : null;

      // 1. Title & Subtitle Banner
      if (config.customTitle || config.customSubtitle) {
        var titleBar = document.createElement('div');
        titleBar.className = 'surgical-title-bar';
        titleBar.style.width = '100%';
        titleBar.style.padding = '8px 16px 6px 16px';
        titleBar.style.borderBottom = '1px solid ' + theme.border;
        titleBar.style.backgroundColor = theme.bg;
        titleBar.style.flexShrink = '0';
        var tHtml = '';
        if (config.customTitle) {
          tHtml += '<div style="font-size: 15px; font-weight: 700; color: ' + theme.text + '; line-height: 1.2;">' + config.customTitle + '</div>';
        }
        if (config.customSubtitle) {
          tHtml += '<div style="font-size: 11.5px; color: ' + theme.subtext + '; margin-top: 2px;">' + config.customSubtitle + '</div>';
        }
        titleBar.innerHTML = tHtml;
        container.appendChild(titleBar);
      }

      // 2. Executive KPI HUD
      var hudMode = config.hudMode || 'scorecard';
      if (hudMode !== 'hidden') {
        var hud = document.createElement('div');
        hud.className = 'surgical-hud-bar';
        hud.style.width = '100%';
        hud.style.display = 'flex';
        hud.style.flexWrap = 'wrap';
        hud.style.alignItems = 'center';
        hud.style.justifyContent = 'space-between';
        hud.style.padding = hudMode === 'compact_strip' ? '4px 12px' : '8px 16px';
        hud.style.backgroundColor = theme.track;
        hud.style.borderBottom = '1px solid ' + theme.border;
        hud.style.gap = '10px';
        hud.style.flexShrink = '0';

        var netColor = netExcessCost > 0 ? (isLowerBetter ? adverseColor : favorableColor) : (isLowerBetter ? favorableColor : adverseColor);

        var cardsHtml = '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">';
        // Total Cases
        cardsHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:' + theme.subtext + ';font-weight:600;">Surgical Cases</span>' +
          '<span style="font-size:' + (hudMode === 'compact_strip' ? '13px' : '15px') + ';font-weight:700;color:' + theme.text + ';">' + formatNumber(totalCases, 'compact_number') + '</span>' +
          '</div>';

        // Total Supply Cost
        cardsHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:' + theme.subtext + ';font-weight:600;">Total Supply Spend</span>' +
          '<span style="font-size:' + (hudMode === 'compact_strip' ? '13px' : '15px') + ';font-weight:700;color:' + theme.text + ';">' + formatNumber(totalActualCost, 'compact_currency') + '</span>' +
          '</div>';

        // Net Variance $
        var varianceSign = netExcessCost > 0 ? '+' : '';
        cardsHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:' + theme.subtext + ';font-weight:600;">Net Supply Variance</span>' +
          '<span style="font-size:' + (hudMode === 'compact_strip' ? '13px' : '15px') + ';font-weight:700;color:' + netColor + ';">' + varianceSign + formatNumber(netExcessCost, 'compact_currency') + ' (' + (overallVariancePct * 100).toFixed(1) + '%)</span>' +
          '</div>';

        // % Procedures Exceeding Benchmark
        cardsHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:' + theme.subtext + ';font-weight:600;">Over Benchmark</span>' +
          '<span style="font-size:' + (hudMode === 'compact_strip' ? '13px' : '15px') + ';font-weight:700;color:' + (pctAdverse > 50 ? adverseColor : favorableColor) + ';">' + pctAdverse + '% (' + adverseProcedures.length + '/' + finalItems.length + ')</span>' +
          '</div>';

        // Top Standardization Opportunity
        if (topOpp && hudMode === 'scorecard') {
          cardsHtml += '<div style="display:flex;flex-direction:column;">' +
            '<span style="font-size:10px;text-transform:uppercase;color:' + theme.subtext + ';font-weight:600;">Top Opportunity (Excess $)</span>' +
            '<span style="font-size:12.5px;font-weight:600;color:' + adverseColor + ';">' + topOpp.procedure + ' (+' + formatNumber(topOpp.excessCost, 'compact_currency') + ')</span>' +
            '</div>';
        }
        cardsHtml += '</div>';

        // Search Bar
        if (config.showSearch !== false) {
          cardsHtml += '<div style="display:flex;align-items:center;">' +
            '<input type="text" class="surgical-search-input" value="' + (self._searchQuery || '') + '" placeholder="Search procedure / specialty..." style="padding:4px 8px;font-size:11px;border:1px solid ' + theme.border + ';border-radius:4px;outline:none;width:170px;" />' +
            '</div>';
        }

        hud.innerHTML = cardsHtml;
        container.appendChild(hud);

        var searchInput = hud.querySelector('.surgical-search-input');
        if (searchInput) {
          searchInput.addEventListener('input', function (e) {
            self._searchQuery = e.target.value;
            self.render(d3, self._lastData, element, self._lastConfig, self._lastQueryResponse, function () {});
          });
        }
      }

      // 3. Canvas wrapper
      var chartWrap = document.createElement('div');
      chartWrap.className = 'surgical-chart-wrap';
      chartWrap.style.flex = '1 1 0';
      chartWrap.style.minHeight = '0';
      chartWrap.style.width = '100%';
      chartWrap.style.position = 'relative';
      chartWrap.style.overflow = 'hidden';
      container.appendChild(chartWrap);

      var width = chartWrap.clientWidth || (element.clientWidth - 20) || 600;
      var height = chartWrap.clientHeight || (element.clientHeight - 80) || 400;

      var layoutMode = config.layoutMode || 'variance_dumbbell_quadrant';

      if (layoutMode === 'clinical_scorecard_hud') {
        renderScorecardTable(chartWrap, finalItems, theme, favorableColor, adverseColor, isLowerBetter, config);
        done();
        return;
      }

      if (layoutMode === 'service_line_waterfall') {
        renderWaterfall(d3, chartWrap, finalItems, width, height, theme, favorableColor, adverseColor, isLowerBetter, config, tooltip);
        done();
        return;
      }

      if (layoutMode === 'case_volume_opportunity_matrix') {
        renderOpportunityMatrix(d3, chartWrap, finalItems, width, height, theme, favorableColor, adverseColor, isLowerBetter, config, tooltip);
        done();
        return;
      }

      // Default: variance_dumbbell_quadrant
      renderDumbbell(d3, chartWrap, finalItems, width, height, theme, favorableColor, adverseColor, benchmarkColor, isLowerBetter, config, tooltip);
      done();
    }
  };

  // -------------------------------------------------------------
  // LAYOUT MODE 1: Dumbbell Plot (Cost vs Benchmark per Procedure)
  // -------------------------------------------------------------
  function renderDumbbell(d3, container, items, width, height, theme, favorableColor, adverseColor, benchmarkColor, isLowerBetter, config, tooltip) {
    var margin = { top: 28, right: 90, bottom: 40, left: 220 };
    var chartW = Math.max(100, width - margin.left - margin.right);
    var chartH = Math.max(100, height - margin.top - margin.bottom);

    var svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('display', 'block');

    var g = svg.append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var maxCost = d3.max(items, function (d) { return Math.max(d.actualCost, d.benchmarkCost); }) * 1.15 || 1000;
    var xScale = d3.scaleLinear().domain([0, maxCost]).range([0, chartW]);
    var yScale = d3.scaleBand().domain(items.map(function (d) { return d.procedure; })).range([0, chartH]).padding(0.4);

    var maxRadius = Number(config.bubbleMaxRadius) || 18;
    var maxCases = d3.max(items, function (d) { return d.caseCount; }) || 1;
    var rScale = d3.scaleSqrt().domain([1, maxCases]).range([5, maxRadius]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', 'translate(0,' + chartH + ')')
      .call(d3.axisBottom(xScale).ticks(6).tickSize(-chartH).tickFormat(''))
      .selectAll('line')
      .style('stroke', theme.border)
      .style('stroke-dasharray', '3,3');

    // Axes
    var xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(function (d) { return '$' + d3.format(',.0f')(d); });
    g.append('g')
      .attr('transform', 'translate(0,' + chartH + ')')
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', theme.subtext);

    var yAxis = d3.axisLeft(yScale).tickSize(0);
    var yGroup = g.append('g')
      .call(yAxis);

    yGroup.selectAll('text')
      .style('font-size', '11.5px')
      .style('font-weight', '500')
      .style('fill', theme.text)
      .style('cursor', 'pointer')
      .each(function (procName) {
        var itm = items.find(function (x) { return x.procedure === procName; });
        if (itm && itm.links && itm.links.length) {
          d3.select(this)
            .on('click', function (event) {
              if (window.LookerCharts && window.LookerCharts.Utils) {
                window.LookerCharts.Utils.openDrillMenu({ links: itm.links, event: event });
              }
            });
        }
      });

    yGroup.select('.domain').remove();

    var lw = Number(config.dumbbellLineWidth) || 3;

    // Dumbbell groups
    var rows = g.selectAll('.dumbbell-row')
      .data(items)
      .enter()
      .append('g')
      .attr('class', 'dumbbell-row')
      .attr('transform', function (d) { return 'translate(0,' + (yScale(d.procedure) + yScale.bandwidth() / 2) + ')'; });

    // Connector line
    rows.append('line')
      .attr('x1', function (d) { return xScale(Math.min(d.actualCost, d.benchmarkCost)); })
      .attr('x2', function (d) { return xScale(Math.max(d.actualCost, d.benchmarkCost)); })
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', function (d) {
        var isAdverse = d.unitVariance > 0;
        return isAdverse ? (isLowerBetter ? adverseColor : favorableColor) : (isLowerBetter ? favorableColor : adverseColor);
      })
      .attr('stroke-width', lw)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.85);

    // Benchmark marker (vertical diamond or circle)
    rows.append('circle')
      .attr('cx', function (d) { return xScale(d.benchmarkCost); })
      .attr('cy', 0)
      .attr('r', 6)
      .attr('fill', '#ffffff')
      .attr('stroke', benchmarkColor)
      .attr('stroke-width', 2.5)
      .style('cursor', 'pointer');

    // Actual Cost Bubble (sized by case volume)
    rows.append('circle')
      .attr('cx', function (d) { return xScale(d.actualCost); })
      .attr('cy', 0)
      .attr('r', function (d) { return rScale(d.caseCount); })
      .attr('fill', function (d) {
        var isAdverse = d.unitVariance > 0;
        return isAdverse ? (isLowerBetter ? adverseColor : favorableColor) : (isLowerBetter ? favorableColor : adverseColor);
      })
      .attr('fill-opacity', 0.88)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('stroke', '#0f172a').attr('stroke-width', 2.5);
        var isAdv = d.unitVariance > 0;
        var stColor = isAdv ? adverseColor : favorableColor;
        var stLabel = isAdv ? 'Adverse Spend' : 'Favorable Performance';
        tooltip.innerHTML =
          '<div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#ffffff;">' + d.procedure + '</div>' +
          '<div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">Specialty: <span style="color:#e2e8f0;font-weight:600;">' + d.serviceLine + '</span></div>' +
          '<div style="display:grid;grid-template-columns:auto auto;gap:4px 12px;font-size:11.5px;">' +
          '<span style="color:#94a3b8;">Actual Cost/Case:</span><span style="font-weight:600;text-align:right;">$' + d.actualCost.toFixed(2) + '</span>' +
          '<span style="color:#94a3b8;">Benchmark Cost:</span><span style="font-weight:600;text-align:right;">$' + d.benchmarkCost.toFixed(2) + '</span>' +
          '<span style="color:#94a3b8;">Unit Variance:</span><span style="font-weight:700;color:' + stColor + ';text-align:right;">' + (d.unitVariance > 0 ? '+' : '') + '$' + d.unitVariance.toFixed(2) + ' (' + (d.variancePct * 100).toFixed(1) + '%)</span>' +
          '<span style="color:#94a3b8;">Total Cases:</span><span style="font-weight:600;text-align:right;">' + d.caseCount.toLocaleString() + '</span>' +
          '<span style="color:#94a3b8;">Net Variance $:</span><span style="font-weight:700;color:' + stColor + ';text-align:right;">' + (d.excessCost > 0 ? '+' : '') + formatNumber(d.excessCost, 'compact_currency') + '</span>' +
          '</div>' +
          (d.links && d.links.length ? '<div style="margin-top:6px;font-size:10px;color:#38bdf8;font-weight:600;">🔎 Click bubble or label to drill</div>' : '');
        tooltip.style.display = 'block';
      })
      .on('mousemove', function (event) {
        tooltip.style.left = (event.clientX + 14) + 'px';
        tooltip.style.top = (event.clientY - 12) + 'px';
      })
      .on('mouseleave', function () {
        d3.select(this).attr('stroke', '#ffffff').attr('stroke-width', 1.5);
        tooltip.style.display = 'none';
      })
      .on('click', function (event, d) {
        if (d.links && d.links.length && window.LookerCharts && window.LookerCharts.Utils) {
          window.LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
        }
      });

    // Value Labels
    if (config.showValueLabels !== 'hidden') {
      rows.append('text')
        .attr('x', function (d) { return Math.max(xScale(d.actualCost), xScale(d.benchmarkCost)) + rScale(d.caseCount) + 6; })
        .attr('y', 4)
        .style('font-size', '10.5px')
        .style('font-weight', '600')
        .style('fill', function (d) {
          var isAdverse = d.unitVariance > 0;
          return isAdverse ? (isLowerBetter ? adverseColor : favorableColor) : (isLowerBetter ? favorableColor : adverseColor);
        })
        .text(function (d) {
          return (d.unitVariance > 0 ? '+' : '') + (d.variancePct * 100).toFixed(1) + '%';
        });
    }

    // Legend at top right
    var leg = svg.append('g')
      .attr('transform', 'translate(' + (width - margin.right - 140) + ', 14)');

    leg.append('circle').attr('cx', 0).attr('cy', 0).attr('r', 5).attr('fill', '#ffffff').attr('stroke', benchmarkColor).attr('stroke-width', 2);
    leg.append('text').attr('x', 9).attr('y', 4).style('font-size', '10px').style('fill', theme.subtext).text('Benchmark');

    leg.append('circle').attr('cx', 80).attr('cy', 0).attr('r', 6).attr('fill', adverseColor).attr('opacity', 0.85);
    leg.append('text').attr('x', 90).attr('y', 4).style('font-size', '10px').style('fill', theme.subtext).text('Actual Cost');
  }

  // -------------------------------------------------------------
  // LAYOUT MODE 2: Waterfall (Service Line Variance Decomposition)
  // -------------------------------------------------------------
  function renderWaterfall(d3, container, items, width, height, theme, favorableColor, adverseColor, isLowerBetter, config, tooltip) {
    // Group by Service Line
    var groups = d3.rollup(items, function (v) {
      return {
        cases: d3.sum(v, function (d) { return d.caseCount; }),
        excess: d3.sum(v, function (d) { return d.excessCost; }),
        procs: v.map(function (d) { return d.procedure; })
      };
    }, function (d) { return d.serviceLine; });

    var steps = Array.from(groups, function (entry) {
      return { name: entry[0], delta: entry[1].excess, cases: entry[1].cases, procs: entry[1].procs };
    });

    // Sort by largest excess cost
    steps.sort(function (a, b) { return b.delta - a.delta; });

    // Compute running totals
    var running = 0;
    var bars = [];
    steps.forEach(function (s) {
      var start = running;
      running += s.delta;
      bars.push({
        name: s.name,
        start: start,
        end: running,
        delta: s.delta,
        cases: s.cases,
        isTotal: false,
        procs: s.procs
      });
    });

    // Add Net Total bar
    bars.push({
      name: 'Net Variance',
      start: 0,
      end: running,
      delta: running,
      cases: d3.sum(steps, function (s) { return s.cases; }),
      isTotal: true,
      procs: []
    });

    var margin = { top: 25, right: 30, bottom: 65, left: 75 };
    var chartW = Math.max(100, width - margin.left - margin.right);
    var chartH = Math.max(100, height - margin.top - margin.bottom);

    var svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('display', 'block');

    var g = svg.append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var allVals = bars.map(function (d) { return d.start; }).concat(bars.map(function (d) { return d.end; }));
    var minVal = Math.min(0, d3.min(allVals));
    var maxVal = Math.max(0, d3.max(allVals));
    var pad = (maxVal - minVal) * 0.15 || 1000;

    var yScale = d3.scaleLinear().domain([minVal - pad, maxVal + pad]).range([chartH, 0]);
    var xScale = d3.scaleBand().domain(bars.map(function (d) { return d.name; })).range([0, chartW]).padding(0.3);

    // Zero baseline
    g.append('line')
      .attr('x1', 0)
      .attr('x2', chartW)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', '#64748b')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4');

    // Axes
    var yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return formatNumber(d, 'compact_currency'); });
    g.append('g').call(yAxis).selectAll('text').style('font-size', '11px').style('fill', theme.subtext);

    var xAxis = d3.axisBottom(xScale);
    g.append('g')
      .attr('transform', 'translate(0,' + chartH + ')')
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', theme.text)
      .attr('transform', 'rotate(-18)')
      .style('text-anchor', 'end');

    // Bars
    g.selectAll('.waterfall-bar')
      .data(bars)
      .enter()
      .append('rect')
      .attr('class', 'waterfall-bar')
      .attr('x', function (d) { return xScale(d.name); })
      .attr('y', function (d) { return yScale(Math.max(d.start, d.end)); })
      .attr('width', xScale.bandwidth())
      .attr('height', function (d) { return Math.max(3, Math.abs(yScale(d.start) - yScale(d.end))); })
      .attr('fill', function (d) {
        if (d.isTotal) return theme.primary;
        var isAdv = d.delta > 0;
        return isAdv ? (isLowerBetter ? adverseColor : favorableColor) : (isLowerBetter ? favorableColor : adverseColor);
      })
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        tooltip.innerHTML =
          '<div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#ffffff;">' + d.name + '</div>' +
          '<div style="font-size:11.5px;color:#94a3b8;">Impact: <span style="font-weight:700;color:#ffffff;">' + (d.delta > 0 ? '+' : '') + formatNumber(d.delta, 'compact_currency') + '</span></div>' +
          '<div style="font-size:11px;color:#94a3b8;margin-top:2px;">Surgical Cases: ' + d.cases.toLocaleString() + '</div>' +
          (d.procs && d.procs.length ? '<div style="margin-top:4px;font-size:10px;color:#cbd5e1;">Top procedures: ' + d.procs.slice(0, 3).join(', ') + '</div>' : '');
        tooltip.style.display = 'block';
      })
      .on('mousemove', function (event) {
        tooltip.style.left = (event.clientX + 14) + 'px';
        tooltip.style.top = (event.clientY - 12) + 'px';
      })
      .on('mouseleave', function () {
        tooltip.style.display = 'none';
      });

    // Bar value labels
    g.selectAll('.waterfall-label')
      .data(bars)
      .enter()
      .append('text')
      .attr('x', function (d) { return xScale(d.name) + xScale.bandwidth() / 2; })
      .attr('y', function (d) {
        var topY = yScale(Math.max(d.start, d.end));
        return topY - 6;
      })
      .attr('text-anchor', 'middle')
      .style('font-size', '10.5px')
      .style('font-weight', '700')
      .style('fill', function (d) {
        if (d.isTotal) return theme.primary;
        return d.delta > 0 ? adverseColor : favorableColor;
      })
      .text(function (d) {
        return (d.delta > 0 ? '+' : '') + formatNumber(d.delta, 'compact_currency');
      });
  }

  // ----------------------------------------------------------------------
  // LAYOUT MODE 3: 2D Strategic Opportunity Quadrant (Cases vs Variance $)
  // ----------------------------------------------------------------------
  function renderOpportunityMatrix(d3, container, items, width, height, theme, favorableColor, adverseColor, isLowerBetter, config, tooltip) {
    var margin = { top: 25, right: 35, bottom: 45, left: 75 };
    var chartW = Math.max(100, width - margin.left - margin.right);
    var chartH = Math.max(100, height - margin.top - margin.bottom);

    var svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('display', 'block');

    var g = svg.append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var maxCases = d3.max(items, function (d) { return d.caseCount; }) * 1.1 || 1000;
    var medCases = d3.median(items, function (d) { return d.caseCount; }) || (maxCases / 2);
    var xScale = d3.scaleLinear().domain([0, maxCases]).range([0, chartW]);

    var allExcess = items.map(function (d) { return d.excessCost; });
    var minExcess = Math.min(0, d3.min(allExcess)) * 1.15;
    var maxExcess = Math.max(0, d3.max(allExcess)) * 1.15;
    var yScale = d3.scaleLinear().domain([minExcess, maxExcess]).range([chartH, 0]);

    // Quadrant background tint for Priority 1 (High cases, High excess)
    g.append('rect')
      .attr('x', xScale(medCases))
      .attr('y', 0)
      .attr('width', chartW - xScale(medCases))
      .attr('height', yScale(0))
      .attr('fill', '#fee2e2')
      .attr('fill-opacity', 0.35);

    g.append('text')
      .attr('x', chartW - 8)
      .attr('y', 16)
      .attr('text-anchor', 'end')
      .style('font-size', '10px')
      .style('font-weight', '700')
      .style('fill', '#b91c1c')
      .text('PRIORITY 1 STANDARDIZATION');

    // Quadrant background tint for Best Practice (High cases, favorable cost)
    g.append('rect')
      .attr('x', xScale(medCases))
      .attr('y', yScale(0))
      .attr('width', chartW - xScale(medCases))
      .attr('height', chartH - yScale(0))
      .attr('fill', '#dcfce7')
      .attr('fill-opacity', 0.35);

    g.append('text')
      .attr('x', chartW - 8)
      .attr('y', chartH - 8)
      .attr('text-anchor', 'end')
      .style('font-size', '10px')
      .style('font-weight', '700')
      .style('fill', '#15803d')
      .text('CLINICAL BEST PRACTICE ANCHORS');

    // Center divider lines
    g.append('line')
      .attr('x1', xScale(medCases))
      .attr('x2', xScale(medCases))
      .attr('y1', 0)
      .attr('y2', chartH)
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4');

    g.append('line')
      .attr('x1', 0)
      .attr('x2', chartW)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', '#64748b')
      .attr('stroke-width', 1.5);

    // Axes
    var xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(function (d) { return formatNumber(d, 'compact_number'); });
    g.append('g')
      .attr('transform', 'translate(0,' + chartH + ')')
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', theme.subtext);

    g.append('text')
      .attr('x', chartW / 2)
      .attr('y', chartH + 34)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', theme.text)
      .text('Total Surgical Case Volume');

    var yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return formatNumber(d, 'compact_currency'); });
    g.append('g').call(yAxis).selectAll('text').style('font-size', '11px').style('fill', theme.subtext);

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartH / 2)
      .attr('y', -52)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', theme.text)
      .text('Net Excess Supply Spend ($)');

    // Bubbles
    var dots = g.selectAll('.opp-bubble')
      .data(items)
      .enter()
      .append('g')
      .attr('class', 'opp-bubble')
      .attr('transform', function (d) { return 'translate(' + xScale(d.caseCount) + ',' + yScale(d.excessCost) + ')'; });

    dots.append('circle')
      .attr('r', 8)
      .attr('fill', function (d) {
        var isAdv = d.excessCost > 0;
        return isAdv ? adverseColor : favorableColor;
      })
      .attr('fill-opacity', 0.85)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('r', 11).attr('stroke', '#0f172a').attr('stroke-width', 2);
        tooltip.innerHTML =
          '<div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#ffffff;">' + d.procedure + '</div>' +
          '<div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">Specialty: ' + d.serviceLine + '</div>' +
          '<div style="font-size:11.5px;display:grid;grid-template-columns:auto auto;gap:3px 10px;">' +
          '<span style="color:#94a3b8;">Cases:</span><span style="font-weight:600;text-align:right;">' + d.caseCount.toLocaleString() + '</span>' +
          '<span style="color:#94a3b8;">Excess Cost:</span><span style="font-weight:700;text-align:right;color:' + (d.excessCost > 0 ? adverseColor : favorableColor) + ';">' + (d.excessCost > 0 ? '+' : '') + formatNumber(d.excessCost, 'compact_currency') + '</span>' +
          '<span style="color:#94a3b8;">Unit Variance:</span><span style="font-weight:600;text-align:right;">' + (d.unitVariance > 0 ? '+' : '') + '$' + d.unitVariance.toFixed(2) + '</span>' +
          '</div>';
        tooltip.style.display = 'block';
      })
      .on('mousemove', function (event) {
        tooltip.style.left = (event.clientX + 14) + 'px';
        tooltip.style.top = (event.clientY - 12) + 'px';
      })
      .on('mouseleave', function () {
        d3.select(this).attr('r', 8).attr('stroke', '#ffffff').attr('stroke-width', 1.5);
        tooltip.style.display = 'none';
      })
      .on('click', function (event, d) {
        if (d.links && d.links.length && window.LookerCharts && window.LookerCharts.Utils) {
          window.LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
        }
      });

    // Callout labels on top 6 items
    dots.filter(function (d, i) { return i < 6; })
      .append('text')
      .attr('x', 11)
      .attr('y', 4)
      .style('font-size', '10px')
      .style('font-weight', '600')
      .style('fill', theme.text)
      .text(function (d) { return d.procedure; });
  }

  // -------------------------------------------------------------
  // LAYOUT MODE 4: Clinical OR Standardization Scorecard Table
  // -------------------------------------------------------------
  function renderScorecardTable(container, items, theme, favorableColor, adverseColor, isLowerBetter, config) {
    var tableWrap = document.createElement('div');
    tableWrap.style.width = '100%';
    tableWrap.style.height = '100%';
    tableWrap.style.overflow = 'auto';
    tableWrap.style.padding = '8px 16px';
    container.appendChild(tableWrap);

    var html = '<table style="width:100%;border-collapse:collapse;font-size:12px;color:' + theme.text + ';">' +
      '<thead>' +
      '<tr style="border-bottom:2px solid ' + theme.border + ';text-align:left;font-size:11px;text-transform:uppercase;color:' + theme.subtext + ';">' +
      '<th style="padding:8px 6px;">Procedure</th>' +
      '<th style="padding:8px 6px;">Service Line</th>' +
      '<th style="padding:8px 6px;text-align:right;">Cases</th>' +
      '<th style="padding:8px 6px;text-align:right;">Actual Cost</th>' +
      '<th style="padding:8px 6px;text-align:right;">Benchmark</th>' +
      '<th style="padding:8px 6px;text-align:right;">Variance %</th>' +
      '<th style="padding:8px 6px;text-align:right;">Net Excess ($)</th>' +
      '<th style="padding:8px 6px;text-align:center;">Priority</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>';

    items.forEach(function (d, i) {
      var isAdv = d.excessCost > 0;
      var statusColor = isAdv ? adverseColor : favorableColor;
      var priorityBadge = isAdv ? (d.excessCost > 50000 ? '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">P1 Critical</span>' : '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;">P2 Monitor</span>') : '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;">Best Practice</span>';

      html += '<tr style="border-bottom:1px solid ' + theme.border + ';background:' + (i % 2 === 0 ? '#ffffff' : theme.track) + ';">' +
        '<td style="padding:8px 6px;font-weight:600;">' + d.procedure + '</td>' +
        '<td style="padding:8px 6px;color:' + theme.subtext + ';">' + d.serviceLine + '</td>' +
        '<td style="padding:8px 6px;text-align:right;">' + d.caseCount.toLocaleString() + '</td>' +
        '<td style="padding:8px 6px;text-align:right;font-weight:600;">$' + d.actualCost.toFixed(2) + '</td>' +
        '<td style="padding:8px 6px;text-align:right;color:' + theme.subtext + ';">$' + d.benchmarkCost.toFixed(2) + '</td>' +
        '<td style="padding:8px 6px;text-align:right;font-weight:700;color:' + statusColor + ';">' + (d.unitVariance > 0 ? '+' : '') + (d.variancePct * 100).toFixed(1) + '%</td>' +
        '<td style="padding:8px 6px;text-align:right;font-weight:700;color:' + statusColor + ';">' + (d.excessCost > 0 ? '+' : '') + formatNumber(d.excessCost, 'compact_currency') + '</td>' +
        '<td style="padding:8px 6px;text-align:center;">' + priorityBadge + '</td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    tableWrap.innerHTML = html;
  }

  if (typeof looker !== 'undefined' && looker.plugins && looker.plugins.visualizations) {
    looker.plugins.visualizations.add(visObject);
  } else if (typeof window !== 'undefined') {
    window.surgical_procedure_variance_matrix = visObject;
  }
})();
