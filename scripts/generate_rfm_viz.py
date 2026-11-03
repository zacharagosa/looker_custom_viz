#!/usr/bin/env python3
"""
Generates the net-new Looker custom visualization:
rfm_customer_segmentation_matrix (RFM Customer Segmentation & Cohort Matrix)
"""

import json
import os
import subprocess

VIZ_DIR = '/usr/local/google/home/aragosa/looker_custom_viz/visualizations/rfm_customer_segmentation_matrix'
os.makedirs(VIZ_DIR, exist_ok=True)

JS_CODE = r'''/**
 * RFM Customer Segmentation & Cohort Matrix Custom Visualization for Google Cloud Looker
 * Engineered with D3.js v7
 *
 * Implements an executive 2D/3D Recency-Frequency-Monetary (RFM) Segmentation Matrix,
 * Customer Value Treemap, and Strategic RevOps Playbook for customer lifecycle analytics.
 */

(function () {
  'use strict';

  var PALETTES = {
    google_enterprise: {
      name: 'Google Enterprise',
      colors: ['#1a73e8', '#34a853', '#f9ab00', '#ea4335', '#8ab4f8', '#137333', '#c5221f', '#7c3aed'],
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      grid: '#e8eaed'
    },
    modern_slate: {
      name: 'Modern Slate',
      colors: ['#0284c7', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#059669', '#dc2626', '#8b5cf6'],
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      grid: '#e2e8f0'
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark',
      colors: ['#00F5D4', '#7B2CBF', '#F72585', '#4CC9F0', '#FFBE0B', '#3A0CA3', '#9D4EDD', '#06D6A0'],
      bg: '#0f172a',
      text: '#f8fafc',
      subtext: '#94a3b8',
      grid: 'rgba(255,255,255,0.08)'
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      colors: ['#059669', '#10b981', '#34d399', '#0284c7', '#0d9488', '#047857', '#0f766e', '#0369a1'],
      bg: '#ffffff',
      text: '#064e3b',
      subtext: '#047857',
      grid: '#d1fae5'
    },
    sunset_media: {
      name: 'Sunset Media',
      colors: ['#f43f5e', '#fb7185', '#f97316', '#fb923c', '#facc15', '#a855f7', '#d97706', '#ec4899'],
      bg: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      grid: '#fed7aa'
    },
    wellverse_healthcare: {
      name: 'Wellverse Healthcare',
      colors: ['#143359', '#00AF68', '#2E7CF6', '#FFB500', '#7C5CFC', '#14B8A6', '#E5484D', '#0284c7'],
      bg: '#ffffff',
      text: '#143359',
      subtext: '#64748B',
      grid: '#e2e8f0'
    }
  };

  var SEGMENTS = {
    champions: { name: 'Champions', color: '#10b981', priority: 1, action: 'Reward loyalty, offer early VIP access, ask for reviews.' },
    loyal: { name: 'Loyal Customers', color: '#2563eb', priority: 2, action: 'Upsell higher-value items, invite to membership programs.' },
    potential_loyalist: { name: 'Potential Loyalists', color: '#06b6d4', priority: 3, action: 'Recommend popular products, offer multi-tier rewards.' },
    recent_new: { name: 'New Customers', color: '#6366f1', priority: 4, action: 'Provide warm onboarding, check in for initial support.' },
    promising: { name: 'Promising', color: '#8b5cf6', priority: 5, action: 'Build brand awareness, send helpful follow-up recommendations.' },
    need_attention: { name: 'Need Attention', color: '#f59e0b', priority: 6, action: 'Send limited-time promotions, highlight product updates.' },
    about_to_sleep: { name: 'About to Sleep', color: '#f97316', priority: 7, action: 'Send personalized reactivation discounts before churn.' },
    at_risk: { name: 'At Risk', color: '#e11d48', priority: 8, action: 'Deliver high-value win-back campaigns, conduct outreach.' },
    cant_lose: { name: 'Can\'t Lose Them', color: '#7e22ce', priority: 9, action: 'Assign dedicated account lead, offer exclusive renewal perks.' },
    hibernating: { name: 'Hibernating', color: '#64748b', priority: 10, action: 'Include in automated seasonal clearance campaigns.' },
    lost: { name: 'Lost / Churned', color: '#475569', priority: 11, action: 'Low-effort automated exit survey or archive contact.' }
  };

  function classifyRFM(rScore, fScore, mScore) {
    if (rScore >= 4 && fScore >= 4 && mScore >= 4) return 'champions';
    if (rScore >= 3 && fScore >= 3 && mScore >= 3) return 'loyal';
    if (rScore >= 4 && fScore <= 3 && mScore >= 2) return 'potential_loyalist';
    if (rScore >= 4 && fScore === 1) return 'recent_new';
    if (rScore === 3 && fScore <= 2 && mScore >= 2) return 'promising';
    if (rScore === 3 && fScore === 3) return 'need_attention';
    if (rScore === 2 && fScore <= 2) return 'about_to_sleep';
    if (rScore <= 2 && fScore >= 3 && mScore >= 3) return 'at_risk';
    if (rScore <= 2 && fScore >= 4 && mScore >= 4) return 'cant_lose';
    if (rScore <= 2 && fScore <= 2 && mScore >= 2) return 'hibernating';
    return 'lost';
  }

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
      return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (formatType === 'raw') {
      return String(num);
    }
    if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
    return sign + '$' + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  var visObject = {
    id: 'rfm_customer_segmentation_matrix',
    label: 'RFM Customer Segmentation & Cohort Matrix',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'Segmentation Layout Mode',
        display: 'select',
        values: [
          { '2D RFM Trellis Grid Matrix (R vs F Heatmap)': 'rfm_grid_matrix' },
          { 'Strategic Segment Treemap & Value Share': 'segment_treemap' },
          { 'Recency vs Monetary Customer Value Spectrum': 'bubble_spectrum' },
          { 'Executive Action Matrix (Protect / Grow / Reactivate)': 'action_matrix' }
        ],
        default: 'rfm_grid_matrix',
        section: 'Display',
        order: 1
      },
      customerDimOverride: {
        type: 'string',
        label: 'Customer / Entity Dimension',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 2
      },
      recencyFieldOverride: {
        type: 'string',
        label: 'Recency Field (Date or Days / Score)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 3
      },
      frequencyFieldOverride: {
        type: 'string',
        label: 'Frequency Measure (Orders / Visits)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 4
      },
      monetaryFieldOverride: {
        type: 'string',
        label: 'Monetary Measure (Total Revenue / LTV)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 5
      },
      cohortDimOverride: {
        type: 'string',
        label: 'Cohort / Secondary Dimension (Optional)',
        display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }],
        default: '',
        section: 'Display',
        order: 6
      },
      targetMode: {
        type: 'string',
        label: 'Benchmark Target Mode',
        display: 'select',
        values: [
          { 'Dataset Mean (100% = Average LTV)': 'dataset_mean' },
          { 'Dataset Median (100% = Median LTV)': 'dataset_median' },
          { 'Top Percentile P75 Target': 'percentile_p75' },
          { 'Top Percentile P90 Target': 'percentile_p90' },
          { 'Fixed Static Target Value': 'fixed_value' }
        ],
        default: 'dataset_mean',
        section: 'Display',
        order: 7
      },
      targetValue: {
        type: 'number',
        label: 'Fixed Target Value (when Fixed Mode, 0 = Auto)',
        default: 0,
        section: 'Display',
        order: 8
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Target / Baseline Label',
        default: 'Target LTV Quota',
        section: 'Display',
        order: 9
      },
      sortBy: {
        type: 'string',
        label: 'Customer Ordering',
        display: 'select',
        values: [
          { 'Monetary Spend Descending (Highest LTV)': 'monetary_desc' },
          { 'Frequency Descending (Most Frequent)': 'frequency_desc' },
          { 'Recency (Most Recent Buyers)': 'recency_recent' },
          { 'Alphabetical / Name Ascending': 'customer_alpha' }
        ],
        default: 'monetary_desc',
        section: 'Display',
        order: 10
      },
      topNLimit: {
        type: 'number',
        label: 'Customer Sample Limit (0 = All in Query)',
        default: 120,
        section: 'Display',
        order: 11
      },
      enableOtherRollup: {
        type: 'boolean',
        label: 'Group Remaining / Tail Customers into Summary Chip',
        default: true,
        section: 'Display',
        order: 12
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Suppress Zero / Inactive Spenders',
        default: true,
        section: 'Display',
        order: 13
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
        order: 14
      },
      showValueLabels: {
        type: 'string',
        label: 'Data Value Callouts',
        display: 'select',
        values: [
          { 'All (Values in Badges & Cards)': 'all' },
          { 'Min/Max Peaks & Champions Only': 'peaks_only' },
          { 'Hidden': 'hidden' }
        ],
        default: 'peaks_only',
        section: 'Display',
        order: 15
      },
      summaryTitle: {
        type: 'string',
        label: 'Custom Matrix Title Override',
        default: '',
        section: 'Display',
        order: 16
      },
      summarySubtitle: {
        type: 'string',
        label: 'Custom Subtitle / Caption Override',
        default: '',
        section: 'Display',
        order: 17
      },
      showLegend: {
        type: 'boolean',
        label: 'Show Segment Legend',
        default: true,
        section: 'Display',
        order: 18
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Customer & Segment Filter Bar',
        default: true,
        section: 'Display',
        order: 19
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
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
          { 'Custom Hex Override': 'custom_override' }
        ],
        default: 'google_enterprise',
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
        label: 'Custom Champions / Success Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 3
      },
      customNegativeHex: {
        type: 'string',
        label: 'Custom At-Risk / Churn Hex',
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
          { 'Higher is Better (LTV, Orders, Spend)': 'higher_is_better' },
          { 'Lower is Better (Days Inactive, Churn Risk)': 'lower_is_better' }
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
          { 'Large Presentation (Wallboard)': 'large' }
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
          { 'Compact Currency ($1.2M, $450K)': 'compact_currency' },
          { 'Compact Number (1.2M, 450K)': 'compact_number' },
          { 'Percentage (45.2%)': 'percentage' },
          { 'Decimal (1,234.56)': 'decimal_2' },
          { 'Raw Unformatted': 'raw' }
        ],
        default: 'compact_currency',
        section: 'Style',
        order: 7
      },
      bubbleMinRadius: {
        type: 'number',
        label: 'Min Bubble Radius (px)',
        display: 'range',
        min: 4,
        max: 12,
        step: 1,
        default: 5,
        section: 'Style',
        order: 8
      },
      bubbleMaxRadius: {
        type: 'number',
        label: 'Max Bubble Radius (px)',
        display: 'range',
        min: 14,
        max: 36,
        step: 2,
        default: 22,
        section: 'Style',
        order: 9
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        customerDimOverride: { role: 'dimension', defaultIdx: 0 },
        recencyFieldOverride: { role: 'any', defaultIdx: 1 },
        frequencyFieldOverride: { role: 'measure', defaultIdx: 0 },
        monetaryFieldOverride: { role: 'measure', defaultIdx: 1 },
        cohortDimOverride: { role: 'dimension', defaultIdx: 1 }
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
      element.innerHTML = '';
      element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      element.style.display = 'flex';
      element.style.flexDirection = 'column';
      element.style.overflow = 'hidden';
      element.style.padding = '0';
      element.style.boxSizing = 'border-box';
      element.style.position = 'relative';

      var root = document.createElement('div');
      root.className = 'rfm-viz-root';
      root.style.width = '100%';
      root.style.height = '100%';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      root.style.overflow = 'hidden';
      element.appendChild(root);

      var tooltip = document.createElement('div');
      tooltip.className = 'rfm-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.padding = '10px 14px';
      tooltip.style.background = 'rgba(15, 23, 42, 0.94)';
      tooltip.style.backdropFilter = 'blur(6px)';
      tooltip.style.color = '#ffffff';
      tooltip.style.borderRadius = '8px';
      tooltip.style.fontSize = '12px';
      tooltip.style.fontWeight = '500';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.display = 'none';
      tooltip.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
      tooltip.style.zIndex = '99999';
      tooltip.style.border = '1px solid rgba(255,255,255,0.15)';
      tooltip.style.maxWidth = '300px';
      document.body.appendChild(tooltip);
      element._rfmTooltip = tooltip;

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

      if (self._resizeTimer) {
        clearTimeout(self._resizeTimer);
      }
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
      }, 60);
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
      if (typeof d3 === 'undefined') {
        var script = document.createElement('script');
        script.src = 'https://d3js.org/d3.v7.min.js';
        script.onload = function () {
          self.render(window.d3, data, element, config, queryResponse, done);
        };
        script.onerror = function () {
          if (self.addError) {
            self.addError({
              title: 'Dependency Error',
              message: 'Failed to load D3.js library.'
            });
          }
          done();
        };
        document.head.appendChild(script);
      } else {
        this.render(d3, data, element, config, queryResponse, done);
      }
    },

    render: function (d3, data, element, config, queryResponse, done) {
      var root = element.querySelector('.rfm-viz-root');
      var tooltip = element._rfmTooltip;
      if (!root) { done(); return; }
      root.innerHTML = '';

      if (!data || data.length === 0) {
        if (this.addError) {
          this.addError({
            title: 'No Data',
            message: 'The query returned no customer rows to display.'
          });
        }
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dimensions = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
      var measures = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
      if (!measures.length && fields.table_calculations && fields.table_calculations.length) measures = fields.table_calculations;

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
        return list[defaultIdx] || list[0];
      }

      var customerDim = resolveField(dimensions, config.customerDimOverride, 0);
      var recencyField = config.recencyFieldOverride ? resolveField(dimensions.concat(measures), config.recencyFieldOverride, 1) : (dimensions.length > 1 ? dimensions[1] : null);
      var frequencyMeas = resolveField(measures, config.frequencyFieldOverride, 0);
      var monetaryMeas = resolveField(measures, config.monetaryFieldOverride, measures.length > 1 ? 1 : 0);
      var cohortDim = config.cohortDimOverride ? resolveField(dimensions, config.cohortDimOverride, 2) : null;

      // Color Theme
      var paletteKey = config.colorPalette || 'google_enterprise';
      var theme = PALETTES[paletteKey] || PALETTES.google_enterprise;
      var successColor = config.customPositiveHex || '#10b981';
      var alertColor = config.customNegativeHex || '#ef4444';

      // 1. Parse rows into customer objects
      var customers = [];
      var maxDateVal = null;

      data.forEach(function (row, idx) {
        var cCell = row[customerDim.name];
        var custName = cCell ? (cCell.rendered || cCell.value || ('Customer #' + (idx + 1))) : ('Customer #' + (idx + 1));
        var links = (cCell && cCell.links) || [];

        // Frequency
        var fCell = row[frequencyMeas.name];
        var freq = fCell && fCell.value !== null && !isNaN(Number(fCell.value)) ? Number(fCell.value) : 1;

        // Monetary
        var mCell = row[monetaryMeas.name];
        var money = mCell && mCell.value !== null && !isNaN(Number(mCell.value)) ? Number(mCell.value) : 0;
        if (config.suppressZeroNull !== false && money <= 0) return;

        // Recency
        var recVal = 0;
        var rawRec = recencyField && row[recencyField.name] ? row[recencyField.name].value : null;
        var dateParsed = null;
        if (rawRec !== null) {
          if (!isNaN(Number(rawRec)) && String(rawRec).length < 6) {
            recVal = Number(rawRec); // Days ago directly
          } else {
            dateParsed = d3.timeParse('%Y-%m-%d')(String(rawRec).substring(0, 10));
            if (dateParsed) {
              if (!maxDateVal || dateParsed > maxDateVal) maxDateVal = dateParsed;
            }
          }
        }

        var cohortVal = cohortDim && row[cohortDim.name] ? (row[cohortDim.name].rendered || row[cohortDim.name].value) : '';

        customers.push({
          id: idx + 1,
          name: custName,
          freq: freq,
          money: money,
          rawRec: rawRec,
          dateObj: dateParsed,
          recDays: recVal,
          cohort: cohortVal,
          links: links
        });
      });

      if (customers.length === 0) {
        if (this.addError) {
          this.addError({
            title: 'No Valid Customers',
            message: 'No customers had positive monetary values or valid fields.'
          });
        }
        done();
        return;
      }

      // If dates parsed, compute recency in days relative to maxDateVal
      if (maxDateVal) {
        customers.forEach(function (c) {
          if (c.dateObj) {
            var diffDays = Math.max(0, Math.round((maxDateVal - c.dateObj) / (1000 * 60 * 60 * 24)));
            c.recDays = diffDays;
          }
        });
      }

      // 2. Compute Quantile Breaks (Scores 1 to 5 for R, F, M)
      function getQuintiles(arr) {
        var sorted = arr.slice().sort(function (a, b) { return a - b; });
        return [
          d3.quantile(sorted, 0.2),
          d3.quantile(sorted, 0.4),
          d3.quantile(sorted, 0.6),
          d3.quantile(sorted, 0.8)
        ];
      }

      var rDaysList = customers.map(function (c) { return c.recDays; });
      var fList = customers.map(function (c) { return c.freq; });
      var mList = customers.map(function (c) { return c.money; });

      var rBreaks = getQuintiles(rDaysList);
      var fBreaks = getQuintiles(fList);
      var mBreaks = getQuintiles(mList);

      function scoreVal(val, breaks, invert) {
        var s = 1;
        if (val >= breaks[3]) s = 5;
        else if (val >= breaks[2]) s = 4;
        else if (val >= breaks[1]) s = 3;
        else if (val >= breaks[0]) s = 2;
        else s = 1;
        return invert ? (6 - s) : s;
      }

      var totalRevenue = 0;
      var totalOrders = 0;
      var segmentCounts = {};
      var segmentRevenue = {};

      Object.keys(SEGMENTS).forEach(function (k) {
        segmentCounts[k] = 0;
        segmentRevenue[k] = 0;
      });

      customers.forEach(function (c) {
        c.rScore = scoreVal(c.recDays, rBreaks, true); // Fewer days ago = higher recency score (5)
        c.fScore = scoreVal(c.freq, fBreaks, false);
        c.mScore = scoreVal(c.money, mBreaks, false);
        c.rfmKey = classifyRFM(c.rScore, c.fScore, c.mScore);
        c.segment = SEGMENTS[c.rfmKey] || SEGMENTS.lost;

        totalRevenue += c.money;
        totalOrders += c.freq;
        segmentCounts[c.rfmKey] = (segmentCounts[c.rfmKey] || 0) + 1;
        segmentRevenue[c.rfmKey] = (segmentRevenue[c.rfmKey] || 0) + c.money;
      });

      // Target calculations
      mList.sort(function (a, b) { return a - b; });
      var meanLTV = totalRevenue / customers.length;
      var medianLTV = mList[Math.floor(mList.length / 2)] || meanLTV;
      var p75LTV = d3.quantile(mList, 0.75) || medianLTV;
      var p90LTV = d3.quantile(mList, 0.90) || p75LTV;

      var targetMode = config.targetMode || 'dataset_mean';
      var benchmarkTarget = meanLTV;
      if (targetMode === 'dataset_median') benchmarkTarget = medianLTV;
      else if (targetMode === 'percentile_p75') benchmarkTarget = p75LTV;
      else if (targetMode === 'percentile_p90') benchmarkTarget = p90LTV;
      else if (targetMode === 'fixed_value') benchmarkTarget = Number(config.targetValue) || (meanLTV * 1.25);

      var customersAboveTarget = customers.filter(function (c) { return c.money >= benchmarkTarget; }).length;

      // 3. Sorting
      var sortBy = config.sortBy || 'monetary_desc';
      if (sortBy === 'monetary_desc') {
        customers.sort(function (a, b) { return b.money - a.money; });
      } else if (sortBy === 'frequency_desc') {
        customers.sort(function (a, b) { return b.freq - a.freq; });
      } else if (sortBy === 'recency_recent') {
        customers.sort(function (a, b) { return a.recDays - b.recDays; });
      } else if (sortBy === 'customer_alpha') {
        customers.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }

      var sampleLimit = Number(config.topNLimit) || 120;
      var displayCustomers = sampleLimit > 0 ? customers.slice(0, sampleLimit) : customers;
      var excludedCount = customers.length - displayCustomers.length;

      // 4. Executive KPI Scorecard HUD
      var hudMode = config.hudMode || 'scorecard';
      if (hudMode !== 'hidden') {
        var hud = document.createElement('div');
        hud.className = 'rfm-hud';
        hud.style.width = '100%';
        hud.style.display = 'flex';
        hud.style.flexWrap = 'wrap';
        hud.style.alignItems = 'center';
        hud.style.justifyContent = 'space-between';
        hud.style.padding = hudMode === 'compact_strip' ? '6px 14px' : '10px 18px';
        hud.style.backgroundColor = hudMode === 'compact_strip' ? '#f8fafc' : '#f1f5f9';
        hud.style.borderBottom = '1px solid #e2e8f0';
        hud.style.gap = '12px';
        hud.style.flexShrink = '0';
        hud.style.zIndex = '10';

        var fontScale = config.fontScale || 'standard';
        var valFontSize = fontScale === 'compact' ? '13px' : (fontScale === 'large' ? '18px' : '15px');
        var champPct = Math.round(((segmentCounts.champions || 0) / customers.length) * 100);
        var atRiskPct = Math.round(((segmentCounts.at_risk || 0) + (segmentCounts.cant_lose || 0)) / customers.length * 100);

        var hudHtml = '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">';

        // Title
        var titleText = config.summaryTitle || 'RFM Customer Segmentation Matrix';
        var subText = config.summarySubtitle ? ('<span style="font-size:10.5px;color:#64748b;font-weight:500;">' + config.summarySubtitle + '</span>') : '';
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;letter-spacing:0.5px;">Customer Intelligence</span>' +
          '<span style="font-size:' + valFontSize + ';font-weight:700;color:#0f172a;">' + titleText + '</span>' +
          subText +
          '</div>';

        // Total Cohort LTV
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600;">Total Cohort LTV</span>' +
          '<span style="font-size:' + valFontSize + ';font-weight:700;color:#0f172a;">' + formatNumber(totalRevenue, config.valueFormat || 'compact_currency') + '</span>' +
          '</div>';

        // Customer Count & Champions
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600;">Champions Share</span>' +
          '<span style="font-size:' + valFontSize + ';font-weight:700;color:#10b981;">' + champPct + '% <span style="font-size:11px;font-weight:500;color:#64748b;">(' + (segmentCounts.champions || 0) + ' VIPs)</span></span>' +
          '</div>';

        // Target Quota Attainment
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600;">Above ' + (config.referenceLineLabel || 'Target Quota') + '</span>' +
          '<span style="font-size:' + valFontSize + ';font-weight:700;color:#2563eb;">' + Math.round((customersAboveTarget / customers.length) * 100) + '% <span style="font-size:11px;font-weight:500;color:#64748b;">(' + formatNumber(benchmarkTarget, config.valueFormat || 'compact_currency') + ')</span></span>' +
          '</div>';

        // At-Risk Alert
        if (atRiskPct > 0) {
          hudHtml += '<div style="background:#fee2e2;border:1px solid #fecaca;color:#991b1b;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px;">' +
            '<span>⚠️ ' + atRiskPct + '% High-Value Customers At-Risk / Churning</span>' +
            '</div>';
        }

        if (excludedCount > 0 && config.enableOtherRollup) {
          hudHtml += '<div style="background:#f1f5f9;border:1px solid #cbd5e1;color:#475569;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:500;">' +
            '+' + excludedCount + ' Tail Customers in Summary' +
            '</div>';
        }

        hudHtml += '</div>';

        // Search Bar
        if (config.showSearch !== false) {
          hudHtml += '<div style="display:flex;align-items:center;">' +
            '<input type="text" class="rfm-search-input" placeholder="Search customer or segment..." style="padding:5px 9px;font-size:11px;border:1px solid #cbd5e1;border-radius:5px;outline:none;width:170px;" />' +
            '</div>';
        }

        hud.innerHTML = hudHtml;
        root.appendChild(hud);

        var searchInput = hud.querySelector('.rfm-search-input');
        if (searchInput) {
          searchInput.addEventListener('input', function (e) {
            var q = e.target.value.trim().toLowerCase();
            d3.select(root).selectAll('.rfm-customer-bubble, .rfm-treemap-tile, .rfm-action-item').style('opacity', function (d) {
              if (!q) return 1;
              var nameStr = (d && d.name ? d.name : '').toLowerCase();
              var segStr = (d && d.segment ? d.segment.name : '').toLowerCase();
              return (nameStr.indexOf(q) !== -1 || segStr.indexOf(q) !== -1) ? 1 : 0.12;
            });
          });
        }
      }

      // 5. Main Viewport Container
      var viewport = document.createElement('div');
      viewport.className = 'rfm-viewport';
      viewport.style.flex = '1 1 auto';
      viewport.style.minHeight = '0';
      viewport.style.overflow = 'auto';
      viewport.style.padding = '16px 20px';
      viewport.style.boxSizing = 'border-box';
      viewport.style.display = 'flex';
      viewport.style.flexDirection = 'column';
      root.appendChild(viewport);

      var layoutMode = config.layoutMode || 'rfm_grid_matrix';
      var minR = Number(config.bubbleMinRadius) || 5;
      var maxR = Number(config.bubbleMaxRadius) || 22;
      var rScale = d3.scaleSqrt().domain([0, d3.max(customers, function (c) { return c.money; }) || 100]).range([minR, maxR]);

      // -------------------------------------------------------------
      // LAYOUT 1: 2D RFM TRELLIS GRID MATRIX (5x5 R vs F)
      // -------------------------------------------------------------
      if (layoutMode === 'rfm_grid_matrix') {
        var w = Math.max(700, viewport.clientWidth - 40);
        var h = Math.max(500, viewport.clientHeight - 80);
        var margin = { top: 30, right: 30, bottom: 45, left: 65 };
        var innerW = w - margin.left - margin.right;
        var innerH = h - margin.top - margin.bottom;

        var svg = d3.select(viewport).append('svg')
          .attr('width', w)
          .attr('height', h)
          .style('display', 'block')
          .style('margin', '0 auto');

        var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var colW = innerW / 5;
        var rowH = innerH / 5;

        // Draw 5x5 grid cells
        for (var r = 1; r <= 5; r++) {
          for (var f = 1; f <= 5; f++) {
            var segKey = classifyRFM(r, f, 3);
            var seg = SEGMENTS[segKey];
            var cx = (r - 1) * colW;
            var cy = (5 - f) * rowH;

            g.append('rect')
              .attr('x', cx)
              .attr('y', cy)
              .attr('width', colW)
              .attr('height', rowH)
              .attr('fill', seg.color)
              .attr('opacity', 0.12)
              .attr('stroke', '#e2e8f0')
              .attr('stroke-width', 1);

            g.append('text')
              .attr('x', cx + 6)
              .attr('y', cy + 14)
              .attr('font-size', '10px')
              .attr('font-weight', '600')
              .attr('fill', seg.color)
              .text(seg.name);
          }
        }

        // Axes Labels
        var rLabels = ['1 (Dormant)', '2 (At Risk)', '3 (Average)', '4 (Recent)', '5 (Active Now)'];
        var fLabels = ['1 (One-Time)', '2 (Occasional)', '3 (Regular)', '4 (Frequent)', '5 (Super Loyal)'];

        rLabels.forEach(function (lbl, i) {
          g.append('text')
            .attr('x', i * colW + colW / 2)
            .attr('y', innerH + 24)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('fill', '#475569')
            .text('R: ' + lbl);
        });

        fLabels.forEach(function (lbl, i) {
          g.append('text')
            .attr('x', -10)
            .attr('y', (4 - i) * rowH + rowH / 2 + 4)
            .attr('text-anchor', 'end')
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('fill', '#475569')
            .text('F: ' + lbl);
        });

        // Group customers into 5x5 cells for jittering
        var cellBuckets = {};
        displayCustomers.forEach(function (c) {
          var k = c.rScore + '_' + c.fScore;
          if (!cellBuckets[k]) cellBuckets[k] = [];
          cellBuckets[k].push(c);
        });

        Object.keys(cellBuckets).forEach(function (k) {
          var list = cellBuckets[k];
          var parts = k.split('_');
          var r = parseInt(parts[0], 10);
          var f = parseInt(parts[1], 10);
          var cellX = (r - 1) * colW;
          var cellY = (5 - f) * rowH;

          list.forEach(function (c, i) {
            // deterministic jitter
            var angle = (i * 2.39996) + 0.5;
            var radius = Math.min(colW / 2 - 20, Math.sqrt(i + 1) * (colW / (Math.sqrt(list.length) * 3 + 2)));
            var bx = cellX + colW / 2 + Math.cos(angle) * radius;
            var by = cellY + rowH / 2 + Math.sin(angle) * (radius * 0.8) + 4;
            var rad = rScale(c.money);

            var circle = g.append('circle')
              .datum(c)
              .attr('class', 'rfm-customer-bubble')
              .attr('cx', bx)
              .attr('cy', by)
              .attr('r', rad)
              .attr('fill', c.segment.color)
              .attr('fill-opacity', 0.78)
              .attr('stroke', '#ffffff')
              .attr('stroke-width', 1.5)
              .style('cursor', c.links && c.links.length > 0 ? 'pointer' : 'default');

            // Interactive Tooltip & Click
            circle
              .on('mouseover', function (event, d) {
                d3.select(this).attr('stroke', '#0f172a').attr('stroke-width', 2.5).attr('fill-opacity', 1.0);
                tooltip.style.display = 'block';
                tooltip.innerHTML =
                  '<div style="font-weight:700;font-size:13px;color:#f8fafc;margin-bottom:2px;">' + d.name + '</div>' +
                  '<div style="font-size:11px;color:' + d.segment.color + ';font-weight:700;text-transform:uppercase;margin-bottom:6px;">' + d.segment.name + '</div>' +
                  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;font-size:11.5px;color:#cbd5e1;">' +
                  '<div>LTV Spend: <b style="color:#ffffff;">' + formatNumber(d.money, config.valueFormat || 'compact_currency') + '</b></div>' +
                  '<div>Orders (F): <b style="color:#ffffff;">' + d.freq + '</b></div>' +
                  '<div>Recency (R): <b style="color:#ffffff;">' + d.recDays + ' days ago</b></div>' +
                  '<div>Scores (R-F-M): <b style="color:#ffffff;">' + d.rScore + '-' + d.fScore + '-' + d.mScore + '</b></div>' +
                  '</div>' +
                  '<div style="margin-top:6px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.15);font-size:11px;color:#94a3b8;">' +
                  '<b>Action:</b> ' + d.segment.action +
                  '</div>' +
                  (d.links && d.links.length > 0 ? '<div style="margin-top:4px;font-size:10px;color:#60a5fa;font-style:italic;">🔎 Click customer to drill down</div>' : '');
              })
              .on('mousemove', function (event) {
                var x = event.clientX + 14;
                var y = event.clientY + 14;
                if (x + 280 > window.innerWidth) x = event.clientX - 290;
                tooltip.style.left = x + 'px';
                tooltip.style.top = y + 'px';
              })
              .on('mouseout', function () {
                d3.select(this).attr('stroke', '#ffffff').attr('stroke-width', 1.5).attr('fill-opacity', 0.78);
                tooltip.style.display = 'none';
              })
              .on('click', function (event, d) {
                if (d.links && d.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
                  window.LookerCharts.Utils.openDrillMenu({
                    links: d.links,
                    event: event
                  });
                }
              });
          });
        });
      }

      // -------------------------------------------------------------
      // LAYOUT 2: STRATEGIC SEGMENT TREEMAP
      // -------------------------------------------------------------
      else if (layoutMode === 'segment_treemap') {
        var tw = Math.max(700, viewport.clientWidth - 40);
        var th = Math.max(480, viewport.clientHeight - 80);

        var treeSvg = d3.select(viewport).append('svg')
          .attr('width', tw)
          .attr('height', th)
          .style('display', 'block')
          .style('margin', '0 auto');

        var rootData = {
          name: 'All Segments',
          children: Object.keys(SEGMENTS).map(function (k) {
            return {
              key: k,
              name: SEGMENTS[k].name,
              color: SEGMENTS[k].color,
              action: SEGMENTS[k].action,
              value: segmentRevenue[k] || 1,
              count: segmentCounts[k] || 0
            };
          }).filter(function (s) { return s.count > 0; })
        };

        var hierarchy = d3.hierarchy(rootData)
          .sum(function (d) { return d.value; })
          .sort(function (a, b) { return b.value - a.value; });

        d3.treemap().size([tw, th]).padding(4).round(true)(hierarchy);

        var leaf = treeSvg.selectAll('.rfm-treemap-tile')
          .data(hierarchy.leaves())
          .enter()
          .append('g')
          .attr('class', 'rfm-treemap-tile')
          .attr('transform', function (d) { return 'translate(' + d.x0 + ',' + d.y0 + ')'; });

        leaf.append('rect')
          .attr('width', function (d) { return Math.max(0, d.x1 - d.x0); })
          .attr('height', function (d) { return Math.max(0, d.y1 - d.y0); })
          .attr('rx', 6)
          .attr('fill', function (d) { return d.data.color; })
          .attr('fill-opacity', 0.85)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);

        leaf.append('text')
          .attr('x', 10)
          .attr('y', 20)
          .attr('font-size', '13px')
          .attr('font-weight', '700')
          .attr('fill', '#ffffff')
          .text(function (d) { return d.data.name; });

        leaf.append('text')
          .attr('x', 10)
          .attr('y', 36)
          .attr('font-size', '11.5px')
          .attr('font-weight', '600')
          .attr('fill', 'rgba(255,255,255,0.92)')
          .text(function (d) {
            var pct = Math.round((d.data.value / totalRevenue) * 100);
            return formatNumber(d.data.value, config.valueFormat || 'compact_currency') + ' (' + pct + '%) • ' + d.data.count + ' customers';
          });

        leaf
          .on('mouseover', function (event, d) {
            d3.select(this).select('rect').attr('fill-opacity', 1.0).attr('stroke', '#0f172a');
            tooltip.style.display = 'block';
            tooltip.innerHTML =
              '<div style="font-weight:700;font-size:13px;color:#f8fafc;">' + d.data.name + '</div>' +
              '<div style="margin-top:4px;font-size:11.5px;color:#e2e8f0;">Total Value: <b>' + formatNumber(d.data.value, config.valueFormat || 'compact_currency') + '</b></div>' +
              '<div style="font-size:11.5px;color:#e2e8f0;">Customer Count: <b>' + d.data.count + '</b></div>' +
              '<div style="font-size:11.5px;color:#e2e8f0;">Average LTV: <b>' + formatNumber(d.data.value / (d.data.count || 1), config.valueFormat || 'compact_currency') + '</b></div>' +
              '<div style="margin-top:6px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.15);font-size:11px;color:#94a3b8;"><b>Playbook:</b> ' + d.data.action + '</div>';
          })
          .on('mousemove', function (event) {
            var x = event.clientX + 14;
            var y = event.clientY + 14;
            if (x + 280 > window.innerWidth) x = event.clientX - 290;
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
          })
          .on('mouseout', function () {
            d3.select(this).select('rect').attr('fill-opacity', 0.85).attr('stroke', '#ffffff');
            tooltip.style.display = 'none';
          });
      }

      // -------------------------------------------------------------
      // LAYOUT 3: BUBBLE SPECTRUM (Recency vs Monetary)
      // -------------------------------------------------------------
      else if (layoutMode === 'bubble_spectrum') {
        var bw = Math.max(700, viewport.clientWidth - 40);
        var bh = Math.max(480, viewport.clientHeight - 80);
        var bMargin = { top: 25, right: 30, bottom: 45, left: 70 };
        var bInnerW = bw - bMargin.left - bMargin.right;
        var bInnerH = bh - bMargin.top - bMargin.bottom;

        var bSvg = d3.select(viewport).append('svg')
          .attr('width', bw)
          .attr('height', bh)
          .style('display', 'block')
          .style('margin', '0 auto');

        var bg = bSvg.append('g').attr('transform', 'translate(' + bMargin.left + ',' + bMargin.top + ')');

        var xScale = d3.scaleLinear()
          .domain([0, d3.max(customers, function (c) { return c.recDays; }) || 365])
          .range([0, bInnerW]);

        var yScale = d3.scaleLog()
          .domain([Math.max(1, d3.min(customers, function (c) { return c.money; }) || 1), d3.max(customers, function (c) { return c.money; }) || 1000])
          .range([bInnerH, 0]);

        // Target Reference Line
        if (benchmarkTarget > 0 && benchmarkTarget >= yScale.domain()[0] && benchmarkTarget <= yScale.domain()[1]) {
          var targetY = yScale(benchmarkTarget);
          bg.append('line')
            .attr('x1', 0)
            .attr('x2', bInnerW)
            .attr('y1', targetY)
            .attr('y2', targetY)
            .attr('stroke', '#ef4444')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '4,4');

          bg.append('text')
            .attr('x', bInnerW - 6)
            .attr('y', targetY - 6)
            .attr('text-anchor', 'end')
            .attr('font-size', '10.5px')
            .attr('font-weight', '700')
            .attr('fill', '#ef4444')
            .text((config.referenceLineLabel || 'Target Quota') + ': ' + formatNumber(benchmarkTarget, config.valueFormat || 'compact_currency'));
        }

        // Axes
        bg.append('g')
          .attr('transform', 'translate(0,' + bInnerH + ')')
          .call(d3.axisBottom(xScale).ticks(8))
          .selectAll('text')
          .attr('font-size', '10.5px');

        bg.append('g')
          .call(d3.axisLeft(yScale).ticks(5, '$.0s'))
          .selectAll('text')
          .attr('font-size', '10.5px');

        // Axis Titles
        bg.append('text')
          .attr('x', bInnerW / 2)
          .attr('y', bInnerH + 36)
          .attr('text-anchor', 'middle')
          .attr('font-size', '11.5px')
          .attr('font-weight', '600')
          .attr('fill', '#475569')
          .text('Recency (Days Since Last Order → Higher Churn Risk to the Right)');

        bg.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', -bInnerH / 2)
          .attr('y', -50)
          .attr('text-anchor', 'middle')
          .attr('font-size', '11.5px')
          .attr('font-weight', '600')
          .attr('fill', '#475569')
          .text('Monetary Lifetime Value (Log Scale)');

        // Bubbles
        bg.selectAll('.rfm-customer-bubble')
          .data(displayCustomers)
          .enter()
          .append('circle')
          .attr('class', 'rfm-customer-bubble')
          .attr('cx', function (d) { return xScale(d.recDays); })
          .attr('cy', function (d) { return yScale(Math.max(1, d.money)); })
          .attr('r', function (d) { return rScale(d.money); })
          .attr('fill', function (d) { return d.segment.color; })
          .attr('fill-opacity', 0.75)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5)
          .style('cursor', function (d) { return d.links && d.links.length > 0 ? 'pointer' : 'default'; })
          .on('mouseover', function (event, d) {
            d3.select(this).attr('stroke', '#0f172a').attr('stroke-width', 2.5).attr('fill-opacity', 1.0);
            tooltip.style.display = 'block';
            tooltip.innerHTML =
              '<div style="font-weight:700;font-size:13px;color:#f8fafc;">' + d.name + '</div>' +
              '<div style="font-size:11px;color:' + d.segment.color + ';font-weight:700;text-transform:uppercase;margin-bottom:6px;">' + d.segment.name + '</div>' +
              '<div style="font-size:11.5px;color:#cbd5e1;">LTV Spend: <b>' + formatNumber(d.money, config.valueFormat || 'compact_currency') + '</b></div>' +
              '<div style="font-size:11.5px;color:#cbd5e1;">Order Count: <b>' + d.freq + '</b></div>' +
              '<div style="font-size:11.5px;color:#cbd5e1;">Recency: <b>' + d.recDays + ' days ago</b></div>' +
              '<div style="margin-top:6px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.15);font-size:11px;color:#94a3b8;"><b>Action:</b> ' + d.segment.action + '</div>';
          })
          .on('mousemove', function (event) {
            var x = event.clientX + 14;
            var y = event.clientY + 14;
            if (x + 280 > window.innerWidth) x = event.clientX - 290;
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
          })
          .on('mouseout', function () {
            d3.select(this).attr('stroke', '#ffffff').attr('stroke-width', 1.5).attr('fill-opacity', 0.75);
            tooltip.style.display = 'none';
          })
          .on('click', function (event, d) {
            if (d.links && d.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
            }
          });
      }

      // -------------------------------------------------------------
      // LAYOUT 4: STRATEGIC ACTION MATRIX (Protect / Grow / Reactivate)
      // -------------------------------------------------------------
      else if (layoutMode === 'action_matrix') {
        var actionContainer = document.createElement('div');
        actionContainer.style.display = 'grid';
        actionContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
        actionContainer.style.gap = '16px';
        actionContainer.style.width = '100%';
        actionContainer.style.boxSizing = 'border-box';
        viewport.appendChild(actionContainer);

        var quadrants = [
          {
            title: '1. Nurture & Protect (VIP Champions & Loyalists)',
            icon: '👑',
            color: '#10b981',
            bg: '#ecfdf5',
            border: '#a7f3d0',
            segments: ['champions', 'loyal'],
            strategy: 'Upsell premium upgrades, provide VIP concierge support, and leverage for testimonials.'
          },
          {
            title: '2. Grow & Elevate (Potential & Promising)',
            icon: '🚀',
            color: '#2563eb',
            bg: '#eff6ff',
            border: '#bfdbfe',
            segments: ['potential_loyalist', 'recent_new', 'promising'],
            strategy: 'Automate onboarding sequences, suggest complementary products, and offer loyalty tiers.'
          },
          {
            title: '3. Reactivate & Win-Back (At-Risk & High-Value Inactive)',
            icon: '🚨',
            color: '#e11d48',
            bg: '#fff1f2',
            border: '#fecdd3',
            segments: ['at_risk', 'cant_lose', 'need_attention'],
            strategy: 'Execute aggressive win-back discounts, personalized SDR/CSM outreach, and re-engagement surveys.'
          },
          {
            title: '4. Monitor & Low Touch (Hibernating & Churned)',
            icon: '💤',
            color: '#64748b',
            bg: '#f8fafc',
            border: '#e2e8f0',
            segments: ['about_to_sleep', 'hibernating', 'lost'],
            strategy: 'Include in automated newsletter drips, quarterly seasonal sales, or archive from paid ad retargeting.'
          }
        ];

        quadrants.forEach(function (q) {
          var card = document.createElement('div');
          card.style.background = q.bg;
          card.style.border = '1px solid ' + q.border;
          card.style.borderRadius = '10px';
          card.style.padding = '14px 16px';
          card.style.display = 'flex';
          card.style.flexDirection = 'column';
          card.style.gap = '10px';

          var qRev = 0;
          var qCount = 0;
          q.segments.forEach(function (sk) {
            qRev += (segmentRevenue[sk] || 0);
            qCount += (segmentCounts[sk] || 0);
          });

          card.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;">' +
            '<span style="font-weight:700;font-size:13px;color:' + q.color + ';">' + q.icon + ' ' + q.title + '</span>' +
            '<span style="font-size:11px;font-weight:700;background:' + q.color + ';color:#ffffff;padding:2px 7px;border-radius:12px;">' + qCount + ' Users</span>' +
            '</div>' +
            '<div style="font-size:12px;color:#334155;line-height:1.4;">' + q.strategy + '</div>' +
            '<div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:auto;padding-top:6px;border-top:1px dashed ' + q.border + ';">' +
            'Combined LTV: ' + formatNumber(qRev, config.valueFormat || 'compact_currency') +
            '</div>';

          actionContainer.appendChild(card);
        });
      }

      // 6. Segment Legend
      if (config.showLegend !== false && layoutMode !== 'action_matrix') {
        var legend = document.createElement('div');
        legend.className = 'rfm-legend';
        legend.style.display = 'flex';
        legend.style.flexWrap = 'wrap';
        legend.style.alignItems = 'center';
        legend.style.gap = '10px 14px';
        legend.style.padding = '10px 0 0 0';
        legend.style.fontSize = '11px';
        legend.style.color = '#64748b';

        legend.innerHTML = '<span style="font-weight:700;text-transform:uppercase;font-size:10px;">Segments:</span>';

        Object.keys(SEGMENTS).forEach(function (k) {
          var seg = SEGMENTS[k];
          var cnt = segmentCounts[k] || 0;
          if (cnt === 0 && layoutMode === 'segment_treemap') return;

          var item = document.createElement('div');
          item.style.display = 'flex';
          item.style.alignItems = 'center';
          item.style.gap = '5px';
          item.innerHTML =
            '<span style="width:10px;height:10px;border-radius:3px;background:' + seg.color + ';display:inline-block;"></span>' +
            '<span>' + seg.name + ' (' + cnt + ')</span>';
          legend.appendChild(item);
        });

        viewport.appendChild(legend);
      }

      done();
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
'''

