/**
 * Clinical Supply Disruption & Critical Shortage Risk Matrix
 * Google Cloud Looker Custom Visualization
 * Built with D3.js v7
 *
 * Implements a comprehensive hospital & health system Med-Surg supply chain risk matrix:
 * 1. shortage_severity_matrix: 2D Category / Disruption Type vs Severity heatmap matrix
 *    (Critical, High, Medium, Low) with cell badges, active disruption counters, and clinically critical emergency badges.
 * 2. risk_horizon_timeline: Active Shortage Duration & Days Active horizontal risk horizon bars
 *    (0-30d, 31-60d, 61-90d, 90d+) with clinical criticality markers, SLA breach markers, and alternative availability badges.
 * 3. clinical_impact_quadrant: 2D Clinical Criticality vs Days Active quadrant matrix
 *    separating "Tier 1 Code Red Shortages", "Substitutable Watchlist", "Operational Inconvenience", and "Routine Resupply".
 * 4. executive_war_room_hud: High-density hospital supply chain emergency command center table
 *    with status pills, clinical impact scores, days active, equivalent alternatives, and one-click drill actions.
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
      critical: '#b91c1c',
      high: '#ea580c',
      medium: '#d97706',
      low: '#059669',
      resolved: '#10b981',
      active: '#dc2626',
      monitoring: '#3b82f6',
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: '#e2e8f0',
      track: '#f8fafc',
      badgeAlternativeBg: '#ecfdf5',
      badgeAlternativeText: '#047857',
      badgeNoAltBg: '#fef2f2',
      badgeNoAltText: '#b91c1c'
    },
    clinical_alert: {
      name: 'Clinical Alert (Emergency Red / Amber / Green)',
      primary: '#991b1b',
      critical: '#7f1d1d',
      high: '#c2410c',
      medium: '#b45309',
      low: '#15803d',
      resolved: '#16a34a',
      active: '#b91c1c',
      monitoring: '#2563eb',
      bg: '#ffffff',
      text: '#111827',
      subtext: '#4b5563',
      border: '#e5e7eb',
      track: '#f9fafb',
      badgeAlternativeBg: '#f0fdf4',
      badgeAlternativeText: '#166534',
      badgeNoAltBg: '#fff1f2',
      badgeNoAltText: '#9f1239'
    },
    google_enterprise: {
      name: 'Google Enterprise',
      primary: '#1a73e8',
      critical: '#d93025',
      high: '#f29900',
      medium: '#f9ab00',
      low: '#188038',
      resolved: '#1e8e3e',
      active: '#ea4335',
      monitoring: '#4285f4',
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      border: '#dadce0',
      track: '#f8f9fa',
      badgeAlternativeBg: '#e6f4ea',
      badgeAlternativeText: '#137333',
      badgeNoAltBg: '#fce8e6',
      badgeNoAltText: '#c5221f'
    },
    modern_slate: {
      name: 'Modern Slate',
      primary: '#0f172a',
      critical: '#e11d48',
      high: '#f97316',
      medium: '#eab308',
      low: '#10b981',
      resolved: '#059669',
      active: '#f43f5e',
      monitoring: '#0ea5e9',
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: '#cbd5e1',
      track: '#f1f5f9',
      badgeAlternativeBg: '#dcfce7',
      badgeAlternativeText: '#15803d',
      badgeNoAltBg: '#ffe4e6',
      badgeNoAltText: '#be123c'
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark',
      primary: '#38bdf8',
      critical: '#f43f5e',
      high: '#fb923c',
      medium: '#facc15',
      low: '#4ade80',
      resolved: '#34d399',
      active: '#fb7185',
      monitoring: '#818cf8',
      bg: '#0f172a',
      text: '#f8fafc',
      subtext: '#94a3b8',
      border: '#334155',
      track: '#1e293b',
      badgeAlternativeBg: '#064e3b',
      badgeAlternativeText: '#6ee7b7',
      badgeNoAltBg: '#881337',
      badgeNoAltText: '#fda4af'
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      primary: '#065f46',
      critical: '#be123c',
      high: '#d97706',
      medium: '#0f766e',
      low: '#047857',
      resolved: '#10b981',
      active: '#e11d48',
      monitoring: '#0284c7',
      bg: '#ffffff',
      text: '#064e3b',
      subtext: '#047857',
      border: '#a7f3d0',
      track: '#f0fdf4',
      badgeAlternativeBg: '#ecfdf5',
      badgeAlternativeText: '#065f46',
      badgeNoAltBg: '#fff1f2',
      badgeNoAltText: '#9f1239'
    },
    sunset_media: {
      name: 'Sunset Media',
      primary: '#c2410c',
      critical: '#991b1b',
      high: '#ea580c',
      medium: '#d97706',
      low: '#059669',
      resolved: '#10b981',
      active: '#dc2626',
      monitoring: '#d97706',
      bg: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      border: '#fed7aa',
      track: '#fff7ed',
      badgeAlternativeBg: '#f0fdf4',
      badgeAlternativeText: '#15803d',
      badgeNoAltBg: '#fff1f2',
      badgeNoAltText: '#991b1b'
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
        if (list[i].name === trimmed || list[i].label === trimmed) {
          return list[i];
        }
      }
    }
    if (defaultIdx >= 0 && defaultIdx < list.length) {
      return list[defaultIdx];
    }
    return null;
  }

  function formatDays(val, formatType) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    var num = Math.round(Number(val));
    if (formatType === 'raw') return String(val);
    if (formatType === 'compact_number') {
      if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + 'M';
      if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
      return String(num);
    }
    return num + 'd';
  }

  function getSeverityColor(sev, palette) {
    var s = String(sev || '').toLowerCase();
    if (s.indexOf('crit') !== -1) return palette.critical;
    if (s.indexOf('high') !== -1) return palette.high;
    if (s.indexOf('med') !== -1) return palette.medium;
    return palette.low;
  }

  function getStatusBadge(status, palette) {
    var st = String(status || '').toLowerCase();
    if (st.indexOf('active') !== -1) {
      return { bg: palette.badgeNoAltBg, text: palette.badgeNoAltText, label: 'Active Shortage' };
    }
    if (st.indexOf('monit') !== -1 || st.indexOf('poten') !== -1) {
      return { bg: '#eff6ff', text: '#1d4ed8', label: 'Monitoring' };
    }
    if (st.indexOf('resolv') !== -1) {
      return { bg: palette.badgeAlternativeBg, text: palette.badgeAlternativeText, label: 'Resolved' };
    }
    return { bg: '#f1f5f9', text: '#475569', label: status || 'Unknown' };
  }

  var visObject = {
    id: 'clinical_supply_disruption_matrix',
    label: 'Clinical Supply Disruption & Shortage Matrix',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strict 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'Clinical Visual Paradigm',
        display: 'select',
        values: [
          { 'Shortage Severity Matrix (Heatmap Grid)': 'shortage_severity_matrix' },
          { 'Risk Horizon Timeline (Days Active Bars)': 'risk_horizon_timeline' },
          { 'Clinical Impact Quadrant (Criticality vs Duration)': 'clinical_impact_quadrant' },
          { 'Executive War Room Command HUD (High-Density Table)': 'executive_war_room_hud' }
        ],
        default: 'shortage_severity_matrix',
        section: 'Display',
        order: 1
      },
      dimCategoryOverride: {
        type: 'string',
        label: 'Product Category Dimension',
        display: 'select',
        values: [{ 'Auto (run query)': '' }],
        default: '',
        section: 'Display',
        order: 2
      },
      dimProductOverride: {
        type: 'string',
        label: 'Product / Item Name Dimension',
        display: 'select',
        values: [{ 'Auto (run query)': '' }],
        default: '',
        section: 'Display',
        order: 3
      },
      dimSeverityOverride: {
        type: 'string',
        label: 'Shortage Severity Dimension',
        display: 'select',
        values: [{ 'Auto (run query)': '' }],
        default: '',
        section: 'Display',
        order: 4
      },
      dimStatusOverride: {
        type: 'string',
        label: 'Disruption Status Dimension',
        display: 'select',
        values: [{ 'Auto (run query)': '' }],
        default: '',
        section: 'Display',
        order: 5
      },
      dimDisruptionTypeOverride: {
        type: 'string',
        label: 'Disruption Root Cause Dimension',
        display: 'select',
        values: [{ 'Auto (run query)': '' }],
        default: '',
        section: 'Display',
        order: 6
      },
      dimAlternativeOverride: {
        type: 'string',
        label: 'Equivalent Alternative Available',
        display: 'select',
        values: [{ 'Auto (run query)': '' }],
        default: '',
        section: 'Display',
        order: 7
      },
      dimCriticalOverride: {
        type: 'string',
        label: 'Clinically Critical Flag',
        display: 'select',
        values: [{ 'Auto (run query)': '' }],
        default: '',
        section: 'Display',
        order: 8
      },
      measureDaysActiveOverride: {
        type: 'string',
        label: 'Days Active / Duration Measure',
        display: 'select',
        values: [{ 'Auto (run query)': '' }],
        default: '',
        section: 'Display',
        order: 9
      },
      measureCountOverride: {
        type: 'string',
        label: 'Incident / Product Count Measure (Optional)',
        display: 'select',
        values: [{ 'Auto (run query)': '' }],
        default: '',
        section: 'Display',
        order: 10
      },
      targetMode: {
        type: 'string',
        label: 'SLA Resolution Target Mode',
        display: 'select',
        values: [
          { 'Fixed Static SLA Target (Days)': 'fixed_value' },
          { 'Measure Column (From Query)': 'measure_column' },
          { 'Dataset Mean Duration': 'dataset_mean' },
          { 'Dataset Median Duration': 'dataset_median' },
          { 'Percentile P75 Target': 'percentile_p75' },
          { 'Percentile P90 Target': 'percentile_p90' },
          { 'None (No Target Line)': 'none' }
        ],
        default: 'fixed_value',
        section: 'Display',
        order: 11
      },
      targetValue: {
        type: 'number',
        label: 'Fixed SLA Target Value (Days)',
        default: 45,
        section: 'Display',
        order: 12
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Custom Reference Line Label',
        default: 'SLA Resolution Target (45d)',
        section: 'Display',
        order: 13
      },
      anomalyThreshold: {
        type: 'number',
        label: 'Breach Alert Threshold (Days Active)',
        default: 75,
        section: 'Display',
        order: 14
      },
      sortBy: {
        type: 'string',
        label: 'Sorting & Ordering',
        display: 'select',
        values: [
          { 'Days Active (Highest to Lowest)': 'days_active_desc' },
          { 'Days Active (Lowest to Highest)': 'days_active_asc' },
          { 'Severity Rank (Critical to Low)': 'severity_desc' },
          { 'Product / Category (Alphabetical)': 'alphabetical' },
          { 'Natural Query Order': 'natural' }
        ],
        default: 'days_active_desc',
        section: 'Display',
        order: 15
      },
      topNLimit: {
        type: 'number',
        label: 'Top-N Entities Limit (0 = All, Max 30)',
        default: 15,
        section: 'Display',
        order: 16
      },
      enableOtherRollup: {
        type: 'boolean',
        label: 'Group Remaining into "Other" Rollup',
        default: false,
        section: 'Display',
        order: 17
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Suppress Zero / Null Duration Rows',
        default: true,
        section: 'Display',
        order: 18
      },
      showCriticalOnly: {
        type: 'boolean',
        label: 'Filter: Clinically Critical Items Only',
        default: false,
        section: 'Display',
        order: 19
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
        order: 20
      },
      showValueLabels: {
        type: 'string',
        label: 'Data Value Callouts',
        display: 'select',
        values: [
          { 'Show All Callouts': 'all' },
          { 'Min/Max Outliers Only': 'peaks_only' },
          { 'Hidden': 'hidden' }
        ],
        default: 'all',
        section: 'Display',
        order: 21
      },
      customTitle: {
        type: 'string',
        label: 'Custom Scorecard Title Override',
        default: '',
        section: 'Display',
        order: 22
      },
      customSubtitle: {
        type: 'string',
        label: 'Custom Scorecard Subtitle Override',
        default: '',
        section: 'Display',
        order: 23
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Product & Root Cause Search Bar',
        default: true,
        section: 'Display',
        order: 24
      },
      showAlternativeBadges: {
        type: 'boolean',
        label: 'Show Equivalent Substitute Badges',
        default: true,
        section: 'Display',
        order: 25
      },

      // ==========================================
      // SECTION 2: STYLE (Strict 2 tabs rule)
      // ==========================================
      colorPalette: {
        type: 'string',
        label: 'Healthcare Color Palette',
        display: 'select',
        values: [
          { 'Wellverse Healthcare (Default Navy/Teal)': 'wellverse_healthcare' },
          { 'Clinical Alert (Emergency Red/Amber/Green)': 'clinical_alert' },
          { 'Google Enterprise': 'google_enterprise' },
          { 'Modern Slate': 'modern_slate' },
          { 'Cyberpunk Dark': 'cyberpunk_dark' },
          { 'Emerald FinOps': 'emerald_finops' },
          { 'Sunset Media': 'sunset_media' },
          { 'Custom Hex Override': 'custom_hex' }
        ],
        default: 'wellverse_healthcare',
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
        label: 'Custom Resolved / Low Severity Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 3
      },
      customNegativeHex: {
        type: 'string',
        label: 'Custom Critical Breach Hex',
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
          { 'Lower is Better (Shorter Disruption Duration)': 'lower_is_better' },
          { 'Higher is Better (Inventory Par Attainment)': 'higher_is_better' }
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
          { 'Compact (High Density Clinical Workstation)': 'compact' },
          { 'Standard (Default)': 'standard' },
          { 'Large (Wallboard Command Center)': 'large' }
        ],
        default: 'standard',
        section: 'Style',
        order: 6
      },
      valueFormat: {
        type: 'string',
        label: 'Duration Value Formatting',
        display: 'select',
        values: [
          { 'Days Duration (e.g. 106d)': 'days' },
          { 'Compact Number (e.g. 106)': 'compact_number' },
          { 'Raw Unformatted': 'raw' }
        ],
        default: 'days',
        section: 'Style',
        order: 7
      }
    },

    create: function (element, config) {
      element.style.boxSizing = 'border-box';
      element.style.margin = '0';
      element.style.padding = '0';
      element.style.overflow = 'hidden';
      element.style.position = 'relative';

      var container = document.createElement('div');
      container.className = 'clinical-matrix-root';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.boxSizing = 'border-box';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.overflow = 'hidden';
      container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      element.appendChild(container);

      // Tooltip
      var tooltip = document.createElement('div');
      tooltip.className = 'clinical-matrix-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.opacity = '0';
      tooltip.style.padding = '10px 14px';
      tooltip.style.borderRadius = '8px';
      tooltip.style.fontSize = '12px';
      tooltip.style.lineHeight = '1.45';
      tooltip.style.zIndex = '99999';
      tooltip.style.transition = 'opacity 0.15s ease-in-out';
      tooltip.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.3)';
      document.body.appendChild(tooltip);
      element._clinicalTooltip = tooltip;

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

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        dimCategoryOverride: { role: 'dimension', defaultIdx: 0 },
        dimProductOverride: { role: 'dimension', defaultIdx: 1 },
        dimSeverityOverride: { role: 'dimension', defaultIdx: 2 },
        dimStatusOverride: { role: 'dimension', defaultIdx: 3 },
        dimDisruptionTypeOverride: { role: 'dimension', defaultIdx: 4 },
        dimAlternativeOverride: { role: 'dimension', defaultIdx: 5 },
        dimCriticalOverride: { role: 'dimension', defaultIdx: 6 },
        measureDaysActiveOverride: { role: 'measure', defaultIdx: 0 },
        measureCountOverride: { role: 'measure', defaultIdx: 1 }
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
        newOptions[key].values = values;
      });

      try {
        self.trigger('registerOptions', newOptions);
      } catch (e) {}
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

      var self = this;
      ensureD3(function (d3) {
        self.render(d3, data, element, config, queryResponse, done);
      });
    },

    render: function (d3, data, element, config, queryResponse, done) {
      var root = element.querySelector('.clinical-matrix-root');
      var tooltip = element._clinicalTooltip;
      if (!root) {
        done();
        return;
      }
      root.innerHTML = '';

      if (!data || data.length === 0) {
        if (this.addError) {
          this.addError({
            title: 'No Data',
            message: 'The clinical supply disruptions query returned zero rows.'
          });
        }
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dims = fields.dimensions || fields.dimension_like || [];
      var meas = fields.measures || fields.measure_like || fields.table_calculations || [];

      // Field role resolution
      var catField = resolveField(dims, config.dimCategoryOverride, 0);
      var prodField = resolveField(dims, config.dimProductOverride, 1) || catField;
      var sevField = resolveField(dims, config.dimSeverityOverride, 2);
      var statusField = resolveField(dims, config.dimStatusOverride, 3);
      var typeField = resolveField(dims, config.dimDisruptionTypeOverride, 4);
      var altField = resolveField(dims, config.dimAlternativeOverride, 5);
      var critField = resolveField(dims, config.dimCriticalOverride, 6);
      var daysField = resolveField(meas, config.measureDaysActiveOverride, 0);
      var countField = resolveField(meas, config.measureCountOverride, 1);

      if (!daysField) {
        if (this.addError) {
          this.addError({
            title: 'Duration Measure Required',
            message: 'Supply Disruption analysis requires at least one duration measure (e.g. avg_days_active).'
          });
        }
        done();
        return;
      }

      // Palette setup
      var pKey = config.colorPalette || 'wellverse_healthcare';
      var palette = PALETTES[pKey] ? Object.assign({}, PALETTES[pKey]) : Object.assign({}, PALETTES.wellverse_healthcare);

      if (config.customPrimaryHex) palette.primary = config.customPrimaryHex;
      if (config.customPositiveHex) palette.low = config.customPositiveHex;
      if (config.customNegativeHex) palette.critical = config.customNegativeHex;

      element.style.backgroundColor = palette.bg;
      root.style.backgroundColor = palette.bg;
      root.style.color = palette.text;

      // Font scaling
      var fScale = config.fontScale || 'standard';
      var fSizes = {
        title: fScale === 'compact' ? '14px' : (fScale === 'large' ? '18px' : '16px'),
        sub: fScale === 'compact' ? '11px' : (fScale === 'large' ? '13px' : '12px'),
        cell: fScale === 'compact' ? '11px' : (fScale === 'large' ? '14px' : '12px'),
        statNum: fScale === 'compact' ? '16px' : (fScale === 'large' ? '22px' : '19px'),
        statLbl: fScale === 'compact' ? '9px' : (fScale === 'large' ? '11px' : '10px')
      };

      // Target SLA calculation
      var targetDays = 45;
      var targetMode = config.targetMode || 'fixed_value';
      if (targetMode === 'fixed_value') {
        targetDays = Number(config.targetValue) || 45;
      } else if (targetMode === 'dataset_mean') {
        var sum = 0;
        data.forEach(function (r) { sum += Number(r[daysField.name].value) || 0; });
        targetDays = data.length ? Math.round(sum / data.length) : 45;
      } else if (targetMode === 'dataset_median') {
        var sortedVals = data.map(function (r) { return Number(r[daysField.name].value) || 0; }).sort(function (a, b) { return a - b; });
        targetDays = sortedVals.length ? sortedVals[Math.floor(sortedVals.length / 2)] : 45;
      } else if (targetMode === 'percentile_p75') {
        var sVals = data.map(function (r) { return Number(r[daysField.name].value) || 0; }).sort(function (a, b) { return a - b; });
        targetDays = sVals.length ? sVals[Math.floor(sVals.length * 0.75)] : 60;
      } else if (targetMode === 'none') {
        targetDays = null;
      }

      var breachThreshold = Number(config.anomalyThreshold) || 75;

      // Parse and normalize rows
      var items = [];
      data.forEach(function (row, idx) {
        var cat = catField ? (row[catField.name].rendered || row[catField.name].value || 'General Med-Surg') : 'General';
        var prod = prodField ? (row[prodField.name].rendered || row[prodField.name].value || 'Item ' + (idx + 1)) : ('Item ' + (idx + 1));
        var sev = sevField ? (row[sevField.name].rendered || row[sevField.name].value || 'Medium') : 'Medium';
        var status = statusField ? (row[statusField.name].rendered || row[statusField.name].value || 'Active') : 'Active';
        var dtype = typeField ? (row[typeField.name].rendered || row[typeField.name].value || 'Supply Disruption') : 'Disruption';
        var alt = altField ? (row[altField.name].rendered || row[altField.name].value || 'No') : 'No';
        var isCrit = critField ? (String(row[critField.name].value).toLowerCase() === 'yes' || String(row[critField.name].value).toLowerCase() === 'true') : false;

        var days = Number(row[daysField.name].value) || 0;
        var count = countField ? (Number(row[countField.name].value) || 1) : 1;

        if (config.suppressZeroNull && days <= 0) return;
        if (config.showCriticalOnly && !isCrit) return;

        var hasAlt = (String(alt).toLowerCase() === 'yes' || String(alt).toLowerCase() === 'true');

        // Drill links
        var drillLinks = (row[daysField.name] && row[daysField.name].links) ||
          (prodField && row[prodField.name] && row[prodField.name].links) ||
          (catField && row[catField.name] && row[catField.name].links) || [];

        items.push({
          idx: idx,
          category: cat,
          product: prod,
          severity: sev,
          status: status,
          disruptionType: dtype,
          hasAlternative: hasAlt,
          alternativeLabel: alt,
          isCritical: isCrit,
          daysActive: days,
          count: count,
          drillLinks: drillLinks,
          isBreach: days >= breachThreshold,
          color: getSeverityColor(sev, palette)
        });
      });

      // Sorting
      var sortBy = config.sortBy || 'days_active_desc';
      if (sortBy === 'days_active_desc') {
        items.sort(function (a, b) { return b.daysActive - a.daysActive; });
      } else if (sortBy === 'days_active_asc') {
        items.sort(function (a, b) { return a.daysActive - b.daysActive; });
      } else if (sortBy === 'severity_desc') {
        var sevRank = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        items.sort(function (a, b) {
          var ra = sevRank[String(a.severity).toLowerCase()] || 0;
          var rb = sevRank[String(b.severity).toLowerCase()] || 0;
          if (rb !== ra) return rb - ra;
          return b.daysActive - a.daysActive;
        });
      } else if (sortBy === 'alphabetical') {
        items.sort(function (a, b) { return String(a.product).localeCompare(String(b.product)); });
      }

      // Top-N
      var topN = Number(config.topNLimit) || 0;
      if (topN > 0 && items.length > topN) {
        items = items.slice(0, topN);
      }

      // Metrics calculation for Scorecard HUD
      var totalDisruptions = items.length;
      var activeCount = 0;
      var criticalCount = 0;
      var breachedCount = 0;
      var altAvailableCount = 0;
      var totalDays = 0;

      items.forEach(function (d) {
        totalDays += d.daysActive;
        if (String(d.status).toLowerCase().indexOf('active') !== -1) activeCount++;
        if (d.isCritical || String(d.severity).toLowerCase().indexOf('crit') !== -1) criticalCount++;
        if (d.isBreach) breachedCount++;
        if (d.hasAlternative) altAvailableCount++;
      });

      var avgDays = totalDisruptions ? Math.round(totalDays / totalDisruptions) : 0;
      var mitigationRate = totalDisruptions ? Math.round((altAvailableCount / totalDisruptions) * 100) : 0;

      // --- HEADER & SCORECARD HUD ---
      var hudMode = config.hudMode || 'scorecard';
      if (hudMode !== 'hidden') {
        var hud = document.createElement('div');
        hud.className = 'clinical-hud-strip';
        hud.style.padding = hudMode === 'compact_strip' ? '6px 14px' : '10px 16px';
        hud.style.borderBottom = '1px solid ' + palette.border;
        hud.style.backgroundColor = palette.track;
        hud.style.display = 'flex';
        hud.style.flexWrap = 'wrap';
        hud.style.alignItems = 'center';
        hud.style.justifyContent = 'space-between';
        hud.style.gap = '10px';
        hud.style.flexShrink = '0';

        var titleBlock = document.createElement('div');
        var mainTitle = document.createElement('div');
        mainTitle.style.fontSize = fSizes.title;
        mainTitle.style.fontWeight = '700';
        mainTitle.style.color = palette.primary;
        mainTitle.textContent = config.customTitle || 'Clinical Supply Disruption & Shortage Command Center';

        var subTitle = document.createElement('div');
        subTitle.style.fontSize = fSizes.sub;
        subTitle.style.color = palette.subtext;
        subTitle.style.marginTop = '2px';
        subTitle.textContent = config.customSubtitle || (totalDisruptions + ' Monitored Supply Lines • ' + criticalCount + ' Clinically Critical • ' + breachedCount + ' SLA Breaches (> ' + breachThreshold + 'd)');

        titleBlock.appendChild(mainTitle);
        titleBlock.appendChild(subTitle);
        hud.appendChild(titleBlock);

        // Stats boxes
        var statsRow = document.createElement('div');
        statsRow.style.display = 'flex';
        statsRow.style.gap = '8px';
        statsRow.style.flexWrap = 'wrap';

        function addChip(lbl, val, color, isAlert) {
          var chip = document.createElement('div');
          chip.style.backgroundColor = isAlert ? palette.badgeNoAltBg : (palette.bg);
          chip.style.border = '1px solid ' + (isAlert ? palette.critical : palette.border);
          chip.style.borderRadius = '6px';
          chip.style.padding = hudMode === 'compact_strip' ? '3px 8px' : '5px 12px';
          chip.style.display = 'flex';
          chip.style.flexDirection = 'column';

          var vSpan = document.createElement('span');
          vSpan.style.fontSize = fSizes.statNum;
          vSpan.style.fontWeight = '800';
          vSpan.style.color = color;
          vSpan.style.lineHeight = '1.1';
          vSpan.textContent = val;

          var lSpan = document.createElement('span');
          lSpan.style.fontSize = fSizes.statLbl;
          lSpan.style.textTransform = 'uppercase';
          lSpan.style.letterSpacing = '0.04em';
          lSpan.style.color = palette.subtext;
          lSpan.textContent = lbl;

          chip.appendChild(vSpan);
          chip.appendChild(lSpan);
          statsRow.appendChild(chip);
        }

        addChip('Active Disruptions', String(activeCount), palette.critical, activeCount > 0);
        addChip('Clinically Critical', String(criticalCount), palette.high, criticalCount > 0);
        addChip('Mean Days Active', avgDays + 'd', palette.primary, false);
        addChip('Mitigation Rate', mitigationRate + '%', palette.low, false);

        hud.appendChild(statsRow);
        root.appendChild(hud);
      }

      // --- SEARCH & FILTER BAR ---
      var currentSearchTerm = '';
      if (config.showSearch) {
        var searchBar = document.createElement('div');
        searchBar.style.padding = '6px 16px';
        searchBar.style.borderBottom = '1px solid ' + palette.border;
        searchBar.style.backgroundColor = palette.bg;
        searchBar.style.display = 'flex';
        searchBar.style.alignItems = 'center';
        searchBar.style.justifyContent = 'space-between';
        searchBar.style.gap = '12px';
        searchBar.style.flexShrink = '0';

        var inputWrap = document.createElement('div');
        inputWrap.style.display = 'flex';
        inputWrap.style.alignItems = 'center';
        inputWrap.style.gap = '6px';
        inputWrap.style.flex = '1';
        inputWrap.style.maxWidth = '360px';

        var icon = document.createElement('span');
        icon.innerHTML = '&#128269;';
        icon.style.fontSize = '13px';
        inputWrap.appendChild(icon);

        var searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search clinical products, categories, or root causes...';
        searchInput.style.width = '100%';
        searchInput.style.padding = '5px 10px';
        searchInput.style.borderRadius = '5px';
        searchInput.style.border = '1px solid ' + palette.border;
        searchInput.style.fontSize = '12px';
        searchInput.style.outline = 'none';

        searchInput.addEventListener('input', function (e) {
          currentSearchTerm = e.target.value.toLowerCase().trim();
          renderContent();
        });
        inputWrap.appendChild(searchInput);
        searchBar.appendChild(inputWrap);

        // Quick paradigm switcher
        var switchWrap = document.createElement('div');
        switchWrap.style.display = 'flex';
        switchWrap.style.gap = '6px';
        var modes = [
          { key: 'shortage_severity_matrix', lbl: 'Grid Matrix' },
          { 'key': 'risk_horizon_timeline', lbl: 'Risk Horizon' },
          { key: 'clinical_impact_quadrant', lbl: 'Impact Quadrant' },
          { key: 'executive_war_room_hud', lbl: 'War Room Table' }
        ];
        modes.forEach(function (m) {
          var btn = document.createElement('button');
          btn.textContent = m.lbl;
          btn.style.padding = '4px 8px';
          btn.style.fontSize = '11px';
          btn.style.borderRadius = '4px';
          btn.style.border = '1px solid ' + (config.layoutMode === m.key ? palette.primary : palette.border);
          btn.style.backgroundColor = config.layoutMode === m.key ? palette.primary : palette.bg;
          btn.style.color = config.layoutMode === m.key ? '#ffffff' : palette.text;
          btn.style.cursor = 'pointer';
          btn.addEventListener('click', function () {
            config.layoutMode = m.key;
            renderContent();
          });
          switchWrap.appendChild(btn);
        });
        searchBar.appendChild(switchWrap);

        root.appendChild(searchBar);
      }

      // Chart wrapper
      var chartWrapper = document.createElement('div');
      chartWrapper.className = 'clinical-matrix-chart-wrapper';
      chartWrapper.style.flex = '1 1 0';
      chartWrapper.style.minHeight = '0';
      chartWrapper.style.overflow = 'auto';
      chartWrapper.style.position = 'relative';
      root.appendChild(chartWrapper);

      function renderContent() {
        chartWrapper.innerHTML = '';

        var displayItems = items.filter(function (it) {
          if (!currentSearchTerm) return true;
          return it.product.toLowerCase().indexOf(currentSearchTerm) !== -1 ||
                 it.category.toLowerCase().indexOf(currentSearchTerm) !== -1 ||
                 it.disruptionType.toLowerCase().indexOf(currentSearchTerm) !== -1 ||
                 it.severity.toLowerCase().indexOf(currentSearchTerm) !== -1;
        });

        if (displayItems.length === 0) {
          var emptyDiv = document.createElement('div');
          emptyDiv.style.padding = '30px';
          emptyDiv.style.textAlign = 'center';
          emptyDiv.style.color = palette.subtext;
          emptyDiv.textContent = 'No clinical products matching current filter criteria.';
          chartWrapper.appendChild(emptyDiv);
          return;
        }

        var mode = config.layoutMode || 'shortage_severity_matrix';
        if (mode === 'shortage_severity_matrix') {
          renderSeverityMatrix(displayItems);
        } else if (mode === 'risk_horizon_timeline') {
          renderRiskHorizon(displayItems);
        } else if (mode === 'clinical_impact_quadrant') {
          renderImpactQuadrant(displayItems);
        } else {
          renderWarRoomTable(displayItems);
        }
      }

      // ========================================================
      // PARADIGM 1: SHORTAGE SEVERITY MATRIX (Heatmap Grid)
      // ========================================================
      function renderSeverityMatrix(dItems) {
        var gridContainer = document.createElement('div');
        gridContainer.style.padding = '16px';
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        gridContainer.style.gap = '14px';

        dItems.forEach(function (d) {
          var card = document.createElement('div');
          card.style.backgroundColor = palette.bg;
          card.style.border = '1px solid ' + (d.isBreach ? palette.critical : palette.border);
          card.style.borderLeft = '6px solid ' + d.color;
          card.style.borderRadius = '8px';
          card.style.padding = '12px 14px';
          card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          card.style.display = 'flex';
          card.style.flexDirection = 'column';
          card.style.justifyContent = 'space-between';
          card.style.cursor = d.drillLinks.length ? 'pointer' : 'default';

          if (d.drillLinks.length) {
            card.addEventListener('click', function (e) {
              if (LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
                LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: e });
              }
            });
          }

          var topRow = document.createElement('div');
          topRow.style.display = 'flex';
          topRow.style.justifyContent = 'space-between';
          topRow.style.alignItems = 'flex-start';
          topRow.style.gap = '8px';

          var nameBlock = document.createElement('div');
          nameBlock.style.flex = '1';

          var catPill = document.createElement('div');
          catPill.style.fontSize = '10.5px';
          catPill.style.color = palette.subtext;
          catPill.style.textTransform = 'uppercase';
          catPill.style.letterSpacing = '0.04em';
          catPill.textContent = d.category;
          nameBlock.appendChild(catPill);

          var prodName = document.createElement('div');
          prodName.style.fontSize = fSizes.cell;
          prodName.style.fontWeight = '700';
          prodName.style.color = palette.text;
          prodName.style.marginTop = '2px';
          prodName.style.lineHeight = '1.3';
          prodName.textContent = d.product;
          nameBlock.appendChild(prodName);
          topRow.appendChild(nameBlock);

          var sevBadge = document.createElement('span');
          sevBadge.style.fontSize = '10px';
          sevBadge.style.fontWeight = '800';
          sevBadge.style.padding = '2px 7px';
          sevBadge.style.borderRadius = '4px';
          sevBadge.style.backgroundColor = d.color + '22';
          sevBadge.style.color = d.color;
          sevBadge.textContent = d.severity.toUpperCase();
          topRow.appendChild(sevBadge);

          card.appendChild(topRow);

          // Details row
          var midRow = document.createElement('div');
          midRow.style.marginTop = '8px';
          midRow.style.fontSize = '11.5px';
          midRow.style.color = palette.subtext;
          midRow.style.display = 'flex';
          midRow.style.flexWrap = 'wrap';
          midRow.style.gap = '6px';

          var typeBadge = document.createElement('span');
          typeBadge.style.backgroundColor = palette.track;
          typeBadge.style.padding = '2px 6px';
          typeBadge.style.borderRadius = '4px';
          typeBadge.style.border = '1px solid ' + palette.border;
          typeBadge.textContent = d.disruptionType;
          midRow.appendChild(typeBadge);

          if (d.isCritical) {
            var critBadge = document.createElement('span');
            critBadge.style.backgroundColor = '#fef2f2';
            critBadge.style.color = '#991b1b';
            critBadge.style.fontWeight = '700';
            critBadge.style.padding = '2px 6px';
            critBadge.style.borderRadius = '4px';
            critBadge.textContent = '⚡ CLINICALLY CRITICAL';
            midRow.appendChild(critBadge);
          }

          card.appendChild(midRow);

          // Bottom metrics & progress bar
          var bottomRow = document.createElement('div');
          bottomRow.style.marginTop = '12px';
          bottomRow.style.borderTop = '1px solid ' + palette.border;
          bottomRow.style.paddingTop = '8px';

          var metricInfo = document.createElement('div');
          metricInfo.style.display = 'flex';
          metricInfo.style.justifyContent = 'space-between';
          metricInfo.style.fontSize = '11px';
          metricInfo.style.marginBottom = '4px';

          var daysLbl = document.createElement('span');
          daysLbl.textContent = 'Active Duration: ' + formatDays(d.daysActive, config.valueFormat);
          daysLbl.style.fontWeight = '700';
          daysLbl.style.color = d.isBreach ? palette.critical : palette.text;
          metricInfo.appendChild(daysLbl);

          if (config.showAlternativeBadges) {
            var altSpan = document.createElement('span');
            altSpan.style.fontSize = '10px';
            altSpan.style.fontWeight = '700';
            altSpan.style.padding = '1px 5px';
            altSpan.style.borderRadius = '3px';
            if (d.hasAlternative) {
              altSpan.style.backgroundColor = palette.badgeAlternativeBg;
              altSpan.style.color = palette.badgeAlternativeText;
              altSpan.textContent = '✓ Equivalent Alt Available';
            } else {
              altSpan.style.backgroundColor = palette.badgeNoAltBg;
              altSpan.style.color = palette.badgeNoAltText;
              altSpan.textContent = '⚠ No Equivalent Alt';
            }
            metricInfo.appendChild(altSpan);
          }
          bottomRow.appendChild(metricInfo);

          // Progress bar vs Target / SLA
          var barTrack = document.createElement('div');
          barTrack.style.width = '100%';
          barTrack.style.height = '6px';
          barTrack.style.backgroundColor = palette.track;
          barTrack.style.borderRadius = '3px';
          barTrack.style.overflow = 'hidden';
          barTrack.style.position = 'relative';

          var pct = targetDays ? Math.min(100, Math.round((d.daysActive / (targetDays * 1.5)) * 100)) : 50;
          var fillBar = document.createElement('div');
          fillBar.style.width = pct + '%';
          fillBar.style.height = '100%';
          fillBar.style.backgroundColor = d.isBreach ? palette.critical : (d.daysActive > (targetDays || 45) ? palette.high : palette.low);
          fillBar.style.borderRadius = '3px';
          barTrack.appendChild(fillBar);

          bottomRow.appendChild(barTrack);
          card.appendChild(bottomRow);

          gridContainer.appendChild(card);
        });

        chartWrapper.appendChild(gridContainer);
      }

      // ========================================================
      // PARADIGM 2: RISK HORIZON TIMELINE (Horizontal Horizon Bars)
      // ========================================================
      function renderRiskHorizon(dItems) {
        var w = chartWrapper.clientWidth || 800;
        var rowHeight = 36;
        var h = Math.max(300, dItems.length * rowHeight + 80);

        var margin = { top: 40, right: 120, bottom: 40, left: 240 };
        var innerW = Math.max(200, w - margin.left - margin.right);
        var innerH = dItems.length * rowHeight;

        var svg = d3.select(chartWrapper)
          .append('svg')
          .attr('width', w)
          .attr('height', h)
          .style('display', 'block');

        var g = svg.append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var maxVal = d3.max(dItems, function (d) { return d.daysActive; }) || 100;
        var xDomainMax = Math.max(maxVal * 1.15, (targetDays || 45) * 1.4, breachThreshold * 1.15);

        var xScale = d3.scaleLinear()
          .domain([0, xDomainMax])
          .range([0, innerW]);

        var yScale = d3.scaleBand()
          .domain(dItems.map(function (d) { return d.product; }))
          .range([0, innerH])
          .padding(0.25);

        // Reference target band & breach line
        if (targetDays) {
          g.append('line')
            .attr('x1', xScale(targetDays))
            .attr('x2', xScale(targetDays))
            .attr('y1', 0)
            .attr('y2', innerH)
            .attr('stroke', palette.subtext)
            .attr('stroke-dasharray', '4,4')
            .attr('stroke-width', 1.5);

          g.append('text')
            .attr('x', xScale(targetDays))
            .attr('y', -8)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('font-weight', '700')
            .attr('fill', palette.subtext)
            .textContent = config.referenceLineLabel || (targetDays + 'd SLA');
        }

        // Breach line
        g.append('line')
          .attr('x1', xScale(breachThreshold))
          .attr('x2', xScale(breachThreshold))
          .attr('y1', 0)
          .attr('y2', innerH)
          .attr('stroke', palette.critical)
          .attr('stroke-width', 1.5);

        g.append('text')
          .attr('x', xScale(breachThreshold))
          .attr('y', -8)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .attr('fill', palette.critical)
          .text('Breach Threshold (' + breachThreshold + 'd)');

        // Background gridlines
        g.append('g')
          .attr('class', 'grid')
          .attr('transform', 'translate(0,' + innerH + ')')
          .call(d3.axisBottom(xScale).ticks(6).tickSize(-innerH).tickFormat(function (d) { return d + 'd'; }))
          .selectAll('.tick line')
          .attr('stroke', palette.border)
          .attr('stroke-opacity', 0.6);

        // Horizon rows
        var rows = g.selectAll('.horizon-row')
          .data(dItems)
          .enter()
          .append('g')
          .attr('class', 'horizon-row')
          .attr('transform', function (d) { return 'translate(0,' + yScale(d.product) + ')'; })
          .style('cursor', function (d) { return d.drillLinks.length ? 'pointer' : 'default'; })
          .on('click', function (e, d) {
            if (d.drillLinks.length && LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
              LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: e });
            }
          });

        // Background track
        rows.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', innerW)
          .attr('height', yScale.bandwidth())
          .attr('rx', 4)
          .attr('fill', palette.track);

        // Active duration bar
        rows.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', function (d) { return xScale(d.daysActive); })
          .attr('height', yScale.bandwidth())
          .attr('rx', 4)
          .attr('fill', function (d) { return d.isBreach ? palette.critical : d.color; });

        // Left label (Product name + Category)
        rows.append('text')
          .attr('x', -10)
          .attr('y', yScale.bandwidth() / 2 + 4)
          .attr('text-anchor', 'end')
          .attr('font-size', '11.5px')
          .attr('font-weight', '600')
          .attr('fill', palette.text)
          .text(function (d) {
            var s = d.product;
            if (s.length > 28) s = s.substring(0, 26) + '...';
            return (d.isCritical ? '⚡ ' : '') + s;
          });

        // Value text at end of bar
        rows.append('text')
          .attr('x', function (d) { return xScale(d.daysActive) + 8; })
          .attr('y', yScale.bandwidth() / 2 + 4)
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .attr('fill', function (d) { return d.isBreach ? palette.critical : palette.text; })
          .text(function (d) {
            return formatDays(d.daysActive, config.valueFormat) + ' (' + d.severity + ')';
          });
      }

      // ========================================================
      // PARADIGM 3: CLINICAL IMPACT QUADRANT (Criticality vs Duration)
      // ========================================================
      function renderImpactQuadrant(dItems) {
        var w = chartWrapper.clientWidth || 800;
        var h = Math.max(420, chartWrapper.clientHeight || 450);

        var margin = { top: 40, right: 40, bottom: 50, left: 60 };
        var innerW = w - margin.left - margin.right;
        var innerH = h - margin.top - margin.bottom;

        var svg = d3.select(chartWrapper)
          .append('svg')
          .attr('width', w)
          .attr('height', h)
          .style('display', 'block');

        var g = svg.append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var maxDays = d3.max(dItems, function (d) { return d.daysActive; }) || 100;
        var xScale = d3.scaleLinear()
          .domain([0, maxDays * 1.15])
          .range([0, innerW]);

        var yScale = d3.scalePoint()
          .domain(['Low', 'Medium', 'High', 'Critical'])
          .range([innerH - 20, 20])
          .padding(0.5);

        // Quadrant divider lines
        var midX = xScale(targetDays || 45);
        var midY = (innerH) / 2;

        g.append('line')
          .attr('x1', midX)
          .attr('x2', midX)
          .attr('y1', 0)
          .attr('y2', innerH)
          .attr('stroke', palette.border)
          .attr('stroke-dasharray', '4,4');

        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', midY)
          .attr('y2', midY)
          .attr('stroke', palette.border)
          .attr('stroke-dasharray', '4,4');

        // Quadrant Background Shading / Watermarks
        var qLabels = [
          { x: innerW * 0.75, y: innerH * 0.2, lbl: 'TIER 1 CODE RED SHORTAGES', color: palette.critical + '22' },
          { x: innerW * 0.25, y: innerH * 0.2, lbl: 'EARLY ALERT & MITIGATION', color: palette.high + '22' },
          { x: innerW * 0.75, y: innerH * 0.8, lbl: 'OPERATIONAL BACKLOG', color: palette.medium + '22' },
          { x: innerW * 0.25, y: innerH * 0.8, lbl: 'ROUTINE DISRUPTIONS', color: palette.low + '22' }
        ];

        qLabels.forEach(function (ql) {
          g.append('text')
            .attr('x', ql.x)
            .attr('y', ql.y)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', '800')
            .attr('letter-spacing', '0.05em')
            .attr('fill', palette.subtext)
            .attr('opacity', 0.4)
            .text(ql.lbl);
        });

        // Axes
        g.append('g')
          .attr('transform', 'translate(0,' + innerH + ')')
          .call(d3.axisBottom(xScale).ticks(8).tickFormat(function (d) { return d + 'd'; }))
          .selectAll('text')
          .attr('fill', palette.text);

        g.append('g')
          .call(d3.axisLeft(yScale))
          .selectAll('text')
          .attr('font-weight', '700')
          .attr('fill', palette.text);

        // Scatter Bubbles
        var nodes = g.selectAll('.quadrant-bubble')
          .data(dItems)
          .enter()
          .append('g')
          .attr('class', 'quadrant-bubble')
          .attr('transform', function (d) {
            var yPos = yScale(d.severity) || midY;
            // Add slight vertical jitter to prevent exact overlap
            var jitter = ((d.idx % 5) - 2) * 6;
            return 'translate(' + xScale(d.daysActive) + ',' + (yPos + jitter) + ')';
          })
          .style('cursor', function (d) { return d.drillLinks.length ? 'pointer' : 'default'; })
          .on('click', function (e, d) {
            if (d.drillLinks.length && LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
              LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: e });
            }
          });

        nodes.append('circle')
          .attr('r', function (d) { return d.isCritical ? 10 : 7; })
          .attr('fill', function (d) { return d.color; })
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2)
          .attr('opacity', 0.85);

        nodes.append('text')
          .attr('x', 12)
          .attr('y', 4)
          .attr('font-size', '10.5px')
          .attr('font-weight', '600')
          .attr('fill', palette.text)
          .text(function (d) {
            var n = d.product;
            return n.length > 20 ? n.substring(0, 18) + '...' : n;
          });
      }

      // ========================================================
      // PARADIGM 4: EXECUTIVE WAR ROOM HUD TABLE
      // ========================================================
      function renderWarRoomTable(dItems) {
        var tableWrap = document.createElement('div');
        tableWrap.style.padding = '12px 16px';
        tableWrap.style.overflowX = 'auto';

        var tbl = document.createElement('table');
        tbl.style.width = '100%';
        tbl.style.borderCollapse = 'collapse';
        tbl.style.fontSize = fSizes.cell;

        // Header
        var thead = document.createElement('thead');
        var trh = document.createElement('tr');
        trh.style.borderBottom = '2px solid ' + palette.primary;
        trh.style.textAlign = 'left';
        trh.style.color = palette.primary;
        trh.style.fontSize = '11px';
        trh.style.textTransform = 'uppercase';
        trh.style.letterSpacing = '0.04em';

        var cols = ['Product / Device', 'Category', 'Severity', 'Disruption Type', 'Days Active', 'Status', 'Substitute Alt'];
        cols.forEach(function (c) {
          var th = document.createElement('th');
          th.style.padding = '8px 10px';
          th.textContent = c;
          trh.appendChild(th);
        });
        thead.appendChild(trh);
        tbl.appendChild(thead);

        // Body
        var tbody = document.createElement('tbody');
        dItems.forEach(function (d, i) {
          var tr = document.createElement('tr');
          tr.style.borderBottom = '1px solid ' + palette.border;
          tr.style.backgroundColor = (i % 2 === 0) ? palette.bg : palette.track;
          tr.style.cursor = d.drillLinks.length ? 'pointer' : 'default';

          if (d.drillLinks.length) {
            tr.addEventListener('click', function (e) {
              if (LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
                LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: e });
              }
            });
          }

          // Product
          var tdProd = document.createElement('td');
          tdProd.style.padding = '8px 10px';
          tdProd.style.fontWeight = '700';
          tdProd.textContent = (d.isCritical ? '⚡ ' : '') + d.product;
          tr.appendChild(tdProd);

          // Category
          var tdCat = document.createElement('td');
          tdCat.style.padding = '8px 10px';
          tdCat.style.color = palette.subtext;
          tdCat.textContent = d.category;
          tr.appendChild(tdCat);

          // Severity
          var tdSev = document.createElement('td');
          tdSev.style.padding = '8px 10px';
          var sBadge = document.createElement('span');
          sBadge.style.fontSize = '10px';
          sBadge.style.fontWeight = '800';
          sBadge.style.padding = '2px 6px';
          sBadge.style.borderRadius = '4px';
          sBadge.style.backgroundColor = d.color + '22';
          sBadge.style.color = d.color;
          sBadge.textContent = d.severity;
          tdSev.appendChild(sBadge);
          tr.appendChild(tdSev);

          // Disruption Type
          var tdType = document.createElement('td');
          tdType.style.padding = '8px 10px';
          tdType.textContent = d.disruptionType;
          tr.appendChild(tdType);

          // Days Active
          var tdDays = document.createElement('td');
          tdDays.style.padding = '8px 10px';
          tdDays.style.fontWeight = '800';
          tdDays.style.color = d.isBreach ? palette.critical : palette.text;
          tdDays.textContent = formatDays(d.daysActive, config.valueFormat);
          tr.appendChild(tdDays);

          // Status
          var tdStat = document.createElement('td');
          tdStat.style.padding = '8px 10px';
          var statBadge = getStatusBadge(d.status, palette);
          var stPill = document.createElement('span');
          stPill.style.fontSize = '10px';
          stPill.style.fontWeight = '700';
          stPill.style.padding = '2px 6px';
          stPill.style.borderRadius = '4px';
          stPill.style.backgroundColor = statBadge.bg;
          stPill.style.color = statBadge.text;
          stPill.textContent = statBadge.label;
          tdStat.appendChild(stPill);
          tr.appendChild(tdStat);

          // Alt Available
          var tdAlt = document.createElement('td');
          tdAlt.style.padding = '8px 10px';
          var altBadge = document.createElement('span');
          altBadge.style.fontSize = '10px';
          altBadge.style.fontWeight = '700';
          altBadge.style.padding = '2px 6px';
          altBadge.style.borderRadius = '4px';
          if (d.hasAlternative) {
            altBadge.style.backgroundColor = palette.badgeAlternativeBg;
            altBadge.style.color = palette.badgeAlternativeText;
            altBadge.textContent = '✓ Yes';
          } else {
            altBadge.style.backgroundColor = palette.badgeNoAltBg;
            altBadge.style.color = palette.badgeNoAltText;
            altBadge.textContent = '⚠ No';
          }
          tdAlt.appendChild(altBadge);
          tr.appendChild(tdAlt);

          tbody.appendChild(tr);
        });

        tbl.appendChild(tbody);
        tableWrap.appendChild(tbl);
        chartWrapper.appendChild(tableWrap);
      }

      renderContent();
      done();
    }
  };

  looker.plugins.visualizations.add(visObject);
}());
