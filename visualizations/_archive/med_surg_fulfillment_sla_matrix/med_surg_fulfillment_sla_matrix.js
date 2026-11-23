/**
 * Med-Surg Distribution Center Fulfillment & SLA Performance Matrix
 * Google Cloud Looker Custom Visualization
 * Built with D3.js v7
 *
 * Implements an executive-grade clinical supply fulfillment & distribution logistics matrix:
 * 1. fulfillment_sla_quadrant: 2D Strategic Service Level Quadrant
 *    (Line Fill Rate % vs On-Time Delivery Rate % with SLA reference lines, volume bubble scaling, and compliance zone shading)
 * 2. sla_variance_dumbbell: Paired Horizontal SLA Performance Dumbbells
 *    (Paired horizontal dumbbells per Distribution Center comparing Line Fill Rate vs On-Time Delivery with variance bridge and benchmark pins)
 * 3. fulfillment_risk_matrix: 2D Clinical Service Level & Logistics Heatmap Matrix
 *    (Distribution Center vs Key Performance Metrics: Line Fill %, On-Time %, Backorder %, Delivery Days, Total Spend)
 * 4. executive_fulfillment_scorecard: High-Density Logistics Operations Scorecard Table
 *    (Executive table with DC Name, Region, Spend, Order Volume, SLA Rates, Backorders, Delivery Days, and SLA Tier Governance Badges)
 *
 * Resolves Buganizer Cloud Blockers b/493810294, b/398501948, and b/510294829.
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
      fillRate: '#059669',     // Line Fill Emerald
      onTime: '#0284c7',       // On-Time Sky Blue
      backorder: '#dc2626',    // Backorder Crimson Red
      leadTime: '#d97706',     // Delivery Days Amber
      goldTier: '#059669',
      silverTier: '#0284c7',
      watchlistTier: '#d97706',
      criticalTier: '#dc2626',
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: '#e2e8f0',
      track: '#f8fafc',
      cardBg: '#ffffff',
      grid: '#f1f5f9',
      tooltipBg: '#0f172a',
      tooltipText: '#ffffff'
    },
    google_enterprise: {
      name: 'Google Enterprise',
      primary: '#1a73e8',
      fillRate: '#137333',
      onTime: '#1a73e8',
      backorder: '#c5221f',
      leadTime: '#f9ab00',
      goldTier: '#137333',
      silverTier: '#1a73e8',
      watchlistTier: '#f9ab00',
      criticalTier: '#c5221f',
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      border: '#dadce0',
      track: '#f8f9fa',
      cardBg: '#ffffff',
      grid: '#e8eaed',
      tooltipBg: '#202124',
      tooltipText: '#ffffff'
    },
    modern_slate: {
      name: 'Modern Slate',
      primary: '#334155',
      fillRate: '#10b981',
      onTime: '#6366f1',
      backorder: '#ef4444',
      leadTime: '#f59e0b',
      goldTier: '#10b981',
      silverTier: '#6366f1',
      watchlistTier: '#f59e0b',
      criticalTier: '#ef4444',
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: '#e2e8f0',
      track: '#f8fafc',
      cardBg: '#ffffff',
      grid: '#f1f5f9',
      tooltipBg: '#0f172a',
      tooltipText: '#ffffff'
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark',
      primary: '#38bdf8',
      fillRate: '#34d399',
      onTime: '#38bdf8',
      backorder: '#f43f5e',
      leadTime: '#fbbf24',
      goldTier: '#34d399',
      silverTier: '#38bdf8',
      watchlistTier: '#fbbf24',
      criticalTier: '#f43f5e',
      bg: '#0f172a',
      text: '#f8fafc',
      subtext: '#94a3b8',
      border: '#334155',
      track: '#1e293b',
      cardBg: '#1e293b',
      grid: '#334155',
      tooltipBg: '#0284c7',
      tooltipText: '#ffffff'
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      primary: '#065f46',
      fillRate: '#059669',
      onTime: '#0d9488',
      backorder: '#e11d48',
      leadTime: '#d97706',
      goldTier: '#059669',
      silverTier: '#0d9488',
      watchlistTier: '#d97706',
      criticalTier: '#e11d48',
      bg: '#ffffff',
      text: '#064e3b',
      subtext: '#047857',
      border: '#a7f3d0',
      track: '#f0fdf4',
      cardBg: '#ffffff',
      grid: '#d1fae5',
      tooltipBg: '#064e3b',
      tooltipText: '#ffffff'
    },
    sunset_media: {
      name: 'Sunset Media',
      primary: '#c2410c',
      fillRate: '#16a34a',
      onTime: '#ea580c',
      backorder: '#dc2626',
      leadTime: '#d97706',
      goldTier: '#16a34a',
      silverTier: '#ea580c',
      watchlistTier: '#d97706',
      criticalTier: '#dc2626',
      bg: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      border: '#fed7aa',
      track: '#fff7ed',
      cardBg: '#ffffff',
      grid: '#ffedd5',
      tooltipBg: '#431407',
      tooltipText: '#ffffff'
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
    return (defaultIdx >= 0 && defaultIdx < list.length) ? list[defaultIdx] : null;
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
        return sign + '$' + abs.toFixed(2);
      case 'compact_number':
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + 'B';
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + 'M';
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
        return sign + abs.toLocaleString();
      case 'percentage':
        return (val * (abs <= 1.0 ? 100 : 1)).toFixed(1) + '%';
      case 'decimal_2':
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'raw':
        return String(val);
      default:
        if (lookerRendered) return lookerRendered;
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
  }

  function makeHudCard(label, valStr, subStr, subColor, theme, isDark) {
    var card = document.createElement('div');
    card.style.flex = '1 1 0';
    card.style.minWidth = '130px';
    card.style.padding = '8px 14px';
    card.style.borderRadius = '8px';
    card.style.backgroundColor = isDark ? 'rgba(30, 41, 59, 0.85)' : theme.cardBg;
    card.style.border = '1px solid ' + (isDark ? '#334155' : theme.border);
    card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '2px';

    var lbl = document.createElement('div');
    lbl.style.fontSize = '10.5px';
    lbl.style.fontWeight = '600';
    lbl.style.textTransform = 'uppercase';
    lbl.style.letterSpacing = '0.04em';
    lbl.style.color = theme.subtext;
    lbl.textContent = label;
    card.appendChild(lbl);

    var val = document.createElement('div');
    val.style.fontSize = '17px';
    val.style.fontWeight = '700';
    val.style.color = theme.text;
    val.textContent = valStr;
    card.appendChild(val);

    if (subStr) {
      var sub = document.createElement('div');
      sub.style.fontSize = '11px';
      sub.style.fontWeight = '600';
      sub.style.color = subColor || theme.subtext;
      sub.textContent = subStr;
      card.appendChild(sub);
    }
    return card;
  }

  function getSlaTier(fillRate, onTime, targetFill, targetOnTime) {
    var f = fillRate * (fillRate <= 1.0 ? 100 : 1);
    var o = onTime * (onTime <= 1.0 ? 100 : 1);
    var tf = targetFill * (targetFill <= 1.0 ? 100 : 1);
    var to = targetOnTime * (targetOnTime <= 1.0 ? 100 : 1);

    if (f >= tf && o >= to) {
      return { tier: 'Gold Tier', label: 'Gold SLA Benchmark', color: '#059669', bg: '#d1fae5', badge: 'GOLD SLA' };
    }
    if (f >= tf || o >= to) {
      return { tier: 'Silver Tier', label: 'Silver Operational', color: '#0284c7', bg: '#e0f2fe', badge: 'SILVER SLA' };
    }
    if (f >= tf - 2.0 && o >= to - 5.0) {
      return { tier: 'Watchlist', label: 'Near-Target Watchlist', color: '#d97706', bg: '#fef3c7', badge: 'WATCHLIST' };
    }
    return { tier: 'Critical', label: 'SLA Breach Action Required', color: '#dc2626', bg: '#fee2e2', badge: 'BREACH ALERT' };
  }

  looker.plugins.visualizations.add({
    id: 'med_surg_fulfillment_sla_matrix',
    label: 'Med-Surg Fulfillment & SLA Performance Matrix',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'Clinical Logistics Layout',
        display: 'select',
        values: [
          { 'Fulfillment SLA Strategic Quadrant (2D Matrix)': 'fulfillment_sla_quadrant' },
          { 'Paired SLA Performance Dumbbells': 'sla_variance_dumbbell' },
          { 'Clinical Service Level Heatmap Matrix': 'fulfillment_risk_matrix' },
          { 'Executive Logistics Scorecard Table': 'executive_fulfillment_scorecard' }
        ],
        default: 'fulfillment_sla_quadrant',
        section: 'Display',
        order: 1
      },
      entityDimOverride: {
        type: 'string',
        label: 'Distribution Center / Facility Dimension',
        display: 'select',
        values: [{ 'Auto (run query to populate)': '' }],
        default: '',
        section: 'Display',
        order: 2
      },
      regionDimOverride: {
        type: 'string',
        label: 'Region / Care Setting Dimension (Optional)',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 3
      },
      fillRateMeasOverride: {
        type: 'string',
        label: 'Line Fill Rate Measure (%)',
        display: 'select',
        values: [{ 'Auto (run query to populate)': '' }],
        default: '',
        section: 'Display',
        order: 4
      },
      onTimeMeasOverride: {
        type: 'string',
        label: 'On-Time Delivery Rate Measure (%)',
        display: 'select',
        values: [{ 'Auto (run query to populate)': '' }],
        default: '',
        section: 'Display',
        order: 5
      },
      backorderMeasOverride: {
        type: 'string',
        label: 'Backorder Rate Measure (%) (Optional)',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 6
      },
      daysToDeliverMeasOverride: {
        type: 'string',
        label: 'Avg Days to Deliver Measure (Optional)',
        display: 'select',
        values: [{ 'Auto / None': '' }],
        default: '',
        section: 'Display',
        order: 7
      },
      spendMeasOverride: {
        type: 'string',
        label: 'Total Spend / Volume Measure',
        display: 'select',
        values: [{ 'Auto (run query to populate)': '' }],
        default: '',
        section: 'Display',
        order: 8
      },
      targetCalculationMode: {
        type: 'string',
        label: 'SLA Benchmark Calculation Mode',
        display: 'select',
        values: [
          { 'Standard Med-Surg SLA Contract (98.0% Fill / 85.0% On-Time)': 'fixed_sla' },
          { 'Dataset Mean (Network Average)': 'dataset_mean' },
          { 'Dataset Median (Network Median)': 'dataset_median' },
          { 'Top Percentile P75 Target': 'percentile_p75' },
          { 'Top Percentile P90 Target': 'percentile_p90' },
          { 'None (No Reference Lines)': 'none' }
        ],
        default: 'fixed_sla',
        section: 'Display',
        order: 9
      },
      targetLineFillPct: {
        type: 'number',
        label: 'Line Fill Rate SLA Target (%)',
        default: 98.0,
        section: 'Display',
        order: 10
      },
      targetOnTimePct: {
        type: 'number',
        label: 'On-Time Delivery SLA Target (%)',
        default: 85.0,
        section: 'Display',
        order: 11
      },
      targetDaysToDeliver: {
        type: 'number',
        label: 'Delivery Lead Time Ceiling (Days)',
        default: 2.0,
        section: 'Display',
        order: 12
      },
      referenceLineLabel: {
        type: 'string',
        label: 'SLA Reference Label',
        default: 'Contract SLA Target',
        section: 'Display',
        order: 13
      },
      showReferenceLines: {
        type: 'boolean',
        label: 'Show SLA Benchmark Reference Lines',
        default: true,
        section: 'Display',
        order: 14
      },
      anomalyThresholdPct: {
        type: 'number',
        label: 'SLA Shortfall Alert Threshold (%)',
        default: 5.0,
        section: 'Display',
        order: 15
      },
      sortBy: {
        type: 'string',
        label: 'Sort Fulfillment Entities By',
        display: 'select',
        values: [
          { 'Total Spend Descending': 'spend_desc' },
          { 'Line Fill Rate Descending': 'fill_rate_desc' },
          { 'On-Time Delivery Descending': 'on_time_desc' },
          { 'Backorder Rate Descending (Highest Risk)': 'backorder_desc' },
          { 'Entity Name (A-Z)': 'name_asc' },
          { 'Default (Query Order)': 'natural' }
        ],
        default: 'spend_desc',
        section: 'Display',
        order: 16
      },
      topNLimit: {
        type: 'number',
        label: 'Top-N Entities Limit (0 = All, Max 50)',
        default: 0,
        section: 'Display',
        order: 17
      },
      enableOtherRollup: {
        type: 'boolean',
        label: 'Group Remaining into Other Rollup Summary',
        default: false,
        section: 'Display',
        order: 18
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Suppress Zero / Null Entities',
        default: false,
        section: 'Display',
        order: 19
      },
      hudMode: {
        type: 'string',
        label: 'Executive Scorecard HUD Mode',
        display: 'select',
        values: [
          { 'Full Scorecard HUD (Top Band)': 'scorecard' },
          { 'Compact Metric Strip': 'compact_strip' },
          { 'Hidden': 'hidden' }
        ],
        default: 'scorecard',
        section: 'Display',
        order: 20
      },
      showValueLabels: {
        type: 'string',
        label: 'Data Value Readouts',
        display: 'select',
        values: [
          { 'Show All Numbers': 'all' },
          { 'Top Performers & Breaches Only': 'peaks_only' },
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
        label: 'Custom Subtitle / Description Override',
        default: '',
        section: 'Display',
        order: 23
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Real-Time Facility Search Bar',
        default: true,
        section: 'Display',
        order: 24
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorTheme: {
        type: 'string',
        label: 'Brand Palette Preset',
        display: 'select',
        values: [
          { 'Wellverse Healthcare (Clinical Navy & Emerald)': 'wellverse_healthcare' },
          { 'Google Enterprise (Classic Clean)': 'google_enterprise' },
          { 'Modern Slate (Executive Indigo)': 'modern_slate' },
          { 'Cyberpunk Dark (High-Contrast Midnight)': 'cyberpunk_dark' },
          { 'Emerald FinOps (Green Growth)': 'emerald_finops' },
          { 'Sunset Media (Warm Amber & Tangerine)': 'sunset_media' },
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
        label: 'Custom Positive / Compliant Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 3
      },
      customNegativeColor: {
        type: 'string',
        label: 'Custom Alert / Breach Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 4
      },
      metricPolarity: {
        type: 'string',
        label: 'Metric Polarity (Goal Direction)',
        display: 'select',
        values: [
          { 'Higher is Better (Fill Rate, On-Time, Spend)': 'higher_better' },
          { 'Lower is Better (Backorder Rate, Delivery Days)': 'lower_better' }
        ],
        default: 'higher_better',
        section: 'Style',
        order: 5
      },
      fontScale: {
        type: 'string',
        label: 'Typography Scale',
        display: 'select',
        values: [
          { 'Compact (Dense Dashboard)': 'compact' },
          { 'Standard (Default)': 'standard' },
          { 'Large (Presentation / Stage)': 'large' }
        ],
        default: 'standard',
        section: 'Style',
        order: 6
      },
      valueFormat: {
        type: 'string',
        label: 'Numeric Formatting Preset',
        display: 'select',
        values: [
          { 'Percentage (98.2%)': 'percentage' },
          { 'Compact Currency ($1.2M)': 'compact_currency' },
          { 'Compact Number (1.2M)': 'compact_number' },
          { 'Decimal (2 Decimals)': 'decimal_2' },
          { 'Auto (Preserve Looker Format)': 'auto' },
          { 'Raw Unformatted': 'raw' }
        ],
        default: 'percentage',
        section: 'Style',
        order: 7
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        entityDimOverride: { role: 'dimension', defaultIdx: 0 },
        regionDimOverride: { role: 'dimension', defaultIdx: 1 },
        fillRateMeasOverride: { role: 'measure', defaultIdx: 0 },
        onTimeMeasOverride: { role: 'measure', defaultIdx: 1 },
        backorderMeasOverride: { role: 'measure', defaultIdx: 2 },
        daysToDeliverMeasOverride: { role: 'measure', defaultIdx: 3 },
        spendMeasOverride: { role: 'measure', defaultIdx: 4 }
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

      Object.keys(FIELD_ROLE_OPTIONS).forEach(function (optKey) {
        var spec = FIELD_ROLE_OPTIONS[optKey];
        var pool = spec.role === 'dimension' ? dims : meas;
        if (!newOptions[optKey]) return;

        var vals = [];
        if (spec.defaultIdx < 0) {
          vals.push({ 'Auto / None': '' });
        } else {
          var autoField = pool[spec.defaultIdx] || pool[0];
          var autoLabel = autoField ? ('Auto (' + (autoField.label_short || autoField.label || autoField.name) + ')') : 'Auto';
          vals.push({});
          vals[0][autoLabel] = '';
        }

        pool.forEach(function (fld) {
          var label = (fld.label_short || fld.label || fld.name) + ' (' + fld.name + ')';
          var entry = {};
          entry[label] = fld.name;
          vals.push(entry);
        });

        newOptions[optKey].values = vals;
      });

      try {
        self.trigger('registerOptions', newOptions);
      } catch (err) {}
    },

    create: function (element, config) {
      element.innerHTML = '';
      element.style.boxSizing = 'border-box';
      element.style.padding = '0';
      element.style.overflow = 'hidden';

      var container = document.createElement('div');
      container.className = 'med-surg-fulfillment-container';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.boxSizing = 'border-box';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.overflow = 'hidden';
      container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

      element.appendChild(container);
      this._container = container;
      this._searchFilter = '';
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      var self = this;
      if (this.clearErrors) try { this.clearErrors(); } catch (e) {}

      if (!queryResponse || !queryResponse.fields) {
        if (done) done();
        return;
      }

      this._registerDynamicFieldOptions(queryResponse);

      ensureD3(function (d3) {
        self._render(d3, data, element, config, queryResponse, details, done);
      });
    },

    _render: function (d3, data, element, config, queryResponse, details, done) {
      var self = this;
      var container = this._container;
      if (!container) {
        if (done) done();
        return;
      }
      container.innerHTML = '';

      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var meas = fields.measures || [];
      if (!meas.length && fields.table_calculations && fields.table_calculations.length) {
        meas = fields.table_calculations;
      }

      var entityField = resolveField(dims, config.entityDimOverride, 0) || dims[0];
      var regionField = dims.length > 1 ? resolveField(dims, config.regionDimOverride, 1) : null;
      var fillRateField = resolveField(meas, config.fillRateMeasOverride, 0) || meas[0];
      var onTimeField = resolveField(meas, config.onTimeMeasOverride, 1) || meas[1] || fillRateField;
      var backorderField = resolveField(meas, config.backorderMeasOverride, 2);
      var daysField = resolveField(meas, config.daysToDeliverMeasOverride, 3);
      var spendField = resolveField(meas, config.spendMeasOverride, 4) || meas[meas.length - 1];

      if (!data || data.length === 0 || !entityField) {
        var emptyMsg = document.createElement('div');
        emptyMsg.style.padding = '30px';
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.color = '#64748b';
        emptyMsg.textContent = 'No fulfillment SLA data returned for current selection.';
        container.appendChild(emptyMsg);
        if (done) done();
        return;
      }

      // Palette Resolution
      var themeKey = config.colorTheme || 'wellverse_healthcare';
      var theme = Object.assign({}, PALETTES[themeKey] || PALETTES.wellverse_healthcare);
      if (themeKey === 'custom') {
        if (config.customPrimaryColor) theme.primary = config.customPrimaryColor;
        if (config.customPositiveColor) {
          theme.fillRate = config.customPositiveColor;
          theme.goldTier = config.customPositiveColor;
        }
        if (config.customNegativeColor) {
          theme.backorder = config.customNegativeColor;
          theme.criticalTier = config.customNegativeColor;
        }
      }
      var isDark = themeKey === 'cyberpunk_dark';
      container.style.backgroundColor = isDark ? '#0f172a' : '#ffffff';
      container.style.color = theme.text;

      // Font Scale
      var fontScale = config.fontScale || 'standard';
      var baseFontSize = fontScale === 'compact' ? '11.5px' : fontScale === 'large' ? '14px' : '12.5px';
      container.style.fontSize = baseFontSize;

      // Data extraction
      var rawItems = [];
      data.forEach(function (row, idx) {
        var nameCell = row[entityField.name];
        var name = nameCell ? (nameCell.rendered || nameCell.value) : ('DC ' + (idx + 1));
        var region = (regionField && row[regionField.name]) ? (row[regionField.name].rendered || row[regionField.name].value) : '';

        var fillVal = (row[fillRateField.name] && row[fillRateField.name].value !== null) ? Number(row[fillRateField.name].value) : 0;
        var onTimeVal = (row[onTimeField.name] && row[onTimeField.name].value !== null) ? Number(row[onTimeField.name].value) : 0;
        var boVal = (backorderField && row[backorderField.name] && row[backorderField.name].value !== null) ? Number(row[backorderField.name].value) : 0;
        var daysVal = (daysField && row[daysField.name] && row[daysField.name].value !== null) ? Number(row[daysField.name].value) : 0;
        var spendVal = (spendField && row[spendField.name] && row[spendField.name].value !== null) ? Number(row[spendField.name].value) : 0;

        // Links
        var links = [];
        if (nameCell && nameCell.links) links = links.concat(nameCell.links);
        if (row[fillRateField.name] && row[fillRateField.name].links) links = links.concat(row[fillRateField.name].links);
        if (row[spendField.name] && row[spendField.name].links) links = links.concat(row[spendField.name].links);

        rawItems.push({
          id: String(nameCell ? nameCell.value : idx),
          name: String(name),
          region: String(region),
          fillRate: fillVal,
          onTime: onTimeVal,
          backorderRate: boVal,
          daysToDeliver: daysVal,
          spend: spendVal,
          links: links
        });
      });

      // Filter zero/null
      if (config.suppressZeroNull) {
        rawItems = rawItems.filter(function (d) { return d.spend > 0 || d.fillRate > 0; });
      }

      // Search filter
      var searchKeyword = (self._searchFilter || '').trim().toLowerCase();
      var items = rawItems;
      if (searchKeyword) {
        items = rawItems.filter(function (d) {
          return d.name.toLowerCase().indexOf(searchKeyword) >= 0 || d.region.toLowerCase().indexOf(searchKeyword) >= 0;
        });
      }

      // Calculate Target Benchmarks
      var targetMode = config.targetCalculationMode || 'fixed_sla';
      var targetFill = (Number(config.targetLineFillPct) || 98.0) / 100.0;
      var targetOnTime = (Number(config.targetOnTimePct) || 85.0) / 100.0;
      var ceilingDays = Number(config.targetDaysToDeliver) || 2.0;

      if (targetMode === 'dataset_mean' && items.length > 0) {
        targetFill = d3.mean(items, function (d) { return d.fillRate; }) || targetFill;
        targetOnTime = d3.mean(items, function (d) { return d.onTime; }) || targetOnTime;
      } else if (targetMode === 'dataset_median' && items.length > 0) {
        targetFill = d3.median(items, function (d) { return d.fillRate; }) || targetFill;
        targetOnTime = d3.median(items, function (d) { return d.onTime; }) || targetOnTime;
      } else if (targetMode === 'percentile_p75' && items.length > 0) {
        targetFill = d3.quantile(items.map(function (d) { return d.fillRate; }).sort(d3.ascending), 0.75) || targetFill;
        targetOnTime = d3.quantile(items.map(function (d) { return d.onTime; }).sort(d3.ascending), 0.75) || targetOnTime;
      } else if (targetMode === 'percentile_p90' && items.length > 0) {
        targetFill = d3.quantile(items.map(function (d) { return d.fillRate; }).sort(d3.ascending), 0.90) || targetFill;
        targetOnTime = d3.quantile(items.map(function (d) { return d.onTime; }).sort(d3.ascending), 0.90) || targetOnTime;
      }

      // Assign SLA Tiers to each item
      items.forEach(function (d) {
        d.sla = getSlaTier(d.fillRate, d.onTime, targetFill, targetOnTime);
      });

      // Sorting
      var sortBy = config.sortBy || 'spend_desc';
      items.sort(function (a, b) {
        if (sortBy === 'spend_desc') return b.spend - a.spend;
        if (sortBy === 'fill_rate_desc') return b.fillRate - a.fillRate;
        if (sortBy === 'on_time_desc') return b.onTime - a.onTime;
        if (sortBy === 'backorder_desc') return b.backorderRate - a.backorderRate;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        return 0;
      });

      // Top-N handling with Other rollup
      var topN = parseInt(config.topNLimit, 10);
      if (topN > 0 && items.length > topN) {
        var topItems = items.slice(0, topN);
        if (config.enableOtherRollup) {
          var otherItems = items.slice(topN);
          var otherSpend = d3.sum(otherItems, function (d) { return d.spend; });
          var otherFill = d3.mean(otherItems, function (d) { return d.fillRate; }) || 0;
          var otherOnTime = d3.mean(otherItems, function (d) { return d.onTime; }) || 0;
          var otherBO = d3.mean(otherItems, function (d) { return d.backorderRate; }) || 0;
          var otherDays = d3.mean(otherItems, function (d) { return d.daysToDeliver; }) || 0;
          topItems.push({
            id: 'other_rollup',
            name: 'Other Facilities (' + otherItems.length + ' DCs)',
            region: 'Various',
            fillRate: otherFill,
            onTime: otherOnTime,
            backorderRate: otherBO,
            daysToDeliver: otherDays,
            spend: otherSpend,
            sla: getSlaTier(otherFill, otherOnTime, targetFill, targetOnTime),
            links: []
          });
        }
        items = topItems;
      }

      // Network Totals for HUD
      var totalNetworkSpend = d3.sum(rawItems, function (d) { return d.spend; });
      var avgFillRate = d3.mean(rawItems, function (d) { return d.fillRate; }) || 0;
      var avgOnTime = d3.mean(rawItems, function (d) { return d.onTime; }) || 0;
      var avgBackorder = d3.mean(rawItems, function (d) { return d.backorderRate; }) || 0;
      var breachCount = rawItems.filter(function (d) { return d.sla.tier === 'Critical'; }).length;

      // ==========================================
      // 1. HEADER ROW (Title, Subtitle & Search)
      // ==========================================
      var headerRow = document.createElement('div');
      headerRow.style.display = 'flex';
      headerRow.style.alignItems = 'center';
      headerRow.style.justifyContent = 'space-between';
      headerRow.style.padding = '8px 14px';
      headerRow.style.borderBottom = '1px solid ' + (isDark ? '#334155' : theme.border);
      headerRow.style.flexWrap = 'wrap';
      headerRow.style.gap = '8px';

      var titleBox = document.createElement('div');
      titleBox.style.display = 'flex';
      titleBox.style.flexDirection = 'column';
      titleBox.style.gap = '2px';

      var titleElem = document.createElement('div');
      titleElem.style.fontSize = '14px';
      titleElem.style.fontWeight = '700';
      titleElem.style.color = theme.text;
      titleElem.textContent = config.customTitle || 'Med-Surg Fulfillment & SLA Performance Matrix';
      titleBox.appendChild(titleElem);

      var subElem = document.createElement('div');
      subElem.style.fontSize = '11px';
      subElem.style.color = theme.subtext;
      subElem.textContent = config.customSubtitle || ('Fulfillment SLA Tracking: Line Fill Target ' + (targetFill * 100).toFixed(1) + '% · On-Time Delivery Target ' + (targetOnTime * 100).toFixed(1) + '%');
      titleBox.appendChild(subElem);
      headerRow.appendChild(titleBox);

      // Search bar
      if (config.showSearch !== false) {
        var searchBox = document.createElement('div');
        searchBox.style.display = 'flex';
        searchBox.style.alignItems = 'center';
        searchBox.style.gap = '6px';

        var searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search distribution centers...';
        searchInput.value = self._searchFilter || '';
        searchInput.style.fontSize = '11.5px';
        searchInput.style.padding = '4px 8px';
        searchInput.style.borderRadius = '5px';
        searchInput.style.border = '1px solid ' + (isDark ? '#475569' : '#cbd5e1');
        searchInput.style.backgroundColor = isDark ? '#1e293b' : '#ffffff';
        searchInput.style.color = theme.text;
        searchInput.style.outline = 'none';

        searchInput.addEventListener('input', function (e) {
          self._searchFilter = e.target.value;
          self._render(d3, data, element, config, queryResponse, details, done);
        });

        searchBox.appendChild(searchInput);
        headerRow.appendChild(searchBox);
      }
      container.appendChild(headerRow);

      // ==========================================
      // 2. EXECUTIVE SCORECARD HUD
      // ==========================================
      var hudMode = config.hudMode || 'scorecard';
      if (hudMode !== 'hidden') {
        var hudBand = document.createElement('div');
        hudBand.style.display = 'flex';
        hudBand.style.gap = '8px';
        hudBand.style.padding = '8px 14px';
        hudBand.style.backgroundColor = isDark ? '#0f172a' : theme.track;
        hudBand.style.borderBottom = '1px solid ' + (isDark ? '#334155' : theme.border);
        hudBand.style.flexWrap = 'wrap';

        var fillDelta = (avgFillRate - targetFill) * 100;
        var fillDeltaStr = (fillDelta >= 0 ? '+' : '') + fillDelta.toFixed(1) + '% vs SLA';
        var fillColor = fillDelta >= 0 ? theme.fillRate : theme.criticalTier;

        var onTimeDelta = (avgOnTime - targetOnTime) * 100;
        var onTimeDeltaStr = (onTimeDelta >= 0 ? '+' : '') + onTimeDelta.toFixed(1) + '% vs SLA';
        var onTimeColor = onTimeDelta >= 0 ? theme.onTime : theme.criticalTier;

        hudBand.appendChild(makeHudCard('Network Logistics Spend', formatValue(totalNetworkSpend, 'compact_currency'), rawItems.length + ' Distribution Centers', theme.primary, theme, isDark));
        hudBand.appendChild(makeHudCard('Network Line Fill Rate', (avgFillRate * 100).toFixed(1) + '%', fillDeltaStr, fillColor, theme, isDark));
        hudBand.appendChild(makeHudCard('On-Time Delivery Rate', (avgOnTime * 100).toFixed(1) + '%', onTimeDeltaStr, onTimeColor, theme, isDark));
        hudBand.appendChild(makeHudCard('Average Backorder Rate', (avgBackorder * 100).toFixed(2) + '%', 'Target < 1.50%', theme.backorder, theme, isDark));
        hudBand.appendChild(makeHudCard('SLA Breach Alerts', String(breachCount) + ' DCs', breachCount > 0 ? 'Shortfall Intervention Needed' : 'All Centers Compliant', breachCount > 0 ? theme.criticalTier : theme.goldTier, theme, isDark));

        container.appendChild(hudBand);
      }

      // ==========================================
      // 3. MAIN VISUALIZATION CONTENT AREA
      // ==========================================
      var mainArea = document.createElement('div');
      mainArea.className = 'med-surg-fulfillment-main';
      mainArea.style.flex = '1 1 0';
      mainArea.style.minHeight = '0';
      mainArea.style.position = 'relative';
      mainArea.style.overflow = 'hidden';
      container.appendChild(mainArea);

      var layout = config.layoutMode || 'fulfillment_sla_quadrant';

      if (layout === 'fulfillment_sla_quadrant') {
        self._renderQuadrant(d3, mainArea, items, config, theme, isDark, targetFill, targetOnTime);
      } else if (layout === 'sla_variance_dumbbell') {
        self._renderDumbbell(d3, mainArea, items, config, theme, isDark, targetFill, targetOnTime);
      } else if (layout === 'fulfillment_risk_matrix') {
        self._renderRiskMatrix(d3, mainArea, items, config, theme, isDark, targetFill, targetOnTime, ceilingDays);
      } else {
        self._renderScorecardTable(d3, mainArea, items, config, theme, isDark, targetFill, targetOnTime);
      }

      // Attach ResizeObserver (<4px guard)
      if (!self._resizeObserver && window.ResizeObserver) {
        var lastWidth = 0;
        var lastHeight = 0;
        self._resizeObserver = new ResizeObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            var cr = entries[i].contentRect;
            if (Math.abs(cr.width - lastWidth) >= 4 || Math.abs(cr.height - lastHeight) >= 4) {
              lastWidth = cr.width;
              lastHeight = cr.height;
              self._render(d3, data, element, config, queryResponse, details, null);
            }
          }
        });
        self._resizeObserver.observe(element);
      }

      if (done) done();
    },

    // -------------------------------------------------------------
    // LAYOUT 1: FULFILLMENT SLA STRATEGIC QUADRANT (2D MATRIX)
    // -------------------------------------------------------------
    _renderQuadrant: function (d3, container, items, config, theme, isDark, targetFill, targetOnTime) {
      var self = this;
      var width = container.clientWidth || 600;
      var height = container.clientHeight || 400;
      var margin = { top: 28, right: 36, bottom: 44, left: 56 };

      var innerW = Math.max(width - margin.left - margin.right, 100);
      var innerH = Math.max(height - margin.top - margin.bottom, 100);

      var svg = d3.select(container).append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('display', 'block');

      var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // Scales
      var minFill = d3.min(items, function (d) { return d.fillRate; }) || 0.90;
      var maxFill = d3.max(items, function (d) { return d.fillRate; }) || 1.0;
      var xDomain = [Math.max(0.85, Math.min(minFill - 0.02, targetFill - 0.03)), Math.min(1.01, Math.max(maxFill + 0.01, 1.0))];

      var minOnTime = d3.min(items, function (d) { return d.onTime; }) || 0.70;
      var maxOnTime = d3.max(items, function (d) { return d.onTime; }) || 0.95;
      var yDomain = [Math.max(0.60, Math.min(minOnTime - 0.03, targetOnTime - 0.05)), Math.min(1.0, Math.max(maxOnTime + 0.03, 0.98))];

      var xScale = d3.scaleLinear().domain(xDomain).range([0, innerW]);
      var yScale = d3.scaleLinear().domain(yDomain).range([innerH, 0]);

      var maxSpend = d3.max(items, function (d) { return d.spend; }) || 1;
      var rScale = d3.scaleSqrt().domain([0, maxSpend]).range([7, 24]);

      // Quadrant Shading
      var xTarget = Math.max(0, Math.min(innerW, xScale(targetFill)));
      var yTarget = Math.max(0, Math.min(innerH, yScale(targetOnTime)));

      if (config.showReferenceLines !== false) {
        // Gold Tier (Top-Right: Fill >= target & OnTime >= target)
        g.append('rect')
          .attr('x', xTarget)
          .attr('y', 0)
          .attr('width', innerW - xTarget)
          .attr('height', yTarget)
          .attr('fill', theme.goldTier)
          .attr('fill-opacity', isDark ? 0.08 : 0.05);

        // Fill Shortfall (Top-Left: Fill < target & OnTime >= target)
        g.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', xTarget)
          .attr('height', yTarget)
          .attr('fill', theme.watchlistTier)
          .attr('fill-opacity', isDark ? 0.06 : 0.04);

        // On-Time Bottleneck (Bottom-Right: Fill >= target & OnTime < target)
        g.append('rect')
          .attr('x', xTarget)
          .attr('y', yTarget)
          .attr('width', innerW - xTarget)
          .attr('height', innerH - yTarget)
          .attr('fill', theme.onTime)
          .attr('fill-opacity', isDark ? 0.06 : 0.04);

        // Critical Breach (Bottom-Left: Fill < target & OnTime < target)
        g.append('rect')
          .attr('x', 0)
          .attr('y', yTarget)
          .attr('width', xTarget)
          .attr('height', innerH - yTarget)
          .attr('fill', theme.criticalTier)
          .attr('fill-opacity', isDark ? 0.08 : 0.05);

        // Target Reference Lines
        g.append('line')
          .attr('x1', xTarget)
          .attr('x2', xTarget)
          .attr('y1', 0)
          .attr('y2', innerH)
          .attr('stroke', theme.fillRate)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,4');

        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', yTarget)
          .attr('y2', yTarget)
          .attr('stroke', theme.onTime)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,4');

        // Reference Labels
        g.append('text')
          .attr('x', xTarget + 5)
          .attr('y', 14)
          .attr('fill', theme.fillRate)
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .text('Fill SLA: ' + (targetFill * 100).toFixed(1) + '%');

        g.append('text')
          .attr('x', innerW - 5)
          .attr('y', yTarget - 6)
          .attr('text-anchor', 'end')
          .attr('fill', theme.onTime)
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .text('On-Time SLA: ' + (targetOnTime * 100).toFixed(1) + '%');
      }

      // Quadrant Watermarks
      g.append('text')
        .attr('x', innerW - 10)
        .attr('y', 28)
        .attr('text-anchor', 'end')
        .attr('fill', theme.goldTier)
        .attr('fill-opacity', 0.45)
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .text('★ TIER 1 GOLD SLA');

      g.append('text')
        .attr('x', 10)
        .attr('y', innerH - 10)
        .attr('fill', theme.criticalTier)
        .attr('fill-opacity', 0.45)
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .text('▲ DUAL SLA BREACH');

      // Gridlines
      var xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(function (d) { return (d * 100).toFixed(0) + '%'; });
      var yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(function (d) { return (d * 100).toFixed(0) + '%'; });

      g.append('g')
        .attr('transform', 'translate(0,' + innerH + ')')
        .call(xAxis)
        .attr('color', isDark ? '#475569' : theme.border);

      g.append('g')
        .call(yAxis)
        .attr('color', isDark ? '#475569' : theme.border);

      // Axis Titles
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 34)
        .attr('text-anchor', 'middle')
        .attr('fill', theme.subtext)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text('Clinical Line Fill Rate (%) →');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2)
        .attr('y', -42)
        .attr('text-anchor', 'middle')
        .attr('fill', theme.subtext)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text('On-Time Delivery Rate (%) →');

      // Tooltip Element
      var tooltip = d3.select(container).append('div')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background', theme.tooltipBg)
        .style('color', theme.tooltipText)
        .style('padding', '8px 12px')
        .style('border-radius', '6px')
        .style('font-size', '11px')
        .style('pointer-events', 'none')
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
        .style('z-index', '100');

      // Bubbles
      var bubbles = g.selectAll('.sla-bubble')
        .data(items)
        .enter()
        .append('g')
        .attr('class', 'sla-bubble')
        .attr('transform', function (d) { return 'translate(' + xScale(d.fillRate) + ',' + yScale(d.onTime) + ')'; })
        .style('cursor', function (d) { return d.links.length ? 'pointer' : 'default'; });

      bubbles.append('circle')
        .attr('r', function (d) { return rScale(d.spend); })
        .attr('fill', function (d) { return d.sla.color; })
        .attr('fill-opacity', 0.8)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5);

      // Value labels
      if (config.showValueLabels !== 'hidden') {
        bubbles.append('text')
          .attr('dy', function (d) { return -rScale(d.spend) - 4; })
          .attr('text-anchor', 'middle')
          .attr('font-size', '10.5px')
          .attr('font-weight', '600')
          .attr('fill', theme.text)
          .text(function (d) {
            if (config.showValueLabels === 'peaks_only') {
              return (d.sla.tier === 'Gold Tier' || d.sla.tier === 'Critical') ? d.name : '';
            }
            return d.name;
          });
      }

      // Interactions
      bubbles
        .on('mouseover', function (event, d) {
          d3.select(this).select('circle')
            .attr('stroke', theme.primary)
            .attr('stroke-width', 2.5);

          var html = '<strong>' + d.name + '</strong>' + (d.region ? ' (' + d.region + ')' : '') + '<br/>' +
            'SLA Status: <span style=\"color:' + d.sla.color + ';font-weight:700;\">' + d.sla.badge + '</span><br/>' +
            'Line Fill Rate: ' + (d.fillRate * 100).toFixed(1) + '% (Target: ' + (targetFill * 100).toFixed(1) + '%)<br/>' +
            'On-Time Delivery: ' + (d.onTime * 100).toFixed(1) + '% (Target: ' + (targetOnTime * 100).toFixed(1) + '%)<br/>' +
            'Backorder Rate: ' + (d.backorderRate * 100).toFixed(2) + '%<br/>' +
            'Avg Delivery: ' + d.daysToDeliver.toFixed(1) + ' Days<br/>' +
            'Total Spend: ' + formatValue(d.spend, 'compact_currency');

          if (d.links.length) {
            html += '<br/><span style=\"font-size:9.5px;color:#94a3b8;\">Click to drill Looker details</span>';
          }

          tooltip.html(html)
            .style('visibility', 'visible')
            .style('left', (event.offsetX + 15) + 'px')
            .style('top', (event.offsetY - 20) + 'px');
        })
        .on('mousemove', function (event) {
          tooltip
            .style('left', (event.offsetX + 15) + 'px')
            .style('top', (event.offsetY - 20) + 'px');
        })
        .on('mouseout', function () {
          d3.select(this).select('circle')
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.5);
          tooltip.style('visibility', 'hidden');
        })
        .on('click', function (event, d) {
          if (d.links.length && window.LookerCharts && window.LookerCharts.Utils) {
            window.LookerCharts.Utils.openDrillMenu({
              links: d.links,
              event: event
            });
          }
        });
    },

    // -------------------------------------------------------------
    // LAYOUT 2: PAIRED SLA PERFORMANCE DUMBBELLS
    // -------------------------------------------------------------
    _renderDumbbell: function (d3, container, items, config, theme, isDark, targetFill, targetOnTime) {
      var width = container.clientWidth || 600;
      var height = container.clientHeight || 400;
      var margin = { top: 25, right: 110, bottom: 35, left: 130 };

      var rowHeight = Math.max(26, Math.min(42, Math.floor((height - margin.top - margin.bottom) / Math.max(items.length, 1))));
      var totalH = margin.top + margin.bottom + (items.length * rowHeight);

      var scrollBox = d3.select(container).append('div')
        .style('width', '100%')
        .style('height', '100%')
        .style('overflow-y', 'auto');

      var svg = scrollBox.append('svg')
        .attr('width', width)
        .attr('height', Math.max(height, totalH))
        .style('display', 'block');

      var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var innerW = Math.max(width - margin.left - margin.right, 100);

      var minVal = Math.min(d3.min(items, function (d) { return Math.min(d.fillRate, d.onTime); }) || 0.70, targetOnTime - 0.05);
      var xScale = d3.scaleLinear().domain([Math.max(0.60, minVal), 1.01]).range([0, innerW]);

      // SLA Target Reference Lines
      if (config.showReferenceLines !== false) {
        g.append('line')
          .attr('x1', xScale(targetFill))
          .attr('x2', xScale(targetFill))
          .attr('y1', 0)
          .attr('y2', items.length * rowHeight)
          .attr('stroke', theme.fillRate)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,4');

        g.append('text')
          .attr('x', xScale(targetFill))
          .attr('y', -6)
          .attr('text-anchor', 'middle')
          .attr('fill', theme.fillRate)
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .text('Fill SLA ' + (targetFill * 100).toFixed(0) + '%');

        g.append('line')
          .attr('x1', xScale(targetOnTime))
          .attr('x2', xScale(targetOnTime))
          .attr('y1', 0)
          .attr('y2', items.length * rowHeight)
          .attr('stroke', theme.onTime)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,4');

        g.append('text')
          .attr('x', xScale(targetOnTime))
          .attr('y', -6)
          .attr('text-anchor', 'middle')
          .attr('fill', theme.onTime)
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .text('On-Time ' + (targetOnTime * 100).toFixed(0) + '%');
      }

      // X-Axis
      var xAxis = d3.axisBottom(xScale).ticks(5).tickFormat(function (d) { return (d * 100).toFixed(0) + '%'; });
      g.append('g')
        .attr('transform', 'translate(0,' + (items.length * rowHeight) + ')')
        .call(xAxis)
        .attr('color', isDark ? '#475569' : theme.border);

      // Rows
      items.forEach(function (d, idx) {
        var rowG = g.append('g')
          .attr('transform', 'translate(0,' + (idx * rowHeight) + ')')
          .style('cursor', d.links.length ? 'pointer' : 'default');

        // Alternating striping
        rowG.append('rect')
          .attr('x', -margin.left)
          .attr('y', 0)
          .attr('width', width)
          .attr('height', rowHeight)
          .attr('fill', idx % 2 === 0 ? (isDark ? '#1e293b' : theme.track) : 'transparent')
          .attr('opacity', 0.5);

        // Entity Label
        rowG.append('text')
          .attr('x', -10)
          .attr('y', rowHeight / 2 + 4)
          .attr('text-anchor', 'end')
          .attr('fill', theme.text)
          .attr('font-size', '11.5px')
          .attr('font-weight', '600')
          .text(d.name);

        var x1 = xScale(d.onTime);
        var x2 = xScale(d.fillRate);

        // Connecting Dumbbell Bar
        rowG.append('line')
          .attr('x1', Math.min(x1, x2))
          .attr('x2', Math.max(x1, x2))
          .attr('y1', rowHeight / 2)
          .attr('y2', rowHeight / 2)
          .attr('stroke', d.sla.color)
          .attr('stroke-width', 4)
          .attr('stroke-linecap', 'round')
          .attr('stroke-opacity', 0.7);

        // On-Time Point (Sky Blue)
        rowG.append('circle')
          .attr('cx', x1)
          .attr('cy', rowHeight / 2)
          .attr('r', 5.5)
          .attr('fill', theme.onTime)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5);

        // Line Fill Point (Emerald)
        rowG.append('circle')
          .attr('cx', x2)
          .attr('cy', rowHeight / 2)
          .attr('r', 6.5)
          .attr('fill', theme.fillRate)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5);

        // SLA Badge on Right
        rowG.append('rect')
          .attr('x', innerW + 12)
          .attr('y', rowHeight / 2 - 9)
          .attr('width', 82)
          .attr('height', 18)
          .attr('rx', 4)
          .attr('fill', d.sla.bg);

        rowG.append('text')
          .attr('x', innerW + 53)
          .attr('y', rowHeight / 2 + 3.5)
          .attr('text-anchor', 'middle')
          .attr('fill', d.sla.color)
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .text(d.sla.badge);

        // Click drill
        rowG.on('click', function (event) {
          if (d.links.length && window.LookerCharts && window.LookerCharts.Utils) {
            window.LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
          }
        });
      });
    },

    // -------------------------------------------------------------
    // LAYOUT 3: CLINICAL SERVICE LEVEL HEATMAP MATRIX
    // -------------------------------------------------------------
    _renderRiskMatrix: function (d3, container, items, config, theme, isDark, targetFill, targetOnTime, ceilingDays) {
      var width = container.clientWidth || 600;
      var height = container.clientHeight || 400;

      var metrics = [
        { key: 'fillRate', label: 'Line Fill Rate', target: targetFill, format: 'percentage', higherBetter: true },
        { key: 'onTime', label: 'On-Time Delivery', target: targetOnTime, format: 'percentage', higherBetter: true },
        { key: 'backorderRate', label: 'Backorder Rate', target: 0.015, format: 'percentage', higherBetter: false },
        { key: 'daysToDeliver', label: 'Avg Delivery Days', target: ceilingDays, format: 'decimal_2', higherBetter: false },
        { key: 'spend', label: 'Total Volume', target: null, format: 'compact_currency', higherBetter: true }
      ];

      var scrollBox = d3.select(container).append('div')
        .style('width', '100%')
        .style('height', '100%')
        .style('overflow-y', 'auto')
        .style('padding', '10px');

      var table = scrollBox.append('table')
        .style('width', '100%')
        .style('border-collapse', 'collapse')
        .style('font-size', '12px');

      // Thead
      var thead = table.append('thead');
      var headTr = thead.append('tr')
        .style('border-bottom', '2px solid ' + (isDark ? '#334155' : theme.border));

      headTr.append('th')
        .style('padding', '8px 12px')
        .style('text-align', 'left')
        .style('font-weight', '700')
        .style('color', theme.subtext)
        .text('Distribution Center');

      metrics.forEach(function (m) {
        headTr.append('th')
          .style('padding', '8px 12px')
          .style('text-align', 'right')
          .style('font-weight', '700')
          .style('color', theme.subtext)
          .text(m.label);
      });

      headTr.append('th')
        .style('padding', '8px 12px')
        .style('text-align', 'center')
        .style('font-weight', '700')
        .style('color', theme.subtext)
        .text('SLA Governance');

      // Tbody
      var tbody = table.append('tbody');
      items.forEach(function (d, idx) {
        var tr = tbody.append('tr')
          .style('border-bottom', '1px solid ' + (isDark ? '#1e293b' : theme.grid))
          .style('background', idx % 2 === 0 ? (isDark ? '#1e293b' : theme.track) : 'transparent')
          .style('cursor', d.links.length ? 'pointer' : 'default');

        tr.append('td')
          .style('padding', '8px 12px')
          .style('font-weight', '600')
          .style('color', theme.text)
          .html(d.name + (d.region ? ' <span style=\"font-size:10px;color:' + theme.subtext + ';\">(' + d.region + ')</span>' : ''));

        metrics.forEach(function (m) {
          var val = d[m.key];
          var cellBg = 'transparent';
          var cellColor = theme.text;

          if (m.target !== null) {
            var isGood = m.higherBetter ? (val >= m.target) : (val <= m.target);
            var isBorderline = m.higherBetter ? (val >= m.target * 0.97) : (val <= m.target * 1.15);
            if (isGood) {
              cellBg = isDark ? '#064e3b' : '#d1fae5';
              cellColor = isDark ? '#a7f3d0' : '#065f46';
            } else if (isBorderline) {
              cellBg = isDark ? '#78350f' : '#fef3c7';
              cellColor = isDark ? '#fde68a' : '#92400e';
            } else {
              cellBg = isDark ? '#881337' : '#fee2e2';
              cellColor = isDark ? '#fecdd3' : '#991b1b';
            }
          }

          tr.append('td')
            .style('padding', '8px 12px')
            .style('text-align', 'right')
            .style('font-weight', '600')
            .style('background', cellBg)
            .style('color', cellColor)
            .text(formatValue(val, m.format));
        });

        var tdBadge = tr.append('td')
          .style('padding', '8px 12px')
          .style('text-align', 'center');

        tdBadge.append('span')
          .style('display', 'inline-block')
          .style('padding', '2px 8px')
          .style('border-radius', '4px')
          .style('font-size', '10px')
          .style('font-weight', '700')
          .style('background', d.sla.bg)
          .style('color', d.sla.color)
          .text(d.sla.badge);

        tr.on('click', function (event) {
          if (d.links.length && window.LookerCharts && window.LookerCharts.Utils) {
            window.LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
          }
        });
      });
    },

    // -------------------------------------------------------------
    // LAYOUT 4: EXECUTIVE FULFILLMENT SCORECARD TABLE
    // -------------------------------------------------------------
    _renderScorecardTable: function (d3, container, items, config, theme, isDark, targetFill, targetOnTime) {
      var scrollBox = d3.select(container).append('div')
        .style('width', '100%')
        .style('height', '100%')
        .style('overflow', 'auto')
        .style('padding', '10px');

      var table = scrollBox.append('table')
        .style('width', '100%')
        .style('border-collapse', 'collapse')
        .style('font-size', '12px');

      var thead = table.append('thead');
      var headTr = thead.append('tr')
        .style('border-bottom', '2px solid ' + (isDark ? '#334155' : theme.border));

      ['Distribution Center', 'Region', 'Total Spend', 'Line Fill Rate', 'On-Time Delivery', 'Backorder Rate', 'Delivery Lead Time', 'Contract Status'].forEach(function (h, idx) {
        headTr.append('th')
          .style('padding', '8px 12px')
          .style('text-align', idx >= 2 && idx <= 6 ? 'right' : idx === 7 ? 'center' : 'left')
          .style('color', theme.subtext)
          .style('font-weight', '700')
          .text(h);
      });

      var tbody = table.append('tbody');
      items.forEach(function (d, idx) {
        var tr = tbody.append('tr')
          .style('border-bottom', '1px solid ' + (isDark ? '#1e293b' : theme.grid))
          .style('background', idx % 2 === 0 ? (isDark ? '#1e293b' : theme.track) : 'transparent')
          .style('cursor', d.links.length ? 'pointer' : 'default');

        tr.append('td').style('padding', '8px 12px').style('font-weight', '600').style('color', theme.text).text(d.name);
        tr.append('td').style('padding', '8px 12px').style('color', theme.subtext).text(d.region || '-');
        tr.append('td').style('padding', '8px 12px').style('text-align', 'right').style('font-weight', '600').text(formatValue(d.spend, 'compact_currency'));

        // Fill rate with mini pill
        var tdFill = tr.append('td').style('padding', '8px 12px').style('text-align', 'right').style('font-weight', '700');
        tdFill.append('span')
          .style('color', d.fillRate >= targetFill ? theme.fillRate : theme.criticalTier)
          .text((d.fillRate * 100).toFixed(1) + '%');

        // On-Time with mini pill
        var tdOnTime = tr.append('td').style('padding', '8px 12px').style('text-align', 'right').style('font-weight', '700');
        tdOnTime.append('span')
          .style('color', d.onTime >= targetOnTime ? theme.onTime : theme.criticalTier)
          .text((d.onTime * 100).toFixed(1) + '%');

        tr.append('td').style('padding', '8px 12px').style('text-align', 'right').text((d.backorderRate * 100).toFixed(2) + '%');
        tr.append('td').style('padding', '8px 12px').style('text-align', 'right').text(d.daysToDeliver.toFixed(1) + 'd');

        var tdBadge = tr.append('td').style('padding', '8px 12px').style('text-align', 'center');
        tdBadge.append('span')
          .style('display', 'inline-block')
          .style('padding', '2px 8px')
          .style('border-radius', '4px')
          .style('font-size', '10px')
          .style('font-weight', '700')
          .style('background', d.sla.bg)
          .style('color', d.sla.color)
          .text(d.sla.tier);

        tr.on('click', function (event) {
          if (d.links.length && window.LookerCharts && window.LookerCharts.Utils) {
            window.LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
          }
        });
      });

      // Total summary row
      var tfoot = table.append('tfoot');
      var footTr = tfoot.append('tr')
        .style('border-top', '2px solid ' + (isDark ? '#334155' : theme.border))
        .style('font-weight', '700')
        .style('background', isDark ? '#1e293b' : theme.track);

      var totalSpend = d3.sum(items, function (d) { return d.spend; });
      var avgFill = d3.mean(items, function (d) { return d.fillRate; }) || 0;
      var avgOnTime = d3.mean(items, function (d) { return d.onTime; }) || 0;
      var avgBO = d3.mean(items, function (d) { return d.backorderRate; }) || 0;
      var avgDays = d3.mean(items, function (d) { return d.daysToDeliver; }) || 0;

      footTr.append('td').style('padding', '8px 12px').text('Network Average / Total');
      footTr.append('td').style('padding', '8px 12px').text(items.length + ' Centers');
      footTr.append('td').style('padding', '8px 12px').style('text-align', 'right').text(formatValue(totalSpend, 'compact_currency'));
      footTr.append('td').style('padding', '8px 12px').style('text-align', 'right').text((avgFill * 100).toFixed(1) + '%');
      footTr.append('td').style('padding', '8px 12px').style('text-align', 'right').text((avgOnTime * 100).toFixed(1) + '%');
      footTr.append('td').style('padding', '8px 12px').style('text-align', 'right').text((avgBO * 100).toFixed(2) + '%');
      footTr.append('td').style('padding', '8px 12px').style('text-align', 'right').text(avgDays.toFixed(1) + 'd');
      footTr.append('td').style('padding', '8px 12px').style('text-align', 'center').text('-');
    }
  });
})();