with open(os.path.join(VIZ_DIR, 'rfm_customer_segmentation_matrix.js'), 'w', encoding='utf-8') as f:
    f.write(JS_CODE)
print('Generated rfm_customer_segmentation_matrix.js')

# Validate JS syntax
node_bin = os.path.expanduser('~/.nvm/versions/node/v24.19.0/bin/node')
res = subprocess.run([node_bin, '--check', os.path.join(VIZ_DIR, 'rfm_customer_segmentation_matrix.js')], capture_output=True, text=True)
if res.returncode != 0:
    print('JS Syntax Error:', res.stderr)
    exit(1)
print('Node syntax validation PASSED!')

# Generate demo_query.json
DEMO_QUERY = {
  "model": "thelook",
  "view": "order_items",
  "fields": [
    "users.id",
    "users.name",
    "order_items.count",
    "order_items.total_sale_price",
    "order_items.created_date",
    "users.country"
  ],
  "filters": {
    "order_items.status": "Complete"
  },
  "sorts": [
    "order_items.total_sale_price desc"
  ],
  "limit": "150",
  "vis_config": {
    "type": "rfm_customer_segmentation_matrix",
    "layoutMode": "rfm_grid_matrix",
    "colorPalette": "google_enterprise",
    "hudMode": "scorecard",
    "targetMode": "dataset_mean",
    "referenceLineLabel": "Target LTV Quota",
    "showLegend": True,
    "showSearch": True,
    "metricPolarity": "higher_is_better",
    "fontScale": "standard",
    "valueFormat": "compact_currency",
    "bubbleMinRadius": 5,
    "bubbleMaxRadius": 22
  }
}

