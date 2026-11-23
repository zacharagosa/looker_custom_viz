/**
 * SecOps Incident Dwell-Time, MTTD vs MTTR Remediation Velocity & SLA Frontier Matrix
 * Looker Custom Visualization
 * Built with D3.js v7
 *
 * Cloud Governance & Security Compliance Suite:
 * - 4 Analytical Layout Paradigms:
 *   1) 4-Quadrant SLA Scatter & Decision Matrix (MTTD vs MTTR, bubble size = alert volume, crosshairs)
 *   2) Tactic Velocity Stacked Dwell Bars (Detection + Remediation duration waterfall)
 *   3) SOAR Playbook Automation Frontier vs MTTR Reduction
 *   4) Incident Dwell Severity Cross-Tab Heatmap Grid
 * - Dynamic Field-Role Mapping (Display tab): Entity Dimension, Severity/Sub-Dimension, MTTD, MTTR, Volume
 * - Configurable Reference Targets & SLA Crosshairs: Fixed, Mean, Median, P75, P90, or Target Measure
 * - Sorting, Top-N Bucketing & Null Suppression: MTTR Desc/Asc, MTTD, Total Alerts, Alphabetical
 * - Executive KPI Scorecard HUD: Fleet MTTD, Fleet MTTR, SLA Compliance Rate %, SOAR Automation Rate %
 * - CISO Security Color Palettes: Cortex Cyber Navy, Google Enterprise, Modern Slate, Cyberpunk Midnight, Emerald FinOps, Sunset Alert
 * - Debounced ResizeObserver (<4px guard), proper container bounds, Looker drill-down menu support
 */

