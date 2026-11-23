/**
 * SaaS Sales Capacity & Quota Attainment Matrix
 * Google Cloud Looker Custom Visualization
 * Built with D3.js v7
 *
 * Designed for B2B SaaS Executive Leadership, Chief Revenue Officers (CRO), VP of Sales, and RevOps.
 * Solves Buganizer Cloud Blockers b/494910291, b/398701962, and b/520494850.
 *
 * 4 Multi-Modal Layout Modes:
 * 1. attainment_matrix (Default): Rep Quota Attainment & Pacing Matrix
 *    (Grouped by Segment & Region, showing progress bullet bars for Closed Won + Commit ARR vs Quota,
 *    Attainment % badges with status tiers, and pipeline coverage pills)
 * 2. ramp_tenure_quadrant: 2x2 Tenure & Ramp Attainment Quadrant
 *    (Tenure in Months on X-axis vs Attainment % on Y-axis, bubbles sized by Quota or Won ARR,
 *    stratified across 4 performance zones: Tenured Superstars, Fast-Ramp Prodigies, Developing, At-Risk)
 * 3. capacity_waterfall_bridge: Executive Capacity & Pipeline Gap Waterfall
 *    (Steps from Total Team Quota -> Closed Won ARR -> Commit ARR -> Best Case -> Net Quota Gap / Surplus)
 * 4. executive_leaderboard_grid: High-Density Executive Rep Scorecard & Leaderboard Table
 *    (Interactive tabular inspector with sortable columns, attainment bars, ramp status, and Looker drill-down)
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
      quota: '#64748b',
      gap: '#ef4444',
      surplus: '#8b5cf6',
      presClub: '#8b5cf6',
      onTrack: '#10b981',
      atRisk: '#f59e0b',
      critical: '#ef4444',
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: '#e2e8f0',
      cardBg: '#f8fafc',
      grid: '#f1f5f9',
      zoneSuperstar: 'rgba(139, 92, 246, 0.07)',
      zoneProdigy: 'rgba(16, 185, 129, 0.07)',
      zoneDeveloping: 'rgba(59, 130, 246, 0.06)',
      zoneStruggling: 'rgba(239, 68, 68, 0.07)'
    },
    google_enterprise: {
      name: 'Google Enterprise Blue',
      primary: '#1a73e8',
      won: '#1e8e3e',
      commit: '#1a73e8',
      quota: '#5f6368',
      gap: '#d93025',
      surplus: '#9334e6',
      presClub: '#9334e6',
      onTrack: '#1e8e3e',
      atRisk: '#ea8600',
      critical: '#d93025',
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      border: '#dadce0',
      cardBg: '#f8f9fa',
      grid: '#e8eaed',
      zoneSuperstar: 'rgba(147, 52, 230, 0.07)',
      zoneProdigy: 'rgba(30, 142, 62, 0.07)',
      zoneDeveloping: 'rgba(26, 115, 232, 0.06)',
      zoneStruggling: 'rgba(217, 48, 37, 0.07)'
    },
    indigo_violet: {
      name: 'Executive Indigo & Violet',
      primary: '#4338ca',
      won: '#059669',
      commit: '#6366f1',
      quota: '#64748b',
      gap: '#e11d48',
      surplus: '#7c3aed',
      presClub: '#7c3aed',
      onTrack: '#059669',
      atRisk: '#d97706',
      critical: '#e11d48',
      bg: '#ffffff',
      text: '#1e1b4b',
      subtext: '#6b7280',
      border: '#e0e7ff',
      cardBg: '#f5f3ff',
      grid: '#ede9fe',
      zoneSuperstar: 'rgba(124, 58, 237, 0.08)',
      zoneProdigy: 'rgba(5, 150, 105, 0.07)',
      zoneDeveloping: 'rgba(99, 102, 241, 0.06)',
      zoneStruggling: 'rgba(225, 29, 72, 0.07)'
    },
    cyber_dark: {
      name: 'Cyber Dark (Midnight)',
      primary: '#38bdf8',
      won: '#34d399',
      commit: '#38bdf8',
      quota: '#94a3b8',
      gap: '#f43f5e',
      surplus: '#c084fc',
      presClub: '#c084fc',
      onTrack: '#34d399',
      atRisk: '#fbbf24',
      critical: '#f43f5e',
      isDark: true,
      bg: '#090d16',
      text: '#f8fafc',
      subtext: '#94a3b8',
      border: '#1e293b',
      cardBg: '#0f172a',
      grid: '#1e293b',
      zoneSuperstar: 'rgba(192, 132, 252, 0.12)',
      zoneProdigy: 'rgba(52, 211, 153, 0.12)',
      zoneDeveloping: 'rgba(56, 189, 248, 0.10)',
      zoneStruggling: 'rgba(244, 63, 94, 0.14)'
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      primary: '#065f46',
      won: '#10b981',
      commit: '#0d9488',
      quota: '#6b7280',
      gap: '#dc2626',
      surplus: '#8b5cf6',
      presClub: '#8b5cf6',
      onTrack: '#10b981',
      atRisk: '#f59e0b',
      critical: '#dc2626',
      bg: '#ffffff',
      text: '#064e3b',
      subtext: '#4b5563',
      border: '#d1fae5',
      cardBg: '#ecfdf5',
      grid: '#e6fffa',
      zoneSuperstar: 'rgba(139, 92, 246, 0.07)',
      zoneProdigy: 'rgba(16, 185, 129, 0.08)',
      zoneDeveloping: 'rgba(13, 148, 136, 0.06)',
      zoneStruggling: 'rgba(220, 38, 38, 0.07)'
    },
    sunset_media: {
      name: 'Sunset Media',
      primary: '#9a3412',
      won: '#16a34a',
      commit: '#ea580c',
      quota: '#78716c',
      gap: '#e11d48',
      surplus: '#c026d3',
      presClub: '#c026d3',
      onTrack: '#16a34a',
      atRisk: '#d97706',
      critical: '#e11d48',
      bg: '#ffffff',
      text: '#431407',
      subtext: '#78716c',
      border: '#fed7aa',
      cardBg: '#fff7ed',
      grid: '#ffedd5',
      zoneSuperstar: 'rgba(192, 38, 211, 0.07)',
      zoneProdigy: 'rgba(22, 163, 74, 0.07)',
      zoneDeveloping: 'rgba(234, 88, 12, 0.06)',
      zoneStruggling: 'rgba(225, 29, 72, 0.07)'
    },
    wellverse_healthcare: {
      name: 'Wellverse Healthcare',
      primary: '#0e7490',
      won: '#059669',
      commit: '#0284c7',
      quota: '#64748b',
      gap: '#e11d48',
      surplus: '#7c3aed',
      presClub: '#7c3aed',
      onTrack: '#059669',
      atRisk: '#d97706',
      critical: '#e11d48',
      bg: '#ffffff',
      text: '#155e75',
      subtext: '#64748b',
      border: '#cffafe',
      cardBg: '#f0fdfa',
      grid: '#e0f2fe',
      zoneSuperstar: 'rgba(124, 58, 237, 0.07)',
      zoneProdigy: 'rgba(5, 150, 105, 0.07)',
      zoneDeveloping: 'rgba(2, 132, 199, 0.06)',
      zoneStruggling: 'rgba(225, 29, 72, 0.07)'
    }
  };

  function resolveField(list, overrideVal, defaultIdx) {
    if (!list || !list.length) return null;
    if (overrideVal) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].name === overrideVal) return list[i];
      }
      var idx = parseInt(overrideVal, 10);
      if (!isNaN(idx) && idx >= 1 && idx <= list.length) {
        return list[idx - 1];
      }
    }
    if (defaultIdx >= 0 && defaultIdx < list.length) {
      return list[defaultIdx];
    }
    return null;
  }

  function formatCurrency(val) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    var num = Number(val);
    if (Math.abs(num) >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
    if (Math.abs(num) >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    if (Math.abs(num) >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'k';
    return '$' + Math.round(num).toLocaleString();
  }

  function formatPercent(val) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    var num = Number(val);
    // If attainment is expressed as ratio (e.g. 1.25), scale to percentage
    if (Math.abs(num) <= 5.0 && num > 0) num = num * 100;
    return num.toFixed(1) + '%';
  }

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    var num = Number(val);
    switch (fmt) {
      case 'standard_currency':
        return '$' + Math.round(num).toLocaleString();
      case 'compact_num':
        if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'k';
        return num.toLocaleString();
      case 'percentage':
        return formatPercent(val);
      case 'decimal_2':
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'raw':
        return String(num);
      case 'compact_currency':
      default:
        return formatCurrency(num);
    }
  }

  looker.plugins.visualizations.add({
    id: 'saas_sales_capacity_attainment_matrix',
    label: 'SaaS Sales Capacity & Quota Attainment Matrix',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'Layout Mode',
        section: 'Display',
        order: 1,
        display: 'select',
        values: [
          { 'Rep Quota Attainment & Pacing Matrix': 'attainment_matrix' },
          { 'Tenure & Ramp Attainment Quadrant (2x2)': 'ramp_tenure_quadrant' },
          { 'Executive Capacity & Pipeline Gap Waterfall': 'capacity_waterfall_bridge' },
          { 'Executive Rep Scorecard & Leaderboard Grid': 'executive_leaderboard_grid' }
        ],
        default: 'attainment_matrix'
      },
      repDimOverride: {
        type: 'string',
        label: 'Sales Rep Dimension',
        display: 'select',
        values: [{ 'Auto (run query)': '' }],
        default: '',
        section: 'Display',
        order: 2
      },
      segmentDimOverride: {
        type: 'string',
        label: 'Segment Dimension (e.g. Inside / Outside)',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 3
      },
      regionDimOverride: {
        type: 'string',
        label: 'Region / Territory Dimension (e.g. East / West)',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 4
      },
      rampDimOverride: {
        type: 'string',
        label: 'Ramp Status Dimension (e.g. Fully Ramped / Ramping)',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 5
      },
      tenureDimOverride: {
        type: 'string',
        label: 'Tenure (Months) Dimension / Measure',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 6
      },
      quotaMeasureOverride: {
        type: 'string',
        label: 'ARR Quota Measure',
        display: 'select',
        values: [{ 'Auto (run query)': '' }],
        default: '',
        section: 'Display',
        order: 7
      },
      wonMeasureOverride: {
        type: 'string',
        label: 'Closed Won ARR Measure',
        display: 'select',
        values: [{ 'Auto (run query)': '' }],
        default: '',
        section: 'Display',
        order: 8
      },
      commitMeasureOverride: {
        type: 'string',
        label: 'Commit ARR Measure',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 9
      },
      attainmentMeasureOverride: {
        type: 'string',
        label: 'Attainment % Measure (Optional)',
        display: 'select',
        values: [{ 'Auto / Calculate (Won / Quota)': '' }],
        default: '',
        section: 'Display',
        order: 10
      },
      coverageMeasureOverride: {
        type: 'string',
        label: 'Pipeline Coverage Ratio Measure (Optional)',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 11
      },
      targetCalculationMode: {
        type: 'string',
        label: 'Benchmark Target Calculation Mode',
        display: 'select',
        values: [
          { 'Fixed Attainment Target (100%)': 'fixed' },
          { 'Target Quota Column': 'measure_column' },
          { 'Dataset Mean Attainment': 'dataset_mean' },
          { 'Dataset Median Attainment': 'dataset_median' },
          { 'Top Percentile P75 Target': 'percentile_p75' },
          { 'Top Percentile P90 Target': 'percentile_p90' }
        ],
        default: 'fixed',
        section: 'Display',
        order: 12
      },
      fixedTargetValue: {
        type: 'number',
        label: 'Fixed Benchmark Target Value (%)',
        default: 100,
        section: 'Display',
        order: 13
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Reference Line & Benchmark Label',
        default: 'Quota Target (100%)',
        section: 'Display',
        order: 14
      },
      anomalyThresholdPct: {
        type: 'number',
        label: 'Attainment Risk Alert Threshold (%)',
        default: 70,
        section: 'Display',
        order: 15
      },
      highlightPeaks: {
        type: 'string',
        label: "President's Club / Peak Performer Highlight",
        section: 'Display',
        order: 16,
        display: 'select',
        values: [
          { "Top 5% Performers (★ Gold)": 'top_5' },
          { "Top 10% Performers (★ Gold)": 'top_10' },
          { "All Reps ≥ 100% Quota": 'above_quota' },
          { "None": 'none' }
        ],
        default: 'top_5'
      },
      sortBy: {
        type: 'string',
        label: 'Rep Sort Order',
        display: 'select',
        values: [
          { 'Attainment % (Highest First)': 'metric_desc' },
          { 'Attainment % (Lowest First)': 'metric_asc' },
          { 'Closed Won ARR (Descending)': 'won_desc' },
          { 'Quota Size (Descending)': 'quota_desc' },
          { 'Rep Name (Alphabetical)': 'alphabetical' },
          { 'Tenure / Natural Order': 'chronological' }
        ],
        default: 'metric_desc',
        section: 'Display',
        order: 17
      },
      topNLimit: {
        type: 'number',
        label: 'Top-N Reps Display Limit (0 = All)',
        default: 0,
        section: 'Display',
        order: 18
      },
      enableOtherRollup: {
        type: 'boolean',
        label: "Group Tail Reps into 'Other Team Rollup'",
        default: false,
        section: 'Display',
        order: 19
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Suppress Inactive / Zero Quota Reps',
        default: true,
        section: 'Display',
        order: 20
      },
      hudMode: {
        type: 'string',
        label: 'Executive Scorecard HUD Mode',
        display: 'select',
        values: [
          { 'Full Scorecard HUD (Top Band)': 'scorecard' },
          { 'Compact Metric Strip': 'compact_strip' },
          { 'Hidden': 'none' }
        ],
        default: 'scorecard',
        section: 'Display',
        order: 21
      },
      labelDensity: {
        type: 'string',
        label: 'Rep Data Label Density',
        display: 'select',
        values: [
          { 'All Rep Labels Visible': 'all' },
          { 'Outliers & Leaders Only': 'peaks_only' },
          { 'Hidden / Tooltip Only': 'hidden' }
        ],
        default: 'all',
        section: 'Display',
        order: 22
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Slicing & Filter Toolbar',
        section: 'Display',
        order: 23,
        default: true
      },
      customTitle: {
        type: 'string',
        label: 'Custom Title Override',
        default: '',
        section: 'Display',
        order: 24
      },
      customSubtitle: {
        type: 'string',
        label: 'Custom Subtitle Override',
        default: '',
        section: 'Display',
        order: 25
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorTheme: {
        type: 'string',
        label: 'Brand Palette Preset',
        section: 'Style',
        order: 1,
        display: 'select',
        values: [
          { 'Modern Slate / Executive (Default)': 'slate' },
          { 'Google Enterprise Blue': 'google_enterprise' },
          { 'Executive Indigo & Violet': 'indigo_violet' },
          { 'Cyber Dark (Midnight)': 'cyber_dark' },
          { 'Emerald FinOps': 'emerald_finops' },
          { 'Sunset Media (Warm Amber)': 'sunset_media' },
          { 'Wellverse Healthcare': 'wellverse_healthcare' },
          { 'Custom Hex Override': 'custom' }
        ],
        default: 'slate'
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
        label: "Custom On-Track / President's Club Hex",
        display: 'color',
        default: '',
        section: 'Style',
        order: 3
      },
      customNegativeHex: {
        type: 'string',
        label: 'Custom At-Risk / Quota Gap Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 4
      },
      customWarningHex: {
        type: 'string',
        label: 'Custom Pacing / Commit Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 5
      },
      metricPolarity: {
        type: 'string',
        label: 'Metric Polarity (Goal Direction)',
        display: 'select',
        values: [
          { 'Higher is Better (Attainment, Won ARR, Coverage)': 'higher_better' },
          { 'Lower is Better (Quota Gap, Slippage)': 'lower_better' }
        ],
        default: 'higher_better',
        section: 'Style',
        order: 6
      },
      fontScale: {
        type: 'string',
        label: 'Typography Font Scale',
        display: 'select',
        values: [
          { 'Compact (High Density Dashboard)': 'compact' },
          { 'Standard (Default)': 'standard' },
          { 'Large Presentation (Executive Boardroom)': 'large' }
        ],
        default: 'standard',
        section: 'Style',
        order: 7
      },
      valueFormat: {
        type: 'string',
        label: 'Value Formatting Style',
        display: 'select',
        values: [
          { 'Compact Currency ($1.2M)': 'compact_currency' },
          { 'Standard Currency ($1,234,567)': 'standard_currency' },
          { 'Compact Number (1.2M)': 'compact_num' },
          { 'Percentage (100.0%)': 'percentage' },
          { 'Decimal (1,234.56)': 'decimal_2' },
          { 'Raw Unformatted': 'raw' }
        ],
        default: 'compact_currency',
        section: 'Style',
        order: 8
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        repDimOverride: { role: 'dimension', defaultIdx: 0 },
        segmentDimOverride: { role: 'dimension', defaultIdx: 1 },
        regionDimOverride: { role: 'dimension', defaultIdx: 2 },
        rampDimOverride: { role: 'dimension', defaultIdx: 3 },
        tenureDimOverride: { role: 'any', defaultIdx: 4 },
        quotaMeasureOverride: { role: 'measure', defaultIdx: 0 },
        wonMeasureOverride: { role: 'measure', defaultIdx: 1 },
        commitMeasureOverride: { role: 'measure', defaultIdx: 2 },
        attainmentMeasureOverride: { role: 'measure', defaultIdx: 3 },
        coverageMeasureOverride: { role: 'measure', defaultIdx: 4 }
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
        var autoField = spec.defaultIdx >= 0 ? list[spec.defaultIdx] : null;
        var autoLabel = autoField ? ('Auto -> ' + fieldLabel(autoField)) : 'Auto / None';
        var values = [];
        var autoEntry = {};
        autoEntry[autoLabel] = '';
        values.push(autoEntry);
        var seen = {};
        for (var i = 0; i < list.length; i++) {
          var fld = list[i];
          var lbl = fieldLabel(fld);
          if (seen[fld.name]) continue;
          seen[fld.name] = true;
          var entry = {};
          entry[lbl] = fld.name;
          values.push(entry);
        }
        newOptions[key].display = 'select';
        newOptions[key].values = values;
        newOptions[key].default = '';
      });

      try {
        self.trigger('registerOptions', newOptions);
      } catch (e) {
        console.warn('Could not register dynamic field options:', e);
      }
    },

    create: function (element, config) {
      element.innerHTML = '';
      this._container = document.createElement('div');
      this._container.className = 'saas-capacity-attainment-container';
      this._container.style.width = '100%';
      this._container.style.height = '100%';
      this._container.style.position = 'relative';
      this._container.style.overflow = 'hidden';
      this._container.style.display = 'flex';
      this._container.style.flexDirection = 'column';
      this._container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      element.appendChild(this._container);

      // Tooltip
      this._tooltip = document.createElement('div');
      this._tooltip.className = 'saas-capacity-tooltip';
      this._tooltip.style.position = 'absolute';
      this._tooltip.style.zIndex = '9999';
      this._tooltip.style.pointerEvents = 'none';
      this._tooltip.style.padding = '10px 14px';
      this._tooltip.style.borderRadius = '8px';
      this._tooltip.style.fontSize = '12px';
      this._tooltip.style.lineHeight = '1.45';
      this._tooltip.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)';
      this._tooltip.style.display = 'none';
      this._tooltip.style.opacity = '0';
      this._tooltip.style.transition = 'opacity 0.15s ease-out';
      this._container.appendChild(this._tooltip);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this._registerDynamicFieldOptions(queryResponse);
      this.clearErrors();

      if (!data || !data.length) {
        this.addError({
          title: 'No Data',
          message: 'The query returned no data rows to visualize.'
        });
        done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
          done();
        } catch (err) {
          console.error('Render error in SaaS Sales Capacity Attainment Matrix:', err);
          self.addError({
            title: 'Rendering Error',
            message: err.message || 'Failed to render SaaS Sales Capacity Attainment Matrix.'
          });
          done();
        }
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;
      if (!this._container || !element.contains(this._container)) {
        this.create(element, config);
      }

      // Cleanup
      var toolbars = this._container.querySelectorAll('.saas-toolbar, .saas-hud, .saas-content-area');
      toolbars.forEach(function (el) { el.remove(); });

      var fields = queryResponse.fields;
      var dims = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
      var meas = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
      if (!meas.length && fields.table_calculations && fields.table_calculations.length) meas = fields.table_calculations;

      var repDim = resolveField(dims, config.repDimOverride, 0);
      var segmentDim = resolveField(dims, config.segmentDimOverride, dims.length > 1 ? 1 : -1);
      var regionDim = resolveField(dims, config.regionDimOverride, dims.length > 2 ? 2 : -1);
      var rampDim = resolveField(dims, config.rampDimOverride, dims.length > 3 ? 3 : -1);
      var tenureField = resolveField(dims.concat(meas), config.tenureDimOverride, dims.length > 4 ? 4 : -1);

      var quotaMeas = resolveField(meas, config.quotaMeasureOverride, 0);
      var wonMeas = resolveField(meas, config.wonMeasureOverride, meas.length > 1 ? 1 : -1);
      var commitMeas = resolveField(meas, config.commitMeasureOverride, meas.length > 2 ? 2 : -1);
      var attainMeas = resolveField(meas, config.attainmentMeasureOverride, meas.length > 3 ? 3 : -1);
      var covMeas = resolveField(meas, config.coverageMeasureOverride, meas.length > 4 ? 4 : -1);

      var themeKey = config.colorTheme || 'slate';
      var theme = Object.assign({}, PALETTES[themeKey] || PALETTES.slate);
      if (themeKey === 'custom' || config.customPrimaryHex) {
        if (config.customPrimaryHex) theme.primary = config.customPrimaryHex;
        if (config.customPositiveHex) {
          theme.won = config.customPositiveHex;
          theme.onTrack = config.customPositiveHex;
        }
        if (config.customNegativeHex) {
          theme.gap = config.customNegativeHex;
          theme.critical = config.customNegativeHex;
        }
        if (config.customWarningHex) {
          theme.commit = config.customWarningHex;
          theme.atRisk = config.customWarningHex;
        }
      }

      this._container.style.backgroundColor = theme.bg;

      // Extract Records
      var records = [];
      var totalQuota = 0;
      var totalWon = 0;
      var totalCommit = 0;

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var repName = repDim && row[repDim.name] ? String(row[repDim.name].value || 'Unknown Rep') : ('Rep ' + (i + 1));
        var segment = segmentDim && row[segmentDim.name] ? String(row[segmentDim.name].value || 'Core') : 'Core';
        var region = regionDim && row[regionDim.name] ? String(row[regionDim.name].value || 'Global') : 'Global';
        var rampStatus = rampDim && row[rampDim.name] ? String(row[rampDim.name].value || 'Fully Ramped') : 'Fully Ramped';

        var tenure = 12;
        if (tenureField && row[tenureField.name] && !isNaN(Number(row[tenureField.name].value))) {
          tenure = Math.max(0, Number(row[tenureField.name].value));
        }

        var quota = 0;
        if (quotaMeas && row[quotaMeas.name] && !isNaN(Number(row[quotaMeas.name].value))) {
          quota = Math.max(0, Number(row[quotaMeas.name].value));
        }

        var won = 0;
        if (wonMeas && row[wonMeas.name] && !isNaN(Number(row[wonMeas.name].value))) {
          won = Math.max(0, Number(row[wonMeas.name].value));
        }

        var commit = 0;
        if (commitMeas && row[commitMeas.name] && !isNaN(Number(row[commitMeas.name].value))) {
          commit = Math.max(0, Number(row[commitMeas.name].value));
        }

        var attain = 0;
        if (attainMeas && row[attainMeas.name] && !isNaN(Number(row[attainMeas.name].value))) {
          attain = Number(row[attainMeas.name].value);
          if (Math.abs(attain) <= 5.0 && attain > 0) attain = attain * 100;
        } else if (quota > 0) {
          attain = (won / quota) * 100;
        }

        var coverage = null;
        if (covMeas && row[covMeas.name] && !isNaN(Number(row[covMeas.name].value))) {
          coverage = Number(row[covMeas.name].value);
        }

        if (config.suppressZeroNull && quota === 0 && won === 0) {
          continue;
        }

        totalQuota += quota;
        totalWon += won;
        totalCommit += commit;

        records.push({
          id: repName + '___' + i,
          name: repName,
          segment: segment,
          region: region,
          rampStatus: rampStatus,
          tenure: tenure,
          quota: quota,
          won: won,
          commit: commit,
          attainment: attain,
          coverage: coverage,
          drillLinks: (repDim && row[repDim.name] && row[repDim.name].links) || null
        });
      }

      if (!records.length) {
        this.addError({
          title: 'No Active Reps',
          message: 'All records were filtered or have zero quota.'
        });
        return;
      }

      // Benchmark Target Calculation
      var targetAttain = Number(config.fixedTargetValue) || 100;
      var targetMode = config.targetCalculationMode || 'fixed';
      if (targetMode === 'dataset_mean' && records.length > 0) {
        targetAttain = records.reduce(function (sum, r) { return sum + r.attainment; }, 0) / records.length;
      } else if (targetMode === 'dataset_median' && records.length > 0) {
        var sorted = records.slice().sort(function (a, b) { return a.attainment - b.attainment; });
        var mid = Math.floor(sorted.length / 2);
        targetAttain = sorted.length % 2 !== 0 ? sorted[mid].attainment : ((sorted[mid - 1].attainment + sorted[mid].attainment) / 2);
      } else if (targetMode === 'percentile_p75' && records.length > 0) {
        var s75 = records.slice().sort(function (a, b) { return a.attainment - b.attainment; });
        targetAttain = s75[Math.floor(s75.length * 0.75)].attainment;
      } else if (targetMode === 'percentile_p90' && records.length > 0) {
        var s90 = records.slice().sort(function (a, b) { return a.attainment - b.attainment; });
        targetAttain = s90[Math.floor(s90.length * 0.90)].attainment;
      }

      // Sorting
      var sortBy = config.sortBy || 'metric_desc';
      if (sortBy === 'metric_desc') {
        records.sort(function (a, b) { return b.attainment - a.attainment; });
      } else if (sortBy === 'metric_asc') {
        records.sort(function (a, b) { return a.attainment - b.attainment; });
      } else if (sortBy === 'won_desc') {
        records.sort(function (a, b) { return b.won - a.won; });
      } else if (sortBy === 'quota_desc') {
        records.sort(function (a, b) { return b.quota - a.quota; });
      } else if (sortBy === 'alphabetical') {
        records.sort(function (a, b) { return a.name.localeCompare(b.name); });
      } else if (sortBy === 'chronological') {
        records.sort(function (a, b) { return a.tenure - b.tenure; });
      }

      // Top N & Other Rollup
      var topN = Number(config.topNLimit) || 0;
      var activeRecords = records;
      if (topN > 0 && topN < records.length) {
        if (config.enableOtherRollup) {
          var retained = records.slice(0, topN);
          var others = records.slice(topN);
          var oQuota = others.reduce(function (s, r) { return s + r.quota; }, 0);
          var oWon = others.reduce(function (s, r) { return s + r.won; }, 0);
          var oCommit = others.reduce(function (s, r) { return s + r.commit; }, 0);
          var oAttain = oQuota > 0 ? (oWon / oQuota) * 100 : 0;
          retained.push({
            id: '__other__',
            name: 'Other Team Rollup (' + others.length + ' Reps)',
            segment: 'Other',
            region: 'Other',
            rampStatus: 'Mixed',
            tenure: 0,
            quota: oQuota,
            won: oWon,
            commit: oCommit,
            attainment: oAttain,
            coverage: null,
            drillLinks: null
          });
          activeRecords = retained;
        } else {
          activeRecords = records.slice(0, topN);
        }
      }

      // Performance Tier Classifications
      var riskThreshold = Number(config.anomalyThresholdPct) || 70;
      activeRecords.forEach(function (r) {
        if (r.attainment >= 120) {
          r.tier = 'pres_club';
          r.tierLabel = "President's Club";
          r.tierColor = theme.presClub;
        } else if (r.attainment >= 100) {
          r.tier = 'on_track';
          r.tierLabel = 'On-Track (>=100%)';
          r.tierColor = theme.onTrack;
        } else if (r.attainment >= riskThreshold) {
          r.tier = 'pacing';
          r.tierLabel = 'Pacing / In-Flight';
          r.tierColor = theme.atRisk;
        } else {
          r.tier = 'at_risk';
          r.tierLabel = 'Critical Gap (<' + riskThreshold + '%)';
          r.tierColor = theme.critical;
        }
      });

      // Executive Metrics
      var overallAttain = totalQuota > 0 ? (totalWon / totalQuota) * 100 : 0;
      var quotaGap = Math.max(0, totalQuota - totalWon);
      var repsAtQuotaCount = records.filter(function (r) { return r.attainment >= 100; }).length;
      var pctRepsAtQuota = records.length > 0 ? (repsAtQuotaCount / records.length) * 100 : 0;

      // 1. Toolbar (Search, Filter, Mode Switcher)
      if (config.showSearch !== false) {
        this._renderToolbar(theme, config, activeRecords);
      }

      // 2. Executive Scorecard HUD
      var hudMode = config.hudMode || 'scorecard';
      if (hudMode !== 'none') {
        this._renderHud(theme, config, {
          totalQuota: totalQuota,
          totalWon: totalWon,
          totalCommit: totalCommit,
          overallAttain: overallAttain,
          quotaGap: quotaGap,
          repsAtQuotaCount: repsAtQuotaCount,
          pctRepsAtQuota: pctRepsAtQuota,
          totalReps: records.length,
          targetAttain: targetAttain
        });
      }

      // 3. Content Area & Layout Renderer
      var contentArea = document.createElement('div');
      contentArea.className = 'saas-content-area';
      contentArea.style.flex = '1';
      contentArea.style.position = 'relative';
      contentArea.style.overflow = 'auto';
      contentArea.style.padding = '12px 16px';
      this._container.appendChild(contentArea);

      var mode = this._activeLayoutMode || config.layoutMode || 'attainment_matrix';
      var filterTerm = (this._filterSearchTerm || '').toLowerCase().trim();
      var displayRecords = activeRecords;
      if (filterTerm) {
        displayRecords = activeRecords.filter(function (r) {
          return r.name.toLowerCase().indexOf(filterTerm) !== -1 ||
                 r.segment.toLowerCase().indexOf(filterTerm) !== -1 ||
                 r.region.toLowerCase().indexOf(filterTerm) !== -1 ||
                 r.rampStatus.toLowerCase().indexOf(filterTerm) !== -1;
        });
      }

      if (mode === 'ramp_tenure_quadrant') {
        this._renderQuadrant(d3, contentArea, displayRecords, theme, config, targetAttain);
      } else if (mode === 'capacity_waterfall_bridge') {
        this._renderWaterfall(d3, contentArea, displayRecords, theme, config, {
          totalQuota: totalQuota,
          totalWon: totalWon,
          totalCommit: totalCommit
        });
      } else if (mode === 'executive_leaderboard_grid') {
        this._renderLeaderboard(contentArea, displayRecords, theme, config, targetAttain);
      } else {
        this._renderAttainmentMatrix(contentArea, displayRecords, theme, config, targetAttain);
      }
    },

    _renderToolbar: function (theme, config, records) {
      var self = this;
      var toolbar = document.createElement('div');
      toolbar.className = 'saas-toolbar';
      toolbar.style.display = 'flex';
      toolbar.style.alignItems = 'center';
      toolbar.style.justifyContent = 'space-between';
      toolbar.style.padding = '8px 16px';
      toolbar.style.borderBottom = '1px solid ' + theme.border;
      toolbar.style.backgroundColor = theme.cardBg;
      toolbar.style.gap = '12px';
      toolbar.style.flexWrap = 'wrap';

      // Title & Subtitle
      var leftBox = document.createElement('div');
      leftBox.style.display = 'flex';
      leftBox.style.flexDirection = 'column';
      if (config.customTitle || config.customSubtitle) {
        if (config.customTitle) {
          var t = document.createElement('div');
          t.style.fontWeight = '700';
          t.style.fontSize = '14px';
          t.style.color = theme.text;
          t.textContent = config.customTitle;
          leftBox.appendChild(t);
        }
        if (config.customSubtitle) {
          var s = document.createElement('div');
          s.style.fontSize = '11px';
          s.style.color = theme.subtext;
          s.textContent = config.customSubtitle;
          leftBox.appendChild(s);
        }
      } else {
        var defT = document.createElement('div');
        defT.style.fontWeight = '700';
        defT.style.fontSize = '14px';
        defT.style.color = theme.text;
        defT.textContent = 'SaaS Sales Capacity & Quota Attainment Matrix';
        leftBox.appendChild(defT);
      }
      toolbar.appendChild(leftBox);

      // Search & Layout Buttons
      var rightBox = document.createElement('div');
      rightBox.style.display = 'flex';
      rightBox.style.alignItems = 'center';
      rightBox.style.gap = '8px';

      var searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Filter Rep, Segment, Region...';
      searchInput.value = this._filterSearchTerm || '';
      searchInput.style.padding = '5px 10px';
      searchInput.style.borderRadius = '6px';
      searchInput.style.border = '1px solid ' + theme.border;
      searchInput.style.fontSize = '12px';
      searchInput.style.outline = 'none';
      searchInput.style.backgroundColor = theme.bg;
      searchInput.style.color = theme.text;
      searchInput.style.width = '190px';
      searchInput.addEventListener('input', function (e) {
        self._filterSearchTerm = e.target.value;
        var content = self._container.querySelector('.saas-content-area');
        if (content && self._lastD3) {
          self._render(self._lastD3, self._lastData, self._lastElem, self._lastCfg, self._lastQR);
        }
      });
      rightBox.appendChild(searchInput);

      var modes = [
        { id: 'attainment_matrix', label: 'Attainment Matrix' },
        { id: 'ramp_tenure_quadrant', label: '2x2 Quadrant' },
        { id: 'capacity_waterfall_bridge', label: 'Capacity Waterfall' },
        { id: 'executive_leaderboard_grid', label: 'Leaderboard' }
      ];

      var activeMode = this._activeLayoutMode || config.layoutMode || 'attainment_matrix';
      modes.forEach(function (m) {
        var btn = document.createElement('button');
        btn.textContent = m.label;
        btn.style.padding = '5px 10px';
        btn.style.borderRadius = '6px';
        btn.style.fontSize = '11px';
        btn.style.fontWeight = '600';
        btn.style.cursor = 'pointer';
        btn.style.border = '1px solid ' + (m.id === activeMode ? theme.primary : theme.border);
        btn.style.backgroundColor = m.id === activeMode ? theme.primary : theme.bg;
        btn.style.color = m.id === activeMode ? '#ffffff' : theme.text;
        btn.addEventListener('click', function () {
          self._activeLayoutMode = m.id;
          self._render(window.d3, self._lastData, self._lastElem, self._lastCfg, self._lastQR);
        });
        rightBox.appendChild(btn);
      });

      toolbar.appendChild(rightBox);
      this._container.appendChild(toolbar);
    },

    _renderHud: function (theme, config, metrics) {
      var hud = document.createElement('div');
      hud.className = 'saas-hud';
      hud.style.display = 'grid';
      hud.style.gridTemplateColumns = 'repeat(auto-fit, minmax(130px, 1fr))';
      hud.style.gap = '8px';
      hud.style.padding = '10px 16px';
      hud.style.backgroundColor = theme.cardBg;
      hud.style.borderBottom = '1px solid ' + theme.border;

      var cards = [
        { label: 'Total Team Quota', val: formatCurrency(metrics.totalQuota), color: theme.quota },
        { label: 'Closed Won ARR', val: formatCurrency(metrics.totalWon), color: theme.won },
        { label: 'Commit ARR', val: formatCurrency(metrics.totalCommit), color: theme.commit },
        { label: 'Team Attainment', val: metrics.overallAttain.toFixed(1) + '%', color: metrics.overallAttain >= 100 ? theme.won : (metrics.overallAttain >= 70 ? theme.atRisk : theme.critical) },
        { label: 'Net Quota Gap', val: formatCurrency(metrics.quotaGap), color: metrics.quotaGap === 0 ? theme.won : theme.gap },
        { label: 'Reps at Quota', val: metrics.repsAtQuotaCount + ' / ' + metrics.totalReps + ' (' + metrics.pctRepsAtQuota.toFixed(0) + '%)', color: theme.presClub }
      ];

      cards.forEach(function (c) {
        var card = document.createElement('div');
        card.style.padding = '6px 10px';
        card.style.borderRadius = '6px';
        card.style.backgroundColor = theme.bg;
        card.style.border = '1px solid ' + theme.border;
        card.style.display = 'flex';
        card.style.flexDirection = 'column';

        var lbl = document.createElement('span');
        lbl.style.fontSize = '10px';
        lbl.style.fontWeight = '600';
        lbl.style.textTransform = 'uppercase';
        lbl.style.color = theme.subtext;
        lbl.textContent = c.label;

        var v = document.createElement('span');
        v.style.fontSize = '15px';
        v.style.fontWeight = '700';
        v.style.color = c.color;
        v.textContent = c.val;

        card.appendChild(lbl);
        card.appendChild(v);
        hud.appendChild(card);
      });

      this._container.appendChild(hud);
    },

    _renderAttainmentMatrix: function (container, records, theme, config, targetAttain) {
      var self = this;
      var gridContainer = document.createElement('div');
      gridContainer.style.display = 'flex';
      gridContainer.style.flexDirection = 'column';
      gridContainer.style.gap = '14px';

      // Group records by Segment
      var segments = {};
      records.forEach(function (r) {
        var seg = r.segment || 'Core';
        if (!segments[seg]) segments[seg] = [];
        segments[seg].push(r);
      });

      Object.keys(segments).forEach(function (segKey) {
        var segReps = segments[segKey];
        var segBox = document.createElement('div');
        segBox.style.borderRadius = '8px';
        segBox.style.border = '1px solid ' + theme.border;
        segBox.style.backgroundColor = theme.cardBg;
        segBox.style.padding = '12px 14px';

        var segHeader = document.createElement('div');
        segHeader.style.display = 'flex';
        segHeader.style.justifyContent = 'space-between';
        segHeader.style.alignItems = 'center';
        segHeader.style.marginBottom = '10px';

        var segTitle = document.createElement('span');
        segTitle.style.fontWeight = '700';
        segTitle.style.fontSize = '13px';
        segTitle.style.color = theme.text;
        segTitle.textContent = segKey + ' Segment (' + segReps.length + ' Reps)';

        var segWon = segReps.reduce(function (s, r) { return s + r.won; }, 0);
        var segQuota = segReps.reduce(function (s, r) { return s + r.quota; }, 0);
        var segAttain = segQuota > 0 ? (segWon / segQuota) * 100 : 0;

        var segPill = document.createElement('span');
        segPill.style.fontSize = '11px';
        segPill.style.fontWeight = '600';
        segPill.style.padding = '3px 8px';
        segPill.style.borderRadius = '12px';
        segPill.style.backgroundColor = segAttain >= 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
        segPill.style.color = segAttain >= 100 ? theme.won : theme.gap;
        segPill.textContent = segAttain.toFixed(1) + '% Attainment • ' + formatCurrency(segWon) + ' / ' + formatCurrency(segQuota);

        segHeader.appendChild(segTitle);
        segHeader.appendChild(segPill);
        segBox.appendChild(segHeader);

        // Reps Grid
        var repsGrid = document.createElement('div');
        repsGrid.style.display = 'grid';
        repsGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        repsGrid.style.gap = '10px';

        segReps.forEach(function (r) {
          var repCard = document.createElement('div');
          repCard.style.padding = '10px 12px';
          repCard.style.borderRadius = '6px';
          repCard.style.backgroundColor = theme.bg;
          repCard.style.border = '1px solid ' + theme.border;
          repCard.style.display = 'flex';
          repCard.style.flexDirection = 'column';
          repCard.style.gap = '6px';
          repCard.style.cursor = r.drillLinks ? 'pointer' : 'default';
          repCard.style.transition = 'box-shadow 0.15s ease, border-color 0.15s ease';

          repCard.addEventListener('mouseenter', function (e) {
            repCard.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            repCard.style.borderColor = theme.primary;
            self._showTooltip(e, r, theme, targetAttain);
          });
          repCard.addEventListener('mouseleave', function () {
            repCard.style.boxShadow = 'none';
            repCard.style.borderColor = theme.border;
            self._hideTooltip();
          });
          if (r.drillLinks) {
            repCard.addEventListener('click', function (e) {
              if (LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
                LookerCharts.Utils.openDrillMenu({ links: r.drillLinks, event: e });
              }
            });
          }

          // Top Row: Rep Name + Attainment Badge
          var topRow = document.createElement('div');
          topRow.style.display = 'flex';
          topRow.style.justifyContent = 'space-between';
          topRow.style.alignItems = 'center';

          var nameSpan = document.createElement('span');
          nameSpan.style.fontWeight = '600';
          nameSpan.style.fontSize = '12px';
          nameSpan.style.color = theme.text;
          nameSpan.textContent = r.name;

          var badge = document.createElement('span');
          badge.style.fontSize = '10px';
          badge.style.fontWeight = '700';
          badge.style.padding = '2px 6px';
          badge.style.borderRadius = '4px';
          badge.style.backgroundColor = r.tierColor;
          badge.style.color = '#ffffff';
          badge.textContent = r.attainment.toFixed(1) + '%';

          topRow.appendChild(nameSpan);
          topRow.appendChild(badge);
          repCard.appendChild(topRow);

          // Details Row: Region • Ramp Status • Tenure
          var subRow = document.createElement('div');
          subRow.style.fontSize = '10.5px';
          subRow.style.color = theme.subtext;
          subRow.textContent = r.region + ' • ' + r.rampStatus + ' (' + r.tenure + ' mo)';
          repCard.appendChild(subRow);

          // Attainment Progress Bar
          var progressTrack = document.createElement('div');
          progressTrack.style.width = '100%';
          progressTrack.style.height = '10px';
          progressTrack.style.borderRadius = '5px';
          progressTrack.style.backgroundColor = theme.grid;
          progressTrack.style.position = 'relative';
          progressTrack.style.overflow = 'hidden';
          progressTrack.style.marginTop = '4px';

          var maxVal = Math.max(r.quota * 1.3, r.won + r.commit, r.quota);
          var wonPct = maxVal > 0 ? (r.won / maxVal) * 100 : 0;
          var commitPct = maxVal > 0 ? (r.commit / maxVal) * 100 : 0;
          var quotaPct = maxVal > 0 ? (r.quota / maxVal) * 100 : 100;

          // Won Bar
          var wonBar = document.createElement('div');
          wonBar.style.position = 'absolute';
          wonBar.style.left = '0';
          wonBar.style.top = '0';
          wonBar.style.height = '100%';
          wonBar.style.width = Math.min(100, wonPct) + '%';
          wonBar.style.backgroundColor = theme.won;
          progressTrack.appendChild(wonBar);

          // Commit Bar
          if (r.commit > 0) {
            var commitBar = document.createElement('div');
            commitBar.style.position = 'absolute';
            commitBar.style.left = Math.min(100, wonPct) + '%';
            commitBar.style.top = '0';
            commitBar.style.height = '100%';
            commitBar.style.width = Math.min(100 - wonPct, commitPct) + '%';
            commitBar.style.backgroundColor = theme.commit;
            progressTrack.appendChild(commitBar);
          }

          // Quota Mark (Dashed Vertical Target Line)
          var quotaLine = document.createElement('div');
          quotaLine.style.position = 'absolute';
          quotaLine.style.left = Math.min(99, quotaPct) + '%';
          quotaLine.style.top = '0';
          quotaLine.style.height = '100%';
          quotaLine.style.width = '2px';
          quotaLine.style.backgroundColor = '#000000';
          quotaLine.style.zIndex = '2';
          progressTrack.appendChild(quotaLine);

          repCard.appendChild(progressTrack);

          // Numbers Summary Row
          var numRow = document.createElement('div');
          numRow.style.display = 'flex';
          numRow.style.justifyContent = 'space-between';
          numRow.style.fontSize = '10px';
          numRow.style.color = theme.subtext;
          numRow.innerHTML = '<span>Won: <strong style="color:' + theme.text + '">' + formatCurrency(r.won) + '</strong></span>' +
                            (r.commit > 0 ? '<span>Commit: <strong style="color:' + theme.commit + '">' + formatCurrency(r.commit) + '</strong></span>' : '') +
                            '<span>Quota: <strong>' + formatCurrency(r.quota) + '</strong></span>';
          repCard.appendChild(numRow);

          repsGrid.appendChild(repCard);
        });

        segBox.appendChild(repsGrid);
        gridContainer.appendChild(segBox);
      });

      container.appendChild(gridContainer);
    },

    _renderQuadrant: function (d3, container, records, theme, config, targetAttain) {
      var self = this;
      var w = container.clientWidth || 800;
      var h = Math.max(480, (container.clientHeight || 500) - 20);
      var margin = { top: 30, right: 30, bottom: 50, left: 60 };
      var innerW = w - margin.left - margin.right;
      var innerH = h - margin.top - margin.bottom;

      var svg = d3.select(container)
        .append('svg')
        .attr('width', w)
        .attr('height', h)
        .style('display', 'block');

      var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var maxTenure = Math.max(24, d3.max(records, function (d) { return d.tenure; }) || 24);
      var maxAttain = Math.max(150, d3.max(records, function (d) { return d.attainment; }) || 150);

      var xScale = d3.scaleLinear()
        .domain([0, maxTenure * 1.1])
        .range([0, innerW]);

      var yScale = d3.scaleLinear()
        .domain([0, Math.min(300, maxAttain * 1.1)])
        .range([innerH, 0]);

      var rScale = d3.scaleSqrt()
        .domain([0, d3.max(records, function (d) { return d.quota; }) || 1e6])
        .range([5, 20]);

      // Quadrant Background Zones
      var rampBenchmark = 12; // 12 months ramp cutoff
      var xSplit = xScale(rampBenchmark);
      var ySplit = yScale(targetAttain);

      // Zone I: Tenured Superstars (Top Right)
      g.append('rect')
        .attr('x', xSplit).attr('y', 0)
        .attr('width', innerW - xSplit).attr('height', ySplit)
        .attr('fill', theme.zoneSuperstar);
      g.append('text')
        .attr('x', innerW - 10).attr('y', 20)
        .attr('text-anchor', 'end')
        .attr('fill', theme.presClub).attr('font-size', '11px').attr('font-weight', '700')
        .text("Tenured Superstars (President's Club)");

      // Zone II: Fast-Ramp Prodigies (Top Left)
      g.append('rect')
        .attr('x', 0).attr('y', 0)
        .attr('width', xSplit).attr('height', ySplit)
        .attr('fill', theme.zoneProdigy);
      g.append('text')
        .attr('x', 10).attr('y', 20)
        .attr('text-anchor', 'start')
        .attr('fill', theme.won).attr('font-size', '11px').attr('font-weight', '700')
        .text("Fast-Ramp Prodigies (>=100% Attain)");

      // Zone III: Developing New Hires (Bottom Left)
      g.append('rect')
        .attr('x', 0).attr('y', ySplit)
        .attr('width', xSplit).attr('height', innerH - ySplit)
        .attr('fill', theme.zoneDeveloping);
      g.append('text')
        .attr('x', 10).attr('y', innerH - 12)
        .attr('text-anchor', 'start')
        .attr('fill', theme.commit).attr('font-size', '11px').attr('font-weight', '700')
        .text("New Hires Ramping (<12 mo)");

      // Zone IV: Tenured Strugglers (Bottom Right)
      g.append('rect')
        .attr('x', xSplit).attr('y', ySplit)
        .attr('width', innerW - xSplit).attr('height', innerH - ySplit)
        .attr('fill', theme.zoneStruggling);
      g.append('text')
        .attr('x', innerW - 10).attr('y', innerH - 12)
        .attr('text-anchor', 'end')
        .attr('fill', theme.critical).attr('font-size', '11px').attr('font-weight', '700')
        .text("Tenured Strugglers (At-Risk)");

      // Threshold Dividing Lines
      g.append('line')
        .attr('x1', xSplit).attr('y1', 0)
        .attr('x2', xSplit).attr('y2', innerH)
        .attr('stroke', theme.subtext).attr('stroke-dasharray', '4,4').attr('stroke-width', 1.5);

      g.append('line')
        .attr('x1', 0).attr('y1', ySplit)
        .attr('x2', innerW).attr('y2', ySplit)
        .attr('stroke', theme.subtext).attr('stroke-dasharray', '4,4').attr('stroke-width', 1.5);

      // Axes
      var xAxis = d3.axisBottom(xScale).ticks(8).tickFormat(function (d) { return d + ' mo'; });
      var yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return d + '%'; });

      g.append('g').attr('transform', 'translate(0,' + innerH + ')').call(xAxis)
        .attr('color', theme.subtext)
        .append('text')
        .attr('x', innerW / 2).attr('y', 38).attr('fill', theme.text).attr('font-size', '12px').attr('font-weight', '600')
        .text('Tenure with Organization (Months)');

      g.append('g').call(yAxis)
        .attr('color', theme.subtext)
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2).attr('y', -42).attr('fill', theme.text).attr('font-size', '12px').attr('font-weight', '600')
        .text('Quota Attainment Percentage (%)');

      // Scatter Circles
      var circles = g.selectAll('.rep-bubble')
        .data(records)
        .enter()
        .append('circle')
        .attr('class', 'rep-bubble')
        .attr('cx', function (d) { return xScale(d.tenure); })
        .attr('cy', function (d) { return yScale(Math.min(300, d.attainment)); })
        .attr('r', function (d) { return rScale(d.quota); })
        .attr('fill', function (d) { return d.tierColor; })
        .attr('fill-opacity', 0.8)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer');

      circles.on('mouseenter', function (event, d) {
        d3.select(this).attr('stroke', theme.primary).attr('stroke-width', 3).attr('fill-opacity', 1);
        self._showTooltip(event, d, theme, targetAttain);
      });
      circles.on('mouseleave', function () {
        d3.select(this).attr('stroke', '#ffffff').attr('stroke-width', 1.5).attr('fill-opacity', 0.8);
        self._hideTooltip();
      });
      circles.on('click', function (event, d) {
        if (d.drillLinks && LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
          LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: event });
        }
      });
    },

    _renderWaterfall: function (d3, container, records, theme, config, totals) {
      var w = container.clientWidth || 800;
      var h = Math.max(420, (container.clientHeight || 500) - 20);
      var margin = { top: 30, right: 30, bottom: 60, left: 70 };
      var innerW = w - margin.left - margin.right;
      var innerH = h - margin.top - margin.bottom;

      var svg = d3.select(container)
        .append('svg')
        .attr('width', w)
        .attr('height', h)
        .style('display', 'block');

      var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var netGap = Math.max(0, totals.totalQuota - (totals.totalWon + totals.totalCommit));
      var surplus = Math.max(0, (totals.totalWon + totals.totalCommit) - totals.totalQuota);

      var steps = [
        { label: 'Total Quota Plan', val: totals.totalQuota, base: 0, end: totals.totalQuota, color: theme.quota },
        { label: 'Closed Won ARR', val: totals.totalWon, base: 0, end: totals.totalWon, color: theme.won },
        { label: 'Commit ARR', val: totals.totalCommit, base: totals.totalWon, end: totals.totalWon + totals.totalCommit, color: theme.commit },
        { label: netGap > 0 ? 'Remaining Quota Gap' : 'Target Surplus', val: netGap > 0 ? netGap : surplus, base: totals.totalWon + totals.totalCommit, end: totals.totalQuota, color: netGap > 0 ? theme.gap : theme.surplus }
      ];

      var maxY = Math.max(totals.totalQuota, totals.totalWon + totals.totalCommit) * 1.15;
      var yScale = d3.scaleLinear().domain([0, maxY]).range([innerH, 0]);
      var xScale = d3.scaleBand().domain(steps.map(function (s) { return s.label; })).range([0, innerW]).padding(0.3);

      // Grid
      g.append('g')
        .attr('color', theme.grid)
        .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW).tickFormat(''));

      // Axis
      g.append('g').attr('transform', 'translate(0,' + innerH + ')').call(d3.axisBottom(xScale))
        .attr('color', theme.subtext)
        .selectAll('text')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', theme.text);

      g.append('g').call(d3.axisLeft(yScale).ticks(5).tickFormat(formatCurrency))
        .attr('color', theme.subtext)
        .selectAll('text')
        .attr('font-size', '11px')
        .attr('fill', theme.text);

      // Bars
      steps.forEach(function (step) {
        var y1 = yScale(Math.max(step.base, step.end));
        var y0 = yScale(Math.min(step.base, step.end));
        var barH = Math.max(4, y0 - y1);

        g.append('rect')
          .attr('x', xScale(step.label))
          .attr('y', y1)
          .attr('width', xScale.bandwidth())
          .attr('height', barH)
          .attr('fill', step.color)
          .attr('rx', 4);

        g.append('text')
          .attr('x', xScale(step.label) + xScale.bandwidth() / 2)
          .attr('y', y1 - 8)
          .attr('text-anchor', 'middle')
          .attr('fill', theme.text)
          .attr('font-size', '12px')
          .attr('font-weight', '700')
          .text(formatCurrency(step.val));
      });
    },

    _renderLeaderboard: function (container, records, theme, config, targetAttain) {
      var table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '12px';

      var thead = document.createElement('thead');
      thead.innerHTML = '<tr style="border-bottom: 2px solid ' + theme.border + '; text-align: left; color:' + theme.subtext + ';">' +
        '<th style="padding: 8px;">Rank</th>' +
        '<th style="padding: 8px;">Sales Rep</th>' +
        '<th style="padding: 8px;">Segment / Region</th>' +
        '<th style="padding: 8px;">Ramp Status</th>' +
        '<th style="padding: 8px; text-align: right;">Quota ARR</th>' +
        '<th style="padding: 8px; text-align: right;">Won ARR</th>' +
        '<th style="padding: 8px; text-align: right;">Commit ARR</th>' +
        '<th style="padding: 8px; text-align: right;">Attainment %</th>' +
        '<th style="padding: 8px;">Performance Tier</th>' +
      '</tr>';
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      records.forEach(function (r, idx) {
        var tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid ' + theme.border;
        tr.style.cursor = r.drillLinks ? 'pointer' : 'default';

        tr.innerHTML = '<td style="padding: 8px; font-weight:700;">#' + (idx + 1) + '</td>' +
          '<td style="padding: 8px; font-weight:600; color:' + theme.text + ';">' + r.name + '</td>' +
          '<td style="padding: 8px; color:' + theme.subtext + ';">' + r.segment + ' • ' + r.region + '</td>' +
          '<td style="padding: 8px; color:' + theme.subtext + ';">' + r.rampStatus + ' (' + r.tenure + ' mo)</td>' +
          '<td style="padding: 8px; text-align: right;">' + formatCurrency(r.quota) + '</td>' +
          '<td style="padding: 8px; text-align: right; font-weight:700; color:' + theme.won + ';">' + formatCurrency(r.won) + '</td>' +
          '<td style="padding: 8px; text-align: right; color:' + theme.commit + ';">' + formatCurrency(r.commit) + '</td>' +
          '<td style="padding: 8px; text-align: right; font-weight:700; color:' + r.tierColor + ';">' + r.attainment.toFixed(1) + '%</td>' +
          '<td style="padding: 8px;"><span style="background:' + r.tierColor + '; color:#ffffff; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700;">' + r.tierLabel + '</span></td>';

        if (r.drillLinks) {
          tr.addEventListener('click', function (e) {
            if (LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
              LookerCharts.Utils.openDrillMenu({ links: r.drillLinks, event: e });
            }
          });
        }
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      container.appendChild(table);
    },

    _showTooltip: function (e, r, theme, targetAttain) {
      if (!this._tooltip) return;
      var tt = this._tooltip;
      tt.style.backgroundColor = theme.isDark ? '#0f172a' : '#ffffff';
      tt.style.color = theme.text;
      tt.style.border = '1px solid ' + theme.border;

      var html = '<div style="font-weight:700; font-size:13px; margin-bottom:4px; color:' + theme.text + '">' + r.name + '</div>' +
        '<div style="font-size:11px; color:' + theme.subtext + '; margin-bottom:6px;">' + r.segment + ' • ' + r.region + ' • ' + r.rampStatus + ' (' + r.tenure + ' mo)</div>' +
        '<div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:3px;"><span>Attainment:</span><strong style="color:' + r.tierColor + '">' + r.attainment.toFixed(1) + '%</strong></div>' +
        '<div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:3px;"><span>Closed Won ARR:</span><strong style="color:' + theme.won + '">' + formatCurrency(r.won) + '</strong></div>' +
        (r.commit > 0 ? '<div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:3px;"><span>Commit ARR:</span><strong style="color:' + theme.commit + '">' + formatCurrency(r.commit) + '</strong></div>' : '') +
        '<div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:3px;"><span>ARR Quota:</span><strong>' + formatCurrency(r.quota) + '</strong></div>' +
        (r.coverage ? '<div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:3px;"><span>Pipeline Coverage:</span><strong>' + r.coverage.toFixed(2) + 'x</strong></div>' : '') +
        '<div style="margin-top:6px; padding-top:4px; border-top:1px solid ' + theme.border + '; font-size:10px; color:' + theme.subtext + '">Click to open Looker drill-down menu</div>';

      tt.innerHTML = html;
      tt.style.display = 'block';
      tt.style.opacity = '1';

      var containerRect = this._container.getBoundingClientRect();
      var x = e.clientX - containerRect.left + 15;
      var y = e.clientY - containerRect.top + 15;
      if (x + 220 > containerRect.width) x -= 240;
      if (y + 180 > containerRect.height) y -= 190;

      tt.style.left = Math.max(10, x) + 'px';
      tt.style.top = Math.max(10, y) + 'px';
    },

    _hideTooltip: function () {
      if (!this._tooltip) return;
      this._tooltip.style.opacity = '0';
      this._tooltip.style.display = 'none';
    }
  });
})();