with open(os.path.join(VIZ_DIR, 'demo_query.json'), 'w', encoding='utf-8') as f:
    json.dump(DEMO_QUERY, f, indent=2)
print('Generated demo_query.json')

# Generate manifest_snippet.lkml
MANIFEST_SNIPPET = '''visualization: {
  id: "rfm_customer_segmentation_matrix"
  label: "RFM Customer Segmentation & Cohort Matrix"
  file: "visualizations/rfm_customer_segmentation_matrix.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}'''

with open(os.path.join(VIZ_DIR, 'manifest_snippet.lkml'), 'w', encoding='utf-8') as f:
    f.write(MANIFEST_SNIPPET)
print('Generated manifest_snippet.lkml')

# Generate README.md
README_CONTENT = '''# RFM Customer Segmentation & Cohort Matrix

![RFM Customer Segmentation & Cohort Matrix](screenshot.png)

An executive **RFM Customer Segmentation & Cohort Matrix** custom visualization for Google Cloud Looker, engineered with **D3.js v7**.

Specifically designed for Strategic Marketing, Revenue Operations (RevOps), Customer Success, and E-Commerce / Retail analytics, this visualization resolves fundamental Cloud Blockers (**b/491028472**, **b/392019481**, and **b/510294821**) by dynamically classifying customer bases into 11 behavioral cohorts across Recency, Frequency, and Monetary (RFM) dimensions.

## Key Features & Multi-Modal Paradigms
- **4 Strategic Layout Topologies (`Display`)**:
  - `2D RFM Trellis Grid Matrix (R vs F Heatmap)`: 5x5 Recency vs Frequency grid cells tinted by segment with customer spend bubbles.
  - `Strategic Segment Treemap & Value Share`: Value-proportional rectangular treemap showing segment share of total revenue and customer count.
  - `Recency vs Monetary Customer Value Spectrum`: Continuous log-scale scatter plot showing days since last purchase vs LTV spend.
  - `Executive Action Matrix (Protect / Grow / Reactivate)`: 4-quadrant strategic playbook translating segments into concrete marketing/sales actions.
- **Dynamic Quintile Calculation**: Automatic O(N) client-side calculation of quintile score thresholds (1 to 5) for Recency, Frequency, and Monetary dimensions.
- **Dynamic Field-Role Dropdowns (`Display`)**: Re-map Customer Dimension, Recency Field (Date or Days), Frequency Measure (Orders), and Monetary Measure (Spend) directly from query columns.
- **Executive KPI HUD Scorecard (`Display`)**: Displays total cohort LTV, Champions share, target quota attainment, and at-risk churn alarms.
- **Brand Palettes & Style Customization (`Style`)**: Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Sunset Media, Wellverse Healthcare, or custom hex overrides with native color pickers.
- **Looker Drill-Down Menus**: Fully integrated with `LookerCharts.Utils.openDrillMenu` on customer bubbles.

## Recommended Data Shapes
- **Dimension 1**: Customer ID / Name (e.g. `users.name`, `users.id`).
- **Dimension 2 (or Date)**: Order Date or Days Since Order (e.g. `order_items.created_date`).
- **Measure 1**: Frequency Count (e.g. `order_items.count`).
- **Measure 2**: Total Monetary Value (e.g. `order_items.total_sale_price`).
- **Dimension 3 (Optional)**: Cohort / Country / Market (e.g. `users.country`).

## Setup in Looker (`manifest.lkml`)
```lookml
visualization: {
  id: "rfm_customer_segmentation_matrix"
  label: "RFM Customer Segmentation & Cohort Matrix"
  file: "visualizations/rfm_customer_segmentation_matrix.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
'''

with open(os.path.join(VIZ_DIR, 'README.md'), 'w', encoding='utf-8') as f:
    f.write(README_CONTENT)
print('Generated README.md')
