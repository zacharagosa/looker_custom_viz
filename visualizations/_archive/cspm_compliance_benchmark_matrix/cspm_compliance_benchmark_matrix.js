/**
 * Cloud Security Posture & Compliance Benchmark Matrix
 * Google Cloud Looker Custom Visualization
 * Built with D3.js v7
 *
 * Designed for CISOs, SecOps Engineers, and Cloud Compliance Officers.
 * Solves Buganizer Cloud Blockers b/510293847, b/394819201, and b/482019482.
 *
 * 4 Multi-Modal Layout Paradigms:
 * 1. framework_matrix (Default): 2D cross-tabulation matrix of Frameworks x Resource Types
 *    with compliance score heatmap shading, progress mini-bars, open vulnerability counts,
 *    and Critical/High violation warning badges.
 * 2. severity_remediation_waterfall: Severity progression breakdown (Critical -> High -> Med -> Low)
 *    with overlaid waterline tracking Average Days to Remediate SLA.
 * 3. cloud_drift_quadrant: Control Count / Open Findings (X) vs Posture Compliance Score (Y)
 *    interactive scatter plot with governance quadrant crosshairs and danger zone shading.
 * 4. audit_readiness_scorecard: Framework-by-framework executive audit readiness scorecards
 *    with circular gauge indicators, passing vs failing controls, and SLA breach badges.
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
    google_enterprise: {
      name: 'Google Enterprise',
      primary: '#1a73e8',
      accent: '#4285f4',
      compliant: '#1e8e3e',
      warning: '#f9ab00',
      critical: '#d93025',
      bg: '#ffffff',
      cardBg: '#f8f9fa',
      border: '#dadce0',
      text: '#202124',
      subtext: '#5f6368',
      grid: '#e8eaed',
      isDark: false
    },
    modern_slate: {
      name: 'Modern Slate',
      primary: '#0f172a',
      accent: '#2563eb',
      compliant: '#10b981',
      warning: '#f59e0b',
      critical: '#ef4444',
      bg: '#ffffff',
      cardBg: '#f8fafc',
      border: '#e2e8f0',
      text: '#0f172a',
      subtext: '#64748b',
      grid: '#f1f5f9',
      isDark: false
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark',
      primary: '#06b6d4',
      accent: '#a855f7',
      compliant: '#10b981',
      warning: '#f59e0b',
      critical: '#f43f5e',
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
      compliant: '#059669',
      warning: '#d97706',
      critical: '#dc2626',
      bg: '#ffffff',
      cardBg: '#f0fdf4',
      border: '#bbf7d0',
      text: '#064e3b',
      subtext: '#047857',
      grid: '#dcfce7',
      isDark: false
    },
    sunset_media: {
      name: 'Sunset Media',
      primary: '#c2410c',
      accent: '#ea580c',
      compliant: '#16a34a',
      warning: '#d97706',
      critical: '#b91c1c',
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
      compliant: '#006b40',
      warning: '#b54708',
      critical: '#b42318',
      bg: '#ffffff',
      cardBg: '#eef2f7',
      border: '#cbd5e1',
      text: '#143359',
      subtext: '#64748b',
      grid: '#e2e8f0',
      isDark: false
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
    return list[defaultIdx] || list[0];
  }

  function formatNumber(num, formatType) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    var abs = Math.abs(num);
    var sign = num < 0 ? '-' : '';

    if (formatType === 'percentage') {
      return (num * (abs <= 1.0 ? 100 : 1)).toFixed(1) + '%';
    }
    if (formatType === 'compact_number') {
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + 'B';
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + 'M';
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
      return sign + abs.toLocaleString();
    }
    if (formatType === 'compact_currency') {
      if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
      if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
      if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
      return sign + '$' + Math.round(abs).toLocaleString();
    }
    if (formatType === 'decimal_2') {
      return sign + abs.toFixed(2);
    }
    if (formatType === 'raw') {
      return String(num);
    }
    // Auto fallback
    if (abs <= 1.0 && num !== 0) return (num * 100).toFixed(1) + '%';
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1) + 'M';
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
    return sign + Math.round(abs).toLocaleString();
  }

  var visObject = {
    id: 'cspm_compliance_benchmark_matrix',
    label: 'Cloud Security Posture & Compliance Benchmark Matrix',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'Compliance View Topology',
        display: 'select',
        values: [
          { '2D Framework × Resource Matrix': 'framework_matrix' },
          { 'Severity & Remediation SLA Waterfall': 'severity_remediation_waterfall' },
          { 'Exposure & Compliance Quadrant': 'cloud_drift_quadrant' },
          { 'Executive Audit Readiness Scorecards': 'audit_readiness_scorecard' }
        ],
        default: 'framework_matrix',
        section: 'Display',
        order: 1
      },
      frameworkFieldOverride: {
        type: 'string',
        label: 'Compliance Framework Dimension (Rows)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 2
      },
      resourceFieldOverride: {
        type: 'string',
        label: 'Cloud Resource Type Dimension (Columns)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 3
      },
      severityFieldOverride: {
        type: 'string',
        label: 'Severity Level Dimension (Optional)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 4
      },
      countFieldOverride: {
        type: 'string',
        label: 'Total Controls Audited Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 5
      },
      criticalHighOverride: {
        type: 'string',
        label: 'Critical / High Violations Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 6
      },
      openFindingsOverride: {
        type: 'string',
        label: 'Open Findings Count Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 7
      },
      scoreFieldOverride: {
        type: 'string',
        label: 'Posture Compliance Score Measure',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 8
      },
      slaDaysOverride: {
        type: 'string',
        label: 'Avg Days to Remediate Measure (Optional)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 9
      },
      targetMeasureOverride: {
        type: 'string',
        label: 'Target / SLA Benchmark Measure (Optional)',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 10
      },
      targetMode: {
        type: 'string',
        label: 'Compliance Target Benchmark Mode',
        display: 'select',
        values: [
          { 'Fixed Target Benchmark': 'fixed' },
          { 'Dataset Mean Compliance': 'dataset_mean' },
          { 'Dataset Median Compliance': 'dataset_median' },
          { 'Top Percentile P75 Target': 'percentile_p75' },
          { 'Top Percentile P90 Target': 'percentile_p90' },
          { 'None (Disabled)': 'none' }
        ],
        default: 'fixed',
        section: 'Display',
        order: 11
      },
      fixedTargetValue: {
        type: 'number',
        label: 'Fixed Target Compliance % (e.g. 0.85 = 85%)',
        default: 0.85,
        section: 'Display',
        order: 12
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Reference Benchmark Label',
        default: 'CISO Target Compliance SLA',
        section: 'Display',
        order: 13
      },
      anomalyThresholdPct: {
        type: 'number',
        label: 'Underperformance Disparity Alert Threshold (%)',
        default: 15,
        section: 'Display',
        order: 14
      },
      sortBy: {
        type: 'string',
        label: 'Matrix Sort Order',
        display: 'select',
        values: [
          { 'Compliance Score Ascending (Worst First)': 'compliance_asc' },
          { 'Compliance Score Descending (Best First)': 'compliance_desc' },
          { 'Open Findings Descending': 'open_findings_desc' },
          { 'Critical Violations Descending': 'critical_desc' },
          { 'Alphabetical A-Z': 'alphabetical' },
          { 'Natural / Query Order': 'natural' }
        ],
        default: 'compliance_asc',
        section: 'Display',
        order: 15
      },
      topNLimit: {
        type: 'number',
        label: 'Top-N Frameworks / Resources Focus (0 = All)',
        default: 0,
        section: 'Display',
        order: 16
      },
      enableOtherRollup: {
        type: 'boolean',
        label: 'Highlight / Rollup Non-Top Categories',
        default: false,
        section: 'Display',
        order: 17
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Suppress Zero / Null Controls',
        default: false,
        section: 'Display',
        order: 18
      },
      hudMode: {
        type: 'string',
        label: 'Executive CISO Scorecard HUD',
        display: 'select',
        values: [
          { 'Full Scorecard HUD': 'scorecard' },
          { 'Compact Metric Strip': 'compact_strip' },
          { 'Hidden': 'hidden' }
        ],
        default: 'scorecard',
        section: 'Display',
        order: 19
      },
      dataLabels: {
        type: 'string',
        label: 'Matrix Cell Data Labels',
        display: 'select',
        values: [
          { 'All Cell Metrics (Score + Counts)': 'all' },
          { 'Compliance Scores Only': 'scores_only' },
          { 'SLA & Policy Breaches Only': 'breaches_only' },
          { 'Hidden': 'hidden' }
        ],
        default: 'all',
        section: 'Display',
        order: 20
      },
      customTitleOverride: {
        type: 'string',
        label: 'Custom Scorecard Title Override',
        default: '',
        section: 'Display',
        order: 21
      },
      customSubtitleOverride: {
        type: 'string',
        label: 'Custom Subtitle Override',
        default: '',
        section: 'Display',
        order: 22
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Interactive Framework / Resource Filter Bar',
        default: true,
        section: 'Display',
        order: 23
      },
      showSlaBadges: {
        type: 'boolean',
        label: 'Show Remediation SLA Aging Badges',
        default: true,
        section: 'Display',
        order: 24
      },
      showLegend: {
        type: 'boolean',
        label: 'Show Color Scale Legend',
        default: true,
        section: 'Display',
        order: 25
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
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
          { 'Custom Hex Override': 'custom' }
        ],
        default: 'google_enterprise',
        section: 'Style',
        order: 1
      },
      customPrimaryHex: {
        type: 'string',
        label: 'Custom Primary Accent Color (Hex)',
        display: 'color',
        default: '',
        section: 'Style',
        order: 2
      },
      customPositiveHex: {
        type: 'string',
        label: 'Custom Compliant / Passing Color (Hex)',
        display: 'color',
        default: '',
        section: 'Style',
        order: 3
      },
      customNegativeHex: {
        type: 'string',
        label: 'Custom Violation / Critical Color (Hex)',
        display: 'color',
        default: '',
        section: 'Style',
        order: 4
      },
      metricPolarity: {
        type: 'string',
        label: 'Metric Polarity (Optimization Direction)',
        display: 'select',
        values: [
          { 'Higher is Better (Compliance Score)': 'higher_is_better' },
          { 'Lower is Better (Violations / Aging SLA)': 'lower_is_better' }
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
        label: 'Number & Metric Formatting',
        display: 'select',
        values: [
          { 'Auto Formatting': 'auto' },
          { 'Percentage (85.2%)': 'percentage' },
          { 'Compact Number (1.2K / 1.5M)': 'compact_number' },
          { 'Compact Currency ($1.2M)': 'compact_currency' },
          { 'Decimal 2dp (0.85)': 'decimal_2' },
          { 'Raw Unformatted': 'raw' }
        ],
        default: 'percentage',
        section: 'Style',
        order: 7
      },
      cellRadius: {
        type: 'number',
        label: 'Matrix Cell Corner Radius (px)',
        default: 6,
        section: 'Style',
        order: 8
      },
      enableAnimation: {
        type: 'boolean',
        label: 'Enable Smooth State Transitions',
        default: true,
        section: 'Style',
        order: 9
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        frameworkFieldOverride: { role: 'dimension', defaultIdx: 0 },
        resourceFieldOverride: { role: 'dimension', defaultIdx: 1 },
        severityFieldOverride: { role: 'dimension', defaultIdx: 2 },
        countFieldOverride: { role: 'measure', defaultIdx: 0 },
        criticalHighOverride: { role: 'measure', defaultIdx: 1 },
        openFindingsOverride: { role: 'measure', defaultIdx: 2 },
        scoreFieldOverride: { role: 'measure', defaultIdx: 3 },
        slaDaysOverride: { role: 'measure', defaultIdx: 4 },
        targetMeasureOverride: { role: 'measure', defaultIdx: -1 }
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
        var autoLabel = autoField ? ('Auto → ' + fieldLabel(autoField)) : 'Auto / None';
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
      element.style.boxSizing = 'border-box';
      element.style.padding = '0';
      element.style.overflow = 'hidden';
      element.style.display = 'flex';
      element.style.flexDirection = 'column';
      element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

      var container = document.createElement('div');
      container.className = 'cspm-matrix-container';
      container.style.width = '100%';
      container.style.flex = '1 1 auto';
      container.style.minHeight = '0';
      container.style.position = 'relative';
      container.style.overflowX = 'hidden';
      container.style.overflowY = 'auto';
      container.style.boxSizing = 'border-box';
      element.appendChild(container);

      // Floating Tooltip
      var tooltip = document.createElement('div');
      tooltip.className = 'cspm-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.display = 'none';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.zIndex = '99999';
      tooltip.style.padding = '10px 14px';
      tooltip.style.borderRadius = '8px';
      tooltip.style.fontSize = '12px';
      tooltip.style.lineHeight = '1.45';
      tooltip.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.25), 0 8px 10px -6px rgba(0,0,0,0.15)';
      tooltip.style.backdropFilter = 'blur(8px)';
      tooltip.style.webkitBackdropFilter = 'blur(8px)';
      document.body.appendChild(tooltip);

      this._tooltip = tooltip;
      this._element = element;
      this._searchFilter = '';
      this._setupResizeObserver(element);
    },

    _setupResizeObserver: function (element) {
      var self = this;
      if (!window.ResizeObserver) return;
      var lastW = element.clientWidth;
      var lastH = element.clientHeight;
      var resizeTimer = null;

      var ro = new ResizeObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var cr = entries[i].contentRect;
          var dw = Math.abs(cr.width - lastW);
          var dh = Math.abs(cr.height - lastH);
          if (dw >= 4 || dh >= 4) {
            lastW = cr.width;
            lastH = cr.height;
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
              if (self._lastData && self._lastQueryResponse) {
                ensureD3(function (d3) {
                  self.render(d3, self._lastData, element, self._lastConfig, self._lastQueryResponse, function () {});
                });
              }
            }, 100);
          }
        }
      });
      ro.observe(element);
      this._resizeObserver = ro;
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;

      this._registerDynamicFieldOptions(queryResponse);

      var self = this;
      ensureD3(function (d3) {
        self.render(d3, data, element, config, queryResponse, done);
      });
    },

    render: function (d3, data, element, config, queryResponse, done) {
      var self = this;
      var container = element.querySelector('.cspm-matrix-container');
      if (!container) {
        if (typeof done === 'function') done();
        return;
      }
      container.innerHTML = '';

      if (!data || data.length === 0) {
        if (this.addError) {
          this.addError({
            title: 'No Data',
            message: 'The query returned no compliance records to evaluate.'
          });
        }
        if (typeof done === 'function') done();
        return;
      }

      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var meas = fields.measures || [];

      // --- FIELD RESOLUTION ---
      var fFramework = resolveField(dims, config.frameworkFieldOverride, 0);
      var fResource = resolveField(dims, config.resourceFieldOverride, 1);
      var fSeverity = resolveField(dims, config.severityFieldOverride, 2);

      var fCount = resolveField(meas, config.countFieldOverride, 0);
      var fCritHigh = resolveField(meas, config.criticalHighOverride, 1);
      var fOpen = resolveField(meas, config.openFindingsOverride, 2);
      var fScore = resolveField(meas, config.scoreFieldOverride, 3);
      var fSlaDays = resolveField(meas, config.slaDaysOverride, 4);

      // --- THEME & PALETTES ---
      var themeKey = config.colorPalette || 'google_enterprise';
      var theme = PALETTES[themeKey] ? Object.assign({}, PALETTES[themeKey]) : Object.assign({}, PALETTES.google_enterprise);

      if (config.customPrimaryHex) theme.primary = config.customPrimaryHex;
      if (config.customPositiveHex) theme.compliant = config.customPositiveHex;
      if (config.customNegativeHex) theme.critical = config.customNegativeHex;

      element.style.backgroundColor = theme.bg;
      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      // Font scale
      var fontScale = config.fontScale || 'standard';
      var fontScaleMap = {
        compact: { title: '13px', subtitle: '11px', cellHdr: '11px', cellTxt: '11px', statNum: '13px', statLbl: '9px' },
        standard: { title: '15px', subtitle: '12px', cellHdr: '12px', cellTxt: '12px', statNum: '15px', statLbl: '10px' },
        large: { title: '18px', subtitle: '13px', cellHdr: '13px', cellTxt: '13px', statNum: '18px', statLbl: '11px' }
      };
      var fSizes = fontScaleMap[fontScale] || fontScaleMap.standard;

      // --- DATA AGGREGATION ---
      var frameworkSet = {};
      var resourceSet = {};
      var cellMap = {};
      var totalControls = 0;
      var totalOpen = 0;
      var totalCritHigh = 0;
      var scoreSum = 0;
      var scoreCount = 0;
      var slaDaysSum = 0;
      var slaDaysCount = 0;
      var severityBreakdown = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

      data.forEach(function (row, idx) {
        var fw = fFramework && row[fFramework.name] ? String(row[fFramework.name].value || '') : 'General Framework';
        var res = fResource && row[fResource.name] ? String(row[fResource.name].value || '') : 'Cloud Resource';
        var sev = fSeverity && row[fSeverity.name] ? String(row[fSeverity.name].value || '').toUpperCase() : 'MEDIUM';

        var cnt = fCount && row[fCount.name] ? Number(row[fCount.name].value) || 0 : 1;
        var crit = fCritHigh && row[fCritHigh.name] ? Number(row[fCritHigh.name].value) || 0 : 0;
        var op = fOpen && row[fOpen.name] ? Number(row[fOpen.name].value) || 0 : 0;
        var sc = fScore && row[fScore.name] ? Number(row[fScore.name].value) || 0 : (cnt > 0 ? (cnt - op) / cnt : 1.0);
        var sla = fSlaDays && row[fSlaDays.name] ? Number(row[fSlaDays.name].value) || 0 : 0;

        var links = (fScore && row[fScore.name] && row[fScore.name].links) ||
          (fOpen && row[fOpen.name] && row[fOpen.name].links) ||
          (fFramework && row[fFramework.name] && row[fFramework.name].links) || [];

        frameworkSet[fw] = true;
        resourceSet[res] = true;

        totalControls += cnt;
        totalOpen += op;
        totalCritHigh += crit;
        scoreSum += sc * cnt;
        scoreCount += cnt;

        if (sla > 0) {
          slaDaysSum += sla * cnt;
          slaDaysCount += cnt;
        }

        if (severityBreakdown[sev] !== undefined) {
          severityBreakdown[sev] += op;
        } else {
          severityBreakdown[sev] = op;
        }

        var cellKey = fw + ':::' + res;
        if (!cellMap[cellKey]) {
          cellMap[cellKey] = {
            framework: fw,
            resource: res,
            count: 0,
            openFindings: 0,
            criticalHigh: 0,
            weightedScoreSum: 0,
            slaDaysSum: 0,
            slaCount: 0,
            severities: {},
            links: links
          };
        }

        var c = cellMap[cellKey];
        c.count += cnt;
        c.openFindings += op;
        c.criticalHigh += crit;
        c.weightedScoreSum += sc * cnt;
        if (sla > 0) {
          c.slaDaysSum += sla * cnt;
          c.slaCount += cnt;
        }
        c.severities[sev] = (c.severities[sev] || 0) + op;
        if (links.length && !c.links.length) c.links = links;
      });

      var overallScore = scoreCount > 0 ? (scoreSum / scoreCount) : 0.85;
      var avgSlaDays = slaDaysCount > 0 ? Math.round(slaDaysSum / slaDaysCount) : 18;

      var frameworks = Object.keys(frameworkSet);
      var resources = Object.keys(resourceSet);

      // Search filter
      var searchFilter = (self._searchFilter || '').trim().toLowerCase();
      if (searchFilter) {
        frameworks = frameworks.filter(function (fw) { return fw.toLowerCase().indexOf(searchFilter) >= 0; });
        resources = resources.filter(function (res) { return res.toLowerCase().indexOf(searchFilter) >= 0; });
      }

      // Compute cell aggregate score
      var cellList = [];
      Object.keys(cellMap).forEach(function (k) {
        var c = cellMap[k];
        c.score = c.count > 0 ? (c.weightedScoreSum / c.count) : 1.0;
        c.avgSla = c.slaCount > 0 ? Math.round(c.slaDaysSum / c.slaCount) : 0;
        cellList.push(c);
      });

      // Benchmark Target Calculation
      var targetMode = config.targetMode || 'fixed';
      var targetVal = null;
      if (targetMode === 'fixed') {
        targetVal = Number(config.fixedTargetValue) || 0.85;
      } else if (targetMode === 'dataset_mean' && cellList.length > 0) {
        targetVal = overallScore;
      } else if (targetMode === 'dataset_median' && cellList.length > 0) {
        var sortedScores = cellList.map(function (c) { return c.score; }).sort(function (a, b) { return a - b; });
        targetVal = sortedScores[Math.floor(sortedScores.length / 2)];
      } else if (targetMode === 'percentile_p75' && cellList.length > 0) {
        var sP75 = cellList.map(function (c) { return c.score; }).sort(function (a, b) { return a - b; });
        targetVal = sP75[Math.floor(sP75.length * 0.75)];
      } else if (targetMode === 'percentile_p90' && cellList.length > 0) {
        var sP90 = cellList.map(function (c) { return c.score; }).sort(function (a, b) { return a - b; });
        targetVal = sP90[Math.floor(sP90.length * 0.90)];
      }

      // Framework score rollups for sorting
      var fwScores = {};
      var fwOpen = {};
      var fwCrit = {};
      frameworks.forEach(function (fw) {
        var fwCells = cellList.filter(function (c) { return c.framework === fw; });
        var totalC = fwCells.reduce(function (acc, c) { return acc + c.count; }, 0);
        var sumS = fwCells.reduce(function (acc, c) { return acc + (c.score * c.count); }, 0);
        fwScores[fw] = totalC > 0 ? (sumS / totalC) : 1.0;
        fwOpen[fw] = fwCells.reduce(function (acc, c) { return acc + c.openFindings; }, 0);
        fwCrit[fw] = fwCells.reduce(function (acc, c) { return acc + c.criticalHigh; }, 0);
      });

      // Sorting
      var sortBy = config.sortBy || 'compliance_asc';
      if (sortBy === 'compliance_asc') {
        frameworks.sort(function (a, b) { return fwScores[a] - fwScores[b]; });
      } else if (sortBy === 'compliance_desc') {
        frameworks.sort(function (a, b) { return fwScores[b] - fwScores[a]; });
      } else if (sortBy === 'open_findings_desc') {
        frameworks.sort(function (a, b) { return fwOpen[b] - fwOpen[a]; });
      } else if (sortBy === 'critical_desc') {
        frameworks.sort(function (a, b) { return fwCrit[b] - fwCrit[a]; });
      } else if (sortBy === 'alphabetical') {
        frameworks.sort();
      }

      // Top-N Filtering
      var topN = Number(config.topNLimit) || 0;
      if (topN > 0 && frameworks.length > topN) {
        frameworks = frameworks.slice(0, topN);
      }

      // --- 1. EXECUTIVE CISO SCORECARD HUD ---
      var hudMode = config.hudMode || 'scorecard';
      if (hudMode !== 'hidden') {
        var hud = document.createElement('div');
        hud.className = 'cspm-hud-banner';
        hud.style.padding = hudMode === 'compact_strip' ? '8px 16px' : '14px 20px';
        hud.style.borderBottom = '1px solid ' + theme.border;
        hud.style.backgroundColor = theme.cardBg;
        hud.style.display = 'flex';
        hud.style.flexWrap = 'wrap';
        hud.style.alignItems = 'center';
        hud.style.justifyContent = 'space-between';
        hud.style.gap = '14px';

        var titleBox = document.createElement('div');
        var mainTitle = document.createElement('div');
        mainTitle.style.fontSize = fSizes.title;
        mainTitle.style.fontWeight = '700';
        mainTitle.style.color = theme.text;
        mainTitle.textContent = config.customTitleOverride || 'Cloud Security Posture & Compliance Governance Matrix';

        var subTitle = document.createElement('div');
        subTitle.style.fontSize = fSizes.subtitle;
        subTitle.style.color = theme.subtext;
        subTitle.style.marginTop = '2px';

        var auditStatus = overallScore >= (targetVal || 0.85) ? 'AUDIT READY' : (overallScore >= 0.70 ? 'AT RISK' : 'NON-COMPLIANT');
        subTitle.textContent = config.customSubtitleOverride || (
          'Overall Posture: ' + (overallScore * 100).toFixed(1) + '% (' + auditStatus + ') • ' +
          totalControls.toLocaleString() + ' Controls • ' + totalOpen.toLocaleString() + ' Open Findings • ' +
          totalCritHigh.toLocaleString() + ' Critical/High'
        );

        if (targetVal !== null && overallScore < targetVal * (1 - (Number(config.anomalyThresholdPct) || 15) / 100)) {
          var gapBadge = document.createElement('span');
          gapBadge.style.cssText = 'background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;margin-left:8px;';
          gapBadge.textContent = '⚠️ Compliance Gap (-' + ((targetVal - overallScore) * 100).toFixed(1) + '% vs SLA)';
          subTitle.appendChild(gapBadge);
        }

        titleBox.appendChild(mainTitle);
        titleBox.appendChild(subTitle);
        hud.appendChild(titleBox);

        var statPills = document.createElement('div');
        statPills.style.display = 'flex';
        statPills.style.gap = '8px';
        statPills.style.flexWrap = 'wrap';

        function makeStatCard(lbl, val, col, sub) {
          var c = document.createElement('div');
          c.style.background = theme.bg;
          c.style.border = '1px solid ' + theme.border;
          c.style.borderRadius = '6px';
          c.style.padding = hudMode === 'compact_strip' ? '4px 8px' : '6px 12px';
          c.style.display = 'flex';
          c.style.flexDirection = 'column';

          var l = document.createElement('span');
          l.style.fontSize = fSizes.statLbl;
          l.style.textTransform = 'uppercase';
          l.style.letterSpacing = '0.05em';
          l.style.color = theme.subtext;
          l.textContent = lbl;

          var v = document.createElement('span');
          v.style.fontSize = fSizes.statNum;
          v.style.fontWeight = '700';
          v.style.color = col || theme.text;
          v.textContent = val;

          c.appendChild(l);
          c.appendChild(v);
          if (sub) {
            var s = document.createElement('span');
            s.style.fontSize = '9.5px';
            s.style.color = theme.subtext;
            s.textContent = sub;
            c.appendChild(s);
          }
          return c;
        }

        var scoreColor = overallScore >= (targetVal || 0.85) ? theme.compliant : (overallScore >= 0.70 ? theme.warning : theme.critical);
        statPills.appendChild(makeStatCard('Posture Score', (overallScore * 100).toFixed(1) + '%', scoreColor, auditStatus));
        if (targetVal !== null) {
          statPills.appendChild(makeStatCard(config.referenceLineLabel || 'CISO SLA Target', (targetVal * 100).toFixed(1) + '%', theme.accent, 'Governed SLA'));
        }
        statPills.appendChild(makeStatCard('Open Findings', totalOpen.toLocaleString(), totalOpen > 50 ? theme.critical : theme.text, 'Total Deficiencies'));
        statPills.appendChild(makeStatCard('Critical / High', totalCritHigh.toLocaleString(), totalCritHigh > 0 ? theme.critical : theme.compliant, 'Immediate Action'));
        statPills.appendChild(makeStatCard('Avg Remediation SLA', avgSlaDays + 'd', avgSlaDays > 30 ? theme.critical : theme.compliant, 'Days Open'));

        hud.appendChild(statPills);
        container.appendChild(hud);
      }

      // --- 2. CONTROL & SEARCH BAR ---
      var controlBar = document.createElement('div');
      controlBar.className = 'cspm-control-bar';
      controlBar.style.padding = '10px 20px';
      controlBar.style.borderBottom = '1px solid ' + theme.border;
      controlBar.style.backgroundColor = theme.cardBg;
      controlBar.style.display = 'flex';
      controlBar.style.flexWrap = 'wrap';
      controlBar.style.alignItems = 'center';
      controlBar.style.justifyContent = 'space-between';
      controlBar.style.gap = '12px';

      var layoutBox = document.createElement('div');
      layoutBox.style.display = 'flex';
      layoutBox.style.alignItems = 'center';
      layoutBox.style.gap = '6px';
      layoutBox.style.flexWrap = 'wrap';

      var layoutModes = [
        { id: 'framework_matrix', label: '▤ Matrix Grid' },
        { id: 'severity_remediation_waterfall', label: '📊 Severity Waterfall' },
        { id: 'cloud_drift_quadrant', label: '⦿ Risk Quadrant' },
        { id: 'audit_readiness_scorecard', label: '📋 Readiness Scorecard' }
      ];

      var activeLayout = config.layoutMode || 'framework_matrix';

      layoutModes.forEach(function (m) {
        var btn = document.createElement('button');
        btn.textContent = m.label;
        btn.style.fontSize = '11px';
        btn.style.fontWeight = '600';
        btn.style.padding = '5px 11px';
        btn.style.borderRadius = '5px';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.15s ease';
        if (m.id === activeLayout) {
          btn.style.background = theme.primary;
          btn.style.color = '#ffffff';
          btn.style.border = '1px solid ' + theme.primary;
        } else {
          btn.style.background = theme.bg;
          btn.style.color = theme.text;
          btn.style.border = '1px solid ' + theme.border;
        }
        btn.addEventListener('click', function () {
          config.layoutMode = m.id;
          self.render(d3, data, element, config, queryResponse, function () {});
        });
        layoutBox.appendChild(btn);
      });

      controlBar.appendChild(layoutBox);

      if (config.showSearch !== false) {
        var searchBox = document.createElement('div');
        searchBox.style.display = 'flex';
        searchBox.style.alignItems = 'center';
        searchBox.style.gap = '6px';

        var searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '🔍 Search framework or asset...';
        searchInput.value = self._searchFilter || '';
        searchInput.style.fontSize = '11px';
        searchInput.style.padding = '5px 10px';
        searchInput.style.borderRadius = '5px';
        searchInput.style.border = '1px solid ' + theme.border;
        searchInput.style.background = theme.bg;
        searchInput.style.color = theme.text;
        searchInput.style.width = '180px';
        searchInput.addEventListener('input', function (e) {
          self._searchFilter = e.target.value;
          self.render(d3, data, element, config, queryResponse, function () {});
        });
        searchBox.appendChild(searchInput);
        controlBar.appendChild(searchBox);
      }

      container.appendChild(controlBar);

      // --- 3. MAIN CONTENT AREA ---
      var contentArea = document.createElement('div');
      contentArea.className = 'cspm-main-content';
      contentArea.style.padding = '20px';
      contentArea.style.overflowX = 'auto';
      container.appendChild(contentArea);

      var tooltip = self._tooltip;
      function showTooltip(html, e) {
        if (!tooltip) return;
        tooltip.innerHTML = html;
        tooltip.style.background = theme.isDark ? '#1e293b' : 'rgba(255,255,255,0.96)';
        tooltip.style.color = theme.text;
        tooltip.style.border = '1px solid ' + theme.border;
        tooltip.style.display = 'block';
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top = (e.clientY + 14) + 'px';
      }
      function hideTooltip() {
        if (tooltip) tooltip.style.display = 'none';
      }

      if (activeLayout === 'framework_matrix') {
        renderFrameworkMatrix(contentArea);
      } else if (activeLayout === 'severity_remediation_waterfall') {
        renderSeverityWaterfall(contentArea);
      } else if (activeLayout === 'cloud_drift_quadrant') {
        renderCloudQuadrant(contentArea);
      } else if (activeLayout === 'audit_readiness_scorecard') {
        renderAuditScorecards(contentArea);
      }

      // ==========================================
      // LAYOUT 1: 2D FRAMEWORK x RESOURCE MATRIX
      // ==========================================
      function renderFrameworkMatrix(wrapper) {
        var table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'separate';
        table.style.borderSpacing = '6px';
        table.style.fontSize = fSizes.cellTxt;

        var thead = document.createElement('thead');
        var trHead = document.createElement('tr');
        var thCorner = document.createElement('th');
        thCorner.style.textAlign = 'left';
        thCorner.style.padding = '8px 12px';
        thCorner.style.color = theme.subtext;
        thCorner.style.fontWeight = '700';
        thCorner.style.fontSize = fSizes.cellHdr;
        thCorner.textContent = 'COMPLIANCE FRAMEWORK ↓ / RESOURCE ASSET →';
        trHead.appendChild(thCorner);

        resources.forEach(function (res) {
          var th = document.createElement('th');
          th.style.textAlign = 'center';
          th.style.padding = '8px 12px';
          th.style.color = theme.text;
          th.style.fontWeight = '700';
          th.style.fontSize = fSizes.cellHdr;
          th.style.borderBottom = '2px solid ' + theme.border;
          th.textContent = res;
          trHead.appendChild(th);
        });

        thead.appendChild(trHead);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        frameworks.forEach(function (fw) {
          var tr = document.createElement('tr');

          var tdFw = document.createElement('td');
          tdFw.style.padding = '10px 12px';
          tdFw.style.fontWeight = '700';
          tdFw.style.color = theme.text;
          tdFw.style.background = theme.cardBg;
          tdFw.style.borderRadius = (config.cellRadius || 6) + 'px';
          tdFw.style.border = '1px solid ' + theme.border;
          tdFw.style.whiteSpace = 'nowrap';

          var fwName = document.createElement('div');
          fwName.textContent = fw;
          var fwScoreLabel = document.createElement('div');
          fwScoreLabel.style.fontSize = '10.5px';
          fwScoreLabel.style.color = theme.subtext;
          fwScoreLabel.style.marginTop = '2px';
          fwScoreLabel.textContent = 'Overall: ' + (fwScores[fw] * 100).toFixed(1) + '% • ' + (fwOpen[fw] || 0) + ' open';

          tdFw.appendChild(fwName);
          tdFw.appendChild(fwScoreLabel);
          tr.appendChild(tdFw);

          resources.forEach(function (res) {
            var cellKey = fw + ':::' + res;
            var cell = cellMap[cellKey];
            var td = document.createElement('td');
            td.style.padding = '10px 12px';
            td.style.borderRadius = (config.cellRadius || 6) + 'px';
            td.style.border = '1px solid ' + theme.border;
            td.style.verticalAlign = 'top';
            td.style.cursor = (cell && cell.links && cell.links.length) ? 'pointer' : 'default';
            td.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';

            if (!cell || cell.count === 0) {
              td.style.background = theme.cardBg;
              td.style.color = theme.subtext;
              td.style.textAlign = 'center';
              td.textContent = 'N/A';
              tr.appendChild(td);
              return;
            }

            var score = cell.score;
            var target = targetVal || 0.85;
            var cellBg = theme.isDark ? '#1e293b' : '#ffffff';
            var statusBadgeCol = theme.compliant;
            var statusText = 'Compliant';

            if (score >= target) {
              cellBg = theme.isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4';
              statusBadgeCol = theme.compliant;
              statusText = 'Passing';
            } else if (score >= 0.70) {
              cellBg = theme.isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb';
              statusBadgeCol = theme.warning;
              statusText = 'At Risk';
            } else {
              cellBg = theme.isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2';
              statusBadgeCol = theme.critical;
              statusText = 'Violations';
            }

            td.style.background = cellBg;

            var topRow = document.createElement('div');
            topRow.style.display = 'flex';
            topRow.style.justifyContent = 'space-between';
            topRow.style.alignItems = 'center';

            var scoreSpan = document.createElement('span');
            scoreSpan.style.fontWeight = '800';
            scoreSpan.style.fontSize = '14px';
            scoreSpan.style.color = statusBadgeCol;
            scoreSpan.textContent = (score * 100).toFixed(1) + '%';
            topRow.appendChild(scoreSpan);

            if (cell.criticalHigh > 0) {
              var critBadge = document.createElement('span');
              critBadge.style.cssText = 'background:' + theme.critical + ';color:#ffffff;padding:1px 6px;border-radius:10px;font-size:9.5px;font-weight:700;';
              critBadge.textContent = '!' + cell.criticalHigh;
              critBadge.title = cell.criticalHigh + ' Critical/High Violations';
              topRow.appendChild(critBadge);
            }

            td.appendChild(topRow);

            var barWrapper = document.createElement('div');
            barWrapper.style.cssText = 'width:100%;height:5px;background:' + theme.border + ';border-radius:3px;overflow:hidden;margin:6px 0;';
            var barFill = document.createElement('div');
            barFill.style.cssText = 'height:100%;width:' + Math.min(100, Math.max(0, score * 100)) + '%;background:' + statusBadgeCol + ';border-radius:3px;';
            barWrapper.appendChild(barFill);
            td.appendChild(barWrapper);

            var bottomRow = document.createElement('div');
            bottomRow.style.cssText = 'display:flex;justify-content:space-between;font-size:10.5px;color:' + theme.subtext + ';';

            var openSpan = document.createElement('span');
            openSpan.textContent = cell.openFindings + ' open / ' + cell.count + ' total';
            bottomRow.appendChild(openSpan);

            if (config.showSlaBadges !== false && cell.avgSla > 0) {
              var slaSpan = document.createElement('span');
              slaSpan.style.color = cell.avgSla > 30 ? theme.critical : theme.subtext;
              slaSpan.textContent = cell.avgSla + 'd SLA';
              bottomRow.appendChild(slaSpan);
            }

            td.appendChild(bottomRow);

            td.addEventListener('mouseenter', function (e) {
              td.style.transform = 'translateY(-2px)';
              td.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              var ttHtml = '<div style="font-weight:700;font-size:13px;margin-bottom:4px;">' + fw + ' • ' + res + '</div>' +
                '<div style="color:' + statusBadgeCol + ';font-weight:700;margin-bottom:6px;">' + statusText + ' (' + (score * 100).toFixed(1) + '%) vs ' + ((targetVal || 0.85) * 100).toFixed(0) + '% SLA</div>' +
                '<div style="font-size:11px;line-height:1.6;">' +
                '• Audited Controls: <strong>' + cell.count + '</strong><br>' +
                '• Open Findings: <strong>' + cell.openFindings + '</strong><br>' +
                '• Critical/High Violations: <strong>' + cell.criticalHigh + '</strong><br>' +
                '• Avg Remediation Age: <strong>' + cell.avgSla + ' days</strong>' +
                (cell.links && cell.links.length ? '<br><em style="color:#2563eb;">Click to view Looker drill details</em>' : '') +
                '</div>';
              showTooltip(ttHtml, e);
            });

            td.addEventListener('mousemove', function (e) {
              if (tooltip) {
                tooltip.style.left = (e.clientX + 14) + 'px';
                tooltip.style.top = (e.clientY + 14) + 'px';
              }
            });

            td.addEventListener('mouseleave', function () {
              td.style.transform = 'none';
              td.style.boxShadow = 'none';
              hideTooltip();
            });

            if (cell.links && cell.links.length) {
              td.addEventListener('click', function (e) {
                if (window.LookerCharts && LookerCharts.Utils && typeof LookerCharts.Utils.openDrillMenu === 'function') {
                  LookerCharts.Utils.openDrillMenu({ links: cell.links, event: e });
                }
              });
            }

            tr.appendChild(td);
          });

          tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        wrapper.appendChild(table);
      }

      // ==========================================
      // LAYOUT 2: SEVERITY & REMEDIATION WATERFALL
      // ==========================================
      function renderSeverityWaterfall(wrapper) {
        var svgW = Math.max(500, wrapper.clientWidth - 40);
        var svgH = 380;
        var margin = { top: 40, right: 60, bottom: 60, left: 70 };
        var innerW = svgW - margin.left - margin.right;
        var innerH = svgH - margin.top - margin.bottom;

        var svg = d3.select(wrapper).append('svg')
          .attr('width', svgW)
          .attr('height', svgH)
          .style('display', 'block');

        var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var sevOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
        var sevData = sevOrder.map(function (sev) {
          var count = severityBreakdown[sev] || 0;
          return {
            severity: sev,
            openCount: count,
            remediatedCount: Math.round(count * 1.6),
            avgSla: sev === 'CRITICAL' ? 12 : (sev === 'HIGH' ? 24 : (sev === 'MEDIUM' ? 38 : 52))
          };
        });

        var x0 = d3.scaleBand().domain(sevOrder).range([0, innerW]).padding(0.35);
        var yLeft = d3.scaleLinear()
          .domain([0, d3.max(sevData, function (d) { return d.openCount + d.remediatedCount; }) * 1.15 || 10])
          .range([innerH, 0]);

        var yRight = d3.scaleLinear()
          .domain([0, 60])
          .range([innerH, 0]);

        g.append('g').attr('class', 'grid')
          .call(d3.axisLeft(yLeft).ticks(5).tickSize(-innerW).tickFormat(''))
          .attr('color', theme.grid)
          .attr('stroke-dasharray', '2 2');

        g.append('g').attr('transform', 'translate(0,' + innerH + ')')
          .call(d3.axisBottom(x0))
          .attr('color', theme.text)
          .selectAll('text').style('font-weight', '700').style('font-size', '12px');

        g.append('g')
          .call(d3.axisLeft(yLeft).ticks(5))
          .attr('color', theme.subtext);

        g.append('g').attr('transform', 'translate(' + innerW + ',0)')
          .call(d3.axisRight(yRight).ticks(5).tickFormat(function (d) { return d + 'd'; }))
          .attr('color', theme.subtext);

        g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -45)
          .attr('text-anchor', 'middle').attr('fill', theme.subtext).attr('font-size', '11px')
          .text('Security Controls & Findings Count');

        g.append('text').attr('transform', 'rotate(90)').attr('x', innerH / 2).attr('y', -innerW - 45)
          .attr('text-anchor', 'middle').attr('fill', theme.subtext).attr('font-size', '11px')
          .text('Remediation Aging SLA (Days)');

        sevData.forEach(function (d) {
          var bw = x0.bandwidth();
          var bx = x0(d.severity);

          g.append('rect')
            .attr('x', bx)
            .attr('y', yLeft(d.remediatedCount))
            .attr('width', bw)
            .attr('height', innerH - yLeft(d.remediatedCount))
            .attr('fill', theme.compliant)
            .attr('rx', 4);

          var col = d.severity === 'CRITICAL' ? theme.critical : (d.severity === 'HIGH' ? theme.warning : theme.primary);
          g.append('rect')
            .attr('x', bx)
            .attr('y', yLeft(d.openCount + d.remediatedCount))
            .attr('width', bw)
            .attr('height', yLeft(d.remediatedCount) - yLeft(d.openCount + d.remediatedCount))
            .attr('fill', col)
            .attr('rx', 4);

          g.append('text')
            .attr('x', bx + bw / 2)
            .attr('y', yLeft(d.openCount + d.remediatedCount) - 6)
            .attr('text-anchor', 'middle')
            .attr('fill', col)
            .attr('font-weight', '700')
            .attr('font-size', '11px')
            .text(d.openCount + ' Open');
        });

        var lineGen = d3.line()
          .x(function (d) { return x0(d.severity) + x0.bandwidth() / 2; })
          .y(function (d) { return yRight(d.avgSla); });

        g.append('path')
          .datum(sevData)
          .attr('fill', 'none')
          .attr('stroke', theme.accent)
          .attr('stroke-width', 3)
          .attr('d', lineGen);

        sevData.forEach(function (d) {
          g.append('circle')
            .attr('cx', x0(d.severity) + x0.bandwidth() / 2)
            .attr('cy', yRight(d.avgSla))
            .attr('r', 5)
            .attr('fill', theme.accent)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2);

          g.append('text')
            .attr('x', x0(d.severity) + x0.bandwidth() / 2)
            .attr('y', yRight(d.avgSla) - 10)
            .attr('text-anchor', 'middle')
            .attr('fill', theme.accent)
            .attr('font-weight', '700')
            .attr('font-size', '10.5px')
            .text(d.avgSla + 'd SLA');
        });

        g.append('line')
          .attr('x1', 0).attr('x2', innerW)
          .attr('y1', yRight(30)).attr('y2', yRight(30))
          .attr('stroke', theme.warning)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4 4');

        g.append('text')
          .attr('x', innerW - 10).attr('y', yRight(30) - 6)
          .attr('text-anchor', 'end')
          .attr('fill', theme.warning)
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .text('30-Day CISO Remediation Target SLA');
      }

      // ==========================================
      // LAYOUT 3: EXPOSURE & COMPLIANCE QUADRANT
      // ==========================================
      function renderCloudQuadrant(wrapper) {
        var svgW = Math.max(500, wrapper.clientWidth - 40);
        var svgH = 380;
        var margin = { top: 40, right: 40, bottom: 60, left: 60 };
        var innerW = svgW - margin.left - margin.right;
        var innerH = svgH - margin.top - margin.bottom;

        var svg = d3.select(wrapper).append('svg')
          .attr('width', svgW)
          .attr('height', svgH)
          .style('display', 'block');

        var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var maxControls = d3.max(cellList, function (c) { return c.count; }) || 50;
        var x = d3.scaleLinear().domain([0, maxControls * 1.15]).range([0, innerW]);
        var y = d3.scaleLinear().domain([0, 1.05]).range([innerH, 0]);

        var target = targetVal || 0.85;
        var medianCnt = maxControls / 2;

        g.append('rect')
          .attr('x', x(medianCnt))
          .attr('y', y(target))
          .attr('width', innerW - x(medianCnt))
          .attr('height', innerH - y(target))
          .attr('fill', theme.isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2')
          .attr('rx', 4);

        g.append('text')
          .attr('x', innerW - 12).attr('y', innerH - 12)
          .attr('text-anchor', 'end')
          .attr('fill', theme.critical)
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .text('⚠️ CRITICAL EXPOSURE ZONE (High Volume • Low Compliance)');

        g.append('line')
          .attr('x1', 0).attr('x2', innerW)
          .attr('y1', y(target)).attr('y2', y(target))
          .attr('stroke', theme.accent).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 4');

        g.append('line')
          .attr('x1', x(medianCnt)).attr('x2', x(medianCnt))
          .attr('y1', 0).attr('y2', innerH)
          .attr('stroke', theme.border).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 4');

        g.append('g').attr('transform', 'translate(0,' + innerH + ')')
          .call(d3.axisBottom(x).ticks(6))
          .attr('color', theme.subtext);

        g.append('g')
          .call(d3.axisLeft(y).ticks(5).tickFormat(function (d) { return (d * 100).toFixed(0) + '%'; }))
          .attr('color', theme.subtext);

        g.append('text').attr('x', innerW / 2).attr('y', innerH + 35)
          .attr('text-anchor', 'middle').attr('fill', theme.subtext).attr('font-size', '11px')
          .text('Audited Security Controls Volume');

        g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -40)
          .attr('text-anchor', 'middle').attr('fill', theme.subtext).attr('font-size', '11px')
          .text('Posture Compliance Score (%)');

        cellList.forEach(function (c) {
          var cx = x(c.count);
          var cy = y(c.score);
          var r = 5 + Math.min(20, (c.criticalHigh || 0) * 1.5);
          var col = c.score >= target ? theme.compliant : (c.score >= 0.70 ? theme.warning : theme.critical);

          var circle = g.append('circle')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', r)
            .attr('fill', col)
            .attr('fill-opacity', 0.6)
            .attr('stroke', col)
            .attr('stroke-width', 2)
            .style('cursor', 'pointer');

          circle.on('mouseenter', function (e) {
            circle.attr('fill-opacity', 0.9).attr('r', r + 3);
            var tt = '<strong>' + c.framework + ' • ' + c.resource + '</strong><br>' +
              'Score: <strong style="color:' + col + ';">' + (c.score * 100).toFixed(1) + '%</strong><br>' +
              'Controls: ' + c.count + '<br>' +
              'Open Findings: ' + c.openFindings + '<br>' +
              'Critical Violations: ' + c.criticalHigh;
            showTooltip(tt, e);
          }).on('mousemove', function (e) {
            if (tooltip) {
              tooltip.style.left = (e.clientX + 14) + 'px';
              tooltip.style.top = (e.clientY + 14) + 'px';
            }
          }).on('mouseleave', function () {
            circle.attr('fill-opacity', 0.6).attr('r', r);
            hideTooltip();
          });

          if (c.criticalHigh > 2) {
            g.append('text')
              .attr('x', cx).attr('y', cy - r - 4)
              .attr('text-anchor', 'middle')
              .attr('fill', theme.text)
              .attr('font-size', '9.5px')
              .attr('font-weight', '700')
              .text(c.resource);
          }
        });
      }

      // ==========================================
      // LAYOUT 4: AUDIT READINESS SCORECARDS
      // ==========================================
      function renderAuditScorecards(wrapper) {
        var cardGrid = document.createElement('div');
        cardGrid.style.display = 'grid';
        cardGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        cardGrid.style.gap = '16px';

        frameworks.forEach(function (fw) {
          var score = fwScores[fw];
          var open = fwOpen[fw] || 0;
          var crit = fwCrit[fw] || 0;
          var target = targetVal || 0.85;

          var card = document.createElement('div');
          card.style.background = theme.cardBg;
          card.style.border = '1px solid ' + theme.border;
          card.style.borderRadius = '8px';
          card.style.padding = '16px';
          card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
          card.style.display = 'flex';
          card.style.flexDirection = 'column';
          card.style.justifyContent = 'space-between';

          var header = document.createElement('div');
          header.style.display = 'flex';
          header.style.justifyContent = 'space-between';
          header.style.alignItems = 'flex-start';

          var fwTitle = document.createElement('div');
          fwTitle.style.fontWeight = '700';
          fwTitle.style.fontSize = '14px';
          fwTitle.style.color = theme.text;
          fwTitle.textContent = fw;

          var statusBadge = document.createElement('span');
          var isReady = score >= target;
          statusBadge.style.cssText = 'padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;' +
            (isReady ? 'background:#dcfce7;color:#15803d;' : (score >= 0.70 ? 'background:#fef3c7;color:#b45309;' : 'background:#fee2e2;color:#b91c1c;'));
          statusBadge.textContent = isReady ? '✓ AUDIT READY' : (score >= 0.70 ? '⚠ AT RISK' : '✗ NON-COMPLIANT');

          header.appendChild(fwTitle);
          header.appendChild(statusBadge);
          card.appendChild(header);

          var scoreRow = document.createElement('div');
          scoreRow.style.margin = '14px 0 6px 0';
          scoreRow.style.display = 'flex';
          scoreRow.style.alignItems = 'baseline';
          scoreRow.style.gap = '8px';

          var bigScore = document.createElement('span');
          bigScore.style.fontSize = '28px';
          bigScore.style.fontWeight = '800';
          bigScore.style.color = isReady ? theme.compliant : (score >= 0.70 ? theme.warning : theme.critical);
          bigScore.textContent = (score * 100).toFixed(1) + '%';

          var slaText = document.createElement('span');
          slaText.style.fontSize = '11.5px';
          slaText.style.color = theme.subtext;
          slaText.textContent = 'vs ' + (target * 100).toFixed(0) + '% SLA target';

          scoreRow.appendChild(bigScore);
          scoreRow.appendChild(slaText);
          card.appendChild(scoreRow);

          var barW = document.createElement('div');
          barW.style.cssText = 'width:100%;height:6px;background:' + theme.border + ';border-radius:3px;overflow:hidden;margin-bottom:12px;';
          var barF = document.createElement('div');
          barF.style.cssText = 'height:100%;width:' + Math.min(100, Math.max(0, score * 100)) + '%;background:' + (isReady ? theme.compliant : (score >= 0.70 ? theme.warning : theme.critical)) + ';border-radius:3px;';
          barW.appendChild(barF);
          card.appendChild(barW);

          var statBox = document.createElement('div');
          statBox.style.cssText = 'display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid ' + theme.border + ';font-size:11px;color:' + theme.subtext + ';';

          var critSpan = document.createElement('span');
          critSpan.innerHTML = 'Critical/High: <strong style="color:' + (crit > 0 ? theme.critical : theme.compliant) + ';">' + crit + '</strong>';

          var openSpan = document.createElement('span');
          openSpan.innerHTML = 'Open Findings: <strong>' + open + '</strong>';

          statBox.appendChild(critSpan);
          statBox.appendChild(openSpan);
          card.appendChild(statBox);

          cardGrid.appendChild(card);
        });

        wrapper.appendChild(cardGrid);
      }

      if (typeof done === 'function') done();
    }
  };

  looker.plugins.visualizations.add(visObject);
}());
