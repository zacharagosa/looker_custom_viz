/**
 * Stephen Few Bullet Graph - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Implements Stephen Few's classic information-dense Bullet Graph specification
 * for executive KPI reporting, budget vs actual variance analysis, and quota attainment.
 *
 * Features:
 * - Multi-category executive bullet graphs (horizontal or vertical layout)
 * - 3-tier and 4-tier qualitative performance range bands (Poor, Satisfactory, Good, Stretch)
 * - Actual performance bar with smooth entry animations
 * - Crisp target / quota / comparison marker line
 * - Dynamic variance and attainment percentage badges (+12.4%, 108%)
 * - Interactive glassmorphism tooltip with variance breakdown and qualitative tier status
 * - Multiple executive color palettes (Executive Slate, Google Vibrant, Emerald Growth, Midnight Neon, Sunset Warmth)
 * - Flexible data mapping: 0-1 Dimension, 1-3 Measures (Actual, Target/Goal, Baseline)
 * - Rich sorting and formatting controls
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
      actual: '#1e3a8a', // Navy
      target: '#dc2626', // Crimson
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
    google_vibrant: {
      name: 'Google Vibrant',
      bands: ['#e8f0fe', '#d2e3fc', '#aecbfa', '#8ab4f8'],
      actual: '#1a73e8', // Google Blue
      target: '#ea4335', // Google Red
      baseline: '#fbbc04', // Google Yellow
      badgePositiveBg: '#ceead6',
      badgePositiveText: '#137333',
      badgeNegativeBg: '#fad2cf',
      badgeNegativeText: '#c5221f',
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      grid: '#f8f9fa'
    },
    emerald_growth: {
      name: 'Emerald Growth',
      bands: ['#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399'],
      actual: '#065f46', // Deep Emerald
      target: '#047857', // Forest
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
    midnight_cyber: {
      name: 'Midnight Neon (Dark Mode)',
      bands: ['#1e293b', '#334155', '#475569', '#64748b'],
      actual: '#38bdf8', // Neon Sky Blue
      target: '#f43f5e', // Neon Rose
      baseline: '#a855f7', // Neon Purple
      badgePositiveBg: '#064e3b',
      badgePositiveText: '#6ee7b7',
      badgeNegativeBg: '#4c0519',
      badgeNegativeText: '#fda4af',
      bg: '#0f172a',
      text: '#f8fafc',
      subtext: '#94a3b8',
      grid: '#1e293b'
    },
    sunset_warmth: {
      name: 'Sunset Warmth',
      bands: ['#ffedd5', '#fed7aa', '#fdba74', '#fb923c'],
      actual: '#c2410c', // Dark Orange
      target: '#991b1b', // Burgundy
      baseline: '#d97706',
      badgePositiveBg: '#ecfdf5',
      badgePositiveText: '#047857',
      badgeNegativeBg: '#fff1f2',
      badgeNegativeText: '#be123c',
      bg: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      grid: '#fff7ed'
    }
  };

  var visObject = {
    id: 'bullet_graph',
    label: 'Stephen Few Bullet Graph',
    options: {
      colorTheme: {
        type: 'string',
        label: 'Color Theme & Palette',
        display: 'select',
        values: [
          { 'Executive Slate (Classic Few)': 'executive_slate' },
          { 'Google Vibrant': 'google_vibrant' },
          { 'Emerald Growth': 'emerald_growth' },
          { 'Midnight Neon (Dark)': 'midnight_cyber' },
          { 'Sunset Warmth': 'sunset_warmth' }
        ],
        default: 'executive_slate',
        section: 'Style',
        order: 1
      },
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
        order: 2
      },
      band1Pct: {
        type: 'number',
        label: 'Band 1: Poor / Low Threshold (%)',
        default: 60,
        section: 'Display',
        order: 3
      },
      band2Pct: {
        type: 'number',
        label: 'Band 2: Satisfactory Threshold (%)',
        default: 85,
        section: 'Display',
        order: 4
      },
      band3Pct: {
        type: 'number',
        label: 'Band 3: Good / Target Threshold (%)',
        default: 100,
        section: 'Display',
        order: 5
      },
      band4Pct: {
        type: 'number',
        label: 'Band 4: Stretch Threshold (%) (4-Tier only)',
        default: 120,
        section: 'Display',
        order: 6
      },
      targetCalculationMode: {
        type: 'string',
        label: 'Target / Quota Source',
        display: 'select',
        values: [
          { 'Use 2nd Measure from Query': 'second_measure' },
          { 'Percentage Multiplier of Actual (e.g. 115%)': 'multiplier' },
          { 'Fixed Static Target Value': 'fixed' }
        ],
        default: 'second_measure',
        section: 'Display',
        order: 7
      },
      targetMultiplier: {
        type: 'number',
        label: 'Target Multiplier (when source is Multiplier)',
        default: 1.15,
        section: 'Display',
        order: 8
      },
      fixedTargetValue: {
        type: 'number',
        label: 'Fixed Target Value (when source is Fixed)',
        default: 100000,
        section: 'Display',
        order: 9
      },
      showTargetMarker: {
        type: 'boolean',
        label: 'Show Target Marker Line',
        default: true,
        section: 'Display',
        order: 10
      },
      showVarianceBadge: {
        type: 'boolean',
        label: 'Show Attainment / Variance Badge',
        default: true,
        section: 'Display',
        order: 11
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
        order: 12
      },
      showValueLabels: {
        type: 'boolean',
        label: 'Show Actual & Target Value Readouts',
        default: true,
        section: 'Display',
        order: 13
      },
      valueFormat: {
        type: 'string',
        label: 'Value Formatting Style',
        display: 'select',
        values: [
          { 'Auto (from Looker Field Format)': 'auto' },
          { 'Compact Currency ($1.2M, $450K)': 'compact_currency' },
          { 'Full Currency ($1,234,567)': 'full_currency' },
          { 'Compact Number (1.2M, 450K)': 'compact_number' },
          { 'Full Number (1,234,567)': 'full_number' },
          { 'Percentage (85.4%)': 'percentage' }
        ],
        default: 'auto',
        section: 'Display',
        order: 14
      },
      sortBy: {
        type: 'string',
        label: 'Sort Rows By',
        display: 'select',
        values: [
          { 'Default (Looker Query Order)': 'default' },
          { 'Actual Value (High to Low)': 'actual_desc' },
          { 'Actual Value (Low to High)': 'actual_asc' },
          { 'Attainment % (Highest to Lowest)': 'attainment_desc' },
          { 'Attainment % (Lowest to Highest)': 'attainment_asc' },
          { 'Category Name (A to Z)': 'label_asc' }
        ],
        default: 'default',
        section: 'Display',
        order: 15
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
        order: 2
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
        order: 3
      },
      enableAnimation: {
        type: 'boolean',
        label: 'Enable Smooth Entry Animations',
        default: true,
        section: 'Style',
        order: 4
      }
    },

    create: function (element, config) {
      element.innerHTML = '';
      element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      element.style.overflow = 'auto';
      element.style.boxSizing = 'border-box';
      element.style.width = '100%';
      element.style.height = '100%';

      var container = document.createElement('div');
      container.className = 'bullet-graph-container';
      container.style.width = '100%';
      container.style.minHeight = '100%';
      container.style.boxSizing = 'border-box';
      container.style.padding = '16px';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
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

      var dimField = dimensions.length > 0 ? dimensions[0] : null;
      var actualField = measures[0];
      var targetField = measures.length > 1 ? measures[1] : null;
      var baselineField = measures.length > 2 ? measures[2] : null;

      var themeKey = config.colorTheme || 'executive_slate';
      var theme = THEMES[themeKey] || THEMES.executive_slate;

      element.style.backgroundColor = theme.bg;
      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      // Tooltip styling
      if (tooltip) {
        if (themeKey === 'midnight_cyber') {
          tooltip.style.background = 'rgba(15, 23, 42, 0.94)';
          tooltip.style.color = '#f8fafc';
          tooltip.style.border = '1px solid #334155';
        } else {
          tooltip.style.background = 'rgba(15, 23, 42, 0.92)';
          tooltip.style.color = '#ffffff';
          tooltip.style.border = '1px solid rgba(255,255,255,0.1)';
        }
      }

      // Formatters
      function formatVal(val, lookerRendered) {
        if (val === null || val === undefined || isNaN(val)) return '-';
        var style = config.valueFormat || 'auto';
        if (style === 'auto' && lookerRendered) {
          return lookerRendered;
        }
        if (style === 'compact_currency') {
          if (Math.abs(val) >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
          if (Math.abs(val) >= 1e6) return '$' + (val / 1e6).toFixed(2) + 'M';
          if (Math.abs(val) >= 1e3) return '$' + (val / 1e3).toFixed(1) + 'K';
          return '$' + val.toFixed(0);
        }
        if (style === 'full_currency') {
          return '$' + d3.format(',.2f')(val);
        }
        if (style === 'compact_number') {
          if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(2) + 'B';
          if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(2) + 'M';
          if (Math.abs(val) >= 1e3) return (val / 1e3).toFixed(1) + 'K';
          return d3.format(',')(val);
        }
        if (style === 'full_number') {
          return d3.format(',.2f')(val);
        }
        if (style === 'percentage') {
          return (val * 100).toFixed(1) + '%';
        }
        return lookerRendered || d3.format(',')(val);
      }

      // Parse data rows
      var items = [];
      data.forEach(function (row, idx) {
        var label = dimField ? (row[dimField.name].rendered || row[dimField.name].value || 'Item ' + (idx + 1)) : (actualField.label_short || actualField.label || 'KPI Total');
        var actualVal = Number(row[actualField.name].value) || 0;
        var actualRendered = row[actualField.name].rendered;

        var targetVal = 0;
        var targetRendered = null;

        var targetMode = config.targetCalculationMode || 'second_measure';
        if (targetMode === 'second_measure' && targetField) {
          targetVal = Number(row[targetField.name].value) || 0;
          targetRendered = row[targetField.name].rendered;
        } else if (targetMode === 'multiplier') {
          var mult = Number(config.targetMultiplier) || 1.15;
          targetVal = actualVal * mult;
        } else if (targetMode === 'fixed') {
          targetVal = Number(config.fixedTargetValue) || 100000;
        } else {
          // Fallback if no 2nd measure
          targetVal = actualVal * 1.15;
        }

        var baselineVal = (baselineField && row[baselineField.name]) ? Number(row[baselineField.name].value) || null : null;
        var baselineRendered = baselineField && row[baselineField.name] ? row[baselineField.name].rendered : null;

        var attainmentRate = targetVal > 0 ? (actualVal / targetVal) * 100 : (actualVal > 0 ? 100 : 0);
        var variancePct = targetVal > 0 ? ((actualVal - targetVal) / targetVal) * 100 : 0;
        var deltaVal = actualVal - targetVal;

        // Determine max scale anchor (ensure both actual, target, and stretch fit comfortably)
        var isFourTier = (config.qualitativeRanges === '4_tier');
        var b1Pct = Number(config.band1Pct) || (isFourTier ? 50 : 60);
        var b2Pct = Number(config.band2Pct) || (isFourTier ? 75 : 85);
        var b3Pct = Number(config.band3Pct) || 100;
        var b4Pct = Number(config.band4Pct) || 120;

        var maxTargetOrActual = Math.max(actualVal, targetVal, baselineVal || 0);
        var scaleMax = targetVal > 0 ? targetVal * (isFourTier ? (b4Pct / 100) : 1.15) : maxTargetOrActual * 1.2;
        if (actualVal > scaleMax) scaleMax = actualVal * 1.08;
        if (scaleMax <= 0) scaleMax = 100;

        // Band thresholds
        var bandRanges = [];
        if (isFourTier) {
          bandRanges = [
            { name: 'Poor', val: scaleMax * (b1Pct / (isFourTier ? b4Pct : 100)), tier: 1 },
            { name: 'Fair', val: scaleMax * (b2Pct / (isFourTier ? b4Pct : 100)), tier: 2 },
            { name: 'Good', val: scaleMax * (b3Pct / (isFourTier ? b4Pct : 100)), tier: 3 },
            { name: 'Stretch', val: scaleMax, tier: 4 }
          ];
        } else {
          bandRanges = [
            { name: 'Poor', val: (targetVal > 0 ? targetVal * (b1Pct / 100) : scaleMax * 0.6), tier: 1 },
            { name: 'Satisfactory', val: (targetVal > 0 ? targetVal * (b2Pct / 100) : scaleMax * 0.85), tier: 2 },
            { name: 'Good', val: scaleMax, tier: 3 }
          ];
        }

        // Qualitative tier achieved
        var achievedTier = 'Needs Attention';
        if (actualVal >= targetVal) {
          achievedTier = actualVal >= (targetVal * (b4Pct / 100)) && isFourTier ? 'Stretch Exceeded' : 'Target Met (Good)';
        } else if (actualVal >= (targetVal * (b2Pct / 100))) {
          achievedTier = 'Satisfactory';
        }

        items.push({
          id: 'row_' + idx,
          label: String(label),
          actual: actualVal,
          actualRendered: actualRendered,
          target: targetVal,
          targetRendered: targetRendered,
          baseline: baselineVal,
          baselineRendered: baselineRendered,
          attainmentRate: attainmentRate,
          variancePct: variancePct,
          deltaVal: deltaVal,
          scaleMax: scaleMax,
          bandRanges: bandRanges,
          achievedTier: achievedTier
        });
      });

      // Sorting
      var sortMode = config.sortBy || 'default';
      if (sortMode === 'actual_desc') {
        items.sort(function (a, b) { return b.actual - a.actual; });
      } else if (sortMode === 'actual_asc') {
        items.sort(function (a, b) { return a.actual - b.actual; });
      } else if (sortMode === 'attainment_desc') {
        items.sort(function (a, b) { return b.attainmentRate - a.attainmentRate; });
      } else if (sortMode === 'attainment_asc') {
        items.sort(function (a, b) { return a.attainmentRate - b.attainmentRate; });
      } else if (sortMode === 'label_asc') {
        items.sort(function (a, b) { return a.label.localeCompare(b.label); });
      }

      // Header summary cards
      var totalActual = items.reduce(function (acc, it) { return acc + it.actual; }, 0);
      var totalTarget = items.reduce(function (acc, it) { return acc + it.target; }, 0);
      var avgAttainment = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
      var totalItems = items.length;
      var metTargetCount = items.filter(function (it) { return it.actual >= it.target; }).length;

      var header = document.createElement('div');
      header.style.display = 'flex';
      header.style.flexWrap = 'wrap';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.style.gap = '16px';
      header.style.paddingBottom = '14px';
      header.style.marginBottom = '16px';
      header.style.borderBottom = '1px solid ' + (themeKey === 'midnight_cyber' ? '#334155' : '#e2e8f0');

      var titleBox = document.createElement('div');
      var mainTitle = document.createElement('div');
      mainTitle.style.fontSize = '16px';
      mainTitle.style.fontWeight = '700';
      mainTitle.style.letterSpacing = '-0.02em';
      mainTitle.textContent = (dimField ? dimField.label_short || dimField.label : 'Executive KPI') + ' — ' + (actualField.label_short || actualField.label) + (targetField ? ' vs ' + (targetField.label_short || targetField.label) : '');
      
      var subtitle = document.createElement('div');
      subtitle.style.fontSize = '12px';
      subtitle.style.color = theme.subtext;
      subtitle.style.marginTop = '2px';
      subtitle.textContent = totalItems + ' Categories Analyzed • ' + metTargetCount + ' of ' + totalItems + ' met/exceeded target (' + ((metTargetCount / totalItems) * 100).toFixed(0) + '%)';
      titleBox.appendChild(mainTitle);
      titleBox.appendChild(subtitle);
      header.appendChild(titleBox);

      // KPI stat pills
      var statsBox = document.createElement('div');
      statsBox.style.display = 'flex';
      statsBox.style.gap = '12px';
      statsBox.style.flexWrap = 'wrap';

      function createStatCard(label, val, sublabel, isPositive) {
        var card = document.createElement('div');
        card.style.background = themeKey === 'midnight_cyber' ? '#1e293b' : '#f8fafc';
        card.style.border = '1px solid ' + (themeKey === 'midnight_cyber' ? '#334155' : '#e2e8f0');
        card.style.borderRadius = '6px';
        card.style.padding = '6px 12px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';

        var lbl = document.createElement('span');
        lbl.style.fontSize = '10px';
        lbl.style.textTransform = 'uppercase';
        lbl.style.letterSpacing = '0.05em';
        lbl.style.color = theme.subtext;
        lbl.textContent = label;

        var v = document.createElement('span');
        v.style.fontSize = '14px';
        v.style.fontWeight = '700';
        v.style.color = (isPositive === true ? theme.badgePositiveText : (isPositive === false ? theme.badgeNegativeText : theme.text));
        v.textContent = val;

        card.appendChild(lbl);
        card.appendChild(v);
        return card;
      }

      statsBox.appendChild(createStatCard('Total Actual', formatVal(totalActual, null), null, null));
      if (totalTarget > 0) {
        statsBox.appendChild(createStatCard('Total Target', formatVal(totalTarget, null), null, null));
        var overallMet = avgAttainment >= 100;
        statsBox.appendChild(createStatCard('Attainment', avgAttainment.toFixed(1) + '%', null, overallMet));
      }

      header.appendChild(statsBox);
      container.appendChild(header);

      // Sizing variables
      var orientation = config.orientation || 'horizontal';
      var isHorizontal = (orientation === 'horizontal');
      var barThickness = Number(config.barThickness) || 18;
      var rowHeight = Number(config.rowHeight) || 64;
      var enableAnimation = config.enableAnimation !== false;

      // Legend
      var legend = document.createElement('div');
      legend.style.display = 'flex';
      legend.style.alignItems = 'center';
      legend.style.gap = '18px';
      legend.style.fontSize = '11px';
      legend.style.color = theme.subtext;
      legend.style.marginBottom = '12px';
      legend.style.flexWrap = 'wrap';

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
        targetLegend.innerHTML = '<span style="display:inline-block;width:3px;height:12px;background:' + theme.target + ';border-radius:1px;"></span> <strong>Target / Goal:</strong> ' + (targetField ? (targetField.label_short || targetField.label) : 'Calculated Goal');
        legend.appendChild(targetLegend);
      }

      var bandsLegend = document.createElement('div');
      bandsLegend.style.display = 'flex';
      bandsLegend.style.alignItems = 'center';
      bandsLegend.style.gap = '4px';
      var bandSquares = theme.bands.map(function (c) {
        return '<span style="display:inline-block;width:10px;height:10px;background:' + c + ';"></span>';
      }).join('');
      bandsLegend.innerHTML = '<div style="display:flex;margin-right:2px;">' + bandSquares + '</div> <span>Qualitative Ranges (Poor → Target → Good)</span>';
      legend.appendChild(bandsLegend);

      container.appendChild(legend);

      // Bullet Graph Body (SVG container)
      var graphWrapper = document.createElement('div');
      graphWrapper.className = 'bullet-graph-wrapper';
      graphWrapper.style.width = '100%';
      graphWrapper.style.flex = '1';
      container.appendChild(graphWrapper);

      // Render Horizontal vs Vertical
      if (isHorizontal) {
        renderHorizontalBullets(d3, graphWrapper, items, theme, config, tooltip, formatVal, barThickness, rowHeight, enableAnimation);
      } else {
        renderVerticalBullets(d3, graphWrapper, items, theme, config, tooltip, formatVal, barThickness, enableAnimation);
      }

      done();
    }
  };

  function renderHorizontalBullets(d3, container, items, theme, config, tooltip, formatVal, barThickness, rowHeight, enableAnimation) {
    var width = container.clientWidth || 800;
    var labelColWidth = Math.min(220, Math.max(140, width * 0.22));
    var valueColWidth = config.showVarianceBadge !== false ? 110 : 70;
    var bulletWidth = Math.max(180, width - labelColWidth - valueColWidth - 40);
    var totalHeight = items.length * rowHeight + 40;

    var svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', totalHeight)
      .attr('viewBox', '0 0 ' + width + ' ' + totalHeight)
      .style('display', 'block');

    var g = svg.append('g')
      .attr('transform', 'translate(10, 10)');

    // Row Groups
    items.forEach(function (item, idx) {
      var rowY = idx * rowHeight;
      var rowG = g.append('g')
        .attr('class', 'bullet-row')
        .attr('transform', 'translate(0, ' + rowY + ')')
        .style('cursor', 'pointer');

      // Hover overlay background
      var hoverBg = rowG.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width - 20)
        .attr('height', rowHeight - 4)
        .attr('fill', 'transparent')
        .attr('rx', 4)
        .style('transition', 'fill 0.15s ease');

      // Label column
      var textG = rowG.append('g')
        .attr('transform', 'translate(4, ' + (rowHeight / 2 - 2) + ')');

      var labelText = textG.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('font-size', '13px')
        .attr('font-weight', '600')
        .attr('fill', theme.text)
        .text(truncateString(item.label, Math.floor(labelColWidth / 8)));

      var subLabel = textG.append('text')
        .attr('x', 0)
        .attr('y', 15)
        .attr('font-size', '11px')
        .attr('fill', theme.subtext)
        .text('Actual: ' + formatVal(item.actual, item.actualRendered));

      // Bullet Graph Area
      var bulletG = rowG.append('g')
        .attr('transform', 'translate(' + labelColWidth + ', ' + (rowHeight / 2 - 14) + ')');

      var scale = d3.scaleLinear()
        .domain([0, item.scaleMax])
        .range([0, bulletWidth]);

      // Qualitative range bands (descending order from full width down)
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
          .delay(idx * 40)
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

        // Target marker subtle halo / drop-shadow
        targetMarker.style('filter', 'drop-shadow(0px 0px 2px rgba(0,0,0,0.3))');
      }

      // Comparative Baseline Marker (if available)
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
        var isMet = item.attainmentRate >= 100;
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
          .attr('width', 74)
          .attr('height', 24)
          .attr('rx', 12)
          .attr('fill', badgeBg);

        badgeG.append('text')
          .attr('x', 37)
          .attr('y', 16)
          .attr('text-anchor', 'middle')
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .attr('fill', badgeText)
          .text(displayString);
      }

      // Hover events
      rowG.on('mouseenter', function (event) {
        hoverBg.attr('fill', theme.name.includes('Dark') ? 'rgba(51, 65, 85, 0.4)' : 'rgba(241, 245, 249, 0.8)');
        showTooltip(tooltip, event, item, formatVal, theme);
      })
      .on('mousemove', function (event) {
        moveTooltip(tooltip, event);
      })
      .on('mouseleave', function () {
        hoverBg.attr('fill', 'transparent');
        hideTooltip(tooltip);
      });
    });
  }

  function renderVerticalBullets(d3, container, items, theme, config, tooltip, formatVal, barThickness, enableAnimation) {
    var containerWidth = container.clientWidth || 800;
    var colWidth = Math.max(90, Math.min(140, containerWidth / Math.max(1, items.length)));
    var totalWidth = items.length * colWidth + 60;
    var graphHeight = 320;
    var totalHeight = graphHeight + 100;

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
          .delay(idx * 40)
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
        var isMet = item.attainmentRate >= 100;
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
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', theme.text)
        .text(truncateString(item.label, 12));

      colG.append('text')
        .attr('x', (colWidth - 8) / 2)
        .attr('y', graphHeight + 64)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', theme.subtext)
        .text(formatVal(item.actual, item.actualRendered));

      // Tooltip
      colG.on('mouseenter', function (event) {
        hoverBg.attr('fill', theme.name.includes('Dark') ? 'rgba(51, 65, 85, 0.4)' : 'rgba(241, 245, 249, 0.8)');
        showTooltip(tooltip, event, item, formatVal, theme);
      })
      .on('mousemove', function (event) {
        moveTooltip(tooltip, event);
      })
      .on('mouseleave', function () {
        hoverBg.attr('fill', 'transparent');
        hideTooltip(tooltip);
      });
    });
  }

  function showTooltip(tooltip, event, item, formatVal, theme) {
    if (!tooltip) return;
    var isPositive = item.variancePct >= 0;
    var deltaSign = isPositive ? '+' : '-';
    var statusBadgeColor = isPositive ? '#10b981' : '#ef4444';

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
        
        <span style="color:#94a3b8;">Target / Quota:</span>
        <span style="font-weight:700;text-align:right;">${item.target > 0 ? formatVal(item.target, item.targetRendered) : 'N/A'}</span>
        
        <span style="color:#94a3b8;">Attainment:</span>
        <span style="font-weight:700;text-align:right;color:${isPositive ? '#34d399' : '#f87171'};">${item.attainmentRate.toFixed(1)}%</span>
        
        <span style="color:#94a3b8;">Variance Delta:</span>
        <span style="font-weight:700;text-align:right;color:${isPositive ? '#34d399' : '#f87171'};">${deltaSign}${formatVal(Math.abs(item.deltaVal), null)} (${deltaSign}${Math.abs(item.variancePct).toFixed(1)}%)</span>
      </div>
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
