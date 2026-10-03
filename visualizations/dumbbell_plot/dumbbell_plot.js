/**
 * Dumbbell Divergence Plot (Connected Dot Plot) - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Implements an executive-grade Connected Dot / Dumbbell Plot for:
 * - Period-over-period comparisons (Prior Period vs Current Period)
 * - Budget vs Actual variance analysis
 * - Margin vs Revenue divergence
 * - Metric benchmark attainment
 *
 * Upgraded with comprehensive flexibility controls:
 * - Dynamic Field-Role Mapping (Dimension, Measure A Baseline, Measure B Comparison)
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
      dotA: '#64748b',           // Slate Gray
      dotB: '#1e40af',           // Deep Blue
      bridgePositive: '#10b981', // Emerald
      bridgeNegative: '#ef4444', // Crimson Red
      bridgeNeutral: '#cbd5e1',
      badgePosBg: '#dcfce7',
      badgePosText: '#15803d',
      badgeNegBg: '#fee2e2',
      badgeNegText: '#b91c1c',
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      grid: '#f1f5f9',
      rowHover: 'rgba(241, 245, 249, 0.7)',
      cardBg: '#f8fafc',
      cardBorder: '#e2e8f0',
      refLine: '#94a3b8'
    },
    google_enterprise: {
      name: 'Google Enterprise',
      dotA: '#5f6368',           // Google Slate
      dotB: '#1a73e8',           // Google Blue
      bridgePositive: '#34a853', // Google Green
      bridgeNegative: '#ea4335', // Google Red
      bridgeNeutral: '#dadce0',
      badgePosBg: '#ceead6',
      badgePosText: '#137333',
      badgeNegBg: '#fad2cf',
      badgeNegText: '#c5221f',
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      grid: '#f8f9fa',
      rowHover: 'rgba(232, 240, 254, 0.5)',
      cardBg: '#ffffff',
      cardBorder: '#dadce0',
      refLine: '#fbbc04'
    },
    modern_slate: {
      name: 'Modern Slate',
      dotA: '#94a3b8',           // Slate 400
      dotB: '#0f172a',           // Dark Slate
      bridgePositive: '#10b981', // Emerald
      bridgeNegative: '#f43f5e', // Rose
      bridgeNeutral: '#e2e8f0',
      badgePosBg: '#dcfce7',
      badgePosText: '#15803d',
      badgeNegBg: '#fee2e2',
      badgeNegText: '#be123c',
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      grid: '#f8fafc',
      rowHover: 'rgba(241, 245, 249, 0.6)',
      cardBg: '#f8fafc',
      cardBorder: '#e2e8f0',
      refLine: '#cbd5e1'
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark',
      dotA: '#38bdf8',           // Neon Sky Blue
      dotB: '#ec4899',           // Neon Pink
      bridgePositive: '#10b981', // Neon Emerald
      bridgeNegative: '#f43f5e', // Neon Rose
      bridgeNeutral: '#475569',
      badgePosBg: '#064e3b',
      badgePosText: '#6ee7b7',
      badgeNegBg: '#4c0519',
      badgeNegText: '#fda4af',
      bg: '#0f172a',
      text: '#f8fafc',
      subtext: '#94a3b8',
      grid: '#1e293b',
      rowHover: 'rgba(51, 65, 85, 0.5)',
      cardBg: '#1e293b',
      cardBorder: '#334155',
      refLine: '#a855f7'
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      dotA: '#0f766e',           // Teal
      dotB: '#047857',           // Deep Emerald
      bridgePositive: '#10b981', // Bright Emerald
      bridgeNegative: '#f43f5e', // Rose
      bridgeNeutral: '#cbd5e1',
      badgePosBg: '#d1fae5',
      badgePosText: '#065f46',
      badgeNegBg: '#ffe4e6',
      badgeNegText: '#9f1239',
      bg: '#ffffff',
      text: '#064e3b',
      subtext: '#047857',
      grid: '#f0fdf4',
      rowHover: 'rgba(209, 250, 229, 0.4)',
      cardBg: '#f0fdf4',
      cardBorder: '#a7f3d0',
      refLine: '#059669'
    },
    sunset_media: {
      name: 'Sunset Media',
      dotA: '#d97706',           // Amber
      dotB: '#c2410c',           // Burnt Orange
      bridgePositive: '#059669', // Emerald
      bridgeNegative: '#dc2626', // Crimson
      bridgeNeutral: '#fed7aa',
      badgePosBg: '#fef3c7',
      badgePosText: '#92400e',
      badgeNegBg: '#fee2e2',
      badgeNegText: '#991b1b',
      bg: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      grid: '#fff7ed',
      rowHover: 'rgba(254, 243, 199, 0.4)',
      cardBg: '#fffbeb',
      cardBorder: '#fde68a',
      refLine: '#ea580c'
    },
    wellverse_healthcare: {
      name: 'Wellverse Healthcare',
      dotA: '#64748b',           // Slate
      dotB: '#143359',           // Navy
      bridgePositive: '#006B40', // Health Green
      bridgeNegative: '#B42318', // Alert Red
      bridgeNeutral: '#CBD5E1',
      badgePosBg: '#E6F7EF',
      badgePosText: '#006B40',
      badgeNegBg: '#FDECEC',
      badgeNegText: '#B42318',
      bg: '#ffffff',
      text: '#0F172A',
      subtext: '#64748B',
      grid: '#EEF2F7',
      rowHover: 'rgba(238, 242, 247, 0.6)',
      cardBg: '#F8FAFC',
      cardBorder: '#E2E8F0',
      refLine: '#3b82f6'
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

  function formatValue(val, fmt, lookerRendered) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    if (fmt === 'auto' && lookerRendered) return lookerRendered;
    var absVal = Math.abs(val);
    var sign = val < 0 ? '-' : '';

    switch (fmt) {
      case 'compact_currency':
        if (absVal >= 1e9) return sign + '$' + (absVal / 1e9).toFixed(2) + 'B';
        if (absVal >= 1e6) return sign + '$' + (absVal / 1e6).toFixed(2) + 'M';
        if (absVal >= 1e3) return sign + '$' + (absVal / 1e3).toFixed(1) + 'K';
        return sign + '$' + absVal.toFixed(absVal % 1 === 0 ? 0 : 2);
      case 'compact_number':
        if (absVal >= 1e9) return sign + (absVal / 1e9).toFixed(2) + 'B';
        if (absVal >= 1e6) return sign + (absVal / 1e6).toFixed(2) + 'M';
        if (absVal >= 1e3) return sign + (absVal / 1e3).toFixed(1) + 'K';
        return sign + (absVal >= 10 ? Math.round(absVal).toLocaleString() : absVal.toFixed(1));
      case 'percentage':
        return (val * (absVal <= 1.0 ? 100 : 1)).toFixed(1) + '%';
      case 'decimal_2':
        return sign + absVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'raw':
        return String(val);
      case 'auto':
      default:
        if (lookerRendered) return lookerRendered;
        if (absVal >= 1e9) return sign + '$' + (absVal / 1e9).toFixed(2) + 'B';
        if (absVal >= 1e6) return sign + '$' + (absVal / 1e6).toFixed(2) + 'M';
        if (absVal >= 1e3) return sign + '$' + (absVal / 1e3).toFixed(1) + 'K';
        return sign + absVal.toLocaleString();
    }
  }

  function formatDelta(delta, deltaPct, fmt, metricMode) {
    var deltaSign = delta > 0 ? '+' : delta < 0 ? '-' : '';
    var formattedVal = formatValue(Math.abs(delta), fmt);
    var valStr = deltaSign + formattedVal;
    var pctSign = deltaPct > 0 ? '+' : deltaPct < 0 ? '-' : '';
    var pctStr = pctSign + (Math.abs(deltaPct) * 100).toFixed(1) + '%';

    if (metricMode === 'delta_pct') return pctStr;
    if (metricMode === 'delta_val') return valStr;
    if (metricMode === 'ratio') {
      var ratio = delta !== 0 ? (1 + deltaPct) : 1;
      return ratio.toFixed(2) + 'x';
    }
    return valStr + ' (' + pctStr + ')';
  }

  var visObject = {
    id: 'dumbbell_plot',
    label: 'Dumbbell Divergence Plot',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      dimFieldOverride: {
        type: 'string',
        label: 'Category Dimension Index or Name (1 = Col 1)',
        default: '1',
        section: 'Display',
        order: 1
      },
      measureFieldAOverride: {
        type: 'string',
        label: 'Point A Baseline Measure Index or Name (1 = Col 1)',
        default: '1',
        section: 'Display',
        order: 2
      },
      measureFieldBOverride: {
        type: 'string',
        label: 'Point B Comparison Measure Index or Name (2 = Col 2)',
        default: '2',
        section: 'Display',
        order: 3
      },
      targetCalculationMode: {
        type: 'string',
        label: 'Comparison Target Calculation Mode',
        display: 'select',
        values: [
          { 'Measure Column Point B (From Query)': 'second_measure' },
          { 'Percentage Multiplier of Baseline A (e.g. 115%)': 'multiplier' },
          { 'Fixed Static Target Value': 'fixed' },
          { 'Dataset Mean (Point B = Group Average)': 'dataset_mean' },
          { 'Dataset Median (Point B = Group Median)': 'dataset_median' },
          { 'Top Percentile P75 Target': 'percentile_p75' },
          { 'Top Percentile P90 Target': 'percentile_p90' }
        ],
        default: 'second_measure',
        section: 'Display',
        order: 4
      },
      targetMultiplier: {
        type: 'number',
        label: 'Target Multiplier (when Mode is Multiplier)',
        default: 1.15,
        section: 'Display',
        order: 5
      },
      fixedTargetValue: {
        type: 'number',
        label: 'Fixed Target Value (when Mode is Fixed, 0 = Auto)',
        default: 0,
        section: 'Display',
        order: 6
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Benchmark / Reference Line Label',
        default: 'Benchmark Target',
        section: 'Display',
        order: 7
      },
      showReferenceLine: {
        type: 'boolean',
        label: 'Show Benchmark Reference Line Across Chart',
        default: false,
        section: 'Display',
        order: 8
      },
      anomalyThresholdPct: {
        type: 'number',
        label: 'Variance Anomaly Alert Threshold (%)',
        default: 50,
        section: 'Display',
        order: 9
      },
      sortBy: {
        type: 'string',
        label: 'Sort Rows By',
        display: 'select',
        values: [
          { 'Default (Looker Query Order)': 'none' },
          { 'Highest Positive Variance First (B - A desc)': 'delta_desc' },
          { 'Highest Negative Variance First (B - A asc)': 'delta_asc' },
          { 'Point B Value Descending': 'val_b_desc' },
          { 'Point A Value Descending': 'val_a_desc' },
          { 'Category Name (Alphabetical A-Z)': 'category_asc' }
        ],
        default: 'none',
        section: 'Display',
        order: 10
      },
      topNLimit: {
        type: 'number',
        label: 'Top-N Categories Limit (0 = All, Max 50)',
        default: 0,
        section: 'Display',
        order: 11
      },
      enableOtherRollup: {
        type: 'boolean',
        label: 'Group Remaining into "Other" Rollup Dumbbell',
        default: false,
        section: 'Display',
        order: 12
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Suppress Zero / Null Actuals',
        default: false,
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
        label: 'Data Value Readouts at Dots',
        display: 'select',
        values: [
          { 'Show All Numbers at Dots': 'all' },
          { 'Min/Max Peaks Only': 'peaks_only' },
          { 'Hidden': 'hidden' }
        ],
        default: 'all',
        section: 'Display',
        order: 15
      },
      customTitleOverride: {
        type: 'string',
        label: 'Custom Scorecard Title Override',
        default: '',
        section: 'Display',
        order: 16
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Category Search Bar',
        default: true,
        section: 'Display',
        order: 17
      },
      showLegend: {
        type: 'boolean',
        label: 'Show Top Summary Header & Legend',
        default: true,
        section: 'Display',
        order: 18
      },
      labelPointA: {
        type: 'string',
        label: 'Custom Label for Point A (Baseline)',
        default: '',
        section: 'Display',
        order: 19
      },
      labelPointB: {
        type: 'string',
        label: 'Custom Label for Point B (Comparison)',
        default: '',
        section: 'Display',
        order: 20
      },
      showVarianceBadge: {
        type: 'boolean',
        label: 'Show Variance / Delta Badges',
        default: true,
        section: 'Display',
        order: 21
      },
      badgeMetric: {
        type: 'string',
        label: 'Badge Metric Display',
        display: 'select',
        values: [
          { 'Value & % (+Delta ($) & +%)': 'both' },
          { 'Percentage Delta (+18.4%)': 'delta_pct' },
          { 'Value Delta (+$12.5K)': 'delta_val' },
          { 'Ratio Multiplier (1.25x)': 'ratio' }
        ],
        default: 'both',
        section: 'Display',
        order: 22
      },
      bridgeColorMode: {
        type: 'string',
        label: 'Bridge Color Encoding',
        display: 'select',
        values: [
          { 'Directional (Positive Green, Negative Red)': 'directional' },
          { 'Uniform Neutral Bridge': 'neutral' },
          { 'Gradient (Dot A to Dot B)': 'gradient' }
        ],
        default: 'directional',
        section: 'Display',
        order: 23
      },
      showDirectionArrows: {
        type: 'boolean',
        label: 'Show Direction Arrows (A -> B)',
        default: true,
        section: 'Display',
        order: 24
      },
      showGridLines: {
        type: 'boolean',
        label: 'Show Vertical Axis Grid Lines',
        default: true,
        section: 'Display',
        order: 25
      },
      zeroBaseline: {
        type: 'boolean',
        label: 'Force Axis Zero Baseline',
        default: false,
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
          { 'Custom Hex Override': 'custom' }
        ],
        default: 'executive_slate',
        section: 'Style',
        order: 1
      },
      customDotA: {
        type: 'string',
        label: 'Custom Point A Color (Hex)',
        display: 'color',
        default: '',
        section: 'Style',
        order: 2
      },
      customDotB: {
        type: 'string',
        label: 'Custom Point B Color (Hex)',
        display: 'color',
        default: '',
        section: 'Style',
        order: 3
      },
      customBridgePos: {
        type: 'string',
        label: 'Custom Positive Growth Color (Hex)',
        display: 'color',
        default: '',
        section: 'Style',
        order: 4
      },
      customBridgeNeg: {
        type: 'string',
        label: 'Custom Negative Decline Color (Hex)',
        display: 'color',
        default: '',
        section: 'Style',
        order: 5
      },
      metricPolarity: {
        type: 'string',
        label: 'Metric Polarity',
        display: 'select',
        values: [
          { 'Higher is Better (Revenue, Profit, Quota Attainment)': 'higher_is_better' },
          { 'Lower is Better (Latency, Churn, Defect, Operating Cost)': 'lower_is_better' }
        ],
        default: 'higher_is_better',
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
          { 'Large Presentation (Executive Wallboard)': 'large' }
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
          { 'Auto (from Looker Field Format)': 'auto' },
          { 'Compact Currency ($1.2M, $450K)': 'compact_currency' },
          { 'Compact Number (1.2M, 450K)': 'compact_number' },
          { 'Percentage (45.2%)': 'percentage' },
          { 'Decimal (1,234.56)': 'decimal_2' },
          { 'Raw Unformatted': 'raw' }
        ],
        default: 'compact_currency',
        section: 'Style',
        order: 8
      },
      pointRadius: {
        type: 'number',
        label: 'Marker Dot Radius (px)',
        default: 8,
        section: 'Style',
        order: 9
      },
      bridgeThickness: {
        type: 'number',
        label: 'Bridge Line Thickness (px)',
        default: 3,
        section: 'Style',
        order: 10
      },
      rowHeight: {
        type: 'number',
        label: 'Row / Item Height (px)',
        default: 52,
        section: 'Style',
        order: 11
      },
      enableAnimation: {
        type: 'boolean',
        label: 'Enable Smooth Render Transitions',
        default: true,
        section: 'Style',
        order: 12
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
      container.className = 'looker-dumbbell-container';
      container.style.width = '100%';
      container.style.flex = '1 1 auto';
      container.style.minHeight = '0';
      container.style.position = 'relative';
      container.style.overflowX = 'hidden';
      container.style.overflowY = 'auto';
      container.style.boxSizing = 'border-box';
      element.appendChild(container);

      // Tooltip element
      var tooltip = document.createElement('div');
      tooltip.className = 'looker-dumbbell-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.display = 'none';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.zIndex = '99999';
      tooltip.style.padding = '10px 14px';
      tooltip.style.borderRadius = '8px';
      tooltip.style.fontSize = '12px';
      tooltip.style.lineHeight = '1.4';
      tooltip.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15)';
      tooltip.style.transition = 'opacity 0.12s ease-out, transform 0.12s ease-out';
      tooltip.style.backdropFilter = 'blur(8px)';
      tooltip.style.webkitBackdropFilter = 'blur(8px)';
      document.body.appendChild(tooltip);

      this._tooltip = tooltip;
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
      }, 50);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      var self = this;
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

      // Validate inputs
      if (!data || data.length === 0) {
        this.addError({
          title: 'No Data',
          message: 'The query returned no data rows to visualize.'
        });
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var measures = fields.measures || [];

      if (dims.length === 0) {
        this.addError({
          title: 'Dimension Required',
          message: 'Dumbbell Divergence Plot requires at least 1 Dimension for row grouping (e.g. Category, State, Rep).'
        });
        done();
        return;
      }

      if (measures.length === 0) {
        this.addError({
          title: 'Measure Required',
          message: 'Dumbbell Divergence Plot requires at least 1 Measure (2 measures recommended: Point A Baseline and Point B Comparison).'
        });
        done();
        return;
      }

      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
        } catch (err) {
          console.error('Dumbbell Plot render error:', err);
          self.addError({
            title: 'Rendering Error',
            message: err.message || 'An unexpected error occurred while rendering the visualization.'
          });
        }
        done();
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var container = element.querySelector('.looker-dumbbell-container');
      if (!container) return;
      container.innerHTML = '';

      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var measures = fields.measures || [];
      var pivots = queryResponse.pivots || [];

      // --- 1. DYNAMIC FIELD ROLE RESOLUTION ---
      var dimField = resolveField(dims, config.dimFieldOverride, 0);
      var measFieldA = resolveField(measures, config.measureFieldAOverride, 0);
      var measFieldB = config.measureFieldBOverride ? resolveField(measures, config.measureFieldBOverride, 1) : (measures.length > 1 ? measures[1] : null);

      var isPivoted = pivots.length >= 2;
      var labelA = config.labelPointA;
      var labelB = config.labelPointB;

      if (isPivoted) {
        if (!labelA) labelA = pivots[0].key || 'Baseline';
        if (!labelB) labelB = pivots[1].key || 'Comparison';
      } else {
        if (!labelA) labelA = measFieldA ? (measFieldA.label_short || measFieldA.label || 'Baseline') : 'Baseline';
        if (!labelB) labelB = measFieldB ? (measFieldB.label_short || measFieldB.label || 'Comparison') : 'Comparison';
      }

      // --- 2. THEMES & COLOR RESOLUTION ---
      var themeKey = config.colorTheme || 'executive_slate';
      var theme = THEMES[themeKey] ? Object.assign({}, THEMES[themeKey]) : Object.assign({}, THEMES.executive_slate);

      if (themeKey === 'custom' || config.customDotA || config.customDotB || config.customBridgePos || config.customBridgeNeg) {
        if (config.customDotA) theme.dotA = config.customDotA;
        if (config.customDotB) theme.dotB = config.customDotB;
        if (config.customBridgePos) {
          theme.bridgePositive = config.customBridgePos;
          theme.badgePosText = config.customBridgePos;
        }
        if (config.customBridgeNeg) {
          theme.bridgeNegative = config.customBridgeNeg;
          theme.badgeNegText = config.customBridgeNeg;
        }
      }

      var isLowerBetter = config.metricPolarity === 'lower_is_better';
      if (isLowerBetter) {
        var tempPosColor = theme.bridgePositive;
        var tempNegColor = theme.bridgeNegative;
        theme.bridgePositive = tempNegColor;
        theme.bridgeNegative = tempPosColor;

        var tempBg = theme.badgePosBg;
        var tempTxt = theme.badgePosText;
        theme.badgePosBg = theme.badgeNegBg;
        theme.badgePosText = theme.badgeNegText;
        theme.badgeNegBg = tempBg;
        theme.badgeNegText = tempTxt;
      }

      element.style.backgroundColor = theme.bg;
      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      // Font Scaling
      var fontScale = config.fontScale || 'standard';
      var fontScaleMap = {
        compact: { title: '13px', subtitle: '11px', statNum: '13px', statLbl: '9px', rowLabel: '11px', badge: '10px' },
        standard: { title: '15px', subtitle: '12px', statNum: '15px', statLbl: '10px', rowLabel: '12px', badge: '11px' },
        large: { title: '18px', subtitle: '13px', statNum: '18px', statLbl: '11px', rowLabel: '14px', badge: '12px' }
      };
      var fSizes = fontScaleMap[fontScale] || fontScaleMap.standard;

      // Value Formatter
      var valFmt = config.valueFormat || 'compact_currency';
      function formatVal(v, rendered) {
        return formatValue(v, valFmt, rendered);
      }

      // --- 3. PARSE RAW ITEMS ---
      var rawItems = [];
      data.forEach(function (row, idx) {
        var catName = dimField && row[dimField.name] ? (row[dimField.name].rendered || row[dimField.name].value) : ('Item ' + (idx + 1));
        var valA = 0;
        var valB = 0;
        var cellA = null;
        var cellB = null;

        if (isPivoted) {
          var pivotKeyA = pivots[0].key;
          var pivotKeyB = pivots[1].key;
          cellA = measFieldA && row[measFieldA.name] ? row[measFieldA.name][pivotKeyA] : null;
          cellB = measFieldA && row[measFieldA.name] ? row[measFieldA.name][pivotKeyB] : null;
          valA = cellA && cellA.value !== null && !isNaN(cellA.value) ? Number(cellA.value) : 0;
          valB = cellB && cellB.value !== null && !isNaN(cellB.value) ? Number(cellB.value) : 0;
        } else if (measFieldB && row[measFieldB.name]) {
          cellA = measFieldA ? row[measFieldA.name] : null;
          cellB = row[measFieldB.name];
          valA = cellA && cellA.value !== null && !isNaN(cellA.value) ? Number(cellA.value) : 0;
          valB = cellB && cellB.value !== null && !isNaN(cellB.value) ? Number(cellB.value) : 0;
        } else if (measFieldA && row[measFieldA.name]) {
          cellA = row[measFieldA.name];
          valA = cellA && cellA.value !== null && !isNaN(cellA.value) ? Number(cellA.value) : 0;
          valB = valA * (Number(config.targetMultiplier) || 1.15);
        }

        if (config.suppressZeroNull && (valA === 0 && valB === 0)) {
          return;
        }

        var drillLinks = (cellB && cellB.links) || (cellA && cellA.links) || (dimField && row[dimField.name] && row[dimField.name].links) || [];

        rawItems.push({
          id: idx,
          category: String(catName),
          valA: valA,
          valB: valB,
          renderedA: cellA && cellA.rendered ? cellA.rendered : null,
          renderedB: cellB && cellB.rendered ? cellB.rendered : null,
          links: drillLinks
        });
      });

      if (rawItems.length === 0) {
        this.addError({
          title: 'No Data',
          message: 'All returned items evaluated to zero or were suppressed by null filters.'
        });
        return;
      }

      // --- 4. TARGET CALCULATION & STATISTICAL MODES ---
      var aValues = rawItems.map(function (d) { return d.valA; }).sort(function (a, b) { return a - b; });
      var sumA = aValues.reduce(function (acc, v) { return acc + v; }, 0);
      var meanA = sumA / (aValues.length || 1);
      var medianA = aValues[Math.floor(aValues.length / 2)] || meanA;
      var p75A = aValues[Math.floor(aValues.length * 0.75)] || medianA;
      var p90A = aValues[Math.floor(aValues.length * 0.90)] || aValues[aValues.length - 1];

      var targetMode = config.targetCalculationMode || 'second_measure';
      var mult = Number(config.targetMultiplier) || 1.15;
      var fixedTarget = Number(config.fixedTargetValue) || 0;
      var benchmarkVal = meanA;

      rawItems.forEach(function (item) {
        if (targetMode === 'multiplier') {
          item.valB = item.valA * mult;
        } else if (targetMode === 'fixed' && fixedTarget > 0) {
          item.valB = fixedTarget;
        } else if (targetMode === 'dataset_mean') {
          item.valB = meanA;
        } else if (targetMode === 'dataset_median') {
          item.valB = medianA;
        } else if (targetMode === 'percentile_p75') {
          item.valB = p75A;
        } else if (targetMode === 'percentile_p90') {
          item.valB = p90A;
        }

        var delta = item.valB - item.valA;
        var deltaPct = item.valA !== 0 ? delta / Math.abs(item.valA) : 0;
        var isPositive = isLowerBetter ? (delta <= 0) : (delta >= 0);

        item.delta = delta;
        item.deltaPct = deltaPct;
        item.isPositive = isPositive;

        var anomalyThreshold = Number(config.anomalyThresholdPct) || 50;
        item.isAnomaly = Math.abs(deltaPct * 100) >= anomalyThreshold;
      });

      // --- 5. SORTING & TOP-N BUCKETING ---
      var sortBy = config.sortBy || 'none';
      if (sortBy === 'delta_desc') {
        rawItems.sort(function (a, b) { return b.delta - a.delta; });
      } else if (sortBy === 'delta_asc') {
        rawItems.sort(function (a, b) { return a.delta - b.delta; });
      } else if (sortBy === 'val_b_desc') {
        rawItems.sort(function (a, b) { return b.valB - a.valB; });
      } else if (sortBy === 'val_a_desc') {
        rawItems.sort(function (a, b) { return b.valA - a.valA; });
      } else if (sortBy === 'category_asc') {
        rawItems.sort(function (a, b) { return a.category.localeCompare(b.category); });
      }

      var items = rawItems;
      var topN = Number(config.topNLimit) || 0;
      if (topN > 0 && rawItems.length > topN) {
        var topItems = rawItems.slice(0, topN);
        if (config.enableOtherRollup) {
          var remaining = rawItems.slice(topN);
          var otherValA = remaining.reduce(function (acc, d) { return acc + d.valA; }, 0);
          var otherValB = remaining.reduce(function (acc, d) { return acc + d.valB; }, 0);
          var otherDelta = otherValB - otherValA;
          var otherDeltaPct = otherValA !== 0 ? otherDelta / Math.abs(otherValA) : 0;

          topItems.push({
            id: 'other_rollup',
            category: 'Other (' + remaining.length + ' categories)',
            valA: otherValA,
            valB: otherValB,
            delta: otherDelta,
            deltaPct: otherDeltaPct,
            isPositive: isLowerBetter ? (otherDelta <= 0) : (otherDelta >= 0),
            renderedA: null,
            renderedB: null,
            links: [],
            isAnomaly: false
          });
        }
        items = topItems;
      }

      // Aggregates for HUD
      var totalValA = items.reduce(function (acc, it) { return acc + it.valA; }, 0);
      var totalValB = items.reduce(function (acc, it) { return acc + it.valB; }, 0);
      var netDelta = totalValB - totalValA;
      var netGrowthPct = totalValA !== 0 ? (netDelta / Math.abs(totalValA)) * 100 : 0;
      var positiveDeltasCount = items.filter(function (it) { return it.isPositive; }).length;
      var totalCategories = items.length;
      var pctPositive = totalCategories > 0 ? (positiveDeltasCount / totalCategories) * 100 : 0;

      var topGainer = items.slice().sort(function (a, b) { return b.delta - a.delta; })[0];
      var topDecliner = items.slice().sort(function (a, b) { return a.delta - b.delta; })[0];

      // --- 6. EXECUTIVE KPI SCORECARD HUD ---
      var hudMode = config.hudMode || 'scorecard';
      if (hudMode !== 'hidden') {
        var hudHeader = document.createElement('div');
        hudHeader.className = 'dumbbell-header-hud';
        hudHeader.style.display = 'flex';
        hudHeader.style.flexWrap = 'wrap';
        hudHeader.style.alignItems = 'center';
        hudHeader.style.justifyContent = 'space-between';
        hudHeader.style.gap = '12px';
        hudHeader.style.padding = hudMode === 'compact_strip' ? '6px 16px' : '12px 18px';
        hudHeader.style.borderBottom = '1px solid ' + (themeKey === 'cyberpunk_dark' ? '#334155' : theme.grid);
        hudHeader.style.backgroundColor = hudMode === 'compact_strip' ? (themeKey === 'cyberpunk_dark' ? '#1e293b' : '#f8fafc') : (themeKey === 'cyberpunk_dark' ? '#0f172a' : theme.cardBg);

        // Title Block
        var titleBlock = document.createElement('div');
        var mainTitle = document.createElement('div');
        mainTitle.style.fontSize = fSizes.title;
        mainTitle.style.fontWeight = '700';
        mainTitle.style.color = theme.text;
        mainTitle.textContent = config.customTitleOverride || ((dimField ? (dimField.label_short || dimField.label) : 'Executive Divergence') + ' — ' + labelA + ' vs ' + labelB);

        var subTitle = document.createElement('div');
        subTitle.style.fontSize = fSizes.subtitle;
        subTitle.style.color = theme.subtext;
        subTitle.style.marginTop = '2px';
        subTitle.textContent = totalCategories + ' Categories • ' + positiveDeltasCount + ' of ' + totalCategories + ' positive (' + pctPositive.toFixed(0) + '%) • Net Growth: ' + (netGrowthPct >= 0 ? '+' : '') + netGrowthPct.toFixed(1) + '%';

        titleBlock.appendChild(mainTitle);
        titleBlock.appendChild(subTitle);
        hudHeader.appendChild(titleBlock);

        // Scorecard KPI Cards
        var statsBox = document.createElement('div');
        statsBox.style.display = 'flex';
        statsBox.style.gap = '8px';
        statsBox.style.flexWrap = 'wrap';
        statsBox.style.alignItems = 'center';

        function makeHudCard(lbl, val, isPositive, extra) {
          var card = document.createElement('div');
          card.style.background = themeKey === 'cyberpunk_dark' ? '#1e293b' : '#ffffff';
          card.style.border = '1px solid ' + (themeKey === 'cyberpunk_dark' ? '#334155' : theme.cardBorder);
          card.style.borderRadius = '6px';
          card.style.padding = hudMode === 'compact_strip' ? '4px 8px' : '6px 12px';
          card.style.display = 'flex';
          card.style.flexDirection = 'column';

          var l = document.createElement('span');
          l.style.fontSize = fSizes.statLbl;
          l.style.textTransform = 'uppercase';
          l.style.letterSpacing = '0.05em';
          l.style.color = theme.subtext;
          l.textContent = lbl;

          var v = document.createElement('span');
          v.style.fontSize = fSizes.statNum;
          v.style.fontWeight = '700';
          v.style.color = (isPositive === true ? theme.badgePosText : (isPositive === false ? theme.badgeNegText : theme.text));
          v.textContent = val;

          card.appendChild(l);
          card.appendChild(v);
          if (extra) {
            var e = document.createElement('span');
            e.style.fontSize = '9px';
            e.style.color = theme.subtext;
            e.textContent = extra;
            card.appendChild(e);
          }
          return card;
        }

        statsBox.appendChild(makeHudCard('Total ' + labelA, formatVal(totalValA), null));
        statsBox.appendChild(makeHudCard('Total ' + labelB, formatVal(totalValB), null));
        statsBox.appendChild(makeHudCard('Net Variance', (netDelta >= 0 ? '+' : '') + formatVal(Math.abs(netDelta)), (isLowerBetter ? netDelta <= 0 : netDelta >= 0), (netGrowthPct >= 0 ? '+' : '') + netGrowthPct.toFixed(1) + '%'));

        if (topGainer && topGainer.delta !== 0) {
          statsBox.appendChild(makeHudCard('Top Positive', topGainer.category, true, '+' + formatVal(Math.abs(topGainer.delta))));
        }

        // Search Bar
        if (config.showSearch !== false) {
          var searchWrapper = document.createElement('div');
          searchWrapper.style.display = 'flex';
          searchWrapper.style.alignItems = 'center';
          searchWrapper.style.marginLeft = '4px';

          var searchInput = document.createElement('input');
          searchInput.type = 'text';
          searchInput.placeholder = 'Filter categories...';
          searchInput.style.padding = '5px 10px';
          searchInput.style.fontSize = '11px';
          searchInput.style.borderRadius = '6px';
          searchInput.style.border = '1px solid ' + (themeKey === 'cyberpunk_dark' ? '#334155' : theme.cardBorder);
          searchInput.style.background = themeKey === 'cyberpunk_dark' ? '#0f172a' : '#ffffff';
          searchInput.style.color = theme.text;
          searchInput.style.outline = 'none';
          searchInput.style.width = '130px';

          searchInput.addEventListener('input', function (e) {
            var query = e.target.value.toLowerCase().trim();
            d3.select(container).selectAll('.dumbbell-row').each(function (d) {
              var match = !query || d.category.toLowerCase().indexOf(query) !== -1;
              d3.select(this).style('display', match ? null : 'none');
            });
          });

          searchWrapper.appendChild(searchInput);
          statsBox.appendChild(searchWrapper);
        }

        hudHeader.appendChild(statsBox);
        container.appendChild(hudHeader);
      }

      // Legend Bar
      if (config.showLegend !== false && hudMode === 'hidden') {
        var legendBar = document.createElement('div');
        legendBar.style.padding = '12px 18px';
        legendBar.style.borderBottom = '1px solid ' + theme.grid;
        legendBar.style.display = 'flex';
        legendBar.style.justifyContent = 'space-between';
        legendBar.style.alignItems = 'center';

        var legendLeft = document.createElement('div');
        legendLeft.style.display = 'flex';
        legendLeft.style.alignItems = 'center';
        legendLeft.style.gap = '16px';
        legendLeft.style.fontSize = '12px';

        legendLeft.innerHTML = '' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
          '  <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + theme.dotA + ';"></span>' +
          '  <span style="font-weight:600;color:' + theme.text + ';">' + labelA + '</span>' +
          '</div>' +
          '<div style="color:' + theme.subtext + ';">&rarr;</div>' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
          '  <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + theme.dotB + ';"></span>' +
          '  <span style="font-weight:600;color:' + theme.text + ';">' + labelB + '</span>' +
          '</div>';

        var legendRight = document.createElement('div');
        legendRight.style.fontSize = '11px';
        legendRight.style.fontWeight = '600';
        legendRight.style.padding = '3px 8px';
        legendRight.style.borderRadius = '10px';
        legendRight.style.background = pctPositive >= 50 ? theme.badgePosBg : theme.badgeNegBg;
        legendRight.style.color = pctPositive >= 50 ? theme.badgePosText : theme.badgeNegText;
        legendRight.textContent = pctPositive.toFixed(0) + '% Positive Variance';

        legendBar.appendChild(legendLeft);
        legendBar.appendChild(legendRight);
        container.appendChild(legendBar);
      }

      // --- 7. D3 SVG RENDERING ---
      var totalWidth = container.clientWidth || element.clientWidth || 800;
      var rowHeight = Math.max(36, config.rowHeight || 52);
      var chartHeight = items.length * rowHeight;
      var marginTop = 28;
      var marginBottom = 36;
      var marginLeft = 150; // Room for category labels
      var marginRight = config.showVarianceBadge !== false ? 140 : 60;

      var svgWidth = Math.max(totalWidth, 500);
      var svgHeight = chartHeight + marginTop + marginBottom;

      var svg = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', svgHeight)
        .attr('viewBox', '0 0 ' + svgWidth + ' ' + svgHeight)
        .style('display', 'block')
        .style('overflow', 'visible');

      // Defs for arrows and gradients
      var defs = svg.append('defs');

      defs.append('marker')
        .attr('id', 'arrow-positive')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 7)
        .attr('refY', 5)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', 'M 0 1.5 L 8 5 L 0 8.5 z')
        .attr('fill', theme.bridgePositive);

      defs.append('marker')
        .attr('id', 'arrow-negative')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 7)
        .attr('refY', 5)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', 'M 0 1.5 L 8 5 L 0 8.5 z')
        .attr('fill', theme.bridgeNegative);

      defs.append('marker')
        .attr('id', 'arrow-neutral')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 7)
        .attr('refY', 5)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', 'M 0 1.5 L 8 5 L 0 8.5 z')
        .attr('fill', theme.subtext);

      // Scales
      var allValues = [];
      items.forEach(function (d) {
        allValues.push(d.valA);
        allValues.push(d.valB);
      });

      var minVal = d3.min(allValues) || 0;
      var maxVal = d3.max(allValues) || 100;

      if (config.zeroBaseline) {
        minVal = Math.min(0, minVal);
      } else {
        var span = maxVal - minVal;
        minVal = Math.max(0, minVal - span * 0.08);
        maxVal = maxVal + span * 0.08;
      }

      var plotWidth = svgWidth - marginLeft - marginRight;
      var xScale = d3.scaleLinear()
        .domain([minVal, maxVal])
        .range([marginLeft, marginLeft + plotWidth])
        .nice();

      var yScale = d3.scaleBand()
        .domain(items.map(function (d) { return d.category; }))
        .range([marginTop, marginTop + chartHeight])
        .padding(0.3);

      // Vertical Grid Lines
      if (config.showGridLines !== false) {
        var xTicks = xScale.ticks(6);
        var gridGroup = svg.append('g').attr('class', 'grid-lines');

        xTicks.forEach(function (tick) {
          var xPos = xScale(tick);
          gridGroup.append('line')
            .attr('x1', xPos)
            .attr('x2', xPos)
            .attr('y1', marginTop - 8)
            .attr('y2', marginTop + chartHeight + 6)
            .attr('stroke', theme.grid)
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 3');

          gridGroup.append('text')
            .attr('x', xPos)
            .attr('y', marginTop - 12)
            .attr('text-anchor', 'middle')
            .attr('fill', theme.subtext)
            .attr('font-size', '10.5px')
            .attr('font-weight', '500')
            .text(formatVal(tick, null));
        });
      }

      // Optional Benchmark Reference Line
      if (config.showReferenceLine) {
        var refX = xScale(benchmarkVal);
        var refLineGroup = svg.append('g').attr('class', 'benchmark-reference-line');

        refLineGroup.append('line')
          .attr('x1', refX)
          .attr('x2', refX)
          .attr('y1', marginTop - 16)
          .attr('y2', marginTop + chartHeight + 10)
          .attr('stroke', theme.refLine || '#94a3b8')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4 4');

        refLineGroup.append('text')
          .attr('x', refX)
          .attr('y', marginTop - 20)
          .attr('text-anchor', 'middle')
          .attr('fill', theme.refLine || '#94a3b8')
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .text((config.referenceLineLabel || 'Benchmark') + ' (' + formatVal(benchmarkVal) + ')');
      }

      var pointRadius = Math.max(4, config.pointRadius || 8);
      var bridgeThickness = Math.max(1, config.bridgeThickness || 3);
      var bridgeMode = config.bridgeColorMode || 'directional';
      var showArrows = config.showDirectionArrows !== false;
      var enableAnimation = config.enableAnimation !== false;

      // Render Rows
      var rowGroup = svg.append('g').attr('class', 'dumbbell-rows');

      var rows = rowGroup.selectAll('.dumbbell-row')
        .data(items, function (d) { return d.category; })
        .enter()
        .append('g')
        .attr('class', 'dumbbell-row')
        .attr('transform', function (d) {
          return 'translate(0, ' + yScale(d.category) + ')';
        })
        .style('cursor', 'pointer');

      var rowBandHeight = yScale.bandwidth();
      var centerY = rowBandHeight / 2;

      // Row hover pill
      rows.append('rect')
        .attr('x', 4)
        .attr('y', 0)
        .attr('width', svgWidth - 8)
        .attr('height', rowBandHeight)
        .attr('rx', 6)
        .attr('fill', 'transparent')
        .attr('class', 'row-bg-hover')
        .style('transition', 'fill 0.15s ease');

      // Category Label (Y-axis)
      rows.append('text')
        .attr('x', marginLeft - 16)
        .attr('y', centerY)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'central')
        .attr('fill', theme.text)
        .attr('font-size', fSizes.rowLabel)
        .attr('font-weight', '600')
        .text(function (d) {
          var lbl = d.category;
          return lbl.length > 20 ? lbl.slice(0, 18) + '...' : lbl;
        })
        .append('title')
        .text(function (d) { return d.category; });

      // Anomaly highlight dot if active
      rows.each(function (d) {
        if (d.isAnomaly) {
          d3.select(this).append('circle')
            .attr('cx', marginLeft - 8)
            .attr('cy', centerY)
            .attr('r', 3)
            .attr('fill', '#f59e0b')
            .append('title')
            .text('Anomaly: Variance > ' + (config.anomalyThresholdPct || 50) + '%');
        }
      });

      // Connector Bridge Line
      rows.each(function (d, i) {
        var rowG = d3.select(this);
        var xA = xScale(d.valA);
        var xB = xScale(d.valB);

        var bridgeColor = theme.bridgeNeutral;
        var markerId = null;

        if (bridgeMode === 'directional') {
          bridgeColor = d.isPositive ? theme.bridgePositive : theme.bridgeNegative;
          if (showArrows && Math.abs(xB - xA) > 28) {
            markerId = d.isPositive ? 'url(#arrow-positive)' : 'url(#arrow-negative)';
          }
        } else if (bridgeMode === 'gradient') {
          var gradId = 'grad-' + i;
          var grad = defs.append('linearGradient')
            .attr('id', gradId)
            .attr('x1', xA < xB ? '0%' : '100%')
            .attr('y1', '0%')
            .attr('x2', xA < xB ? '100%' : '0%')
            .attr('y2', '0%');
          grad.append('stop').attr('offset', '0%').attr('stop-color', theme.dotA);
          grad.append('stop').attr('offset', '100%').attr('stop-color', theme.dotB);
          bridgeColor = 'url(#' + gradId + ')';
        }

        var line = rowG.append('line')
          .attr('x1', xA)
          .attr('y1', centerY)
          .attr('y2', centerY)
          .attr('stroke', bridgeColor)
          .attr('stroke-width', bridgeThickness)
          .attr('stroke-linecap', 'round');

        if (markerId) {
          line.attr('marker-end', markerId);
        }

        if (enableAnimation) {
          line.attr('x2', xA)
            .transition()
            .duration(600)
            .delay(i * 30)
            .ease(d3.easeCubicOut)
            .attr('x2', xB);
        } else {
          line.attr('x2', xB);
        }
      });

      // Point A Dot (Baseline)
      var dotsA = rows.append('circle')
        .attr('cy', centerY)
        .attr('r', pointRadius)
        .attr('fill', theme.dotA)
        .attr('stroke', theme.bg)
        .attr('stroke-width', 2)
        .style('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))');

      if (enableAnimation) {
        dotsA.attr('cx', function (d) { return xScale(minVal); })
          .transition()
          .duration(500)
          .delay(function (d, i) { return i * 30; })
          .ease(d3.easeBackOut)
          .attr('cx', function (d) { return xScale(d.valA); });
      } else {
        dotsA.attr('cx', function (d) { return xScale(d.valA); });
      }

      // Point B Dot (Comparison)
      var dotsB = rows.append('circle')
        .attr('cy', centerY)
        .attr('r', pointRadius + 1)
        .attr('fill', theme.dotB)
        .attr('stroke', theme.bg)
        .attr('stroke-width', 2)
        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))');

      if (enableAnimation) {
        dotsB.attr('cx', function (d) { return xScale(d.valA); })
          .transition()
          .duration(650)
          .delay(function (d, i) { return i * 30 + 80; })
          .ease(d3.easeCubicOut)
          .attr('cx', function (d) { return xScale(d.valB); });
      } else {
        dotsB.attr('cx', function (d) { return xScale(d.valB); });
      }

      // Value Labels at Dots
      var showValueLabels = config.showValueLabels || 'all';
      if (showValueLabels !== 'hidden') {
        var minValRow = items.slice().sort(function (a, b) { return a.valA - b.valA; })[0];
        var maxValRow = items.slice().sort(function (a, b) { return b.valB - a.valB; })[0];

        rows.each(function (d) {
          if (showValueLabels === 'peaks_only' && d !== minValRow && d !== maxValRow) {
            return;
          }

          var rowG = d3.select(this);
          var xA = xScale(d.valA);
          var xB = xScale(d.valB);
          var dist = Math.abs(xB - xA);

          var textValA = d.renderedA || formatVal(d.valA);
          var textValB = d.renderedB || formatVal(d.valB);

          var offsetA = xA <= xB ? -12 : 12;
          var offsetB = xB >= xA ? 12 : -12;
          var anchorA = xA <= xB ? 'end' : 'start';
          var anchorB = xB >= xA ? 'start' : 'end';

          if (dist < 55) {
            // Stagger vertically
            rowG.append('text')
              .attr('x', xA)
              .attr('y', centerY - pointRadius - 4)
              .attr('text-anchor', 'middle')
              .attr('fill', theme.subtext)
              .attr('font-size', '9.5px')
              .attr('font-weight', '500')
              .text(textValA);

            rowG.append('text')
              .attr('x', xB)
              .attr('y', centerY + pointRadius + 12)
              .attr('text-anchor', 'middle')
              .attr('fill', theme.dotB)
              .attr('font-size', '10px')
              .attr('font-weight', '700')
              .text(textValB);
          } else {
            rowG.append('text')
              .attr('x', xA + offsetA)
              .attr('y', centerY)
              .attr('dominant-baseline', 'central')
              .attr('text-anchor', anchorA)
              .attr('fill', theme.subtext)
              .attr('font-size', '10px')
              .attr('font-weight', '500')
              .text(textValA);

            rowG.append('text')
              .attr('x', xB + offsetB)
              .attr('y', centerY)
              .attr('dominant-baseline', 'central')
              .attr('text-anchor', anchorB)
              .attr('fill', theme.dotB)
              .attr('font-size', '10.5px')
              .attr('font-weight', '700')
              .text(textValB);
          }
        });
      }

      // Variance Badges (Right Margin)
      if (config.showVarianceBadge !== false) {
        var badgeGroup = rows.append('g')
          .attr('transform', 'translate(' + (svgWidth - marginRight + 16) + ', ' + centerY + ')');

        badgeGroup.each(function (d) {
          var bgG = d3.select(this);
          var badgeText = formatDelta(d.delta, d.deltaPct, valFmt, config.badgeMetric || 'both');
          var isPos = d.isPositive;

          var badgeRect = bgG.append('rect')
            .attr('y', -10)
            .attr('height', 20)
            .attr('rx', 10)
            .attr('fill', isPos ? theme.badgePosBg : theme.badgeNegBg)
            .attr('stroke', isPos ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)')
            .attr('stroke-width', 1);

          bgG.append('text')
            .attr('x', 8)
            .attr('y', 0)
            .attr('dominant-baseline', 'central')
            .attr('fill', isPos ? theme.badgePosText : theme.badgeNegText)
            .attr('font-size', fSizes.badge)
            .attr('font-weight', '600')
            .text(badgeText);

          var textWidth = badgeText.length * 6.2 + 16;
          badgeRect.attr('width', textWidth);
        });
      }

      // Tooltip Interactions
      var tooltip = this._tooltip;
      rows.on('mouseenter', function (event, d) {
        d3.select(this).select('.row-bg-hover').attr('fill', theme.rowHover);

        if (!tooltip) return;
        var deltaSign = d.delta > 0 ? '+' : d.delta < 0 ? '-' : '';
        var valAFormatted = d.renderedA || formatVal(d.valA);
        var valBFormatted = d.renderedB || formatVal(d.valB);
        var deltaFormatted = deltaSign + formatVal(Math.abs(d.delta));
        var pctFormatted = (d.deltaPct >= 0 ? '+' : '') + (d.deltaPct * 100).toFixed(1) + '%';
        var ratioStr = (d.valA !== 0 ? (d.valB / d.valA) : 1).toFixed(2) + 'x';

        var statusIcon = d.isPositive ? '&#9650; Growth / Surplus' : '&#9660; Decline / Deficit';
        if (isLowerBetter) {
          statusIcon = d.isPositive ? '&#9650; Target Met (Cost/Latency Reduced)' : '&#9660; Target Exceeded (Cost/Latency Increased)';
        }
        var statusColor = d.isPositive ? theme.badgePosText : theme.badgeNegText;
        var statusBg = d.isPositive ? theme.badgePosBg : theme.badgeNegBg;

        tooltip.innerHTML = '' +
          '<div style="font-weight:700;font-size:13px;margin-bottom:6px;color:' + theme.text + ';">' + d.category + '</div>' +
          '<div style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:' + statusBg + ';color:' + statusColor + ';margin-bottom:8px;">' + statusIcon + '</div>' +
          '<div style="display:grid;grid-template-columns:auto auto;gap:4px 14px;color:' + theme.subtext + ';font-size:11.5px;">' +
          '  <span>' + labelA + ':</span><span style="font-weight:600;color:' + theme.text + ';text-align:right;">' + valAFormatted + '</span>' +
          '  <span>' + labelB + ':</span><span style="font-weight:600;color:' + theme.dotB + ';text-align:right;">' + valBFormatted + '</span>' +
          '  <span>Net Variance:</span><span style="font-weight:700;color:' + statusColor + ';text-align:right;">' + deltaFormatted + ' (' + pctFormatted + ')</span>' +
          '  <span>Multiplier:</span><span style="font-weight:600;color:' + theme.text + ';text-align:right;">' + ratioStr + '</span>' +
          '</div>' +
          (d.isAnomaly ? '<div style="margin-top:6px;font-size:10px;color:#d97706;font-weight:600;">&#9888; Variance exceeds alert threshold (' + (config.anomalyThresholdPct || 50) + '%)</div>' : '') +
          (d.links && d.links.length > 0 ? '<div style="margin-top:8px;font-size:10.5px;color:#3b82f6;font-weight:600;">Click row to explore drill-down &rarr;</div>' : '');

        tooltip.style.backgroundColor = themeKey === 'cyberpunk_dark' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)';
        tooltip.style.border = '1px solid ' + theme.cardBorder;
        tooltip.style.display = 'block';
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'scale(1)';
      });

      rows.on('mousemove', function (event) {
        if (!tooltip) return;
        var mouseX = event.clientX;
        var mouseY = event.clientY;
        var ttWidth = tooltip.offsetWidth || 220;
        var ttHeight = tooltip.offsetHeight || 130;

        var left = mouseX + 16;
        var top = mouseY - 20;

        if (left + ttWidth > window.innerWidth - 10) {
          left = mouseX - ttWidth - 16;
        }
        if (top + ttHeight > window.innerHeight - 10) {
          top = window.innerHeight - ttHeight - 10;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
      });

      rows.on('mouseleave', function () {
        d3.select(this).select('.row-bg-hover').attr('fill', 'transparent');
        if (tooltip) {
          tooltip.style.display = 'none';
        }
      });

      // Handle Looker drill links on click
      rows.on('click', function (event, d) {
        if (d.links && d.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
          window.LookerCharts.Utils.openDrillMenu({
            links: d.links,
            event: event
          });
        }
      });
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
