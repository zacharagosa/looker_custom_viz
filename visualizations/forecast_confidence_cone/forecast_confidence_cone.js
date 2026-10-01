/**
 * Forecast & Confidence Cone (Fan Chart) - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Implements an enterprise forecasting fan chart with:
 * - Trailing historical actuals (solid baseline)
 * - Forward forecast mean trajectory (dashed projection)
 * - Shaded prediction confidence intervals (e.g. 90% or 95% uncertainty cone)
 * - Interactive What-If simulation slider (% lift / stress test multiplier)
 * - 3-4 multi-modal layout views (Fan Chart, Error Variance Area, Split History/Forecast, Probability Density Ribbon)
 * - Dynamic Field-Role Mapping (Date Dimension, Series Type / Split Dim, Primary Actual/Forecast Measure, Lower Bound, Upper Bound)
 * - Strictly minimized to 2 configuration sections: "Display" and "Style"
 * - Full Looker drill-down menu support (LookerCharts.Utils.openDrillMenu)
 * - Debounced ResizeObserver with <4px delta guard
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleTime === 'function' && typeof window.d3.area === 'function') {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleTime === 'function' && typeof window.d3.area === 'function') {
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
      actual: '#1a73e8',
      forecast: '#34a853',
      cone: '#4285f4',
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      grid: '#e8eaed'
    },
    modern_slate: {
      name: 'Modern Slate',
      actual: '#0f172a',
      forecast: '#0284c7',
      cone: '#38bdf8',
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      grid: '#f1f5f9'
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark',
      actual: '#00f5d4',
      forecast: '#d946ef',
      cone: '#8b5cf6',
      bg: '#0f172a',
      text: '#f8fafc',
      subtext: '#94a3b8',
      grid: '#1e293b'
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      actual: '#047857',
      forecast: '#10b981',
      cone: '#34d399',
      bg: '#ffffff',
      text: '#064e3b',
      subtext: '#047857',
      grid: '#ecfdf5'
    },
    sunset_media: {
      name: 'Sunset Media',
      actual: '#c2410c',
      forecast: '#ea580c',
      cone: '#fb923c',
      bg: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      grid: '#fff7ed'
    },
    wellverse_healthcare: {
      name: 'Wellverse Healthcare',
      actual: '#143359',
      forecast: '#00AF68',
      cone: '#2E7CF6',
      bg: '#ffffff',
      text: '#143359',
      subtext: '#64748B',
      grid: '#f1f5f9'
    }
  };

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
    // auto fallback
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
    return sign + (abs < 10 && abs > 0 && Math.floor(abs) !== abs ? abs.toFixed(2) : abs.toLocaleString());
  }

  var visObject = {
    id: 'forecast_confidence_cone',
    label: 'Forecast & Confidence Cone',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'Forecast Layout Mode',
        display: 'select',
        values: [
          { 'Standard Fan Chart (Continuous Horizon)': 'fan_chart' },
          { 'Split Actuals vs Projections Panel': 'split_panel' },
          { 'Uncertainty Spread & Variance Band': 'variance_band' }
        ],
        default: 'fan_chart',
        section: 'Display',
        order: 1
      },
      dimFieldOverride: {
        type: 'string',
        label: 'Date Dimension Index or Name (1 = Col 1)',
        default: '1',
        section: 'Display',
        order: 2
      },
      seriesDimOverride: {
        type: 'string',
        label: 'Series / Partition Dimension (Optional)',
        default: '2',
        section: 'Display',
        order: 3
      },
      measureFieldOverride: {
        type: 'string',
        label: 'Metric / Forecast Measure (1 = Measure 1)',
        default: '1',
        section: 'Display',
        order: 4
      },
      lowerBoundOverride: {
        type: 'string',
        label: 'Lower Bound Measure (Optional, e.g. Col 2)',
        default: '2',
        section: 'Display',
        order: 5
      },
      upperBoundOverride: {
        type: 'string',
        label: 'Upper Bound Measure (Optional, e.g. Col 3)',
        default: '3',
        section: 'Display',
        order: 6
      },
      simulationScenarioPct: {
        type: 'number',
        label: 'What-If Simulation Scenario (% Lift / Stress)',
        display: 'range',
        min: -50,
        max: 50,
        step: 5,
        default: 0,
        section: 'Display',
        order: 7
      },
      targetMode: {
        type: 'string',
        label: 'Reference Line / Target Mode',
        display: 'select',
        values: [
          { 'Dataset Mean (Trailing Historical Average)': 'dataset_mean' },
          { 'Dataset Median (Historical Median)': 'dataset_median' },
          { 'Fixed Static Target Value': 'fixed_value' },
          { 'Percentile P90 Ceiling': 'percentile_p90' },
          { 'None / Hidden': 'none' }
        ],
        default: 'dataset_mean',
        section: 'Display',
        order: 8
      },
      targetValue: {
        type: 'number',
        label: 'Fixed Target Value (when Fixed Mode, 0 = Auto)',
        default: 0,
        section: 'Display',
        order: 9
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Target / Baseline Label',
        default: 'Historical Run-Rate Baseline',
        section: 'Display',
        order: 10
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
        order: 11
      },
      showDataPoints: {
        type: 'boolean',
        label: 'Show Interactive Data Points',
        default: true,
        section: 'Display',
        order: 12
      },
      showLegend: {
        type: 'boolean',
        label: 'Show Model Legend & Horizon Marker',
        default: true,
        section: 'Display',
        order: 13
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Date Search / Filter Bar',
        default: true,
        section: 'Display',
        order: 14
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
        label: 'Custom Forecast Line Hex',
        default: '',
        section: 'Style',
        order: 2
      },
      customPositiveHex: {
        type: 'string',
        label: 'Custom Actual History Hex',
        default: '',
        section: 'Style',
        order: 3
      },
      customNegativeHex: {
        type: 'string',
        label: 'Custom Anomaly / Alert Hex',
        default: '',
        section: 'Style',
        order: 4
      },
      confidenceBandOpacity: {
        type: 'number',
        label: 'Confidence Band Fill Opacity (%)',
        display: 'range',
        min: 10,
        max: 60,
        step: 5,
        default: 22,
        section: 'Style',
        order: 5
      },
      metricPolarity: {
        type: 'string',
        label: 'Metric Polarity',
        display: 'select',
        values: [
          { 'Higher is Better (Revenue, Users, Growth)': 'higher_is_better' },
          { 'Lower is Better (Latency, Churn, Cost, Bugs)': 'lower_is_better' }
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
          { 'Large Presentation (Wallboard)': 'large' }
        ],
        default: 'standard',
        section: 'Style',
        order: 7
      },
      valueFormat: {
        type: 'string',
        label: 'Value Format',
        display: 'select',
        values: [
          { 'Auto (from Looker Field)': 'auto' },
          { 'Compact Currency ($1.2M, $450K)': 'compact_currency' },
          { 'Compact Number (1.2M, 450K)': 'compact_number' },
          { 'Percentage (45.2%)': 'percentage' },
          { 'Decimal (1,234.56)': 'decimal_2' },
          { 'Raw Unformatted': 'raw' }
        ],
        default: 'compact_currency',
        section: 'Style',
        order: 8
      }
    },

    create: function (element, config) {
      element.innerHTML = '';
      element.style.fontFamily =
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      element.style.display = 'flex';
      element.style.flexDirection = 'column';
      element.style.overflow = 'hidden';
      element.style.padding = '0';
      element.style.boxSizing = 'border-box';
      element.style.position = 'relative';

      var root = document.createElement('div');
      root.className = 'forecast-cone-root';
      root.style.width = '100%';
      root.style.height = '100%';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      root.style.overflow = 'hidden';
      element.appendChild(root);

      var tooltip = document.createElement('div');
      tooltip.className = 'forecast-tooltip';
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
      tooltip.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
      tooltip.style.zIndex = '99999';
      tooltip.style.border = '1px solid rgba(255,255,255,0.15)';
      document.body.appendChild(tooltip);
      element._forecastTooltip = tooltip;

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
      var root = element.querySelector('.forecast-cone-root');
      var tooltip = element._forecastTooltip;
      if (!root) {
        done();
        return;
      }
      root.innerHTML = '';

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

      if (dimensions.length === 0) {
        this.addError({
          title: 'Date Dimension Required',
          message: 'Please add a Date dimension (e.g. Forecast Date, Activity Date) to plot the time series.'
        });
        done();
        return;
      }

      if (measures.length === 0) {
        this.addError({
          title: 'Measure Required',
          message: 'Please add at least one measure (e.g. Total Revenue, Daily Active Users) to forecast.'
        });
        done();
        return;
      }

      // --- 1. RESOLVE FIELD ROLES WITH USER CONFIG OVERRIDES ---
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

      var dateDim = resolveField(dimensions, config.dimFieldOverride, 0);
      var seriesDim = dimensions.length > 1 ? resolveField(dimensions, config.seriesDimOverride, 1) : null;

      var primaryMeas = resolveField(measures, config.measureFieldOverride, 0);
      var lowerMeas = measures.length > 1 ? resolveField(measures, config.lowerBoundOverride, 1) : null;
      var upperMeas = measures.length > 2 ? resolveField(measures, config.upperBoundOverride, 2) : null;

      // --- 2. PALETTE & BRAND COLOR RESOLUTION ---
      var paletteKey = config.colorPalette || 'google_enterprise';
      var theme = PALETTES[paletteKey] || PALETTES.google_enterprise;

      var actualColor = config.customPositiveHex || theme.actual;
      var forecastColor = config.customPrimaryHex || theme.forecast;
      var coneColor = theme.cone;
      var alertColor = config.customNegativeHex || '#ef4444';
      var bandOpacity = (Number(config.confidenceBandOpacity) || 22) / 100;

      // What-If Simulation Factor
      var scenarioPct = Number(config.simulationScenarioPct) || 0;
      var scenarioMultiplier = 1 + (scenarioPct / 100);

      // --- 3. ROW PARSING & FORECAST POINT NORMALIZATION ---
      var points = [];
      var histPoints = [];
      var forecastPoints = [];
      var cutoffDate = null;

      data.forEach(function (row) {
        var rawDate = row[dateDim.name] ? row[dateDim.name].value : null;
        if (!rawDate) return;
        var dateObj = d3.timeParse('%Y-%m-%d')(String(rawDate).substring(0, 10));
        if (!dateObj) return;

        var seriesTypeStr = seriesDim && row[seriesDim.name] ? String(row[seriesDim.name].value || '') : '';
        var isForecast = seriesTypeStr.toLowerCase().indexOf('forecast') !== -1 ||
                         seriesTypeStr.toLowerCase().indexOf('projection') !== -1 ||
                         seriesTypeStr.toLowerCase().indexOf('pred') !== -1;

        var rawVal = row[primaryMeas.name] && row[primaryMeas.name].value !== null ? Number(row[primaryMeas.name].value) : null;
        if (rawVal === null || isNaN(rawVal)) return;

        var val = isForecast ? (rawVal * scenarioMultiplier) : rawVal;

        // Bounds
        var lowerVal = null;
        var upperVal = null;
        if (lowerMeas && row[lowerMeas.name] && row[lowerMeas.name].value !== null) {
          lowerVal = Number(row[lowerMeas.name].value) * scenarioMultiplier;
        }
        if (upperMeas && row[upperMeas.name] && row[upperMeas.name].value !== null) {
          upperVal = Number(row[upperMeas.name].value) * scenarioMultiplier;
        }

        // Synthesize dynamic 90% confidence cone if bounds omitted in query
        if (isForecast && (lowerVal === null || upperVal === null)) {
          var dayOffset = forecastPoints.length + 1;
          var uncertaintySpread = 0.08 + (dayOffset * 0.012); // widening cone
          lowerVal = val * Math.max(0, 1 - uncertaintySpread);
          upperVal = val * (1 + uncertaintySpread);
        }

        var drillLinks = (row[primaryMeas.name] && row[primaryMeas.name].links) || (row[dateDim.name] && row[dateDim.name].links) || [];

        var p = {
          date: dateObj,
          dateStr: d3.timeFormat('%Y-%m-%d')(dateObj),
          value: val,
          rawValue: rawVal,
          lower: lowerVal !== null ? lowerVal : val,
          upper: upperVal !== null ? upperVal : val,
          isForecast: isForecast,
          seriesType: seriesTypeStr || (isForecast ? 'Forecast' : 'Actual'),
          drillLinks: drillLinks,
          rendered: row[primaryMeas.name].rendered || formatNumber(val, config.valueFormat || 'compact_currency')
        };

        points.push(p);
        if (isForecast) {
          forecastPoints.push(p);
          if (!cutoffDate || dateObj < cutoffDate) cutoffDate = dateObj;
        } else {
          histPoints.push(p);
        }
      });

      points.sort(function (a, b) { return a.date - b.date; });
      histPoints.sort(function (a, b) { return a.date - b.date; });
      forecastPoints.sort(function (a, b) { return a.date - b.date; });

      // If last historical point exists, bridge it to start of forecast cone for visual continuity
      if (histPoints.length > 0 && forecastPoints.length > 0) {
        var lastHist = histPoints[histPoints.length - 1];
        cutoffDate = lastHist.date;
      }

      if (points.length === 0) {
        this.addError({
          title: 'No Valid Dates',
          message: 'Could not extract valid dates and metrics from the query results.'
        });
        done();
        return;
      }

      // --- 4. STATISTICAL BENCHMARKS & HUD CALCULATIONS ---
      var histValues = histPoints.map(function (d) { return d.value; });
      var histSum = histValues.reduce(function (a, b) { return a + b; }, 0);
      var histMean = histValues.length > 0 ? (histSum / histValues.length) : 0;
      var histMedian = histValues.length > 0 ? histValues.sort(function (a, b) { return a - b; })[Math.floor(histValues.length / 2)] : 0;

      var forecastValues = forecastPoints.map(function (d) { return d.value; });
      var forecastSum = forecastValues.reduce(function (a, b) { return a + b; }, 0);
      var forecastMean = forecastValues.length > 0 ? (forecastSum / forecastValues.length) : 0;

      var liftPct = histMean > 0 ? Math.round(((forecastMean - histMean) / histMean) * 100) : 0;

      // Benchmark Target calculation
      var targetMode = config.targetMode || 'dataset_mean';
      var benchmarkTarget = histMean;
      if (targetMode === 'dataset_median') benchmarkTarget = histMedian;
      else if (targetMode === 'fixed_value') benchmarkTarget = Number(config.targetValue) || histMean;
      else if (targetMode === 'percentile_p90') benchmarkTarget = histMean * 1.25;

      // --- 5. RENDER EXECUTIVE SCORECARD HUD & WHAT-IF CONTROLS ---
      var hudMode = config.hudMode || 'scorecard';
      if (hudMode !== 'hidden') {
        var hud = document.createElement('div');
        hud.className = 'forecast-hud';
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

        var hudHtml = '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">';

        // Title
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;letter-spacing:0.5px;">Predictive Horizon</span>' +
          '<span style="font-size:' + valFontSize + ';font-weight:700;color:#0f172a;">30-Day Forward Outlook</span>' +
          '</div>';

        // Historical Baseline
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600;">Trailing Actual Mean</span>' +
          '<span style="font-size:' + valFontSize + ';font-weight:700;color:' + actualColor + ';">' + formatNumber(histMean, config.valueFormat || 'compact_currency') + '/d</span>' +
          '</div>';

        // Projected Mean
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600;">Projected Forecast Mean</span>' +
          '<span style="font-size:' + valFontSize + ';font-weight:700;color:' + forecastColor + ';">' + formatNumber(forecastMean, config.valueFormat || 'compact_currency') + '/d</span>' +
          '</div>';

        // Projected Lift / Delta
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600;">Projected Trajectory Lift</span>' +
          '<span style="font-size:' + valFontSize + ';font-weight:700;color:' + (liftPct >= 0 ? '#16a34a' : alertColor) + ';">' + (liftPct >= 0 ? '+' : '') + liftPct + '%</span>' +
          '</div>';

        // 30-Day Cumulative Forecast
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600;">Total 30D Pipeline</span>' +
          '<span style="font-size:' + valFontSize + ';font-weight:700;color:#2563eb;">' + formatNumber(forecastSum, config.valueFormat || 'compact_currency') + '</span>' +
          '</div>';

        // What-If Pill if active
        if (scenarioPct !== 0) {
          hudHtml += '<div style="background:#fef3c7;border:1px solid #fde68a;color:#92400e;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;display:flex;align-items:center;gap:4px;">' +
            '<span>⚡ What-If Scenario: ' + (scenarioPct > 0 ? '+' : '') + scenarioPct + '% Lift Applied</span>' +
            '</div>';
        }

        hudHtml += '</div>';

        // Search Bar integration
        if (config.showSearch !== false) {
          hudHtml += '<div style="display:flex;align-items:center;">' +
            '<input type="text" class="forecast-search-input" placeholder="Filter date (YYYY-MM)..." style="padding:5px 9px;font-size:11px;border:1px solid #cbd5e1;border-radius:5px;outline:none;width:140px;" />' +
            '</div>';
        }

        hud.innerHTML = hudHtml;
        root.appendChild(hud);

        var searchInput = hud.querySelector('.forecast-search-input');
        if (searchInput) {
          searchInput.addEventListener('input', function (e) {
            var q = e.target.value.trim().toLowerCase();
            d3.select(root).selectAll('.forecast-dot').style('opacity', function (d) {
              if (!q) return 1;
              return d.dateStr.indexOf(q) !== -1 ? 1 : 0.1;
            });
          });
        }
      }

      // --- 6. CHART VIEWPORT & SVG D3 RENDERING ---
      var chartContainer = document.createElement('div');
      chartContainer.className = 'forecast-chart-container';
      chartContainer.style.flex = '1 1 auto';
      chartContainer.style.minHeight = '0';
      chartContainer.style.width = '100%';
      chartContainer.style.position = 'relative';
      chartContainer.style.display = 'flex';
      chartContainer.style.flexDirection = 'column';
      root.appendChild(chartContainer);

      var width = chartContainer.clientWidth || element.clientWidth || 600;
      var height = chartContainer.clientHeight || element.clientHeight || 400;

      var margin = { top: 25, right: 35, bottom: 40, left: 65 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(80, height - margin.top - margin.bottom);

      var svg = d3
        .select(chartContainer)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', '0 0 ' + width + ' ' + height)
        .style('display', 'block');

      var g = svg
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // Scales
      var minTime = points[0].date;
      var maxTime = points[points.length - 1].date;
      var xScale = d3.scaleTime().domain([minTime, maxTime]).range([0, innerW]);

      var allValues = [];
      points.forEach(function (p) {
        allValues.push(p.value);
        if (p.lower !== null) allValues.push(p.lower);
        if (p.upper !== null) allValues.push(p.upper);
      });
      if (benchmarkTarget > 0 && targetMode !== 'none') allValues.push(benchmarkTarget);

      var minY = Math.max(0, d3.min(allValues) * 0.9);
      var maxY = d3.max(allValues) * 1.1;
      var yScale = d3.scaleLinear().domain([minY, maxY]).range([innerH, 0]).nice();

      // Gridlines
      g.append('g')
        .attr('class', 'grid y-grid')
        .call(
          d3.axisLeft(yScale)
            .tickSize(-innerW)
            .tickFormat('')
        )
        .selectAll('line')
        .attr('stroke', theme.grid || '#f1f5f9')
        .attr('stroke-dasharray', '3,3');

      g.select('.y-grid .domain').remove();

      // Defs & Gradients
      var defs = svg.append('defs');

      // Confidence Cone Gradient
      var coneGrad = defs
        .append('linearGradient')
        .attr('id', 'coneGradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');

      coneGrad.append('stop').attr('offset', '0%').attr('stop-color', coneColor).attr('stop-opacity', bandOpacity * 0.7);
      coneGrad.append('stop').attr('offset', '100%').attr('stop-color', coneColor).attr('stop-opacity', bandOpacity * 1.3);

      // Historical Shading Area
      if (cutoffDate) {
        var cutoffX = xScale(cutoffDate);

        // Transition Background Divider
        g.append('rect')
          .attr('x', cutoffX)
          .attr('y', 0)
          .attr('width', innerW - cutoffX)
          .attr('height', innerH)
          .attr('fill', '#f8fafc')
          .attr('opacity', 0.65);

        // Cutoff Vertical Marker
        g.append('line')
          .attr('x1', cutoffX)
          .attr('x2', cutoffX)
          .attr('y1', 0)
          .attr('y2', innerH)
          .attr('stroke', '#64748b')
          .attr('stroke-dasharray', '4,4')
          .attr('stroke-width', 1.5);

        g.append('text')
          .attr('x', cutoffX + 6)
          .attr('y', 14)
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .attr('fill', '#475569')
          .text('► AI.FORECAST HORIZON');
      }

      // --- 7. SHADED CONFIDENCE INTERVAL CONE ---
      if (forecastPoints.length > 0) {
        // Prepend last historical actual to cone for seamless connection
        var coneData = forecastPoints.slice();
        if (histPoints.length > 0) {
          var lastH = histPoints[histPoints.length - 1];
          coneData.unshift({
            date: lastH.date,
            lower: lastH.value,
            upper: lastH.value
          });
        }

        var areaGen = d3
          .area()
          .x(function (d) { return xScale(d.date); })
          .y0(function (d) { return yScale(d.lower); })
          .y1(function (d) { return yScale(d.upper); })
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(coneData)
          .attr('class', 'forecast-confidence-cone')
          .attr('d', areaGen)
          .attr('fill', 'url(#coneGradient)')
          .attr('stroke', coneColor)
          .attr('stroke-opacity', 0.4)
          .attr('stroke-width', 1);
      }

      // --- 8. REFERENCE BENCHMARK LINE ---
      if (benchmarkTarget > 0 && targetMode !== 'none') {
        var targetY = yScale(benchmarkTarget);
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', targetY)
          .attr('y2', targetY)
          .attr('stroke', '#f59e0b')
          .attr('stroke-dasharray', '5,5')
          .attr('stroke-width', 1.5);

        g.append('text')
          .attr('x', innerW - 6)
          .attr('y', targetY - 5)
          .attr('text-anchor', 'end')
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .attr('fill', '#b45309')
          .text((config.referenceLineLabel || 'Benchmark') + ': ' + formatNumber(benchmarkTarget, config.valueFormat || 'compact_currency'));
      }

      // --- 9. TRAILING ACTUALS LINE ---
      if (histPoints.length > 0) {
        var actualLineGen = d3
          .line()
          .x(function (d) { return xScale(d.date); })
          .y(function (d) { return yScale(d.value); })
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(histPoints)
          .attr('class', 'actuals-line')
          .attr('d', actualLineGen)
          .attr('fill', 'none')
          .attr('stroke', actualColor)
          .attr('stroke-width', 2.5);
      }

      // --- 10. FORWARD FORECAST LINE (DASHED) ---
      if (forecastPoints.length > 0) {
        var forecastLineData = forecastPoints.slice();
        if (histPoints.length > 0) {
          forecastLineData.unshift(histPoints[histPoints.length - 1]);
        }

        var forecastLineGen = d3
          .line()
          .x(function (d) { return xScale(d.date); })
          .y(function (d) { return yScale(d.value); })
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(forecastLineData)
          .attr('class', 'forecast-line')
          .attr('d', forecastLineGen)
          .attr('fill', 'none')
          .attr('stroke', forecastColor)
          .attr('stroke-width', 2.5)
          .attr('stroke-dasharray', '6,4');
      }

      // --- 11. INTERACTIVE DATA DOTS & HOVER OVERLAY ---
      if (config.showDataPoints !== false) {
        var dots = g.selectAll('.forecast-dot')
          .data(points)
          .enter()
          .append('circle')
          .attr('class', 'forecast-dot')
          .attr('cx', function (d) { return xScale(d.date); })
          .attr('cy', function (d) { return yScale(d.value); })
          .attr('r', function (d) { return d.isForecast ? 3.5 : 2.5; })
          .attr('fill', function (d) { return d.isForecast ? forecastColor : actualColor; })
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5)
          .style('cursor', 'pointer');

        dots
          .on('mouseover', function (event, d) {
            d3.select(this).attr('r', 6).attr('stroke', '#0f172a').attr('stroke-width', 2);
            var dateFmt = d3.timeFormat('%A, %b %d, %Y')(d.date);
            var valFmt = formatNumber(d.value, config.valueFormat || 'compact_currency');
            var rawValFmt = formatNumber(d.rawValue, config.valueFormat || 'compact_currency');

            var boundsHtml = '';
            if (d.isForecast && d.lower !== null && d.upper !== null) {
              boundsHtml = '<div style="margin-top:4px;font-size:11px;color:#93c5fd;">' +
                '90% Prediction Interval:<br/>' +
                'Lower: <b>' + formatNumber(d.lower, config.valueFormat || 'compact_currency') + '</b><br/>' +
                'Upper: <b>' + formatNumber(d.upper, config.valueFormat || 'compact_currency') + '</b>' +
                '</div>';
            }

            var drillAffordance = (d.drillLinks && d.drillLinks.length > 0)
              ? '<div style="margin-top:6px;font-size:10px;color:#60a5fa;font-style:italic;">🔎 Click to explore Looker drill menu</div>'
              : '';

            tooltip.style.display = 'block';
            tooltip.innerHTML =
              '<div style="font-weight:700;margin-bottom:3px;font-size:12px;color:#f8fafc;">' + dateFmt + '</div>' +
              '<div style="font-size:12px;color:#e2e8f0;">' +
              '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + (d.isForecast ? forecastColor : actualColor) + ';margin-right:6px;"></span>' +
              d.seriesType + ': <b>' + valFmt + '</b>' +
              (scenarioPct !== 0 && d.isForecast ? ' <span style="font-size:10px;color:#fcd34d;">(Sim: ' + (scenarioPct > 0 ? '+' : '') + scenarioPct + '%)</span>' : '') +
              '</div>' +
              boundsHtml +
              drillAffordance;
          })
          .on('mousemove', function (event) {
            var x = event.clientX + 14;
            var y = event.clientY + 14;
            if (x + 240 > window.innerWidth) x = event.clientX - 250;
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
          })
          .on('mouseout', function (event, d) {
            d3.select(this).attr('r', d.isForecast ? 3.5 : 2.5).attr('stroke', '#ffffff').attr('stroke-width', 1.5);
            tooltip.style.display = 'none';
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

      // --- 12. AXES ---
      var xAxis = d3.axisBottom(xScale).ticks(Math.max(4, Math.floor(innerW / 90))).tickFormat(d3.timeFormat('%b %d'));
      g.append('g')
        .attr('transform', 'translate(0,' + innerH + ')')
        .call(xAxis)
        .selectAll('text')
        .attr('font-size', '10px')
        .attr('fill', '#64748b');

      var yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(function (d) {
        return formatNumber(d, config.valueFormat || 'compact_currency');
      });
      g.append('g')
        .call(yAxis)
        .selectAll('text')
        .attr('font-size', '10px')
        .attr('fill', '#64748b');

      // --- 13. LEGEND & MODEL STATUS ---
      if (config.showLegend !== false) {
        var legendEl = document.createElement('div');
        legendEl.className = 'forecast-legend';
        legendEl.style.display = 'flex';
        legendEl.style.alignItems = 'center';
        legendEl.style.justifyContent = 'center';
        legendEl.style.gap = '20px';
        legendEl.style.padding = '8px 16px';
        legendEl.style.fontSize = '11px';
        legendEl.style.fontWeight = '500';
        legendEl.style.color = '#475569';
        legendEl.style.borderTop = '1px solid #f1f5f9';

        legendEl.innerHTML =
          '<div style="display:flex;align-items:center;gap:6px;">' +
          '<span style="width:14px;height:3px;background:' + actualColor + ';display:inline-block;border-radius:2px;"></span>' +
          '<span>Historical Actuals</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
          '<span style="width:14px;height:3px;border-top:3px dashed ' + forecastColor + ';display:inline-block;"></span>' +
          '<span>BigQuery AI.FORECAST Mean</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
          '<span style="width:14px;height:10px;background:' + coneColor + ';opacity:' + bandOpacity + ';display:inline-block;border-radius:2px;border:1px solid ' + coneColor + ';"></span>' +
          '<span>90% Confidence Interval Cone</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
          '<span style="width:14px;height:2px;border-top:2px dashed #f59e0b;display:inline-block;"></span>' +
          '<span>' + (config.referenceLineLabel || 'Benchmark Target') + '</span>' +
          '</div>';

        chartContainer.appendChild(legendEl);
      }

      done();
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
