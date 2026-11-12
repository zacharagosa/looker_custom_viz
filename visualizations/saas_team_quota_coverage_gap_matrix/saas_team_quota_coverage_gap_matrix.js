/**
 * SaaS Team Quota, Coverage & Gap Matrix
 * Google Cloud Looker Custom Visualization
 * Built with D3.js v7
 *
 * Designed for B2B SaaS Executive Leadership, CROs, VPs of Sales, and RevOps leaders.
 * Solves Buganizer Cloud Blockers b/494910291, b/398701962, and b/520494850.
 *
 * 4 Multi-Modal Layout Modes:
 * 1. team_matrix (Default): Executive Sales Team Attainment & Coverage Matrix
 *    (Grouped by Region & Segment, with multi-stage progress bullet bars for Closed Won + Commit + Upside vs Quota,
 *    Attainment % status badges, pipeline coverage multiplier pills, and Net Quota Gap / Surplus badges)
 * 2. revenue_progression_waterfall: Executive Quota-to-Pipeline Revenue Progression Waterfall
 *    (Step-by-step bridge from ARR Quota -> Closed Won ARR -> Commit ARR -> Upside ARR -> Pipeline Buffer -> Net Gap / Surplus)
 * 3. coverage_vs_attainment_scatter: 2x2 Strategic Pipeline Health & Execution Quadrant
 *    (Pipeline Coverage Multiplier on X-axis vs Quota Attainment % on Y-axis, sized by Quota / Headcount,
 *    stratified across 4 performance quadrants: Dominant Outperformers, Hollow Victories, Execution Lags, Critical Rebuild)
 * 4. capacity_productivity_bars: Sales Team Capacity & Quota-per-Head Productivity Grid
 *    (Comparing Total Headcount, Quota-per-Head, Win Rates, and Reps Producing)
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
      won: '#10b981',
      commit: '#3b82f6',
      upside: '#8b5cf6',
      quota: '#64748b',
      gap: '#ef4444',
      surplus: '#10b981',
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: '#e2e8f0',
      cardBg: '#f8fafc',
      grid: '#f1f5f9',
      isDark: false
    },
    google_enterprise: {
      name: 'Google Enterprise Blue',
      primary: '#1a73e8',
      won: '#1e8e3e',
      commit: '#1a73e8',
      upside: '#9334e6',
      quota: '#5f6368',
      gap: '#d93025',
      surplus: '#1e8e3e',
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      border: '#dadce0',
      cardBg: '#f8f9fa',
      grid: '#e8eaed',
      isDark: false
    },
    cyber_dark: {
      name: 'Cyber NOC Dark',
      primary: '#38bdf8',
      won: '#34d399',
      commit: '#60a5fa',
      upside: '#c084fc',
      quota: '#94a3b8',
      gap: '#f87171',
      surplus: '#34d399',
      bg: '#0b0f19',
      text: '#f8fafc',
      subtext: '#94a3b8',
      border: '#1e293b',
      cardBg: '#111827',
      grid: '#1f2937',
      isDark: true
    },
    emerald: {
      name: 'Emerald FinOps',
      primary: '#065f46',
      won: '#059669',
      commit: '#0284c7',
      upside: '#6366f1',
      quota: '#6b7280',
      gap: '#dc2626',
      surplus: '#059669',
      bg: '#ffffff',
      text: '#064e3b',
      subtext: '#047857',
      border: '#a7f3d0',
      cardBg: '#f0fdf4',
      grid: '#d1fae5',
      isDark: false
    },
    sunset: {
      name: 'Sunset Media & Rev',
      primary: '#9a3412',
      won: '#16a34a',
      commit: '#ea580c',
      upside: '#d97706',
      quota: '#78716c',
      gap: '#e11d48',
      surplus: '#16a34a',
      bg: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      border: '#fed7aa',
      cardBg: '#fff7ed',
      grid: '#ffedd5',
      isDark: false
    },
    wellverse: {
      name: 'Wellverse Healthcare',
      primary: '#143359',
      won: '#00af68',
      commit: '#2e7cf6',
      upside: '#7c5cfc',
      quota: '#64748b',
      gap: '#e5484d',
      surplus: '#00af68',
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: '#e2e8f0',
      cardBg: '#f8fafc',
      grid: '#f1f5f9',
      isDark: false
    }
  };

  function formatCurrency(val, style) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    var n = Number(val);
    var abs = Math.abs(n);
    var prefix = n < 0 ? '-$' : '$';
    if (style === 'raw') return prefix + abs.toLocaleString();
    if (abs >= 1e9) return prefix + (abs / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return prefix + (abs / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return prefix + (abs / 1e3).toFixed(1) + 'k';
    return prefix + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function formatNumber(val, style) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    var n = Number(val);
    var abs = Math.abs(n);
    var sign = n < 0 ? '-' : '';
    if (style === 'raw') return String(n);
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'k';
    return sign + abs.toLocaleString();
  }

  function formatPct(val) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    var n = Number(val);
    if (Math.abs(n) <= 2.5) {
      return (n * 100).toFixed(1) + '%';
    }
    return n.toFixed(1) + '%';
  }

  function formatMetric(val, style) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    if (style === 'compact_number') return formatNumber(val, 'compact');
    if (style === 'percentage') return formatPct(val);
    if (style === 'decimal_2') return Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (style === 'raw') return String(val);
    return formatCurrency(val, style);
  }

  function resolveField(list, overrideName, defaultIndex) {
    if (!list || !list.length) return null;
    if (overrideName && typeof overrideName === 'string' && overrideName.trim() !== '') {
      var trimmed = overrideName.trim();
      for (var i = 0; i < list.length; i++) {
        if (list[i].name === trimmed) return list[i];
      }
      for (var j = 0; j < list.length; j++) {
        var lbl = list[j].label || list[j].label_short || list[j].name;
        if (lbl.toLowerCase() === trimmed.toLowerCase()) return list[j];
      }
    }
    if (defaultIndex >= 0 && defaultIndex < list.length) {
      return list[defaultIndex];
    }
    return null;
  }

  var FIELD_SPECS = {
    teamDimOverride: { role: 'dimension', defaultIdx: 1 },
    managerDimOverride: { role: 'dimension', defaultIdx: 0 },
    regionDimOverride: { role: 'dimension', defaultIdx: 2 },
    segmentDimOverride: { role: 'dimension', defaultIdx: 3 },
    quotaMeasureOverride: { role: 'measure', defaultIdx: 1 },
    wonMeasureOverride: { role: 'measure', defaultIdx: 2 },
    commitMeasureOverride: { role: 'measure', defaultIdx: 3 },
    upsideMeasureOverride: { role: 'measure', defaultIdx: 4 },
    pipelineMeasureOverride: { role: 'measure', defaultIdx: 5 },
    headcountMeasureOverride: { role: 'measure', defaultIdx: 0 },
    targetMeasureOverride: { role: 'measure', defaultIdx: -1 }
  };

  looker.plugins.visualizations.add({
    id: 'saas_team_quota_coverage_gap_matrix',
    label: 'SaaS Team Quota, Coverage & Gap Matrix',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'Layout Paradigm Mode',
        display: 'select',
        values: [
          { 'Executive Team Attainment & Gap Matrix': 'team_matrix' },
          { 'Quota-to-Pipeline Progression Waterfall': 'revenue_progression_waterfall' },
          { '2x2 Pipeline Coverage vs Attainment Quad': 'coverage_vs_attainment_scatter' },
          { 'Sales Capacity & Productivity Bars': 'capacity_productivity_bars' }
        ],
        default: 'team_matrix',
        section: 'Display',
        order: 1
      },
      teamDimOverride: {
        type: 'string',
        label: 'Sales Team Dimension',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 2
      },
      managerDimOverride: {
        type: 'string',
        label: 'Manager Name / Email Dimension',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 3
      },
      regionDimOverride: {
        type: 'string',
        label: 'Region / Geographic Territory Dimension',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 4
      },
      segmentDimOverride: {
        type: 'string',
        label: 'Market Segment Dimension',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 5
      },
      quotaMeasureOverride: {
        type: 'string',
        label: 'Total ARR Quota Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 6
      },
      wonMeasureOverride: {
        type: 'string',
        label: 'Closed Won ARR Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 7
      },
      commitMeasureOverride: {
        type: 'string',
        label: 'Commit ARR Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 8
      },
      upsideMeasureOverride: {
        type: 'string',
        label: 'Upside ARR Measure (Optional)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 9
      },
      pipelineMeasureOverride: {
        type: 'string',
        label: 'Open Pipeline ARR Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 10
      },
      headcountMeasureOverride: {
        type: 'string',
        label: 'Headcount / Capacity Measure (Optional)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 11
      },
      targetMeasureOverride: {
        type: 'string',
        label: 'Custom Benchmark Target Measure (Optional)',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 12
      },
      targetMode: {
        type: 'string',
        label: 'Benchmark Target Mode',
        display: 'select',
        values: [
          { '3.0x Pipeline Coverage Benchmark': 'coverage_3x' },
          { 'Target Measure Column': 'measure_column' },
          { 'Fixed Benchmark Value': 'fixed' },
          { 'Dataset Mean Attainment': 'dataset_mean' },
          { 'Dataset Median Attainment': 'dataset_median' },
          { 'Top Percentile P75 Target': 'percentile_p75' },
          { 'Top Percentile P90 Target': 'percentile_p90' },
          { 'Disabled / None': 'none' }
        ],
        default: 'coverage_3x',
        section: 'Display',
        order: 13
      },
      fixedTargetValue: {
        type: 'number',
        label: 'Fixed Benchmark Target Value (when Fixed Mode)',
        default: 100,
        section: 'Display',
        order: 14
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Benchmark Reference Line Label',
        default: '3.0x Target Coverage',
        section: 'Display',
        order: 15
      },
      anomalyThresholdPct: {
        type: 'number',
        label: 'Anomaly Deficit Alert Threshold (%)',
        default: 25,
        section: 'Display',
        order: 16
      },
      sortBy: {
        type: 'string',
        label: 'Interactive Sorting Order',
        display: 'select',
        values: [
          { 'Closed Won ARR Descending': 'metric_desc' },
          { 'Closed Won ARR Ascending': 'metric_asc' },
          { 'Attainment % Descending': 'attainment_desc' },
          { 'Quota Gap Deficit Descending': 'gap_desc' },
          { 'Alphabetical by Team Name': 'alphabetical' },
          { 'Natural Query Order': 'natural' }
        ],
        default: 'metric_desc',
        section: 'Display',
        order: 17
      },
      topNLimit: {
        type: 'number',
        label: 'Top-N Teams Limit (0 = All)',
        default: 0,
        section: 'Display',
        order: 18
      },
      enableOtherRollup: {
        type: 'boolean',
        label: 'Rollup Tail Teams into (Other) Stream',
        default: true,
        section: 'Display',
        order: 19
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Suppress Zero / Inactive Teams',
        default: false,
        section: 'Display',
        order: 20
      },
      hudMode: {
        type: 'string',
        label: 'Executive Scorecard HUD Mode',
        display: 'select',
        values: [
          { 'Full Scorecard HUD': 'scorecard' },
          { 'Compact Metric Strip': 'compact_strip' },
          { 'Hidden': 'none' }
        ],
        default: 'scorecard',
        section: 'Display',
        order: 21
      },
      labelDensity: {
        type: 'string',
        label: 'Label Density',
        display: 'select',
        values: [
          { 'All Labels Visible': 'all' },
          { 'Min/Max Outliers Only': 'peaks_only' },
          { 'Hidden / Tooltip Only': 'hidden' }
        ],
        default: 'all',
        section: 'Display',
        order: 22
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Interactive Team Search Bar',
        default: true,
        section: 'Display',
        order: 23
      },
      customTitle: {
        type: 'string',
        label: 'Custom Dashboard Title Override',
        default: '',
        section: 'Display',
        order: 24
      },
      customSubtitle: {
        type: 'string',
        label: 'Custom Dashboard Subtitle Override',
        default: '',
        section: 'Display',
        order: 25
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorTheme: {
        type: 'string',
        label: 'Brand Palette Theme',
        section: 'Style',
        order: 1,
        display: 'select',
        values: [
          { 'Modern Slate': 'slate' },
          { 'Google Enterprise Blue': 'google_enterprise' },
          { 'Cyber NOC Dark': 'cyber_dark' },
          { 'Emerald FinOps': 'emerald' },
          { 'Sunset Media & Rev': 'sunset' },
          { 'Wellverse Healthcare': 'wellverse' },
          { 'Custom Hex Override': 'custom' }
        ],
        default: 'slate'
      },
      customPrimaryHex: {
        type: 'string',
        label: 'Custom Primary Accent Hex',
        default: '#0f172a',
        display: 'color',
        section: 'Style',
        order: 2
      },
      customPositiveHex: {
        type: 'string',
        label: 'Custom Positive / Won Hex',
        default: '#10b981',
        display: 'color',
        section: 'Style',
        order: 3
      },
      customNegativeHex: {
        type: 'string',
        label: 'Custom Deficit / Gap Hex',
        default: '#ef4444',
        display: 'color',
        section: 'Style',
        order: 4
      },
      metricPolarity: {
        type: 'string',
        label: 'Metric Polar Sensitivity',
        display: 'select',
        values: [
          { 'Higher is Better (ARR, Attainment, Coverage)': 'higher_is_better' },
          { 'Lower is Better (Quota Gap, Slippage, Churn)': 'lower_is_better' }
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
          { 'Compact (Dense Executive View)': 'compact' },
          { 'Standard Layout': 'standard' },
          { 'Large Presentation': 'large' }
        ],
        default: 'standard',
        section: 'Style',
        order: 6
      },
      valueFormat: {
        type: 'string',
        label: 'Currency & Number Formatting',
        display: 'select',
        values: [
          { 'Auto (Compact Currency $1.2M)': 'auto' },
          { 'Compact Currency ($1.2M)': 'compact_currency' },
          { 'Compact Number (1.2M)': 'compact_number' },
          { 'Percentage (45.2%)': 'percentage' },
          { 'Decimal (2dp)': 'decimal_2' },
          { 'Raw Numbers': 'raw' }
        ],
        default: 'auto',
        section: 'Style',
        order: 7
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      if (!queryResponse || !queryResponse.fields || typeof self.trigger !== 'function') return;
      var f = queryResponse.fields;
      var dims = f.dimensions && f.dimensions.length ? f.dimensions : f.dimension_like || [];
      var meas = f.measures && f.measures.length ? f.measures : f.measure_like || [];
      if (!meas.length && f.table_calculations && f.table_calculations.length) {
        meas = f.table_calculations;
      }

      var signature =
        dims.map(function (d) { return d.name; }).join('|') +
        '::' +
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

      Object.keys(FIELD_SPECS).forEach(function (key) {
        var spec = FIELD_SPECS[key];
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
      element.style.boxSizing = 'border-box';
      element.style.padding = '0';
      element.style.margin = '0';
      element.style.overflow = 'hidden';
      element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

      var container = document.createElement('div');
      container.className = 'saas-team-quota-container';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.overflow = 'hidden';
      element.appendChild(container);
      this._container = container;

      var tooltip = document.createElement('div');
      tooltip.className = 'saas-team-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.display = 'none';
      tooltip.style.zIndex = '99999';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.padding = '10px 14px';
      tooltip.style.borderRadius = '8px';
      tooltip.style.fontSize = '12px';
      tooltip.style.lineHeight = '1.4';
      tooltip.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)';
      document.body.appendChild(tooltip);
      this._tooltip = tooltip;

      var self = this;
      this._lastHeight = 0;
      this._resizeObserver = new ResizeObserver(function (entries) {
        if (!entries || !entries.length) return;
        var h = entries[0].contentRect.height;
        if (Math.abs(h - self._lastHeight) < 4) return;
        self._lastHeight = h;
        if (self._lastData && self._lastQueryResponse) {
          self._render(self._lastData, self._lastConfig, self._lastQueryResponse);
        }
      });
      this._resizeObserver.observe(element);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      this._registerDynamicFieldOptions(queryResponse);

      if (!data || !data.length) {
        this._container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:13px;">No data returned from query.</div>';
        if (done) done();
        return;
      }

      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;

      var self = this;
      ensureD3(function (d3) {
        self._d3 = d3;
        self._render(data, config, queryResponse);
        if (done) done();
      });
    },

    _render: function (data, config, queryResponse) {
      var self = this;
      var container = this._container;
      container.innerHTML = '';

      var f = queryResponse.fields;
      var dims = f.dimensions && f.dimensions.length ? f.dimensions : f.dimension_like || [];
      var meas = f.measures && f.measures.length ? f.measures : f.measure_like || [];
      if (!meas.length && f.table_calculations && f.table_calculations.length) {
        meas = f.table_calculations;
      }

      var themeKey = config.colorTheme || 'slate';
      var theme = Object.assign({}, PALETTES[themeKey] || PALETTES.slate);
      if (themeKey === 'custom') {
        theme.primary = config.customPrimaryHex || '#0f172a';
        theme.won = config.customPositiveHex || '#10b981';
        theme.gap = config.customNegativeHex || '#ef4444';
        theme.surplus = config.customPositiveHex || '#10b981';
      }

      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      // Font scaling
      var fScale = config.fontScale || 'standard';
      var baseFontSize = fScale === 'compact' ? 11 : fScale === 'large' ? 14 : 12;
      container.style.fontSize = baseFontSize + 'px';

      // Field resolution
      var teamField = resolveField(dims, config.teamDimOverride, 1) || dims[0];
      var managerField = resolveField(dims, config.managerDimOverride, 0) || dims[0];
      var regionField = resolveField(dims, config.regionDimOverride, 2);
      var segmentField = resolveField(dims, config.segmentDimOverride, 3);

      var quotaField = resolveField(meas, config.quotaMeasureOverride, 1) || meas[0];
      var wonField = resolveField(meas, config.wonMeasureOverride, 2) || meas[0];
      var commitField = resolveField(meas, config.commitMeasureOverride, 3);
      var upsideField = resolveField(meas, config.upsideMeasureOverride, 4);
      var pipelineField = resolveField(meas, config.pipelineMeasureOverride, 5);
      var headcountField = resolveField(meas, config.headcountMeasureOverride, 0);

      // Parse data rows
      var teams = [];
      data.forEach(function (row, idx) {
        var teamName = teamField && row[teamField.name] ? (row[teamField.name].rendered || row[teamField.name].value || 'Team ' + (idx + 1)) : 'Team ' + (idx + 1);
        var managerName = managerField && row[managerField.name] ? (row[managerField.name].rendered || row[managerField.name].value || 'Manager ' + (idx + 1)) : 'Manager ' + (idx + 1);
        var region = regionField && row[regionField.name] ? (row[regionField.name].rendered || row[regionField.name].value || 'Global') : 'Global';
        var segment = segmentField && row[segmentField.name] ? (row[segmentField.name].rendered || row[segmentField.name].value || 'All Segments') : 'All Segments';

        var quota = quotaField && row[quotaField.name] ? Number(row[quotaField.name].value) || 0 : 0;
        var won = wonField && row[wonField.name] ? Number(row[wonField.name].value) || 0 : 0;
        var commit = commitField && row[commitField.name] ? Number(row[commitField.name].value) || 0 : 0;
        var upside = upsideField && row[upsideField.name] ? Number(row[upsideField.name].value) || 0 : 0;
        var pipeline = pipelineField && row[pipelineField.name] ? Number(row[pipelineField.name].value) || 0 : 0;
        var headcount = headcountField && row[headcountField.name] ? Number(row[headcountField.name].value) || 0 : 0;

        if (config.suppressZeroNull && won <= 0 && quota <= 0 && commit <= 0) return;

        var attainment = quota > 0 ? (won / quota) * 100 : (won > 0 ? 100 : 0);
        var commitAttainment = quota > 0 ? ((won + commit) / quota) * 100 : attainment;
        var gap = quota - won;
        var coverage = quota > 0 ? ((pipeline + commit + upside) / quota) : (pipeline > 0 ? 3.0 : 0);

        // Status Tier
        var statusTier = 'struggling';
        var statusLabel = 'Critical Deficit';
        if (attainment >= 100) {
          statusTier = 'club';
          statusLabel = 'Quota Achieved';
        } else if (commitAttainment >= 100) {
          statusTier = 'on_track';
          statusLabel = 'Commit Covers Quota';
        } else if (commitAttainment >= 75) {
          statusTier = 'pacing';
          statusLabel = 'Pacing';
        }

        teams.push({
          id: 'team_' + idx,
          name: String(teamName).trim(),
          manager: String(managerName).trim(),
          region: String(region).trim(),
          segment: String(segment).trim(),
          quota: quota,
          won: won,
          commit: commit,
          upside: upside,
          pipeline: pipeline,
          headcount: headcount,
          attainment: attainment,
          commitAttainment: commitAttainment,
          gap: gap,
          coverage: coverage,
          statusTier: statusTier,
          statusLabel: statusLabel,
          drillLinks: (teamField && row[teamField.name] && row[teamField.name].links) || (managerField && row[managerField.name] && row[managerField.name].links) || [],
          rawRow: row
        });
      });

      // Filter by search query if any
      var activeTeams = teams;
      if (this._searchQuery) {
        var q = this._searchQuery.toLowerCase();
        activeTeams = activeTeams.filter(function (t) {
          return t.name.toLowerCase().indexOf(q) !== -1 ||
                 t.manager.toLowerCase().indexOf(q) !== -1 ||
                 t.region.toLowerCase().indexOf(q) !== -1 ||
                 t.segment.toLowerCase().indexOf(q) !== -1;
        });
      }

      // Interactive Sorting
      var sortBy = config.sortBy || 'metric_desc';
      if (sortBy === 'metric_desc') {
        activeTeams.sort(function (a, b) { return b.won - a.won; });
      } else if (sortBy === 'metric_asc') {
        activeTeams.sort(function (a, b) { return a.won - b.won; });
      } else if (sortBy === 'attainment_desc') {
        activeTeams.sort(function (a, b) { return b.attainment - a.attainment; });
      } else if (sortBy === 'gap_desc') {
        activeTeams.sort(function (a, b) { return b.gap - a.gap; });
      } else if (sortBy === 'alphabetical') {
        activeTeams.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }

      // Top-N Limiting & Other Rollup
      var topN = Number(config.topNLimit) || 0;
      if (topN > 0 && topN < activeTeams.length) {
        if (config.enableOtherRollup) {
          var retained = activeTeams.slice(0, topN);
          var rest = activeTeams.slice(topN);

          var otherQuota = 0, otherWon = 0, otherCommit = 0, otherUpside = 0, otherPipeline = 0, otherHeadcount = 0;
          rest.forEach(function (r) {
            otherQuota += r.quota;
            otherWon += r.won;
            otherCommit += r.commit;
            otherUpside += r.upside;
            otherPipeline += r.pipeline;
            otherHeadcount += r.headcount;
          });

          var otherAttainment = otherQuota > 0 ? (otherWon / otherQuota) * 100 : 0;
          var otherCommitAttainment = otherQuota > 0 ? ((otherWon + otherCommit) / otherQuota) * 100 : otherAttainment;
          var otherGap = otherQuota - otherWon;
          var otherCoverage = otherQuota > 0 ? ((otherPipeline + otherCommit + otherUpside) / otherQuota) : 0;

          retained.push({
            id: 'team_other',
            name: 'Other (' + rest.length + ' Teams)',
            manager: 'Consolidated Tail',
            region: 'Various',
            segment: 'Various',
            quota: otherQuota,
            won: otherWon,
            commit: otherCommit,
            upside: otherUpside,
            pipeline: otherPipeline,
            headcount: otherHeadcount,
            attainment: otherAttainment,
            commitAttainment: otherCommitAttainment,
            gap: otherGap,
            coverage: otherCoverage,
            statusTier: otherAttainment >= 100 ? 'club' : 'pacing',
            statusLabel: 'Consolidated Tail',
            drillLinks: [],
            rawRow: {}
          });
          activeTeams = retained;
        } else {
          activeTeams = activeTeams.slice(0, topN);
        }
      }

      // Render Toolbar
      self._renderToolbar(container, config, theme, teams.length, activeTeams.length);

      // Render Executive HUD
      if (config.hudMode !== 'none') {
        self._renderHud(container, config, theme, teams);
      }

      // Main Content Area
      var mainArea = document.createElement('div');
      mainArea.className = 'saas-team-main-view';
      mainArea.style.flex = '1 1 auto';
      mainArea.style.minHeight = '0';
      mainArea.style.overflow = 'auto';
      mainArea.style.padding = '12px 16px';
      container.appendChild(mainArea);

      var layout = config.layoutMode || 'team_matrix';
      if (layout === 'revenue_progression_waterfall') {
        self._renderWaterfall(mainArea, activeTeams, config, theme);
      } else if (layout === 'coverage_vs_attainment_scatter') {
        self._renderScatter(mainArea, activeTeams, config, theme);
      } else if (layout === 'capacity_productivity_bars') {
        self._renderProductivity(mainArea, activeTeams, config, theme);
      } else {
        self._renderTeamMatrix(mainArea, activeTeams, config, theme);
      }
    },

    _renderToolbar: function (container, config, theme, totalCount, visibleCount) {
      var self = this;
      var toolbar = document.createElement('div');
      toolbar.className = 'saas-team-toolbar';
      toolbar.style.display = 'flex';
      toolbar.style.alignItems = 'center';
      toolbar.style.justifyContent = 'space-between';
      toolbar.style.flexWrap = 'wrap';
      toolbar.style.gap = '8px';
      toolbar.style.padding = '8px 16px';
      toolbar.style.borderBottom = '1px solid ' + theme.border;
      toolbar.style.backgroundColor = theme.cardBg;

      var leftBox = document.createElement('div');
      leftBox.style.display = 'flex';
      leftBox.style.alignItems = 'center';
      leftBox.style.gap = '10px';

      var titleText = config.customTitle || 'SaaS Team Quota & Pipeline Gap Matrix';
      var titleSpan = document.createElement('span');
      titleSpan.style.fontWeight = '700';
      titleSpan.style.fontSize = '14px';
      titleSpan.style.color = theme.primary;
      titleSpan.textContent = titleText;
      leftBox.appendChild(titleSpan);

      if (config.customSubtitle) {
        var subSpan = document.createElement('span');
        subSpan.style.color = theme.subtext;
        subSpan.style.fontSize = '12px';
        subSpan.textContent = '— ' + config.customSubtitle;
        leftBox.appendChild(subSpan);
      }

      toolbar.appendChild(leftBox);

      var rightBox = document.createElement('div');
      rightBox.style.display = 'flex';
      rightBox.style.alignItems = 'center';
      rightBox.style.gap = '10px';

      if (config.showSearch !== false) {
        var searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search team, manager, region...';
        searchInput.value = self._searchQuery || '';
        searchInput.style.padding = '4px 10px';
        searchInput.style.fontSize = '11px';
        searchInput.style.borderRadius = '6px';
        searchInput.style.border = '1px solid ' + theme.border;
        searchInput.style.backgroundColor = theme.bg;
        searchInput.style.color = theme.text;
        searchInput.style.outline = 'none';
        searchInput.style.width = '180px';

        searchInput.addEventListener('input', function (e) {
          self._searchQuery = e.target.value;
          self._render(self._lastData, self._lastConfig, self._lastQueryResponse);
        });
        rightBox.appendChild(searchInput);
      }

      var countBadge = document.createElement('span');
      countBadge.style.fontSize = '11px';
      countBadge.style.color = theme.subtext;
      countBadge.style.fontWeight = '600';
      countBadge.textContent = visibleCount + ' of ' + totalCount + ' Teams';
      rightBox.appendChild(countBadge);

      toolbar.appendChild(rightBox);
      container.appendChild(toolbar);
    },

    _renderHud: function (container, config, theme, teams) {
      var hudMode = config.hudMode || 'scorecard';
      var hud = document.createElement('div');
      hud.className = 'saas-team-hud';
      hud.style.display = 'flex';
      hud.style.alignItems = 'center';
      hud.style.flexWrap = 'wrap';
      hud.style.gap = hudMode === 'compact_strip' ? '12px' : '16px';
      hud.style.padding = hudMode === 'compact_strip' ? '6px 16px' : '12px 16px';
      hud.style.borderBottom = '1px solid ' + theme.border;
      hud.style.backgroundColor = theme.bg;

      var totalQuota = 0, totalWon = 0, totalCommit = 0, totalUpside = 0, totalPipeline = 0, totalHeadcount = 0;
      teams.forEach(function (t) {
        totalQuota += t.quota;
        totalWon += t.won;
        totalCommit += t.commit;
        totalUpside += t.upside;
        totalPipeline += t.pipeline;
        totalHeadcount += t.headcount;
      });

      var totalAttainment = totalQuota > 0 ? (totalWon / totalQuota) * 100 : 0;
      var totalCoverage = totalQuota > 0 ? ((totalPipeline + totalCommit + totalUpside) / totalQuota) : 0;
      var netGap = totalQuota - totalWon;

      var valFmt = config.valueFormat || 'auto';

      if (hudMode === 'compact_strip') {
        hud.innerHTML =
          '<span style="font-weight:700;color:' + theme.text + ';">💼 Org Won ARR: ' + formatCurrency(totalWon, valFmt) + '</span>' +
          '<span style="color:' + theme.subtext + ';">|</span>' +
          '<span style="color:' + theme.subtext + ';">Quota: <b>' + formatCurrency(totalQuota, valFmt) + '</b></span>' +
          '<span style="color:' + theme.subtext + ';">|</span>' +
          '<span style="color:' + (totalAttainment >= 100 ? theme.won : theme.text) + ';font-weight:700;">Attainment: ' + totalAttainment.toFixed(1) + '%</span>' +
          '<span style="color:' + theme.subtext + ';">|</span>' +
          '<span style="color:' + (totalCoverage >= 3.0 ? theme.won : '#f59e0b') + ';font-weight:700;">Coverage: ' + totalCoverage.toFixed(2) + 'x</span>' +
          '<span style="color:' + theme.subtext + ';">|</span>' +
          '<span style="color:' + (netGap <= 0 ? theme.won : theme.gap) + ';font-weight:700;">' + (netGap <= 0 ? 'Surplus: +' : 'Deficit: -') + formatCurrency(Math.abs(netGap), valFmt) + '</span>';
        container.appendChild(hud);
        return;
      }

      // Full Scorecard HUD
      var metrics = [
        { label: 'Total Won ARR', value: formatCurrency(totalWon, valFmt), color: theme.won, sub: totalAttainment.toFixed(1) + '% of Quota' },
        { label: 'Total ARR Quota', value: formatCurrency(totalQuota, valFmt), color: theme.text, sub: teams.length + ' Teams Active' },
        { label: 'Commit ARR', value: formatCurrency(totalCommit, valFmt), color: theme.commit, sub: ((totalCommit / (totalQuota || 1)) * 100).toFixed(1) + '% of Quota' },
        { label: 'Pipeline Coverage', value: totalCoverage.toFixed(2) + 'x', color: totalCoverage >= 3.0 ? theme.won : '#f59e0b', sub: totalCoverage >= 3.0 ? 'Healthy Multiplier' : 'Below 3.0x Target' },
        { label: netGap <= 0 ? 'Quota Surplus' : 'Net Quota Gap', value: (netGap <= 0 ? '+' : '-') + formatCurrency(Math.abs(netGap), valFmt), color: netGap <= 0 ? theme.won : theme.gap, sub: netGap <= 0 ? 'Quota Beat' : 'Shortfall to Target' }
      ];

      metrics.forEach(function (m) {
        var card = document.createElement('div');
        card.style.flex = '1 1 140px';
        card.style.minWidth = '130px';
        card.style.padding = '8px 12px';
        card.style.borderRadius = '8px';
        card.style.backgroundColor = theme.cardBg;
        card.style.border = '1px solid ' + theme.border;

        card.innerHTML =
          '<div style="font-size:11px;color:' + theme.subtext + ';font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">' + m.label + '</div>' +
          '<div style="font-size:18px;font-weight:800;color:' + m.color + ';margin:2px 0;">' + m.value + '</div>' +
          '<div style="font-size:11px;color:' + theme.subtext + ';">' + m.sub + '</div>';
        hud.appendChild(card);
      });

      container.appendChild(hud);
    },

    _renderTeamMatrix: function (mainArea, teams, config, theme) {
      var self = this;
      var d3 = this._d3;

      var tableWrapper = document.createElement('div');
      tableWrapper.style.width = '100%';
      tableWrapper.style.overflowX = 'auto';

      var table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '12px';

      // Table Header
      var thead = document.createElement('thead');
      thead.innerHTML =
        '<tr style="border-bottom:2px solid ' + theme.border + ';text-align:left;color:' + theme.subtext + ';font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">' +
          '<th style="padding:10px 12px;font-weight:700;">Sales Team & Manager</th>' +
          '<th style="padding:10px 12px;font-weight:700;">Region / Segment</th>' +
          '<th style="padding:10px 12px;font-weight:700;text-align:right;">ARR Quota</th>' +
          '<th style="padding:10px 12px;font-weight:700;min-width:220px;">Progress to Quota (Won + Commit + Upside)</th>' +
          '<th style="padding:10px 12px;font-weight:700;text-align:center;">Attainment</th>' +
          '<th style="padding:10px 12px;font-weight:700;text-align:center;">Pipeline Coverage</th>' +
          '<th style="padding:10px 12px;font-weight:700;text-align:right;">Net Gap / Surplus</th>' +
        '</tr>';
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      teams.forEach(function (t, idx) {
        var tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid ' + theme.border;
        tr.style.backgroundColor = idx % 2 === 0 ? 'transparent' : (theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)');
        tr.style.transition = 'background-color 0.15s ease';

        tr.addEventListener('mouseenter', function () {
          tr.style.backgroundColor = theme.isDark ? '#1e293b' : '#f1f5f9';
        });
        tr.addEventListener('mouseleave', function () {
          tr.style.backgroundColor = idx % 2 === 0 ? 'transparent' : (theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)');
        });

        // Team Name & Manager
        var tdTeam = document.createElement('td');
        tdTeam.style.padding = '10px 12px';
        tdTeam.style.cursor = t.drillLinks && t.drillLinks.length ? 'pointer' : 'default';
        tdTeam.innerHTML =
          '<div style="font-weight:700;color:' + theme.text + ';">' + t.name + '</div>' +
          '<div style="font-size:11px;color:' + theme.subtext + ';">Mgr: ' + t.manager + (t.headcount > 0 ? ' • ' + t.headcount + ' Reps' : '') + '</div>';

        if (t.drillLinks && t.drillLinks.length) {
          tdTeam.addEventListener('click', function (e) {
            if (window.LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
              LookerCharts.Utils.openDrillMenu({ links: t.drillLinks, event: e });
            }
          });
        }
        tr.appendChild(tdTeam);

        // Region / Segment
        var tdGeo = document.createElement('td');
        tdGeo.style.padding = '10px 12px';
        tdGeo.innerHTML =
          '<span style="font-weight:600;">' + t.region + '</span> ' +
          '<span style="color:' + theme.subtext + ';font-size:11px;">(' + t.segment + ')</span>';
        tr.appendChild(tdGeo);

        // Quota
        var tdQuota = document.createElement('td');
        tdQuota.style.padding = '10px 12px';
        tdQuota.style.textAlign = 'right';
        tdQuota.style.fontWeight = '600';
        tdQuota.textContent = formatCurrency(t.quota, config.valueFormat);
        tr.appendChild(tdQuota);

        // Progress Bar
        var tdBar = document.createElement('td');
        tdBar.style.padding = '10px 12px';
        var maxScaleVal = Math.max(t.quota, t.won + t.commit + t.upside) * 1.05 || 100;
        var wonPct = Math.min(100, (t.won / maxScaleVal) * 100);
        var commitPct = Math.min(100 - wonPct, (t.commit / maxScaleVal) * 100);
        var upsidePct = Math.min(100 - wonPct - commitPct, (t.upside / maxScaleVal) * 100);
        var quotaMarkPct = Math.min(100, (t.quota / maxScaleVal) * 100);

        tdBar.innerHTML =
          '<div style="position:relative;width:100%;height:14px;background:' + (theme.isDark ? '#1e293b' : '#e2e8f0') + ';border-radius:7px;overflow:hidden;display:flex;">' +
            '<div style="width:' + wonPct + '%;height:100%;background:' + theme.won + ';transition:width 0.3s;" title="Won: ' + formatCurrency(t.won) + '"></div>' +
            '<div style="width:' + commitPct + '%;height:100%;background:' + theme.commit + ';transition:width 0.3s;" title="Commit: ' + formatCurrency(t.commit) + '"></div>' +
            '<div style="width:' + upsidePct + '%;height:100%;background:' + theme.upside + ';transition:width 0.3s;" title="Upside: ' + formatCurrency(t.upside) + '"></div>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;font-size:10px;color:' + theme.subtext + ';margin-top:3px;">' +
            '<span>Won: ' + formatCurrency(t.won) + '</span>' +
            (t.commit > 0 ? '<span>+Commit: ' + formatCurrency(t.commit) + '</span>' : '') +
            '<span>Target: ' + formatCurrency(t.quota) + '</span>' +
          '</div>';
        tr.appendChild(tdBar);

        // Attainment %
        var tdAtt = document.createElement('td');
        tdAtt.style.padding = '10px 12px';
        tdAtt.style.textAlign = 'center';
        var attBg = t.attainment >= 100 ? (theme.isDark ? '#064e3b' : '#dcfce7') : t.commitAttainment >= 100 ? (theme.isDark ? '#1e3a8a' : '#dbeafe') : (theme.isDark ? '#7f1d1d' : '#fee2e2');
        var attColor = t.attainment >= 100 ? (theme.isDark ? '#34d399' : '#15803d') : t.commitAttainment >= 100 ? (theme.isDark ? '#60a5fa' : '#1d4ed8') : (theme.isDark ? '#f87171' : '#b91c1c');

        tdAtt.innerHTML =
          '<span style="display:inline-block;padding:3px 8px;border-radius:12px;font-weight:700;font-size:11px;background:' + attBg + ';color:' + attColor + ';">' +
            t.attainment.toFixed(1) + '%' +
          '</span>';
        tr.appendChild(tdAtt);

        // Pipeline Coverage
        var tdCov = document.createElement('td');
        tdCov.style.padding = '10px 12px';
        tdCov.style.textAlign = 'center';
        var covColor = t.coverage >= 3.0 ? theme.won : (t.coverage >= 2.0 ? '#f59e0b' : theme.gap);
        tdCov.innerHTML =
          '<span style="font-weight:700;color:' + covColor + ';">' + t.coverage.toFixed(2) + 'x</span>';
        tr.appendChild(tdCov);

        // Gap / Surplus
        var tdGap = document.createElement('td');
        tdGap.style.padding = '10px 12px';
        tdGap.style.textAlign = 'right';
        tdGap.style.fontWeight = '700';
        tdGap.style.color = t.gap <= 0 ? theme.won : theme.gap;
        tdGap.textContent = (t.gap <= 0 ? '+' : '-') + formatCurrency(Math.abs(t.gap), config.valueFormat);
        tr.appendChild(tdGap);

        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      tableWrapper.appendChild(table);
      mainArea.appendChild(tableWrapper);
    },

    _renderWaterfall: function (mainArea, teams, config, theme) {
      var self = this;
      var d3 = this._d3;

      var totalQuota = 0, totalWon = 0, totalCommit = 0, totalUpside = 0, totalPipeline = 0;
      teams.forEach(function (t) {
        totalQuota += t.quota;
        totalWon += t.won;
        totalCommit += t.commit;
        totalUpside += t.upside;
        totalPipeline += t.pipeline;
      });

      var netGap = totalQuota - totalWon;
      var uncommittedPipeline = Math.max(0, totalPipeline - totalCommit - totalUpside);

      var steps = [
        { label: 'ARR Quota', value: totalQuota, type: 'quota', color: theme.quota },
        { label: 'Closed Won ARR', value: totalWon, type: 'won', color: theme.won },
        { label: 'Commit ARR', value: totalCommit, type: 'commit', color: theme.commit },
        { label: 'Upside ARR', value: totalUpside, type: 'upside', color: theme.upside },
        { label: 'Uncommitted Pipe', value: uncommittedPipeline, type: 'pipeline', color: '#0ea5e9' },
        { label: netGap <= 0 ? 'Quota Surplus' : 'Net Quota Deficit', value: Math.abs(netGap), type: netGap <= 0 ? 'surplus' : 'gap', color: netGap <= 0 ? theme.won : theme.gap }
      ];

      var wrap = document.createElement('div');
      wrap.style.width = '100%';
      wrap.style.height = '100%';
      wrap.style.minHeight = '320px';
      mainArea.appendChild(wrap);

      var width = wrap.clientWidth || 600;
      var height = wrap.clientHeight || 340;
      var margin = { top: 20, right: 30, bottom: 40, left: 60 };

      var svg = d3.select(wrap).append('svg')
        .attr('width', width)
        .attr('height', height);

      var x = d3.scaleBand()
        .domain(steps.map(function (d) { return d.label; }))
        .range([margin.left, width - margin.right])
        .padding(0.25);

      var maxVal = Math.max(totalQuota, totalWon + totalCommit + totalUpside, totalPipeline) * 1.15 || 100;
      var y = d3.scaleLinear()
        .domain([0, maxVal])
        .nice()
        .range([height - margin.bottom, margin.top]);

      // Grid lines
      svg.append('g')
        .attr('stroke', theme.grid)
        .attr('stroke-dasharray', '2,2')
        .call(d3.axisLeft(y).tickSize(-(width - margin.left - margin.right)).tickFormat(''));

      // Bars
      svg.selectAll('.waterfall-bar')
        .data(steps)
        .enter().append('rect')
        .attr('class', 'waterfall-bar')
        .attr('x', function (d) { return x(d.label); })
        .attr('y', function (d) { return y(d.value); })
        .attr('width', x.bandwidth())
        .attr('height', function (d) { return (height - margin.bottom) - y(d.value); })
        .attr('fill', function (d) { return d.color; })
        .attr('rx', 4);

      // Value labels
      svg.selectAll('.waterfall-label')
        .data(steps)
        .enter().append('text')
        .attr('class', 'waterfall-label')
        .attr('x', function (d) { return x(d.label) + x.bandwidth() / 2; })
        .attr('y', function (d) { return y(d.value) - 6; })
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('fill', theme.text)
        .text(function (d) { return formatCurrency(d.value, config.valueFormat); });

      // X Axis
      svg.append('g')
        .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
        .call(d3.axisBottom(x))
        .attr('color', theme.subtext)
        .selectAll('text')
        .attr('font-size', '11px')
        .attr('font-weight', '600');

      // Y Axis
      svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',0)')
        .call(d3.axisLeft(y).ticks(5).tickFormat(function (d) { return formatCurrency(d, 'compact'); }))
        .attr('color', theme.subtext);
    },

    _renderScatter: function (mainArea, teams, config, theme) {
      var self = this;
      var d3 = this._d3;

      var wrap = document.createElement('div');
      wrap.style.width = '100%';
      wrap.style.height = '100%';
      wrap.style.minHeight = '340px';
      mainArea.appendChild(wrap);

      var width = wrap.clientWidth || 600;
      var height = wrap.clientHeight || 350;
      var margin = { top: 30, right: 30, bottom: 50, left: 60 };

      var svg = d3.select(wrap).append('svg')
        .attr('width', width)
        .attr('height', height);

      var maxCoverage = Math.max(5.0, d3.max(teams, function (d) { return d.coverage; }) * 1.15 || 5);
      var maxAttainment = Math.max(140, d3.max(teams, function (d) { return d.attainment; }) * 1.15 || 120);

      var x = d3.scaleLinear()
        .domain([0, maxCoverage])
        .range([margin.left, width - margin.right]);

      var y = d3.scaleLinear()
        .domain([0, maxAttainment])
        .range([height - margin.bottom, margin.top]);

      // Quadrant benchmark reference lines
      var refCov = 3.0; // 3x pipeline coverage target
      var refAtt = 100.0; // 100% quota attainment

      svg.append('line')
        .attr('x1', x(refCov))
        .attr('x2', x(refCov))
        .attr('y1', margin.top)
        .attr('y2', height - margin.bottom)
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4');

      svg.append('line')
        .attr('x1', margin.left)
        .attr('x2', width - margin.right)
        .attr('y1', y(refAtt))
        .attr('y2', y(refAtt))
        .attr('stroke', theme.won)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4');

      // Quadrant Labels
      svg.append('text')
        .attr('x', width - margin.right - 8)
        .attr('y', margin.top + 16)
        .attr('text-anchor', 'end')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('fill', theme.won)
        .text('★ Dominant Outperformers (High Cov / High Att)');

      svg.append('text')
        .attr('x', margin.left + 8)
        .attr('y', margin.top + 16)
        .attr('text-anchor', 'start')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('fill', '#f59e0b')
        .text('⚠️ Pipeline Starved (Low Cov / High Att)');

      svg.append('text')
        .attr('x', width - margin.right - 8)
        .attr('y', height - margin.bottom - 12)
        .attr('text-anchor', 'end')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('fill', '#0284c7')
        .text('⏳ Execution Lag (High Cov / Low Att)');

      svg.append('text')
        .attr('x', margin.left + 8)
        .attr('y', height - margin.bottom - 12)
        .attr('text-anchor', 'start')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('fill', theme.gap)
        .text('🚨 Critical Deficit (Low Cov / Low Att)');

      // Dots
      var rScale = d3.scaleSqrt()
        .domain([0, d3.max(teams, function (d) { return d.quota; }) || 100])
        .range([5, 18]);

      var dots = svg.selectAll('.team-dot')
        .data(teams)
        .enter().append('g')
        .attr('class', 'team-dot')
        .attr('transform', function (d) { return 'translate(' + x(d.coverage) + ',' + y(d.attainment) + ')'; })
        .style('cursor', function (d) { return d.drillLinks && d.drillLinks.length ? 'pointer' : 'default'; });

      dots.append('circle')
        .attr('r', function (d) { return rScale(d.quota); })
        .attr('fill', function (d) { return d.attainment >= 100 ? theme.won : (d.coverage >= 3.0 ? theme.commit : theme.gap); })
        .attr('fill-opacity', 0.8)
        .attr('stroke', theme.bg)
        .attr('stroke-width', 1.5);

      dots.append('text')
        .attr('y', function (d) { return -rScale(d.quota) - 3; })
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .attr('fill', theme.text)
        .text(function (d) { return d.name; });

      dots.on('mouseenter', function (e, d) {
        self._showTooltip(e,
          '<b>' + d.name + '</b> (' + d.region + ')<br/>' +
          'Manager: ' + d.manager + '<br/>' +
          'Won ARR: ' + formatCurrency(d.won) + '<br/>' +
          'Quota: ' + formatCurrency(d.quota) + '<br/>' +
          'Attainment: ' + d.attainment.toFixed(1) + '%<br/>' +
          'Pipeline Coverage: ' + d.coverage.toFixed(2) + 'x<br/>' +
          (d.gap <= 0 ? '<span style="color:' + theme.won + ';">Surplus: +' + formatCurrency(Math.abs(d.gap)) + '</span>' : '<span style="color:' + theme.gap + ';">Deficit: -' + formatCurrency(d.gap) + '</span>')
        );
      }).on('mouseleave', function () {
        self._hideTooltip();
      }).on('click', function (e, d) {
        if (d.drillLinks && d.drillLinks.length && window.LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
          LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: e });
        }
      });

      // Axes
      svg.append('g')
        .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
        .call(d3.axisBottom(x).ticks(6).tickFormat(function (d) { return d + 'x'; }))
        .attr('color', theme.subtext)
        .append('text')
        .attr('x', width - margin.right)
        .attr('y', 36)
        .attr('fill', theme.text)
        .attr('text-anchor', 'end')
        .attr('font-weight', '700')
        .text('Pipeline Coverage Ratio (x of Quota)');

      svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',0)')
        .call(d3.axisLeft(y).ticks(6).tickFormat(function (d) { return d + '%'; }))
        .attr('color', theme.subtext)
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -margin.top)
        .attr('y', -42)
        .attr('fill', theme.text)
        .attr('text-anchor', 'end')
        .attr('font-weight', '700')
        .text('Quota Attainment %');
    },

    _renderProductivity: function (mainArea, teams, config, theme) {
      var self = this;
      var d3 = this._d3;

      var wrap = document.createElement('div');
      wrap.style.display = 'grid';
      wrap.style.gridTemplateColumns = 'repeat(auto-fill, minmax(260px, 1fr))';
      wrap.style.gap = '14px';
      wrap.style.padding = '8px';
      mainArea.appendChild(wrap);

      teams.forEach(function (t) {
        var card = document.createElement('div');
        card.style.padding = '12px 14px';
        card.style.borderRadius = '8px';
        card.style.backgroundColor = theme.cardBg;
        card.style.border = '1px solid ' + theme.border;
        card.style.cursor = t.drillLinks && t.drillLinks.length ? 'pointer' : 'default';

        var quotaPerHead = t.headcount > 0 ? (t.quota / t.headcount) : t.quota;
        var wonPerHead = t.headcount > 0 ? (t.won / t.headcount) : t.won;

        card.innerHTML =
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
            '<span style="font-weight:700;color:' + theme.text + ';font-size:13px;">' + t.name + '</span>' +
            '<span style="font-weight:700;padding:2px 6px;border-radius:10px;font-size:10px;background:' + (t.attainment >= 100 ? theme.won : theme.gap) + ';color:#ffffff;">' + t.attainment.toFixed(1) + '%</span>' +
          '</div>' +
          '<div style="font-size:11px;color:' + theme.subtext + ';margin-bottom:8px;">' + t.manager + ' • ' + t.region + ' (' + t.segment + ')</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;border-top:1px solid ' + theme.border + ';padding-top:8px;">' +
            '<div>Headcount: <b>' + (t.headcount || '—') + ' Reps</b></div>' +
            '<div>Coverage: <b>' + t.coverage.toFixed(2) + 'x</b></div>' +
            '<div>Quota/Head: <b>' + formatCurrency(quotaPerHead, 'compact') + '</b></div>' +
            '<div>Won/Head: <b>' + formatCurrency(wonPerHead, 'compact') + '</b></div>' +
          '</div>' +
          '<div style="margin-top:8px;font-size:11px;font-weight:600;color:' + (t.gap <= 0 ? theme.won : theme.gap) + ';">' +
            (t.gap <= 0 ? 'Surplus: +' + formatCurrency(Math.abs(t.gap)) : 'Gap to Target: -' + formatCurrency(t.gap)) +
          '</div>';

        if (t.drillLinks && t.drillLinks.length) {
          card.addEventListener('click', function (e) {
            if (window.LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
              LookerCharts.Utils.openDrillMenu({ links: t.drillLinks, event: e });
            }
          });
        }
        wrap.appendChild(card);
      });
    },

    _showTooltip: function (e, html) {
      if (!this._tooltip) return;
      this._tooltip.innerHTML = html;
      this._tooltip.style.display = 'block';
      this._tooltip.style.left = (e.clientX + 14) + 'px';
      this._tooltip.style.top = (e.clientY + 14) + 'px';
      this._tooltip.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
      this._tooltip.style.color = '#ffffff';
    },

    _hideTooltip: function () {
      if (!this._tooltip) return;
      this._tooltip.style.display = 'none';
    }
  });
})();
