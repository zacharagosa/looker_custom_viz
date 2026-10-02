/**
 * Stephen Few Bullet Graph - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Implements Stephen Few's classic information-dense Bullet Graph specification
 * for executive KPI reporting, budget vs actual variance analysis, and quota attainment.
 *
 * Upgraded with comprehensive flexibility controls:
 * - Dynamic Field-Role Mapping (Dimension, Actual, Target, Baseline)
 * - Configurable Target Calculation Modes (Measure, Multiplier, Fixed, Dataset Mean/Median, P75, P90)
 * - Reference lines, alert thresholds, and anomaly highlighting
 * - Interactive sorting, Top-N bucketing with "Other" rollup, zero/null suppression
 * - Executive KPI Scorecard HUD modes (Full Scorecard, Compact Strip, Hidden)
 * - Value label density (All, Min/Max Peaks, Hidden), search bar filter, title override
 * - Enterprise color palettes (Executive Slate, Google Enterprise, Modern Slate, Cyberpunk Dark,
 *   Emerald FinOps, Sunset Media, Wellverse Healthcare, Custom Hex Override)
 * - Custom brand hex overrides, metric polarity, font scaling, and rich value formatting
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

  var THEMES = {
    executive_slate: {
      name: 'Executive Slate (Classic Few)',
      bands: ['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b'],
      actual: '#1e3a8a',
      target: '#dc2626',
      baseline: '#475569',
      badgePositiveBg: '#dcfce7',
      badgePositiveText: '#166534',
      badgeNegativeBg: '#fee2e2',
      badgeNegativeText: '#991b1b',
      bg: '#ffffff',
      text: '#1e293b',
      subtext: '#64748b',
      grid: '#f1f5f9'
    },
    google_enterprise: {
      name: 'Google Enterprise',
      bands: ['#e8f0fe', '#d2e3fc', '#aecbfa', '#8ab4f8'],
      actual: '#1a73e8',
      target: '#ea4335',
      baseline: '#fbbc04',
      badgePositiveBg: '#ceead6',
      badgePositiveText: '#137333',
      badgeNegativeBg: '#fad2cf',
      badgeNegativeText: '#c5221f',
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      grid: '#f8f9fa'
    },
    modern_slate: {
      name: 'Modern Slate',
      bands: ['#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8'],
      actual: '#0f172a',
      target: '#e11d48',
      baseline: '#64748b',
      badgePositiveBg: '#dcfce7',
      badgePositiveText: '#15803d',
      badgeNegativeBg: '#fee2e2',
      badgeNegativeText: '#b91c1c',
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      grid: '#f8fafc'
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark',
      bands: ['#1e293b', '#334155', '#475569', '#64748b'],
      actual: '#38bdf8',
      target: '#f43f5e',
      baseline: '#a855f7',
      badgePositiveBg: '#064e3b',
      badgePositiveText: '#6ee7b7',
      badgeNegativeBg: '#4c0519',
      badgeNegativeText: '#fda4af',
      bg: '#0f172a',
      text: '#f8fafc',
      subtext: '#94a3b8',
      grid: '#1e293b'
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      bands: ['#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399'],
      actual: '#065f46',
      target: '#047857',
      baseline: '#0f766e',
      badgePositiveBg: '#dcfce7',
      badgePositiveText: '#15803d',
      badgeNegativeBg: '#fee2e2',
      badgeNegativeText: '#b91c1c',
      bg: '#ffffff',
      text: '#064e3b',
      subtext: '#047857',
      grid: '#f0fdf4'
    },
    sunset_media: {
      name: 'Sunset Media',
      bands: ['#ffedd5', '#fed7aa', '#fdba74', '#fb923c'],
      actual: '#c2410c',
      target: '#991b1b',
      baseline: '#d97706',
      badgePositiveBg: '#ecfdf5',
      badgePositiveText: '#047857',
      badgeNegativeBg: '#fff1f2',
      badgeNegativeText: '#be123c',
      bg: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      grid: '#fff7ed'
    },
    wellverse_healthcare: {
      name: 'Wellverse Healthcare',
      bands: ['#EEF2F7', '#E2E8F0', '#CBD5E1', '#B8C4D4'],
      actual: '#143359',
      target: '#0F172A',
      baseline: '#64748B',
      badgePositiveBg: '#E6F7EF',
      badgePositiveText: '#006B40',
      badgeNegativeBg: '#FDECEC',
      badgeNegativeText: '#B42318',
      bg: '#ffffff',
      text: '#0F172A',
      subtext: '#64748B',
      grid: '#EEF2F7'
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
    return list[defaultIdx] || list[0];
  }

  function formatNumber(val, formatType, lookerRendered) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    if (formatType === 'auto' && lookerRendered) return lookerRendered;
    var abs = Math.abs(val);
    var sign = val < 0 ? '-' : '';

    if (formatType === 'compact_currency') {
      if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
      if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
      if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
      return sign + '$' + abs.toFixed(0);
    }
    if (formatType === 'compact_number') {
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + 'B';
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + 'M';
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
      return sign + (abs >= 10 ? Math.round(abs).toLocaleString() : abs.toFixed(1));
    }
    if (formatType === 'percentage') {
      return (val * (abs <= 1.0 ? 100 : 1)).toFixed(1) + '%';
    }
    if (formatType === 'decimal_2') {
      return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (formatType === 'raw') {
      return String(val);
    }
    // Default fallback
    if (lookerRendered) return lookerRendered;
    if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
    return sign + abs.toLocaleString();
  }

  var visObject = {
    id: 'bullet_graph',
    label: 'Stephen Few Bullet Graph',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      orientation: {
        type: 'string',
        label: 'Graph Orientation',
        display: 'select',
        values: [
          { 'Horizontal (Standard Few)': 'horizontal' },
          { 'Vertical (Columnar)': 'vertical' }
        ],
        default: 'horizontal',
        section: 'Display',
        order: 1
      },
      dimFieldOverride: {
        type: 'string',
        label: 'Category Dimension Index or Name (1 = Col 1)',
        default: '1',
        section: 'Display',
        order: 2
      },
      measureFieldOverride: {
        type: 'string',
        label: 'Actual Performance Measure (1 = Measure 1)',
        default: '1',
        section: 'Display',
        order: 3
      },
      targetMeasureOverride: {
        type: 'string',
        label: 'Target / Quota Measure Index or Name (Optional)',
        default: '2',
        section: 'Display',
        order: 4
      },
      baselineMeasureOverride: {
        type: 'string',
        label: 'Prior Baseline Measure Index or Name (Optional)',
        default: '3',
        section: 'Display',
        order: 5
      },
      targetCalculationMode: {
        type: 'string',
        label: 'Target / Quota Calculation Mode',
        display: 'select',
        values: [
          { 'Measure Column (From Query)': 'second_measure' },
          { 'Percentage Multiplier of Actual (e.g. 115%)': 'multiplier' },
          { 'Fixed Static Target Value': 'fixed' },
          { 'Dataset Mean (100% = Group Average)': 'dataset_mean' },
          { 'Dataset Median (100% = Group Median)': 'dataset_median' },
          { 'Top Percentile P75 Target': 'percentile_p75' },
          { 'Top Percentile P90 Target': 'percentile_p90' }
        ],
        default: 'second_measure',
        section: 'Display',
        order: 6
      },
      targetMultiplier: {
        type: 'number',
        label: 'Target Multiplier (when source is Multiplier)',
        default: 1.15,
        section: 'Display',
        order: 7
      },
      fixedTargetValue: {
        type: 'number',
        label: 'Fixed Target Value (when source is Fixed, 0 = Auto)',
        default: 0,
        section: 'Display',
        order: 8
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Target / Quota Marker Label',
        default: 'Target Goal',
        section: 'Display',
        order: 9
      },
      anomalyThresholdPct: {
        type: 'number',
        label: 'Attainment Anomaly Alert Threshold (%)',
        default: 120,
        section: 'Display',
        order: 10
      },
      qualitativeRanges: {
        type: 'string',
        label: 'Qualitative Range Tiers',
        display: 'select',
        values: [
          { '3-Tier (Poor, Satisfactory, Good)': '3_tier' },
          { '4-Tier (Poor, Fair, Good, Stretch)': '4_tier' }
        ],
        default: '3_tier',
        section: 'Display',
        order: 11
      },
      band1Pct: {
        type: 'number',
        label: 'Band 1: Poor / Low Threshold (%)',
        default: 60,
        section: 'Display',
        order: 12
      },
      band2Pct: {
        type: 'number',
        label: 'Band 2: Satisfactory Threshold (%)',
        default: 85,
        section: 'Display',
        order: 13
      },
      band3Pct: {
        type: 'number',
        label: 'Band 3: Good / Target Threshold (%)',
        default: 100,
        section: 'Display',
        order: 14
      },
      band4Pct: {
        type: 'number',
        label: 'Band 4: Stretch Threshold (%) (4-Tier only)',
        default: 120,
        section: 'Display',
        order: 15
      },
      sortBy: {
        type: 'string',
        label: 'Sorting & Ordering',
        display: 'select',
        values: [
          { 'Default (Looker Query Order)': 'default' },
          { 'Actual Value (Metric Descending)': 'actual_desc' },
          { 'Actual Value (Metric Ascending)': 'actual_asc' },
          { 'Attainment % (Highest to Lowest)': 'attainment_desc' },
          { 'Attainment % (Lowest to Highest)': 'attainment_asc' },
          { 'Category Name (Alphabetical A-Z)': 'label_asc' }
        ],
        default: 'default',
        section: 'Display',
        order: 16
      },
      topNLimit: {
        type: 'number',
        label: 'Top-N Categories Limit (0 = All, Max 25)',
        default: 0,
        section: 'Display',
        order: 17
      },
      enableOtherRollup: {
        type: 'boolean',
        label: 'Group Remaining into "Other" Rollup Bar',
        default: false,
        section: 'Display',
        order: 18
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Suppress Zero / Null Actuals',
        default: false,
        section: 'Display',
        order: 19
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
        order: 20
      },
      showValueLabels: {
        type: 'string',
        label: 'Data Value Readouts',
        display: 'select',
        values: [
          { 'Show All Categories': 'all' },
          { 'Min/Max Peaks Only': 'peaks_only' },
          { 'Hidden': 'hidden' }
        ],
        default: 'all',
        section: 'Display',
        order: 21
      },
      customTitleOverride: {
        type: 'string',
        label: 'Custom Scorecard Title Override',
        default: '',
        section: 'Display',
        order: 22
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Category Search Bar',
        default: true,
        section: 'Display',
        order: 23
      },
      showTargetMarker: {
        type: 'boolean',
        label: 'Show Target Marker Line',
        default: true,
        section: 'Display',
        order: 24
      },
      showVarianceBadge: {
        type: 'boolean',
        label: 'Show Attainment / Variance Badge',
        default: true,
        section: 'Display',
        order: 25
      },
      varianceBadgeFormat: {
        type: 'string',
        label: 'Badge Metric Display',
        display: 'select',
        values: [
          { 'Attainment % (e.g. 108.4%)': 'attainment_pct' },
          { 'Variance % (e.g. +8.4% / -4.2%)': 'variance_pct' },
          { 'Delta Amount (e.g. +$12.5K)': 'delta_val' }
        ],
        default: 'attainment_pct',
        section: 'Display',
        order: 26
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorTheme: {
        type: 'string',
        label: 'Brand Palette Preset',
        display: 'select',
        values: [
          { 'Executive Slate (Classic Few)': 'executive_slate' },
          { 'Google Enterprise': 'google_enterprise' },
          { 'Modern Slate': 'modern_slate' },
          { 'Cyberpunk Dark': 'cyberpunk_dark' },
          { 'Emerald FinOps': 'emerald_finops' },
          { 'Sunset Media': 'sunset_media' },
          { 'Wellverse Healthcare': 'wellverse_healthcare' },
          { 'Custom Hex Override': 'custom_override' }
        ],
        default: 'executive_slate',
        section: 'Style',
        order: 1
      },
      customPrimaryHex: {
        type: 'string',
        label: 'Custom Actual Bar Color (Hex)',
        display: 'color',
        default: '',
        section: 'Style',
        order: 2
      },
      customPositiveHex: {
        type: 'string',
        label: 'Custom Target / Quota Color (Hex)',
        display: 'color',
        default: '',
        section: 'Style',
        order: 3
      },
      customNegativeHex: {
        type: 'string',
        label: 'Custom Alert / Deficit Color (Hex)',
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
          { 'Higher is Better (Revenue, Margin, Quota Attainment)': 'higher_is_better' },
          { 'Lower is Better (Latency, Churn, Defect, Operating Cost)': 'lower_is_better' }
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
        label: 'Value Formatting Style',
        display: 'select',
        values: [
          { 'Auto (from Looker Field Format)': 'auto' },
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
      barThickness: {
        type: 'number',
        label: 'Actual Performance Bar Thickness (px)',
        display: 'range',
        min: 8,
        max: 32,
        step: 2,
        default: 18,
        section: 'Style',
        order: 8
      },
      rowHeight: {
        type: 'number',
        label: 'Row / Item Height (px)',
        display: 'range',
        min: 44,
        max: 96,
        step: 4,
        default: 64,
        section: 'Style',
        order: 9
      },
      enableAnimation: {
        type: 'boolean',
        label: 'Enable Smooth Entry Animations',
        default: true,
        section: 'Style',
        order: 10
      }
    },

    create: function (element, config) {
      element.innerHTML = '';
      element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      element.style.overflow = 'hidden';
      element.style.boxSizing = 'border-box';
      element.style.padding = '0';
      element.style.display = 'flex';
      element.style.flexDirection = 'column';

      var container = document.createElement('div');
      container.className = 'bullet-graph-container';
      container.style.width = '100%';
      container.style.flex = '1 1 auto';
      container.style.minHeight = '0';
      container.style.boxSizing = 'border-box';
      container.style.padding = '0';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.overflow = 'hidden';
      element.appendChild(container);

      // Create floating tooltip
      var tooltip = document.createElement('div');
      tooltip.className = 'bullet-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.opacity = '0';
      tooltip.style.padding = '10px 14px';
      tooltip.style.borderRadius = '8px';
      tooltip.style.fontSize = '12px';
      tooltip.style.lineHeight = '1.5';
      tooltip.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.2)';
      tooltip.style.zIndex = '99999';
      tooltip.style.transition = 'opacity 0.15s ease-in-out, transform 0.15s ease-in-out';
      tooltip.style.backdropFilter = 'blur(8px)';
      tooltip.style.webkitBackdropFilter = 'blur(8px)';
      document.body.appendChild(tooltip);
      element._bulletTooltip = tooltip;
      this._element = element;
      this._setupResizeObserver(element);
    },

    _setupResizeObserver: function (element) {
      var self = this;
      if (this._resizeObserver) {
        try { this._resizeObserver.disconnect(); } catch (e) {}
        this._resizeObserver = null;
      }
      if (typeof ResizeObserver !== "undefined" && element) {
        this._resizeObserver = new ResizeObserver(function () {
          self._onResize();
        });
        this._resizeObserver.observe(element);
      }
      if (!this._windowResizeBound) {
        this._windowResizeBound = true;
        window.addEventListener("resize", function () {
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
      }, 50);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

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
      var container = element.querySelector('.bullet-graph-container');
      var tooltip = element._bulletTooltip;
      if (!container) {
        done();
        return;
      }
      container.innerHTML = '';

      if (!data || data.length === 0) {
        this.addError({
          title: 'No Data',
          message: 'The query returned no results to display.'
        });
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dimensions = fields.dimensions || [];
      var measures = fields.measures || [];

      if (measures.length === 0) {
        this.addError({
          title: 'Measure Required',
          message: 'At least one measure (Actual Value) is required. An optional second measure provides the Target/Goal.'
        });
        done();
        return;
      }

      // --- 1. RESOLVE FIELD ROLES WITH CONFIG OVERRIDES ---
      var dimField = resolveField(dimensions, config.dimFieldOverride, 0);
      var actualField = resolveField(measures, config.measureFieldOverride, 0);
      var targetField = config.targetMeasureOverride ? resolveField(measures, config.targetMeasureOverride, 1) : (measures.length > 1 ? measures[1] : null);
      var baselineField = config.baselineMeasureOverride ? resolveField(measures, config.baselineMeasureOverride, 2) : (measures.length > 2 ? measures[2] : null);

      // --- 2. THEMES & COLOR RESOLUTION ---
      var themeKey = config.colorTheme || 'executive_slate';
      var theme = THEMES[themeKey] ? Object.assign({}, THEMES[themeKey]) : Object.assign({}, THEMES.executive_slate);

      if (themeKey === 'custom_override' || config.customPrimaryHex) {
        if (config.customPrimaryHex) theme.actual = config.customPrimaryHex;
        if (config.customPositiveHex) {
          theme.target = config.customPositiveHex;
          theme.badgePositiveText = config.customPositiveHex;
        }
        if (config.customNegativeHex) {
          theme.badgeNegativeText = config.customNegativeHex;
        }
      }

      var isLowerBetter = config.metricPolarity === 'lower_is_better';
      if (isLowerBetter) {
        var tempBg = theme.badgePositiveBg;
        var tempTxt = theme.badgePositiveText;
        theme.badgePositiveBg = theme.badgeNegativeBg;
        theme.badgePositiveText = theme.badgeNegativeText;
        theme.badgeNegativeBg = tempBg;
        theme.badgeNegativeText = tempTxt;
      }

      element.style.backgroundColor = theme.bg;
      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      // Tooltip styling
      if (tooltip) {
        if (themeKey === 'cyberpunk_dark') {
          tooltip.style.background = 'rgba(15, 23, 42, 0.94)';
          tooltip.style.color = '#f8fafc';
          tooltip.style.border = '1px solid #334155';
        } else {
          tooltip.style.background = 'rgba(15, 23, 42, 0.92)';
          tooltip.style.color = '#ffffff';
          tooltip.style.border = '1px solid rgba(255,255,255,0.1)';
        }
      }

      // Value Formatter
      function formatVal(val, lookerRendered) {
        return formatNumber(val, config.valueFormat || 'auto', lookerRendered);
      }

      // --- 3. PARSE RAW ITEMS ---
      var rawItems = [];
      data.forEach(function (row, idx) {
        var label = dimField ? (row[dimField.name].rendered || row[dimField.name].value || 'Item ' + (idx + 1)) : (actualField.label_short || actualField.label || 'KPI Total');
        var actualVal = Number(row[actualField.name].value) || 0;
        var actualRendered = row[actualField.name].rendered;

        if (config.suppressZeroNull && (actualVal === 0 || isNaN(actualVal))) {
          return;
        }

        var targetVal = 0;
        var targetRendered = null;
        if (targetField && row[targetField.name]) {
          targetVal = Number(row[targetField.name].value) || 0;
          targetRendered = row[targetField.name].rendered;
        }

        var baselineVal = (baselineField && row[baselineField.name]) ? Number(row[baselineField.name].value) || null : null;
        var baselineRendered = baselineField && row[baselineField.name] ? row[baselineField.name].rendered : null;

        // Drill links resolution
        var drillLinks = (row[actualField.name] && row[actualField.name].links) ||
          (dimField && row[dimField.name] && row[dimField.name].links) ||
          (targetField && row[targetField.name] && row[targetField.name].links) || [];

        rawItems.push({
          id: 'row_' + idx,
          label: String(label),
          actual: actualVal,
          actualRendered: actualRendered,
          target: targetVal,
          targetRendered: targetRendered,
          baseline: baselineVal,
          baselineRendered: baselineRendered,
          drillLinks: drillLinks
        });
      });

      if (rawItems.length === 0) {
        this.addError({
          title: 'No Data',
          message: 'All returned items evaluated to zero or null.'
        });
        done();
        return;
      }

      // --- 4. TARGET CALCULATION & STATISTICAL MODES ---
      var actualValues = rawItems.map(function (d) { return d.actual; }).sort(function (a, b) { return a - b; });
      var sumActual = actualValues.reduce(function (acc, v) { return acc + v; }, 0);
      var meanActual = sumActual / (actualValues.length || 1);
      var medianActual = actualValues[Math.floor(actualValues.length / 2)] || meanActual;
      var p75Actual = actualValues[Math.floor(actualValues.length * 0.75)] || medianActual;
      var p90Actual = actualValues[Math.floor(actualValues.length * 0.90)] || actualValues[actualValues.length - 1];
      var maxObserved = actualValues[actualValues.length - 1] || 100;

      var targetMode = config.targetCalculationMode || 'second_measure';
      var mult = Number(config.targetMultiplier) || 1.15;
      var fixedTarget = Number(config.fixedTargetValue) || 0;

      rawItems.forEach(function (item) {
        if (targetMode === 'second_measure' && item.target > 0) {
          // Use query target
        } else if (targetMode === 'multiplier') {
          item.target = item.actual * mult;
        } else if (targetMode === 'fixed' && fixedTarget > 0) {
          item.target = fixedTarget;
        } else if (targetMode === 'dataset_mean') {
          item.target = meanActual;
        } else if (targetMode === 'dataset_median') {
          item.target = medianActual;
        } else if (targetMode === 'percentile_p75') {
          item.target = p75Actual;
        } else if (targetMode === 'percentile_p90') {
          item.target = p90Actual;
        } else {
          item.target = item.target > 0 ? item.target : (fixedTarget > 0 ? fixedTarget : item.actual * 1.15);
        }

        var attainmentRate = item.target > 0 ? (item.actual / item.target) * 100 : (item.actual > 0 ? 100 : 0);
        var variancePct = item.target > 0 ? ((item.actual - item.target) / item.target) * 100 : 0;
        var deltaVal = item.actual - item.target;

        var isFourTier = (config.qualitativeRanges === '4_tier');
        var b1Pct = Number(config.band1Pct) || (isFourTier ? 50 : 60);
        var b2Pct = Number(config.band2Pct) || (isFourTier ? 75 : 85);
        var b3Pct = Number(config.band3Pct) || 100;
        var b4Pct = Number(config.band4Pct) || 120;

        var maxTargetOrActual = Math.max(item.actual, item.target, item.baseline || 0);
        var scaleMax = item.target > 0 ? item.target * (isFourTier ? (b4Pct / 100) : 1.15) : maxTargetOrActual * 1.2;
        if (item.actual > scaleMax) scaleMax = item.actual * 1.08;
        if (scaleMax <= 0) scaleMax = 100;

        var bandRanges = [];
        if (isFourTier) {
          bandRanges = [
            { name: 'Poor', val: scaleMax * (b1Pct / b4Pct), tier: 1 },
            { name: 'Fair', val: scaleMax * (b2Pct / b4Pct), tier: 2 },
            { name: 'Good', val: scaleMax * (b3Pct / b4Pct), tier: 3 },
            { name: 'Stretch', val: scaleMax, tier: 4 }
          ];
        } else {
          bandRanges = [
            { name: 'Poor', val: (item.target > 0 ? item.target * (b1Pct / 100) : scaleMax * 0.6), tier: 1 },
            { name: 'Satisfactory', val: (item.target > 0 ? item.target * (b2Pct / 100) : scaleMax * 0.85), tier: 2 },
            { name: 'Good', val: scaleMax, tier: 3 }
          ];
        }

        var isMet = isLowerBetter ? (item.actual <= item.target) : (item.actual >= item.target);
        var achievedTier = 'Needs Attention';
        if (isMet) {
          achievedTier = item.actual >= (item.target * (b4Pct / 100)) && isFourTier ? 'Stretch Exceeded' : 'Target Met (Good)';
        } else if (item.actual >= (item.target * (b2Pct / 100))) {
          achievedTier = 'Satisfactory';
        }

        item.attainmentRate = attainmentRate;
        item.variancePct = variancePct;
        item.deltaVal = deltaVal;
        item.scaleMax = scaleMax;
        item.bandRanges = bandRanges;
        item.achievedTier = achievedTier;
      });

      // --- 5. SORTING & TOP-N BUCKETING ---
      var sortMode = config.sortBy || 'default';
      if (sortMode === 'actual_desc') {
        rawItems.sort(function (a, b) { return b.actual - a.actual; });
      } else if (sortMode === 'actual_asc') {
        rawItems.sort(function (a, b) { return a.actual - b.actual; });
      } else if (sortMode === 'attainment_desc') {
        rawItems.sort(function (a, b) { return b.attainmentRate - a.attainmentRate; });
      } else if (sortMode === 'attainment_asc') {
        rawItems.sort(function (a, b) { return a.attainmentRate - b.attainmentRate; });
      } else if (sortMode === 'label_asc') {
        rawItems.sort(function (a, b) { return a.label.localeCompare(b.label); });
      }

      var items = rawItems;
      var topN = Number(config.topNLimit) || 0;
      if (topN > 0 && rawItems.length > topN) {
        var topItems = rawItems.slice(0, topN);
        if (config.enableOtherRollup) {
          var remaining = rawItems.slice(topN);
          var otherActual = remaining.reduce(function (acc, d) { return acc + d.actual; }, 0);
          var otherTarget = remaining.reduce(function (acc, d) { return acc + d.target; }, 0) || (otherActual * 1.15);
          var otherAttainment = otherTarget > 0 ? (otherActual / otherTarget) * 100 : 100;
          var otherDelta = otherActual - otherTarget;
          var otherVariance = otherTarget > 0 ? ((otherActual - otherTarget) / otherTarget) * 100 : 0;
          var otherScaleMax = Math.max(otherActual, otherTarget) * 1.15;

          topItems.push({
            id: 'other_rollup',
            label: 'Other (' + remaining.length + ' items)',
            actual: otherActual,
            actualRendered: null,
            target: otherTarget,
            targetRendered: null,
            baseline: null,
            baselineRendered: null,
            attainmentRate: otherAttainment,
            variancePct: otherVariance,
            deltaVal: otherDelta,
            scaleMax: otherScaleMax,
            bandRanges: [
              { name: 'Poor', val: otherScaleMax * 0.6, tier: 1 },
              { name: 'Satisfactory', val: otherScaleMax * 0.85, tier: 2 },
              { name: 'Good', val: otherScaleMax, tier: 3 }
            ],
            achievedTier: otherAttainment >= 100 ? 'Target Met (Good)' : 'Needs Attention',
            drillLinks: []
          });
        }
        items = topItems;
      }

      // --- 6. EXECUTIVE KPI SCORECARD HUD ---
      var hudMode = config.hudMode || 'scorecard';
      var totalActual = items.reduce(function (acc, it) { return acc + it.actual; }, 0);
      var totalTarget = items.reduce(function (acc, it) { return acc + it.target; }, 0);
      var avgAttainment = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
      var totalItems = items.length;
      var metTargetCount = items.filter(function (it) {
        return isLowerBetter ? (it.actual <= it.target) : (it.actual >= it.target);
      }).length;

      var fontScale = config.fontScale || 'standard';
      var fontScaleMap = {
        compact: { title: '13px', subtitle: '11px', statNum: '13px', statLbl: '9px', rowLabel: '11px', badge: '10px' },
        standard: { title: '15px', subtitle: '12px', statNum: '15px', statLbl: '10px', rowLabel: '12px', badge: '11px' },
        large: { title: '18px', subtitle: '13px', statNum: '18px', statLbl: '11px', rowLabel: '14px', badge: '12px' }
      };
      var fSizes = fontScaleMap[fontScale] || fontScaleMap.standard;

      if (hudMode !== 'hidden') {
        var header = document.createElement('div');
        header.className = 'bullet-header-hud';
        header.style.display = 'flex';
        header.style.flexWrap = 'wrap';
        header.style.alignItems = 'center';
        header.style.justifyContent = 'space-between';
        header.style.gap = '12px';
        header.style.padding = hudMode === 'compact_strip' ? '6px 14px' : '10px 16px';
        header.style.marginBottom = '10px';
        header.style.backgroundColor = hudMode === 'compact_strip' ? (themeKey === 'cyberpunk_dark' ? '#1e293b' : '#f8fafc') : (themeKey === 'cyberpunk_dark' ? '#0f172a' : '#f1f5f9');
        header.style.borderBottom = '1px solid ' + (themeKey === 'cyberpunk_dark' ? '#334155' : '#e2e8f0');
        header.style.flexShrink = '0';

        var titleBox = document.createElement('div');
        var mainTitle = document.createElement('div');
        mainTitle.style.fontSize = fSizes.title;
        mainTitle.style.fontWeight = '700';
        mainTitle.style.letterSpacing = '-0.02em';
        mainTitle.textContent = config.customTitleOverride || ((dimField ? dimField.label_short || dimField.label : 'Executive KPI') + ' — ' + (actualField.label_short || actualField.label) + (targetField ? ' vs ' + (targetField.label_short || targetField.label) : ''));

        var subtitle = document.createElement('div');
        subtitle.style.fontSize = fSizes.subtitle;
        subtitle.style.color = theme.subtext;
        subtitle.style.marginTop = '2px';
        subtitle.textContent = totalItems + ' Categories Analyzed • ' + metTargetCount + ' of ' + totalItems + ' on track (' + ((metTargetCount / totalItems) * 100).toFixed(0) + '%)';
        titleBox.appendChild(mainTitle);
        titleBox.appendChild(subtitle);
        header.appendChild(titleBox);

        // KPI stat pills
        var statsBox = document.createElement('div');
        statsBox.style.display = 'flex';
        statsBox.style.gap = '10px';
        statsBox.style.flexWrap = 'wrap';

        function createStatCard(label, val, isPositive) {
          var card = document.createElement('div');
          card.style.background = themeKey === 'cyberpunk_dark' ? '#1e293b' : '#ffffff';
          card.style.border = '1px solid ' + (themeKey === 'cyberpunk_dark' ? '#334155' : '#e2e8f0');
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
          v.style.color = (isPositive === true ? theme.badgePositiveText : (isPositive === false ? theme.badgeNegativeText : theme.text));
          v.textContent = val;

          card.appendChild(lbl);
          card.appendChild(v);
          return card;
        }

        var isRate = (config.valueFormat === 'percentage') ||
          /%/.test(actualField.value_format || '') ||
          /(rate|pct|percent|penetration|ratio)/i.test(actualField.name || '');
        var hudN = totalItems || 1;
        var hudPrefix = isRate ? 'Avg ' : 'Total ';
        statsBox.appendChild(createStatCard(hudPrefix + 'Actual', formatVal(isRate ? totalActual / hudN : totalActual, null), null));
        if (totalTarget > 0) {
          statsBox.appendChild(createStatCard(hudPrefix + (config.referenceLineLabel || 'Target'), formatVal(isRate ? totalTarget / hudN : totalTarget, null), null));
          var overallMet = isLowerBetter ? (avgAttainment <= 100) : (avgAttainment >= 100);
          statsBox.appendChild(createStatCard('Attainment', avgAttainment.toFixed(1) + '%', overallMet));
        }

        // Search Bar (if enabled)
        if (config.showSearch !== false) {
          var searchWrapper = document.createElement('div');
          searchWrapper.style.display = 'flex';
          searchWrapper.style.alignItems = 'center';
          searchWrapper.style.marginLeft = '4px';

          var searchInput = document.createElement('input');
          searchInput.type = 'text';
          searchInput.placeholder = 'Search items...';
          searchInput.style.padding = '5px 10px';
          searchInput.style.fontSize = '11px';
          searchInput.style.borderRadius = '6px';
          searchInput.style.border = '1px solid ' + (themeKey === 'cyberpunk_dark' ? '#334155' : '#cbd5e1');
          searchInput.style.background = themeKey === 'cyberpunk_dark' ? '#0f172a' : '#ffffff';
          searchInput.style.color = theme.text;
          searchInput.style.outline = 'none';
          searchInput.style.width = '120px';

          searchInput.addEventListener('input', function (e) {
            var q = e.target.value.toLowerCase().trim();
            var rows = container.querySelectorAll('.bullet-row, .bullet-col');
            rows.forEach(function (r) {
              var lbl = r.getAttribute('data-item-label') || '';
              if (!q || lbl.toLowerCase().indexOf(q) !== -1) {
                r.style.display = '';
              } else {
                r.style.display = 'none';
              }
            });
          });
          searchWrapper.appendChild(searchInput);
          statsBox.appendChild(searchWrapper);
        }

        header.appendChild(statsBox);
        container.appendChild(header);
      }

      // --- 7. LEGEND ---
      var legend = document.createElement('div');
      legend.className = 'bullet-legend';
      legend.style.display = 'flex';
      legend.style.alignItems = 'center';
      legend.style.gap = '16px';
      legend.style.fontSize = '11px';
      legend.style.color = theme.subtext;
      legend.style.padding = '0 16px 8px 16px';
      legend.style.flexWrap = 'wrap';
      legend.style.flexShrink = '0';

      var actualLegend = document.createElement('div');
      actualLegend.style.display = 'flex';
      actualLegend.style.alignItems = 'center';
      actualLegend.style.gap = '6px';
      actualLegend.innerHTML = '<span style="display:inline-block;width:14px;height:8px;background:' + theme.actual + ';border-radius:2px;"></span> <strong>Actual:</strong> ' + (actualField.label_short || actualField.label);
      legend.appendChild(actualLegend);

      if (config.showTargetMarker !== false) {
        var targetLegend = document.createElement('div');
        targetLegend.style.display = 'flex';
        targetLegend.style.alignItems = 'center';
        targetLegend.style.gap = '6px';
        targetLegend.innerHTML = '<span style="display:inline-block;width:3px;height:12px;background:' + theme.target + ';border-radius:1px;"></span> <strong>' + (config.referenceLineLabel || 'Target / Goal') + ':</strong> ' + (targetField ? (targetField.label_short || targetField.label) : 'Goal Mode (' + targetMode + ')');
        legend.appendChild(targetLegend);
      }

      var bandsLegend = document.createElement('div');
      bandsLegend.style.display = 'flex';
      bandsLegend.style.alignItems = 'center';
      bandsLegend.style.gap = '4px';
      var bandSquares = theme.bands.map(function (c) {
        return '<span style="display:inline-block;width:10px;height:10px;background:' + c + ';"></span>';
      }).join('');
      bandsLegend.innerHTML = '<div style="display:flex;margin-right:2px;">' + bandSquares + '</div> <span>Qualitative Ranges (Poor → Good)</span>';
      legend.appendChild(bandsLegend);

      // Drill affordance indicator
      var hasDrills = items.some(function (it) { return it.drillLinks && it.drillLinks.length > 0; });
      if (hasDrills) {
        var drillPill = document.createElement('div');
        drillPill.style.marginLeft = 'auto';
        drillPill.style.fontSize = '10px';
        drillPill.style.fontWeight = '700';
        drillPill.style.color = themeKey === 'cyberpunk_dark' ? '#38bdf8' : '#1e3a8a';
        drillPill.style.padding = '2px 8px';
        drillPill.style.borderRadius = '12px';
        drillPill.style.background = themeKey === 'cyberpunk_dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 58, 138, 0.08)';
        drillPill.textContent = '🔎 CLICK ANY BAR TO DRILL';
        legend.appendChild(drillPill);
      }

      container.appendChild(legend);

      // --- 8. BULLET GRAPH BODY (SCROLLABLE SVG CONTAINER) ---
      var graphWrapper = document.createElement('div');
      graphWrapper.className = 'bullet-graph-wrapper';
      graphWrapper.style.width = '100%';
      graphWrapper.style.flex = '1 1 auto';
      graphWrapper.style.overflow = 'auto';
      graphWrapper.style.padding = '0 16px 16px 16px';
      graphWrapper.style.boxSizing = 'border-box';
      container.appendChild(graphWrapper);

      var orientation = config.orientation || 'horizontal';
      var isHorizontal = (orientation === 'horizontal');
      var barThickness = Number(config.barThickness) || 18;
      var rowHeight = Number(config.rowHeight) || 64;
      var enableAnimation = config.enableAnimation !== false;

      if (isHorizontal) {
        renderHorizontalBullets(d3, graphWrapper, items, theme, config, tooltip, formatVal, barThickness, rowHeight, enableAnimation, fSizes);
      } else {
        renderVerticalBullets(d3, graphWrapper, items, theme, config, tooltip, formatVal, barThickness, enableAnimation, fSizes);
      }

      done();
    }
  };

  function renderHorizontalBullets(d3, container, items, theme, config, tooltip, formatVal, barThickness, rowHeight, enableAnimation, fSizes) {
    var width = container.clientWidth || 800;
    var labelColWidth = Math.min(240, Math.max(140, width * 0.22));
    var valueColWidth = config.showVarianceBadge !== false ? 120 : 70;
    var bulletWidth = Math.max(160, width - labelColWidth - valueColWidth - 40);
    var totalHeight = items.length * rowHeight + 20;

    // Determine min/max peaks for label density
    var minVal = Infinity, maxVal = -Infinity;
    items.forEach(function (it) {
      if (it.actual < minVal) minVal = it.actual;
      if (it.actual > maxVal) maxVal = it.actual;
    });

    var svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', totalHeight)
      .attr('viewBox', '0 0 ' + width + ' ' + totalHeight)
      .style('display', 'block');

    var g = svg.append('g')
      .attr('transform', 'translate(10, 10)');

    items.forEach(function (item, idx) {
      var rowY = idx * rowHeight;
      var rowG = g.append('g')
        .attr('class', 'bullet-row')
        .attr('data-item-label', item.label)
        .attr('transform', 'translate(0, ' + rowY + ')')
        .style('cursor', 'pointer');

      // Hover background
      var hoverBg = rowG.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width - 20)
        .attr('height', rowHeight - 4)
        .attr('fill', 'transparent')
        .attr('rx', 6)
        .style('transition', 'fill 0.15s ease');

      // Label column
      var textG = rowG.append('g')
        .attr('transform', 'translate(4, ' + (rowHeight / 2 - 2) + ')');

      textG.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('font-size', fSizes.rowLabel)
        .attr('font-weight', '600')
        .attr('fill', theme.text)
        .text(truncateString(item.label, Math.floor(labelColWidth / 8)));

      var showLabels = config.showValueLabels || 'all';
      var isPeak = (item.actual === minVal || item.actual === maxVal);
      var renderReadout = (showLabels === 'all') || (showLabels === 'peaks_only' && isPeak);

      if (renderReadout) {
        textG.append('text')
          .attr('x', 0)
          .attr('y', 15)
          .attr('font-size', '11px')
          .attr('fill', theme.subtext)
          .text('Actual: ' + formatVal(item.actual, item.actualRendered));
      }

      // Bullet Graph Area
      var bulletG = rowG.append('g')
        .attr('transform', 'translate(' + labelColWidth + ', ' + (rowHeight / 2 - 14) + ')');

      var scale = d3.scaleLinear()
        .domain([0, item.scaleMax])
        .range([0, bulletWidth]);

      // Qualitative range bands
      var bandHeight = 28;
      var reversedBands = item.bandRanges.slice().reverse();
      reversedBands.forEach(function (band, bIdx) {
        var bandColor = theme.bands[band.tier - 1] || theme.bands[theme.bands.length - 1];
        bulletG.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', Math.min(bulletWidth, Math.max(0, scale(band.val))))
          .attr('height', bandHeight)
          .attr('fill', bandColor)
          .attr('rx', bIdx === 0 ? 3 : 0);
      });

      // Subtle range axis tick lines
      var tickCount = Math.min(4, Math.floor(bulletWidth / 80));
      var ticks = scale.ticks(tickCount);
      ticks.forEach(function (t) {
        if (t === 0 || t > item.scaleMax) return;
        bulletG.append('line')
          .attr('x1', scale(t))
          .attr('x2', scale(t))
          .attr('y1', 0)
          .attr('y2', bandHeight)
          .attr('stroke', 'rgba(255,255,255,0.4)')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,2');
      });

      // Actual Performance Bar
      var actualBarY = (bandHeight - barThickness) / 2;
      var actualBar = bulletG.append('rect')
        .attr('x', 0)
        .attr('y', actualBarY)
        .attr('height', barThickness)
        .attr('fill', theme.actual)
        .attr('rx', 2);

      if (enableAnimation) {
        actualBar
          .attr('width', 0)
          .transition()
          .duration(750)
          .delay(idx * 30)
          .ease(d3.easeCubicOut)
          .attr('width', Math.min(bulletWidth, Math.max(0, scale(item.actual))));
      } else {
        actualBar.attr('width', Math.min(bulletWidth, Math.max(0, scale(item.actual))));
      }

      // Target Marker Line
      if (config.showTargetMarker !== false && item.target > 0) {
        var targetX = scale(item.target);
        var targetMarker = bulletG.append('line')
          .attr('x1', targetX)
          .attr('x2', targetX)
          .attr('y1', -3)
          .attr('y2', bandHeight + 3)
          .attr('stroke', theme.target)
          .attr('stroke-width', 3.5)
          .attr('stroke-linecap', 'round');

        targetMarker.style('filter', 'drop-shadow(0px 0px 2px rgba(0,0,0,0.3))');
      }

      // Comparative Baseline Marker
      if (item.baseline !== null && item.baseline > 0) {
        var baseX = scale(item.baseline);
        bulletG.append('line')
          .attr('x1', baseX)
          .attr('x2', baseX)
          .attr('y1', 2)
          .attr('y2', bandHeight - 2)
          .attr('stroke', theme.baseline)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '3,3');
      }

      // Variance / Attainment Badge Column
      var badgeX = labelColWidth + bulletWidth + 16;
      var badgeG = rowG.append('g')
        .attr('transform', 'translate(' + badgeX + ', ' + (rowHeight / 2 - 12) + ')');

      if (config.showVarianceBadge !== false && item.target > 0) {
        var isLowerBetter = config.metricPolarity === 'lower_is_better';
        var isMet = isLowerBetter ? (item.actual <= item.target) : (item.attainmentRate >= 100);
        var badgeBg = isMet ? theme.badgePositiveBg : theme.badgeNegativeBg;
        var badgeText = isMet ? theme.badgePositiveText : theme.badgeNegativeText;

        var displayString = '';
        var badgeFmt = config.varianceBadgeFormat || 'attainment_pct';
        if (badgeFmt === 'attainment_pct') {
          displayString = item.attainmentRate.toFixed(1) + '%';
        } else if (badgeFmt === 'variance_pct') {
          displayString = (item.variancePct >= 0 ? '+' : '') + item.variancePct.toFixed(1) + '%';
        } else if (badgeFmt === 'delta_val') {
          displayString = (item.deltaVal >= 0 ? '+' : '-') + formatVal(Math.abs(item.deltaVal), null);
        }

        badgeG.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 82)
          .attr('height', 24)
          .attr('rx', 12)
          .attr('fill', badgeBg);

        badgeG.append('text')
          .attr('x', 41)
          .attr('y', 16)
          .attr('text-anchor', 'middle')
          .attr('font-size', fSizes.badge)
          .attr('font-weight', '700')
          .attr('fill', badgeText)
          .text(displayString);
      }

      // Hover and Click Drill events
      rowG.on('mouseenter', function (event) {
        hoverBg.attr('fill', theme.name && theme.name.includes('Dark') ? 'rgba(51, 65, 85, 0.4)' : 'rgba(241, 245, 249, 0.8)');
        showTooltip(tooltip, event, item, formatVal, theme, config);
      })
      .on('mousemove', function (event) {
        moveTooltip(tooltip, event);
      })
      .on('mouseleave', function () {
        hoverBg.attr('fill', 'transparent');
        hideTooltip(tooltip);
      })
      .on('click', function (event) {
        if (item.drillLinks && item.drillLinks.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
          window.LookerCharts.Utils.openDrillMenu({
            links: item.drillLinks,
            event: event
          });
        }
      });
    });
  }

  function renderVerticalBullets(d3, container, items, theme, config, tooltip, formatVal, barThickness, enableAnimation, fSizes) {
    var containerWidth = container.clientWidth || 800;
    var colWidth = Math.max(90, Math.min(140, containerWidth / Math.max(1, items.length)));
    var totalWidth = items.length * colWidth + 60;
    var graphHeight = 320;
    var totalHeight = graphHeight + 100;

    var minVal = Infinity, maxVal = -Infinity;
    items.forEach(function (it) {
      if (it.actual < minVal) minVal = it.actual;
      if (it.actual > maxVal) maxVal = it.actual;
    });

    var svg = d3.select(container)
      .append('svg')
      .attr('width', Math.max(containerWidth, totalWidth))
      .attr('height', totalHeight)
      .style('display', 'block');

    var g = svg.append('g')
      .attr('transform', 'translate(20, 20)');

    items.forEach(function (item, idx) {
      var colX = idx * colWidth;
      var colG = g.append('g')
        .attr('class', 'bullet-col')
        .attr('data-item-label', item.label)
        .attr('transform', 'translate(' + colX + ', 0)')
        .style('cursor', 'pointer');

      var hoverBg = colG.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', colWidth - 8)
        .attr('height', graphHeight + 80)
        .attr('fill', 'transparent')
        .attr('rx', 4);

      var scale = d3.scaleLinear()
        .domain([0, item.scaleMax])
        .range([graphHeight, 0]);

      var bandWidth = 32;
      var bandX = (colWidth - 8 - bandWidth) / 2;

      // Qualitative range bands
      var reversedBands = item.bandRanges.slice().reverse();
      reversedBands.forEach(function (band) {
        var bandColor = theme.bands[band.tier - 1] || theme.bands[theme.bands.length - 1];
        var yPos = scale(band.val);
        var height = graphHeight - yPos;
        colG.append('rect')
          .attr('x', bandX)
          .attr('y', yPos)
          .attr('width', bandWidth)
          .attr('height', height)
          .attr('fill', bandColor)
          .attr('rx', 2);
      });

      // Actual Bar
      var actualBarWidth = Math.min(bandWidth - 6, barThickness);
      var actualBarX = bandX + (bandWidth - actualBarWidth) / 2;
      var actualY = scale(item.actual);
      var actualHeight = graphHeight - actualY;

      var actualBar = colG.append('rect')
        .attr('x', actualBarX)
        .attr('width', actualBarWidth)
        .attr('fill', theme.actual)
        .attr('rx', 2);

      if (enableAnimation) {
        actualBar
          .attr('y', graphHeight)
          .attr('height', 0)
          .transition()
          .duration(750)
          .delay(idx * 30)
          .ease(d3.easeCubicOut)
          .attr('y', actualY)
          .attr('height', actualHeight);
      } else {
        actualBar.attr('y', actualY).attr('height', actualHeight);
      }

      // Target Line
      if (config.showTargetMarker !== false && item.target > 0) {
        var targetY = scale(item.target);
        colG.append('line')
          .attr('x1', bandX - 4)
          .attr('x2', bandX + bandWidth + 4)
          .attr('y1', targetY)
          .attr('y2', targetY)
          .attr('stroke', theme.target)
          .attr('stroke-width', 3.5)
          .attr('stroke-linecap', 'round');
      }

      // Attainment Badge
      if (config.showVarianceBadge !== false && item.target > 0) {
        var isLowerBetter = config.metricPolarity === 'lower_is_better';
        var isMet = isLowerBetter ? (item.actual <= item.target) : (item.attainmentRate >= 100);
        var badgeG = colG.append('g')
          .attr('transform', 'translate(' + ((colWidth - 8 - 56) / 2) + ', ' + (graphHeight + 10) + ')');

        badgeG.append('rect')
          .attr('width', 56)
          .attr('height', 20)
          .attr('rx', 10)
          .attr('fill', isMet ? theme.badgePositiveBg : theme.badgeNegativeBg);

        badgeG.append('text')
          .attr('x', 28)
          .attr('y', 14)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .attr('fill', isMet ? theme.badgePositiveText : theme.badgeNegativeText)
          .text(item.attainmentRate.toFixed(0) + '%');
      }

      // Label below
      colG.append('text')
        .attr('x', (colWidth - 8) / 2)
        .attr('y', graphHeight + 48)
        .attr('text-anchor', 'middle')
        .attr('font-size', fSizes.rowLabel)
        .attr('font-weight', '600')
        .attr('fill', theme.text)
        .text(truncateString(item.label, 12));

      var showLabels = config.showValueLabels || 'all';
      var isPeak = (item.actual === minVal || item.actual === maxVal);
      var renderReadout = (showLabels === 'all') || (showLabels === 'peaks_only' && isPeak);

      if (renderReadout) {
        colG.append('text')
          .attr('x', (colWidth - 8) / 2)
          .attr('y', graphHeight + 64)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('fill', theme.subtext)
          .text(formatVal(item.actual, item.actualRendered));
      }

      // Tooltip and Click Drill events
      colG.on('mouseenter', function (event) {
        hoverBg.attr('fill', theme.name && theme.name.includes('Dark') ? 'rgba(51, 65, 85, 0.4)' : 'rgba(241, 245, 249, 0.8)');
        showTooltip(tooltip, event, item, formatVal, theme, config);
      })
      .on('mousemove', function (event) {
        moveTooltip(tooltip, event);
      })
      .on('mouseleave', function () {
        hoverBg.attr('fill', 'transparent');
        hideTooltip(tooltip);
      })
      .on('click', function (event) {
        if (item.drillLinks && item.drillLinks.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
          window.LookerCharts.Utils.openDrillMenu({
            links: item.drillLinks,
            event: event
          });
        }
      });
    });
  }

  function showTooltip(tooltip, event, item, formatVal, theme, config) {
    if (!tooltip) return;
    var isLowerBetter = config && config.metricPolarity === 'lower_is_better';
    var isPositive = isLowerBetter ? (item.actual <= item.target) : (item.variancePct >= 0);
    var deltaSign = item.variancePct >= 0 ? '+' : '';
    var statusBadgeColor = isPositive ? theme.badgePositiveText : theme.badgeNegativeText;

    var drillHint = (item.drillLinks && item.drillLinks.length > 0) ?
      '<div style="margin-top:6px;font-size:10px;color:#93c5fd;font-style:italic;">🔎 Click bar to open Looker Drill Menu</div>' : '';

    var html = `
      <div style="font-weight:700;font-size:13px;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
        <span>${escapeHtml(item.label)}</span>
        <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${statusBadgeColor}22;color:${statusBadgeColor};border:1px solid ${statusBadgeColor}44;">
          ${escapeHtml(item.achievedTier)}
        </span>
      </div>
      <div style="display:grid;grid-template-columns:auto auto;gap:4px 16px;font-size:11px;">
        <span style="color:#94a3b8;">Actual:</span>
        <span style="font-weight:700;text-align:right;">${formatVal(item.actual, item.actualRendered)}</span>
        
        <span style="color:#94a3b8;">${config && config.referenceLineLabel ? escapeHtml(config.referenceLineLabel) : 'Target / Quota'}:</span>
        <span style="font-weight:700;text-align:right;">${item.target > 0 ? formatVal(item.target, item.targetRendered) : 'N/A'}</span>
        
        <span style="color:#94a3b8;">Attainment:</span>
        <span style="font-weight:700;text-align:right;color:${statusBadgeColor};">${item.attainmentRate.toFixed(1)}%</span>
        
        <span style="color:#94a3b8;">Variance Delta:</span>
        <span style="font-weight:700;text-align:right;color:${statusBadgeColor};">${deltaSign}${formatVal(item.deltaVal, null)} (${deltaSign}${item.variancePct.toFixed(1)}%)</span>
      </div>
      ${drillHint}
    `;

    tooltip.innerHTML = html;
    tooltip.style.opacity = '1';
    moveTooltip(tooltip, event);
  }

  function moveTooltip(tooltip, event) {
    if (!tooltip) return;
    var x = event.clientX + 16;
    var y = event.clientY - 20;

    var tooltipRect = tooltip.getBoundingClientRect();
    if (x + tooltipRect.width > window.innerWidth) {
      x = event.clientX - tooltipRect.width - 16;
    }
    if (y + tooltipRect.height > window.innerHeight) {
      y = window.innerHeight - tooltipRect.height - 10;
    }
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }

  function hideTooltip(tooltip) {
    if (!tooltip) return;
    tooltip.style.opacity = '0';
  }

  function truncateString(str, num) {
    if (!str) return '';
    if (str.length <= num) return str;
    return str.slice(0, num) + '…';
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Register in Looker
  looker.plugins.visualizations.add(visObject);
})();