(function () {
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
    cortex_navy: {
      name: 'Palo Alto Cortex Cyber Navy',
      colors: ['#00c9ff', '#0064d2', '#22d3ee', '#38bdf8', '#818cf8', '#a855f7', '#ec4899', '#f43f5e'],
      bg: '#050d1a',
      text: '#f0f9ff',
      subtext: '#7dd3fc',
      border: '#0e2340',
      hudBg: '#0b1b30',
      cardBg: '#0f2442',
      cardBorder: '#1e3a5f',
      quadOptimal: 'rgba(16, 185, 129, 0.08)',
      quadWarning: 'rgba(245, 158, 11, 0.08)',
      quadBreach: 'rgba(239, 68, 68, 0.12)',
      quadStealth: 'rgba(56, 189, 248, 0.08)'
    },
    google_enterprise: {
      name: 'Google Enterprise',
      colors: ['#1a73e8', '#ea4335', '#fbbc04', '#34a853', '#9334e6', '#00acc1', '#ff7043', '#5c6bc0'],
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      border: '#dadce0',
      hudBg: '#f8f9fa',
      cardBg: '#ffffff',
      cardBorder: '#dadce0',
      quadOptimal: 'rgba(52, 168, 83, 0.06)',
      quadWarning: 'rgba(251, 188, 4, 0.06)',
      quadBreach: 'rgba(234, 67, 53, 0.08)',
      quadStealth: 'rgba(26, 115, 232, 0.06)'
    },
    modern_slate: {
      name: 'Modern Slate',
      colors: ['#0f172a', '#e11d48', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#64748b'],
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: '#e2e8f0',
      hudBg: '#f8fafc',
      cardBg: '#ffffff',
      cardBorder: '#e2e8f0',
      quadOptimal: 'rgba(16, 185, 129, 0.06)',
      quadWarning: 'rgba(245, 158, 11, 0.06)',
      quadBreach: 'rgba(225, 29, 72, 0.08)',
      quadStealth: 'rgba(37, 99, 235, 0.06)'
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Midnight',
      colors: ['#00f5d4', '#d946ef', '#8b5cf6', '#38bdf8', '#f43f5e', '#fbbf24', '#4ade80', '#ec4899'],
      bg: '#0f172a',
      text: '#f8fafc',
      subtext: '#94a3b8',
      border: '#334155',
      hudBg: '#1e293b',
      cardBg: '#1e293b',
      cardBorder: '#334155',
      quadOptimal: 'rgba(74, 222, 128, 0.08)',
      quadWarning: 'rgba(251, 191, 36, 0.08)',
      quadBreach: 'rgba(244, 63, 94, 0.12)',
      quadStealth: 'rgba(56, 189, 248, 0.08)'
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      colors: ['#047857', '#10b981', '#34d399', '#059669', '#0f766e', '#0d9488', '#14b8a6', '#6ee7b7'],
      bg: '#ffffff',
      text: '#064e3b',
      subtext: '#047857',
      border: '#d1fae5',
      hudBg: '#ecfdf5',
      cardBg: '#ffffff',
      cardBorder: '#a7f3d0',
      quadOptimal: 'rgba(16, 185, 129, 0.07)',
      quadWarning: 'rgba(245, 158, 11, 0.07)',
      quadBreach: 'rgba(239, 68, 68, 0.08)',
      quadStealth: 'rgba(13, 148, 136, 0.07)'
    },
    sunset_alert: {
      name: 'Sunset Alert',
      colors: ['#c2410c', '#ea580c', '#fb923c', '#e11d48', '#db2777', '#f59e0b', '#d97706', '#b45309'],
      bg: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      border: '#fed7aa',
      hudBg: '#fff7ed',
      cardBg: '#ffffff',
      cardBorder: '#ffedd5',
      quadOptimal: 'rgba(34, 197, 94, 0.06)',
      quadWarning: 'rgba(249, 115, 22, 0.06)',
      quadBreach: 'rgba(225, 29, 72, 0.08)',
      quadStealth: 'rgba(217, 119, 6, 0.06)'
    }
  };

  var SEVERITY_COLORS = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#3b82f6',
    INFORMATIONAL: '#64748b'
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
        if (list[i].name === trimmed || list[i].label === trimmed) {
          return list[i];
        }
      }
    }
    if (defaultIdx >= 0 && defaultIdx < list.length) {
      return list[defaultIdx];
    }
    return list[0];
  }

  function formatNumber(val, formatType, lookerRendered) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    if (formatType === 'auto' && lookerRendered) return lookerRendered;
    var abs = Math.abs(val);
    var sign = val < 0 ? '-' : '';

    if (formatType === 'minutes') {
      if (abs >= 60) {
        var h = Math.floor(abs / 60);
        var m = Math.round(abs % 60);
        return sign + h + 'h ' + (m > 0 ? m + 'm' : '');
      }
      return sign + abs.toFixed(1) + ' min';
    }
    if (formatType === 'compact_number') {
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + 'B';
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + 'M';
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
      return sign + (abs >= 10 ? Math.round(abs).toLocaleString() : abs.toFixed(1));
    }
    if (formatType === 'decimal_1') {
      return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    if (formatType === 'raw') {
      return String(val);
    }
    if (lookerRendered) return lookerRendered;
    return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  function truncateString(str, maxLen) {
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
  }

  var visObject = {
    id: 'secops_incident_dwell_time_matrix',
    label: 'SecOps Incident Dwell-Time & SLA Frontier Matrix',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'Analytical Paradigm Mode',
        display: 'select',
        values: [
          { '4-Quadrant SLA Decision Matrix (MTTD vs MTTR)': 'quadrant_scatter' },
          { 'Tactic Total Dwell Time Stacked Bars': 'dwell_waterfall' },
          { 'SOAR Automation Frontier vs MTTR': 'automation_frontier' },
          { 'Incident Dwell Severity Heatmap Grid': 'severity_heatmap' }
        ],
        default: 'quadrant_scatter',
        section: 'Display',
        order: 1
      },
      entityDimOverride: {
        type: 'string',
        label: 'Primary Dimension (e.g. MITRE Tactic)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 2
      },
      severityDimOverride: {
        type: 'string',
        label: 'Severity / Sub-Category Dimension',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 3
      },
      mttdMeasureOverride: {
        type: 'string',
        label: 'MTTD Measure (Detection Minutes)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 4
      },
      mttrMeasureOverride: {
        type: 'string',
        label: 'MTTR Measure (Remediation Minutes)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 5
      },
      volumeMeasureOverride: {
        type: 'string',
        label: 'Volume Measure (Alerts / Incidents)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 6
      },
      targetMeasureOverride: {
        type: 'string',
        label: 'Benchmark / SLA Measure Override',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 7
      },
      targetMode: {
        type: 'string',
        label: 'SLA Benchmark Target Mode',
        display: 'select',
        values: [
          { 'Fixed SLA Target (Config Values)': 'fixed' },
          { 'Dataset Mean Duration': 'dataset_mean' },
          { 'Dataset Median Duration': 'dataset_median' },
          { 'Top Percentile P75 Target': 'percentile_p75' },
          { 'Top Percentile P90 Target': 'percentile_p90' },
          { 'Target Measure Column': 'measure_column' }
        ],
        default: 'fixed',
        section: 'Display',
        order: 8
      },
      mttdSlaTarget: {
        type: 'number',
        label: 'CISO MTTD Target SLA (Minutes)',
        default: 8.0,
        section: 'Display',
        order: 9
      },
      mttrSlaTarget: {
        type: 'number',
        label: 'CISO MTTR Target SLA (Minutes)',
        default: 75.0,
        section: 'Display',
        order: 10
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Reference Line Label',
        default: 'CISO SLA Target',
        section: 'Display',
        order: 11
      },
      anomalyThresholdMinutes: {
        type: 'number',
        label: 'Critical Dwell Breach Threshold (Minutes)',
        default: 90.0,
        section: 'Display',
        order: 12
      },
      sortBy: {
        type: 'string',
        label: 'Sort Order',
        display: 'select',
        values: [
          { 'Remediation Time (MTTR Descending)': 'mttr_desc' },
          { 'Detection Time (MTTD Descending)': 'mttd_desc' },
          { 'Total Alert Volume (Metric Descending)': 'alerts_desc' },
          { 'Tactic / Category Name (Alphabetical A-Z)': 'name_asc' }
        ],
        default: 'mttr_desc',
        section: 'Display',
        order: 13
      },
      topNLimit: {
        type: 'number',
        label: 'Top-N Categories Limit (0 = All)',
        default: 0,
        section: 'Display',
        order: 14
      },
      enableOtherRollup: {
        type: 'boolean',
        label: 'Group Remaining Categories into "Other"',
        default: true,
        section: 'Display',
        order: 15
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Suppress Zero / Null Data Points',
        default: true,
        section: 'Display',
        order: 16
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
        order: 17
      },
      showValueLabels: {
        type: 'string',
        label: 'Value Labels Density',
        display: 'select',
        values: [
          { 'Show All Labels': 'all' },
          { 'SLA Breaches / Outliers Only': 'peaks_only' },
          { 'Hidden': 'hidden' }
        ],
        default: 'all',
        section: 'Display',
        order: 18
      },
      customTitleOverride: {
        type: 'string',
        label: 'Custom Scorecard Title Override',
        default: '',
        section: 'Display',
        order: 19
      },
      customSubtitleOverride: {
        type: 'string',
        label: 'Custom Scorecard Subtitle Override',
        default: '',
        section: 'Display',
        order: 20
      },
      showLegend: {
        type: 'boolean',
        label: 'Show Color & Severity Legend',
        default: true,
        section: 'Display',
        order: 21
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Interactive Search / Filter Bar',
        default: true,
        section: 'Display',
        order: 22
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorPalette: {
        type: 'string',
        label: 'Brand Palette Preset',
        display: 'select',
        values: [
          { 'Palo Alto Cortex Cyber Navy': 'cortex_navy' },
          { 'Google Enterprise': 'google_enterprise' },
          { 'Modern Slate': 'modern_slate' },
          { 'Cyberpunk Midnight': 'cyberpunk_dark' },
          { 'Emerald FinOps': 'emerald_finops' },
          { 'Sunset Alert': 'sunset_alert' },
          { 'Custom Hex Override': 'custom_override' }
        ],
        default: 'cortex_navy',
        section: 'Style',
        order: 1
      },
      customPrimaryHex: {
        type: 'string',
        label: 'Custom Primary Accent Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 2
      },
      customPositiveHex: {
        type: 'string',
        label: 'Custom SLA Success Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 3
      },
      customNegativeHex: {
        type: 'string',
        label: 'Custom SLA Breach Hex',
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
          { 'Lower is Better (Incident Dwell, MTTR, MTTD)': 'lower_is_better' },
          { 'Higher is Better (Automation Rate, SLA Compliance)': 'higher_is_better' }
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
          { 'Decimal 1dp (e.g. 74.2)': 'decimal_1' },
          { 'Minutes Duration (e.g. 1h 14m)': 'minutes' },
          { 'Compact Number (e.g. 1.2M, 450K)': 'compact_number' },
          { 'Raw Unformatted': 'raw' }
        ],
        default: 'decimal_1',
        section: 'Style',
        order: 7
      }
    },

    // ------------------------------------------------------------------
    // Dynamic Field-Role Dropdowns via Looker's registerOptions
    // ------------------------------------------------------------------
    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        entityDimOverride: { role: 'dimension', defaultIdx: 0 },
        severityDimOverride: { role: 'dimension', defaultIdx: 1 },
        mttdMeasureOverride: { role: 'measure', defaultIdx: 2 },
        mttrMeasureOverride: { role: 'measure', defaultIdx: 3 },
        volumeMeasureOverride: { role: 'measure', defaultIdx: 4 },
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
      element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

      var root = document.createElement('div');
      root.className = 'secops-dwell-root';
      root.style.width = '100%';
      root.style.height = '100%';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      root.style.overflow = 'hidden';
      root.style.boxSizing = 'border-box';
      element.appendChild(root);

      var tooltip = document.createElement('div');
      tooltip.className = 'secops-dwell-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.display = 'none';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.zIndex = '9999';
      tooltip.style.padding = '8px 12px';
      tooltip.style.borderRadius = '6px';
      tooltip.style.fontSize = '11px';
      tooltip.style.lineHeight = '1.4';
      tooltip.style.boxShadow = '0 6px 18px rgba(0,0,0,0.2)';
      document.body.appendChild(tooltip);
      element._secopsTooltip = tooltip;
    },

    _setupResizeObserver: function (el) {
      var self = this;
      if (typeof ResizeObserver === 'undefined') return;
      this._resizeObserver = new ResizeObserver(function (entries) {
        if (!entries || !entries.length) return;
        var entry = entries[0];
        var curW = (entry.contentRect && entry.contentRect.width) || el.clientWidth || 0;
        var curH = (entry.contentRect && entry.contentRect.height) || el.clientHeight || 0;
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
      });
      this._resizeObserver.observe(el);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this._registerDynamicFieldOptions(queryResponse);
      if (this.clearErrors) try { this.clearErrors(); } catch (e) {}

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
      var root = element.querySelector('.secops-dwell-root');
      var tooltip = element._secopsTooltip;
      if (!root) {
        if (done) done();
        return;
      }
      root.innerHTML = '';

      if (!data || data.length === 0) {
        if (this.addError) {
          this.addError({
            title: 'No Data',
            message: 'The query returned no results to display.'
          });
        }
        if (done) done();
        return;
      }

      var fields = queryResponse.fields;
      var dimensions = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
      var measures = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);

      if (dimensions.length === 0 || measures.length === 0) {
        if (this.addError) {
          this.addError({
            title: 'Fields Required',
            message: 'SecOps Dwell-Time Matrix requires at least 1 Dimension (Threat / Tactic) and 2 Measures (MTTD and MTTR).'
          });
        }
        if (done) done();
        return;
      }

      // --- 1. FIELD RESOLUTION ---
      var entityDim = resolveField(dimensions, config.entityDimOverride, 0);
      var severityDim = dimensions.length > 1 ? resolveField(dimensions, config.severityDimOverride, 1) : null;
      var mttdMeas = resolveField(measures, config.mttdMeasureOverride, measures.length > 2 ? 2 : 0);
      var mttrMeas = resolveField(measures, config.mttrMeasureOverride, measures.length > 3 ? 3 : 1);
      var volMeas = measures.length > 1 ? resolveField(measures, config.volumeMeasureOverride, 1) : null;
      var targetMeas = config.targetMeasureOverride ? resolveField(measures, config.targetMeasureOverride, -1) : null;

      // --- 2. PALETTE & BRAND COLOR RESOLUTION ---
      var paletteKey = config.colorPalette || 'cortex_navy';
      var theme = PALETTES[paletteKey] ? Object.assign({}, PALETTES[paletteKey]) : Object.assign({}, PALETTES.cortex_navy);
      var colorList = theme.colors.slice();

      if (paletteKey === 'custom_override' || config.customPrimaryHex) {
        if (config.customPrimaryHex) colorList[0] = config.customPrimaryHex;
        if (config.customPositiveHex) colorList[1] = config.customPositiveHex;
        if (config.customNegativeHex) colorList[2] = config.customNegativeHex;
      }

      element.style.backgroundColor = theme.bg;
      root.style.backgroundColor = theme.bg;
      root.style.color = theme.text;

      if (tooltip) {
        if (paletteKey === 'cortex_navy' || paletteKey === 'cyberpunk_dark') {
          tooltip.style.background = 'rgba(11, 27, 48, 0.95)';
          tooltip.style.color = '#f0f9ff';
          tooltip.style.border = '1px solid #1e3a5f';
        } else {
          tooltip.style.background = 'rgba(15, 23, 42, 0.94)';
          tooltip.style.color = '#ffffff';
          tooltip.style.border = '1px solid rgba(255,255,255,0.15)';
        }
      }

      function formatVal(val, lookerRendered) {
        return formatNumber(val, config.valueFormat || 'decimal_1', lookerRendered);
      }

      // --- 3. DATA PARSING & AGGREGATION ---
      var items = [];
      var totalAlerts = 0;
      var sumMttd = 0;
      var sumMttr = 0;
      var mttdArr = [];
      var mttrArr = [];

      data.forEach(function (row) {
        var entityVal = entityDim && row[entityDim.name] ? (row[entityDim.name].rendered || row[entityDim.name].value) : 'Incident';
        var severityVal = severityDim && row[severityDim.name] ? String(row[severityDim.name].rendered || row[severityDim.name].value).toUpperCase() : 'UNKNOWN';
        var mttdVal = mttdMeas && row[mttdMeas.name] ? Number(row[mttdMeas.name].value) || 0 : 0;
        var mttrVal = mttrMeas && row[mttrMeas.name] ? Number(row[mttrMeas.name].value) || 0 : 0;
        var volVal = volMeas && row[volMeas.name] ? Number(row[volMeas.name].value) || 0 : 1;
        var autoRate = row['cortex_security_incidents.automation_rate'] ? Number(row['cortex_security_incidents.automation_rate'].value) || 0 : (volVal > 0 ? 0.65 : 0);

        if (config.suppressZeroNull && (mttdVal === 0 && mttrVal === 0)) return;

        var drillLinks = (row[mttdMeas.name] && row[mttdMeas.name].links) ||
          (row[mttrMeas.name] && row[mttrMeas.name].links) ||
          (entityDim && row[entityDim.name] && row[entityDim.name].links) || [];

        var item = {
          name: String(entityVal || 'Unknown'),
          severity: severityVal,
          mttd: mttdVal,
          mttr: mttrVal,
          totalDwell: mttdVal + mttrVal,
          volume: volVal,
          automationRate: autoRate,
          drillLinks: drillLinks,
          row: row
        };

        items.push(item);
        totalAlerts += volVal;
        sumMttd += mttdVal * volVal;
        sumMttr += mttrVal * volVal;
        mttdArr.push(mttdVal);
        mttrArr.push(mttrVal);
      });

      if (items.length === 0) {
        if (this.addError) {
          this.addError({
            title: 'No Valid Incidents',
            message: 'All returned items evaluated to zero or null.'
          });
        }
        if (done) done();
        return;
      }

      var fleetMttd = totalAlerts > 0 ? (sumMttd / totalAlerts) : (d3.mean(mttdArr) || 0);
      var fleetMttr = totalAlerts > 0 ? (sumMttr / totalAlerts) : (d3.mean(mttrArr) || 0);

      // --- 4. TARGET SLA RESOLUTION ---
      var targetMode = config.targetMode || 'fixed';
      var mttdTarget = Number(config.mttdSlaTarget) || 8.0;
      var mttrTarget = Number(config.mttrSlaTarget) || 75.0;

      if (targetMode === 'dataset_mean') {
        mttdTarget = fleetMttd;
        mttrTarget = fleetMttr;
      } else if (targetMode === 'dataset_median') {
        mttdTarget = d3.median(mttdArr) || 8.0;
        mttrTarget = d3.median(mttrArr) || 75.0;
      } else if (targetMode === 'percentile_p75') {
        mttdTarget = d3.quantile(mttdArr.slice().sort(d3.ascending), 0.75) || 10.0;
        mttrTarget = d3.quantile(mttrArr.slice().sort(d3.ascending), 0.75) || 85.0;
      } else if (targetMode === 'percentile_p90') {
        mttdTarget = d3.quantile(mttdArr.slice().sort(d3.ascending), 0.90) || 12.0;
        mttrTarget = d3.quantile(mttrArr.slice().sort(d3.ascending), 0.90) || 95.0;
      }

      var anomalyThreshold = Number(config.anomalyThresholdMinutes) || 90.0;

      // Assign SLA & Quadrant tags
      var compliantCount = 0;
      items.forEach(function (d) {
        d.mttdBreached = d.mttd > mttdTarget;
        d.mttrBreached = d.mttr > mttrTarget;
        d.slaCompliant = !d.mttdBreached && !d.mttrBreached;
        if (d.slaCompliant) compliantCount++;

        // Quadrant identification:
        // Q1: Fast Detect, Fast Remediate (Optimal Autonomous Zone)
        // Q2: Fast Detect, Slow Remediate (Remediation Drag)
        // Q3: Slow Detect, Slow Remediate (Critical Dwell Breach)
        // Q4: Slow Detect, Fast Remediate (Stealth Intrusion)
        if (!d.mttdBreached && !d.mttrBreached) {
          d.quadrant = 'Q1_OPTIMAL';
          d.quadrantLabel = 'Autonomous Optimal (Within SLA)';
        } else if (!d.mttdBreached && d.mttrBreached) {
          d.quadrant = 'Q2_DRAGGING';
          d.quadrantLabel = 'Triage Lag (Fast Detect, Slow Fix)';
        } else if (d.mttdBreached && d.mttrBreached) {
          d.quadrant = 'Q3_CRITICAL';
          d.quadrantLabel = 'Critical Dwell Breach (Dual Lag)';
        } else {
          d.quadrant = 'Q4_STEALTH';
          d.quadrantLabel = 'Stealth Intrusion (Slow Detect, Fast Fix)';
        }
      });

      var slaCompliancePct = (compliantCount / items.length) * 100;
      var avgAutomationRate = d3.mean(items, function (d) { return d.automationRate; }) || 0.65;

      // Sorting
      var sortBy = config.sortBy || 'mttr_desc';
      if (sortBy === 'mttr_desc') {
        items.sort(function (a, b) { return b.mttr - a.mttr; });
      } else if (sortBy === 'mttd_desc') {
        items.sort(function (a, b) { return b.mttd - a.mttd; });
      } else if (sortBy === 'alerts_desc') {
        items.sort(function (a, b) { return b.volume - a.volume; });
      } else if (sortBy === 'name_asc') {
        items.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }

      // Top-N Filter
      var topN = Number(config.topNLimit) || 0;
      if (topN > 0 && items.length > topN) {
        items = items.slice(0, topN);
      }

      // --- 5. EXECUTIVE SCORECARD HUD ---
      var hudMode = config.hudMode || 'scorecard';
      var fontScale = config.fontScale || 'standard';
      var fontScaleMap = {
        compact: { title: '13px', subtitle: '11px', statNum: '13px', statLbl: '9px', label: '10px' },
        standard: { title: '15px', subtitle: '12px', statNum: '15px', statLbl: '10px', label: '11px' },
        large: { title: '18px', subtitle: '13px', statNum: '18px', statLbl: '11px', label: '12px' }
      };
      var fSizes = fontScaleMap[fontScale] || fontScaleMap.standard;

      if (hudMode !== 'hidden') {
        var header = document.createElement('div');
        header.className = 'secops-header-hud';
        header.style.display = 'flex';
        header.style.flexWrap = 'wrap';
        header.style.alignItems = 'center';
        header.style.justifyContent = 'space-between';
        header.style.gap = '12px';
        header.style.padding = hudMode === 'compact_strip' ? '6px 14px' : '10px 16px';
        header.style.backgroundColor = hudMode === 'compact_strip' ? theme.hudBg : (paletteKey === 'cortex_navy' || paletteKey === 'cyberpunk_dark' ? '#0b1b30' : '#f8fafc');
        header.style.borderBottom = '1px solid ' + theme.border;
        header.style.flexShrink = '0';

        var titleBox = document.createElement('div');
        var mainTitle = document.createElement('div');
        mainTitle.style.fontSize = fSizes.title;
        mainTitle.style.fontWeight = '700';
        mainTitle.style.letterSpacing = '-0.02em';
        mainTitle.textContent = config.customTitleOverride || 'SecOps Incident Dwell-Time & SLA Remediation Frontier';

        var subtitle = document.createElement('div');
        subtitle.style.fontSize = fSizes.subtitle;
        subtitle.style.color = theme.subtext;
        subtitle.style.marginTop = '2px';
        subtitle.textContent = config.customSubtitleOverride || (items.length + ' Incident Categories • ' + formatNumber(totalAlerts, 'compact_number', null) + ' Alerts • Target MTTD ' + mttdTarget.toFixed(1) + 'm / MTTR ' + mttrTarget.toFixed(1) + 'm');
        titleBox.appendChild(mainTitle);
        titleBox.appendChild(subtitle);
        header.appendChild(titleBox);

        var statsBox = document.createElement('div');
        statsBox.style.display = 'flex';
        statsBox.style.gap = '10px';
        statsBox.style.flexWrap = 'wrap';

        function createStatCard(label, val, alertStatus) {
          var card = document.createElement('div');
          card.style.background = theme.cardBg;
          card.style.border = '1px solid ' + theme.cardBorder;
          card.style.borderRadius = '6px';
          card.style.padding = hudMode === 'compact_strip' ? '4px 8px' : '6px 12px';
          card.style.display = 'flex';
          card.style.flexDirection = 'column';

          var lbl = document.createElement('span');
          lbl.style.fontSize = fSizes.statLbl;
          lbl.style.textTransform = 'uppercase';
          lbl.style.letterSpacing = '0.05em';
          lbl.style.color = theme.subtext;
          lbl.textContent = label;

          var v = document.createElement('span');
          v.style.fontSize = fSizes.statNum;
          v.style.fontWeight = '700';
          v.style.color = alertStatus === 'alert' ? '#ef4444' : (alertStatus === 'success' ? '#10b981' : theme.text);
          v.textContent = val;

          card.appendChild(lbl);
          card.appendChild(v);
          return card;
        }

        statsBox.appendChild(createStatCard('Fleet MTTD', fleetMttd.toFixed(1) + 'm', fleetMttd <= mttdTarget ? 'success' : 'alert'));
        statsBox.appendChild(createStatCard('Fleet MTTR', fleetMttr.toFixed(1) + 'm', fleetMttr <= mttrTarget ? 'success' : 'alert'));
        statsBox.appendChild(createStatCard('SLA Compliance', slaCompliancePct.toFixed(0) + '%', slaCompliancePct >= 80 ? 'success' : 'alert'));
        statsBox.appendChild(createStatCard('SOAR Automation', (avgAutomationRate * 100).toFixed(0) + '%', avgAutomationRate >= 0.6 ? 'success' : 'normal'));

        // Search Bar
        if (config.showSearch !== false) {
          var searchWrapper = document.createElement('div');
          searchWrapper.style.display = 'flex';
          searchWrapper.style.alignItems = 'center';
          searchWrapper.style.marginLeft = '4px';

          var searchInput = document.createElement('input');
          searchInput.type = 'text';
          searchInput.placeholder = 'Filter tactics...';
          searchInput.style.padding = '5px 10px';
          searchInput.style.fontSize = '11px';
          searchInput.style.borderRadius = '6px';
          searchInput.style.border = '1px solid ' + theme.border;
          searchInput.style.background = paletteKey === 'cortex_navy' || paletteKey === 'cyberpunk_dark' ? '#0f2442' : '#ffffff';
          searchInput.style.color = theme.text;
          searchInput.style.outline = 'none';
          searchInput.style.width = '120px';

          searchInput.addEventListener('input', function (e) {
            var q = e.target.value.toLowerCase().trim();
            var nodes = root.querySelectorAll('.secops-interactive-node');
            nodes.forEach(function (n) {
              var lbl = n.getAttribute('data-name') || '';
              if (!q || lbl.toLowerCase().indexOf(q) !== -1) {
                n.style.opacity = '1';
                n.style.pointerEvents = 'auto';
              } else {
                n.style.opacity = '0.15';
                n.style.pointerEvents = 'none';
              }
            });
          });
          searchWrapper.appendChild(searchInput);
          statsBox.appendChild(searchWrapper);
        }

        header.appendChild(statsBox);
        root.appendChild(header);
      }

      // --- 6. LEGEND BAR ---
      if (config.showLegend !== false) {
        var legend = document.createElement('div');
        legend.className = 'secops-legend-bar';
        legend.style.display = 'flex';
        legend.style.alignItems = 'center';
        legend.style.gap = '14px';
        legend.style.fontSize = '11px';
        legend.style.color = theme.subtext;
        legend.style.padding = '4px 16px 8px 16px';
        legend.style.flexWrap = 'wrap';
        legend.style.flexShrink = '0';

        var severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
        severities.forEach(function (sev) {
          var itemDiv = document.createElement('div');
          itemDiv.style.display = 'flex';
          itemDiv.style.alignItems = 'center';
          itemDiv.style.gap = '5px';
          var c = SEVERITY_COLORS[sev] || '#64748b';
          itemDiv.innerHTML = '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + c + ';"></span>' +
            '<strong>' + sev + '</strong>';
          legend.appendChild(itemDiv);
        });

        var hasDrills = items.some(function (d) { return d.drillLinks && d.drillLinks.length > 0; });
        if (hasDrills) {
          var drillPill = document.createElement('div');
          drillPill.style.marginLeft = 'auto';
          drillPill.style.fontSize = '10px';
          drillPill.style.fontWeight = '700';
          drillPill.style.color = paletteKey === 'cortex_navy' || paletteKey === 'cyberpunk_dark' ? '#38bdf8' : '#1e3a8a';
          drillPill.style.padding = '2px 8px';
          drillPill.style.borderRadius = '12px';
          drillPill.style.background = paletteKey === 'cortex_navy' || paletteKey === 'cyberpunk_dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 58, 138, 0.08)';
          drillPill.textContent = '🔎 CLICK ANY NODE TO DRILL';
          legend.appendChild(drillPill);
        }

        root.appendChild(legend);
      }

      // --- 7. MAIN CANVAS WRAPPER ---
      var chartWrapper = document.createElement('div');
      chartWrapper.className = 'secops-canvas-wrapper';
      chartWrapper.style.width = '100%';
      chartWrapper.style.flex = '1 1 auto';
      chartWrapper.style.minHeight = '0';
      chartWrapper.style.overflow = 'auto';
      chartWrapper.style.padding = '0 16px 16px 16px';
      chartWrapper.style.boxSizing = 'border-box';
      root.appendChild(chartWrapper);

      var layoutMode = config.layoutMode || 'quadrant_scatter';
      if (layoutMode === 'dwell_waterfall') {
        renderDwellWaterfall(d3, chartWrapper, items, theme, config, tooltip, formatVal, fSizes, mttdTarget, mttrTarget);
      } else if (layoutMode === 'automation_frontier') {
        renderAutomationFrontier(d3, chartWrapper, items, theme, config, tooltip, formatVal, fSizes, mttrTarget);
      } else if (layoutMode === 'severity_heatmap') {
        renderSeverityHeatmap(chartWrapper, items, theme, config, tooltip, formatVal, fSizes, mttrTarget);
      } else {
        renderQuadrantScatter(d3, chartWrapper, items, theme, config, tooltip, formatVal, fSizes, mttdTarget, mttrTarget, anomalyThreshold);
      }

      if (done) done();
    }
  };

  // --------------------------------------------------------------------
  // LAYOUT 1: 4-QUADRANT SLA DECISION MATRIX (MTTD vs MTTR SCATTER)
  // --------------------------------------------------------------------
  function renderQuadrantScatter(d3, container, items, theme, config, tooltip, formatVal, fSizes, mttdTarget, mttrTarget, anomalyThreshold) {
    var width = container.clientWidth || 900;
    var height = container.clientHeight || 450;
    if (height < 280) height = 360;

    var margin = { top: 25, right: 35, bottom: 50, left: 60 };
    var innerW = Math.max(width - margin.left - margin.right, 300);
    var innerH = Math.max(height - margin.top - margin.bottom, 200);

    var svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      .style('display', 'block');

    var g = svg.append('g')
      .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

    // Domains
    var maxMttd = Math.max(d3.max(items, function (d) { return d.mttd; }) * 1.25, mttdTarget * 1.35, 12);
    var maxMttr = Math.max(d3.max(items, function (d) { return d.mttr; }) * 1.2, mttrTarget * 1.3, 110);
    var maxVol = d3.max(items, function (d) { return d.volume; }) || 1000;

    var xScale = d3.scaleLinear().domain([0, maxMttd]).range([0, innerW]);
    var yScale = d3.scaleLinear().domain([0, maxMttr]).range([innerH, 0]);
    var rScale = d3.scaleSqrt().domain([0, maxVol]).range([6, 26]);

    var xSla = xScale(mttdTarget);
    var ySla = yScale(mttrTarget);

    // Shaded Quadrants
    // Q1: Bottom-Left (Optimal Autonomous: MTTD <= Target, MTTR <= Target)
    g.append('rect')
      .attr('x', 0)
      .attr('y', ySla)
      .attr('width', Math.max(xSla, 0))
      .attr('height', Math.max(innerH - ySla, 0))
      .attr('fill', theme.quadOptimal)
      .attr('rx', 4);

    // Q2: Top-Left (Triage Lag: MTTD <= Target, MTTR > Target)
    g.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', Math.max(xSla, 0))
      .attr('height', Math.max(ySla, 0))
      .attr('fill', theme.quadWarning)
      .attr('rx', 4);

    // Q3: Top-Right (Critical Dwell Breach: Dual Lag)
    g.append('rect')
      .attr('x', xSla)
      .attr('y', 0)
      .attr('width', Math.max(innerW - xSla, 0))
      .attr('height', Math.max(ySla, 0))
      .attr('fill', theme.quadBreach)
      .attr('rx', 4);

    // Q4: Bottom-Right (Stealth Intrusion: Slow Detect, Fast Fix)
    g.append('rect')
      .attr('x', xSla)
      .attr('y', ySla)
      .attr('width', Math.max(innerW - xSla, 0))
      .attr('height', Math.max(innerH - ySla, 0))
      .attr('fill', theme.quadStealth)
      .attr('rx', 4);

    // Quadrant Corner Labels
    g.append('text')
      .attr('x', 10)
      .attr('y', innerH - 10)
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('fill', '#10b981')
      .text('✓ OPTIMAL (Within SLA)');

    g.append('text')
      .attr('x', 10)
      .attr('y', 16)
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('fill', '#f59e0b')
      .text('⚠️ REMEDIATION DRAG (Slow Containment)');

    g.append('text')
      .attr('x', innerW - 10)
      .attr('y', 16)
      .attr('text-anchor', 'end')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('fill', '#ef4444')
      .text('🚨 CRITICAL DWELL BREACH (Dual Lag)');

    g.append('text')
      .attr('x', innerW - 10)
      .attr('y', innerH - 10)
      .attr('text-anchor', 'end')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('fill', '#38bdf8')
      .text('🔍 STEALTH INTRUSION (Slow Detection)');

    // Axes Gridlines
    var xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(function (d) { return d + 'm'; });
    var yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return d + 'm'; });

    g.append('g')
      .attr('transform', 'translate(0,' + innerH + ')')
      .call(xAxis)
      .attr('color', theme.subtext)
      .selectAll('text')
      .attr('font-size', fSizes.label)
      .attr('fill', theme.text);

    g.append('g')
      .call(yAxis)
      .attr('color', theme.subtext)
      .selectAll('text')
      .attr('font-size', fSizes.label)
      .attr('fill', theme.text);

    // Axis Labels
    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + 40)
      .attr('text-anchor', 'middle')
      .attr('font-size', fSizes.label)
      .attr('font-weight', '700')
      .attr('fill', theme.text)
      .text('Detection Duration — MTTD (Minutes)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .attr('font-size', fSizes.label)
      .attr('font-weight', '700')
      .attr('fill', theme.text)
      .text('Remediation Duration — MTTR (Minutes)');

    // SLA Crosshairs (Dashed lines)
    g.append('line')
      .attr('x1', xSla)
      .attr('y1', 0)
      .attr('x2', xSla)
      .attr('y2', innerH)
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 4')
      .attr('opacity', 0.85);

    g.append('line')
      .attr('x1', 0)
      .attr('y1', ySla)
      .attr('x2', innerW)
      .attr('y2', ySla)
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 4')
      .attr('opacity', 0.85);

    // SLA Badge at intersection
    var badgeText = (config.referenceLineLabel || 'SLA Target') + ': ' + mttdTarget.toFixed(0) + 'm / ' + mttrTarget.toFixed(0) + 'm';
    var badgeG = g.append('g').attr('transform', 'translate(' + Math.min(xSla + 8, innerW - 130) + ',' + Math.max(ySla - 10, 15) + ')');
    badgeG.append('rect')
      .attr('width', 125)
      .attr('height', 18)
      .attr('rx', 4)
      .attr('fill', theme.cardBg)
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 1);
    badgeG.append('text')
      .attr('x', 62)
      .attr('y', 12)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('font-weight', '700')
      .attr('fill', theme.text)
      .text(badgeText);

    // Nodes (Bubbles)
    var nodes = g.selectAll('.secops-incident-bubble')
      .data(items)
      .enter()
      .append('g')
      .attr('class', 'secops-incident-bubble secops-interactive-node')
      .attr('data-name', function (d) { return d.name; })
      .attr('transform', function (d) {
        return 'translate(' + xScale(d.mttd) + ',' + yScale(d.mttr) + ')';
      })
      .style('cursor', 'pointer');

    nodes.append('circle')
      .attr('r', function (d) { return rScale(d.volume); })
      .attr('fill', function (d) { return SEVERITY_COLORS[d.severity] || theme.colors[0]; })
      .attr('fill-opacity', 0.75)
      .attr('stroke', function (d) { return d.slaCompliant ? '#10b981' : '#ef4444'; })
      .attr('stroke-width', function (d) { return d.slaCompliant ? 1.5 : 2.5; })
      .style('transition', 'transform 0.15s ease, fill-opacity 0.15s ease');

    // Labels
    var showLabels = config.showValueLabels || 'all';
    nodes.each(function (d) {
      var isOutlier = d.mttdBreached || d.mttrBreached || d.mttr >= anomalyThreshold;
      var canShow = (showLabels === 'all') || (showLabels === 'peaks_only' && isOutlier);
      if (canShow) {
        d3.select(this).append('text')
          .attr('x', 0)
          .attr('y', -rScale(d.volume) - 4)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .attr('fill', theme.text)
          .text(truncateString(d.name, 18));
      }
    });

    // Hover & Drill
    nodes.on('mouseenter', function (event, d) {
      d3.select(this).select('circle').attr('fill-opacity', 1).attr('stroke-width', 3.5);
      showTooltip(tooltip, event, d, formatVal, theme);
    })
    .on('mousemove', function (event) {
      moveTooltip(tooltip, event);
    })
    .on('mouseleave', function () {
      d3.select(this).select('circle').attr('fill-opacity', 0.75).attr('stroke-width', function (d) { return d.slaCompliant ? 1.5 : 2.5; });
      hideTooltip(tooltip);
    })
    .on('click', function (event, d) {
      if (d.drillLinks && d.drillLinks.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
        window.LookerCharts.Utils.openDrillMenu({
          links: d.drillLinks,
          event: event
        });
      }
    });
  }

  // --------------------------------------------------------------------
  // LAYOUT 2: TACTIC TOTAL DWELL TIME STACKED WATERFALL BARS
  // --------------------------------------------------------------------
  function renderDwellWaterfall(d3, container, items, theme, config, tooltip, formatVal, fSizes, mttdTarget, mttrTarget) {
    var width = container.clientWidth || 900;
    var rowHeight = 36;
    var margin = { top: 25, right: 40, bottom: 40, left: 160 };
    var innerW = Math.max(width - margin.left - margin.right, 300);
    var innerH = items.length * rowHeight;
    var totalHeight = innerH + margin.top + margin.bottom;

    var svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', totalHeight)
      .attr('viewBox', '0 0 ' + width + ' ' + totalHeight)
      .style('display', 'block');

    var g = svg.append('g')
      .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

    var maxDwell = d3.max(items, function (d) { return d.totalDwell; }) * 1.15 || 120;
    var xScale = d3.scaleLinear().domain([0, maxDwell]).range([0, innerW]);

    // X Axis
    g.append('g')
      .attr('transform', 'translate(0,' + innerH + ')')
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(function (d) { return d + 'm'; }))
      .attr('color', theme.subtext)
      .selectAll('text')
      .attr('fill', theme.text);

    // Target SLA Line
    var totalSlaTarget = mttdTarget + mttrTarget;
    var xTarget = xScale(totalSlaTarget);
    g.append('line')
      .attr('x1', xTarget)
      .attr('y1', 0)
      .attr('x2', xTarget)
      .attr('y2', innerH)
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 4');

    g.append('text')
      .attr('x', xTarget + 4)
      .attr('y', -6)
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('fill', '#ef4444')
      .text('SLA Cap: ' + totalSlaTarget.toFixed(0) + 'm');

    // Rows
    var rows = g.selectAll('.secops-waterfall-row')
      .data(items)
      .enter()
      .append('g')
      .attr('class', 'secops-waterfall-row secops-interactive-node')
      .attr('data-name', function (d) { return d.name; })
      .attr('transform', function (d, i) { return 'translate(0,' + (i * rowHeight) + ')'; })
      .style('cursor', 'pointer');

    // Row Label
    rows.append('text')
      .attr('x', -10)
      .attr('y', rowHeight / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', fSizes.label)
      .attr('font-weight', '600')
      .attr('fill', theme.text)
      .text(function (d) { return truncateString(d.name, 22); });

    // Bar 1: MTTD (Detection)
    rows.append('rect')
      .attr('x', 0)
      .attr('y', 6)
      .attr('width', function (d) { return Math.max(xScale(d.mttd), 2); })
      .attr('height', rowHeight - 12)
      .attr('fill', '#38bdf8')
      .attr('rx', 3);

    // Bar 2: MTTR (Remediation)
    rows.append('rect')
      .attr('x', function (d) { return xScale(d.mttd); })
      .attr('y', 6)
      .attr('width', function (d) { return Math.max(xScale(d.mttr), 2); })
      .attr('height', rowHeight - 12)
      .attr('fill', function (d) { return SEVERITY_COLORS[d.severity] || theme.colors[0]; })
      .attr('rx', 3);

    // Total Dwell Label
    rows.append('text')
      .attr('x', function (d) { return xScale(d.totalDwell) + 8; })
      .attr('y', rowHeight / 2 + 4)
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('fill', function (d) { return d.totalDwell > totalSlaTarget ? '#ef4444' : theme.text; })
      .text(function (d) { return d.totalDwell.toFixed(1) + 'm (' + formatNumber(d.volume, 'compact_number', null) + ' alerts)'; });

    // Hover & Drill
    rows.on('mouseenter', function (event, d) {
      d3.select(this).selectAll('rect').style('filter', 'brightness(1.2)');
      showTooltip(tooltip, event, d, formatVal, theme);
    })
    .on('mousemove', function (event) { moveTooltip(tooltip, event); })
    .on('mouseleave', function () {
      d3.select(this).selectAll('rect').style('filter', 'none');
      hideTooltip(tooltip);
    })
    .on('click', function (event, d) {
      if (d.drillLinks && d.drillLinks.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
        window.LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: event });
      }
    });
  }

  // --------------------------------------------------------------------
  // LAYOUT 3: SOAR PLAYBOOK AUTOMATION FRONTIER vs MTTR
  // --------------------------------------------------------------------
  function renderAutomationFrontier(d3, container, items, theme, config, tooltip, formatVal, fSizes, mttrTarget) {
    var width = container.clientWidth || 900;
    var height = container.clientHeight || 450;
    if (height < 280) height = 360;

    var margin = { top: 25, right: 35, bottom: 50, left: 60 };
    var innerW = Math.max(width - margin.left - margin.right, 300);
    var innerH = Math.max(height - margin.top - margin.bottom, 200);

    var svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      .style('display', 'block');

    var g = svg.append('g')
      .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

    var xScale = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
    var maxMttr = d3.max(items, function (d) { return d.mttr; }) * 1.2 || 120;
    var yScale = d3.scaleLinear().domain([0, maxMttr]).range([innerH, 0]);

    // Axes
    g.append('g')
      .attr('transform', 'translate(0,' + innerH + ')')
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('.0%')))
      .attr('color', theme.subtext)
      .selectAll('text')
      .attr('fill', theme.text);

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return d + 'm'; }))
      .attr('color', theme.subtext)
      .selectAll('text')
      .attr('fill', theme.text);

    // Axis Labels
    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + 40)
      .attr('text-anchor', 'middle')
      .attr('font-size', fSizes.label)
      .attr('font-weight', '700')
      .attr('fill', theme.text)
      .text('SOAR Playbook Automation Rate (%)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .attr('font-size', fSizes.label)
      .attr('font-weight', '700')
      .attr('fill', theme.text)
      .text('Remediation Duration — MTTR (Minutes)');

    // MTTR Target SLA Line
    g.append('line')
      .attr('x1', 0)
      .attr('y1', yScale(mttrTarget))
      .attr('x2', innerW)
      .attr('y2', yScale(mttrTarget))
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 4');

    g.append('text')
      .attr('x', innerW - 10)
      .attr('y', yScale(mttrTarget) - 6)
      .attr('text-anchor', 'end')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('fill', '#ef4444')
      .text('Target MTTR SLA: ' + mttrTarget.toFixed(0) + 'm');

    // Regression Curve / Frontier Line
    var sortedByAuto = items.slice().sort(function (a, b) { return a.automationRate - b.automationRate; });
    var lineGen = d3.line()
      .x(function (d) { return xScale(d.automationRate); })
      .y(function (d) { return yScale(d.mttr); })
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(sortedByAuto)
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '3 3')
      .attr('opacity', 0.6);

    // Nodes
    var nodes = g.selectAll('.secops-auto-node')
      .data(items)
      .enter()
      .append('g')
      .attr('class', 'secops-auto-node secops-interactive-node')
      .attr('data-name', function (d) { return d.name; })
      .attr('transform', function (d) {
        return 'translate(' + xScale(d.automationRate) + ',' + yScale(d.mttr) + ')';
      })
      .style('cursor', 'pointer');

    nodes.append('circle')
      .attr('r', 8)
      .attr('fill', function (d) { return SEVERITY_COLORS[d.severity] || theme.colors[0]; })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);

    nodes.append('text')
      .attr('x', 12)
      .attr('y', 4)
      .attr('font-size', '10px')
      .attr('fill', theme.text)
      .text(function (d) { return truncateString(d.name, 18); });

    nodes.on('mouseenter', function (event, d) {
      d3.select(this).select('circle').attr('r', 12);
      showTooltip(tooltip, event, d, formatVal, theme);
    })
    .on('mousemove', function (event) { moveTooltip(tooltip, event); })
    .on('mouseleave', function () {
      d3.select(this).select('circle').attr('r', 8);
      hideTooltip(tooltip);
    })
    .on('click', function (event, d) {
      if (d.drillLinks && d.drillLinks.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
        window.LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: event });
      }
    });
  }

  // --------------------------------------------------------------------
  // LAYOUT 4: INCIDENT DWELL SEVERITY HEATMAP GRID
  // --------------------------------------------------------------------
  function renderSeverityHeatmap(container, items, theme, config, tooltip, formatVal, fSizes, mttrTarget) {
    var tableWrapper = document.createElement('div');
    tableWrapper.style.width = '100%';
    tableWrapper.style.overflow = 'auto';

    var table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = fSizes.label;

    var thead = document.createElement('thead');
    var trHead = document.createElement('tr');
    trHead.style.borderBottom = '2px solid ' + theme.border;

    var cols = ['Threat Category / Tactic', 'Severity', 'MTTD (Detect)', 'MTTR (Remediate)', 'Total Dwell', 'Total Alerts', 'SOAR Auto %', 'SLA Status'];
    cols.forEach(function (c, idx) {
      var th = document.createElement('th');
      th.style.padding = '8px 12px';
      th.style.textAlign = idx === 0 ? 'left' : 'right';
      th.textContent = c;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    items.forEach(function (d) {
      var tr = document.createElement('tr');
      tr.className = 'secops-interactive-node';
      tr.setAttribute('data-name', d.name);
      tr.style.borderBottom = '1px solid ' + theme.border;
      tr.style.cursor = 'pointer';

      function addCell(txt, isRight, color) {
        var td = document.createElement('td');
        td.style.padding = '8px 12px';
        if (isRight) td.style.textAlign = 'right';
        if (color) td.style.color = color;
        td.textContent = txt;
        tr.appendChild(td);
      }

      addCell(d.name, false, theme.text);
      addCell(d.severity, true, SEVERITY_COLORS[d.severity] || theme.text);
      addCell(d.mttd.toFixed(1) + 'm', true, null);
      addCell(d.mttr.toFixed(1) + 'm', true, d.mttr > mttrTarget ? '#ef4444' : '#10b981');
      addCell(d.totalDwell.toFixed(1) + 'm', true, null);
      addCell(formatNumber(d.volume, 'compact_number', null), true, null);
      addCell((d.automationRate * 100).toFixed(0) + '%', true, null);
      addCell(d.slaCompliant ? '✓ PASS' : '🚨 BREACH', true, d.slaCompliant ? '#10b981' : '#ef4444');

      tr.addEventListener('mouseenter', function (e) {
        tr.style.background = theme.cardBg;
        showTooltip(tooltip, e, d, formatVal, theme);
      });
      tr.addEventListener('mousemove', function (e) { moveTooltip(tooltip, e); });
      tr.addEventListener('mouseleave', function () {
        tr.style.background = 'transparent';
        hideTooltip(tooltip);
      });
      tr.addEventListener('click', function (e) {
        if (d.drillLinks && d.drillLinks.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
          window.LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: e });
        }
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
  }

  // --------------------------------------------------------------------
  // TOOLTIP HELPERS
  // --------------------------------------------------------------------
  function showTooltip(tooltip, event, d, formatVal, theme) {
    if (!tooltip) return;
    var html = '<div style="font-weight:700;font-size:12px;margin-bottom:4px;color:#38bdf8;">' + d.name + '</div>' +
      '<div style="margin-bottom:6px;display:flex;gap:6px;align-items:center;">' +
      '<span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;background:' + (SEVERITY_COLORS[d.severity] || '#64748b') + ';color:#ffffff;">' + d.severity + '</span>' +
      '<span style="font-size:10px;color:' + (d.slaCompliant ? '#10b981' : '#ef4444') + ';font-weight:700;">' + (d.slaCompliant ? '✓ Within SLA' : '🚨 SLA Breached') + '</span>' +
      '</div>' +
      '<div style="font-size:10px;color:#94a3b8;margin-bottom:4px;"><strong>Zone:</strong> ' + d.quadrantLabel + '</div>' +
      '<table style="width:100%;font-size:11px;border-collapse:collapse;margin-top:4px;">' +
      '<tr><td style="color:#94a3b8;padding:2px 8px 2px 0;">MTTD (Detect):</td><td style="font-weight:700;text-align:right;">' + d.mttd.toFixed(1) + ' min</td></tr>' +
      '<tr><td style="color:#94a3b8;padding:2px 8px 2px 0;">MTTR (Remediate):</td><td style="font-weight:700;text-align:right;">' + d.mttr.toFixed(1) + ' min</td></tr>' +
      '<tr><td style="color:#94a3b8;padding:2px 8px 2px 0;">Total Dwell Time:</td><td style="font-weight:700;text-align:right;">' + d.totalDwell.toFixed(1) + ' min</td></tr>' +
      '<tr><td style="color:#94a3b8;padding:2px 8px 2px 0;">Total Alerts:</td><td style="font-weight:700;text-align:right;">' + formatNumber(d.volume, 'compact_number', null) + '</td></tr>' +
      '<tr><td style="color:#94a3b8;padding:2px 8px 2px 0;">SOAR Automation:</td><td style="font-weight:700;text-align:right;">' + (d.automationRate * 100).toFixed(0) + '%</td></tr>' +
      '</table>';

    if (d.drillLinks && d.drillLinks.length > 0) {
      html += '<div style="margin-top:6px;font-size:10px;color:#38bdf8;font-weight:600;">🔎 Click node to drill into incident alerts</div>';
    }

    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    moveTooltip(tooltip, event);
  }

  function moveTooltip(tooltip, event) {
    if (!tooltip) return;
    var x = event.clientX + 14;
    var y = event.clientY + 14;
    if (x + 220 > window.innerWidth) x = event.clientX - 230;
    if (y + 180 > window.innerHeight) y = event.clientY - 190;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }

  function hideTooltip(tooltip) {
    if (!tooltip) return;
    tooltip.style.display = 'none';
  }

  // Register with Looker
  if (typeof looker !== 'undefined' && looker.plugins && looker.plugins.visualizations) {
    looker.plugins.visualizations.add(visObject);
  } else if (typeof window !== 'undefined') {
    window.secops_incident_dwell_time_matrix = visObject;
  }
})();
