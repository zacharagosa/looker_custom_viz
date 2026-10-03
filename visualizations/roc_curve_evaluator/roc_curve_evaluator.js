/**
 * ROC / Precision-Recall & Confusion Matrix Classifier Evaluator - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Designed for evaluating machine learning classification models (fraud detection, churn prediction,
 * risk scoring, customer propensity) output by BigQuery ML (ML.ROC_CURVE, ML.CONFUSION_MATRIX).
 *
 * Key Capabilities:
 * - Multi-Modal Layout: Dual View (Side-by-Side ROC & PR), ROC Curve (TPR vs FPR),
 *   Precision-Recall Curve, and Multi-Metric Threshold Tradeoff Curves (F1, Accuracy, Precision, Recall vs Threshold).
 * - Interactive Decision Threshold Slider with preset operating points (Youden's Index J, Max F1, High Precision, High Recall).
 * - Live 2x2 Confusion Matrix (TP, FP, TN, FN) updating in real-time as threshold scrubs.
 * - Dynamic Area Under Curve (AUROC & AUPRC) calculation via numerical integration.
 * - Business Cost / Financial Opportunity Impact model (Cost per False Positive vs Cost per False Negative).
 * - Executive KPI Scorecard HUD with discrimination ratings and optimal operating markers.
 * - Enterprise Brand Palettes (Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Sunset Media, Wellverse Healthcare, Custom Hex).
 * - Debounced ResizeObserver (<4px guard), responsive SVG scaling, and Looker drill-down menu support.
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
    google_enterprise: {
      name: 'Google Enterprise',
      curvePrimary: '#1a73e8', // Google Blue
      curveSecondary: '#ea4335', // Google Red
      f1Color: '#34a853', // Google Green
      accColor: '#fbbc04', // Google Yellow
      tpColor: '#137333', // Dark Green
      fpColor: '#c5221f', // Dark Red
      tnColor: '#1a73e8', // Blue
      fnColor: '#ea8600', // Amber
      matrixBg: '#f8f9fa',
      matrixBorder: '#dadce0',
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      grid: '#f1f3f4',
      hudBg: '#ffffff',
      hudBorder: '#e8eaed',
      baseline: '#9aa0a6'
    },
    modern_slate: {
      name: 'Modern Slate',
      curvePrimary: '#0f172a',
      curveSecondary: '#e11d48',
      f1Color: '#10b981',
      accColor: '#6366f1',
      tpColor: '#15803d',
      fpColor: '#be123c',
      tnColor: '#0f172a',
      fnColor: '#d97706',
      matrixBg: '#f8fafc',
      matrixBorder: '#e2e8f0',
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      grid: '#f1f5f9',
      hudBg: '#ffffff',
      hudBorder: '#e2e8f0',
      baseline: '#94a3b8'
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark',
      curvePrimary: '#38bdf8', // Cyan
      curveSecondary: '#f43f5e', // Neon Rose
      f1Color: '#10b981', // Neon Emerald
      accColor: '#a855f7', // Purple
      tpColor: '#6ee7b7',
      fpColor: '#fda4af',
      tnColor: '#38bdf8',
      fnColor: '#fcd34d',
      matrixBg: '#1e293b',
      matrixBorder: '#334155',
      bg: '#0f172a',
      text: '#f8fafc',
      subtext: '#94a3b8',
      grid: '#1e293b',
      hudBg: '#1e293b',
      hudBorder: '#334155',
      baseline: '#475569'
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      curvePrimary: '#047857',
      curveSecondary: '#b91c1c',
      f1Color: '#059669',
      accColor: '#0284c7',
      tpColor: '#065f46',
      fpColor: '#991b1b',
      tnColor: '#047857',
      fnColor: '#d97706',
      matrixBg: '#f0fdf4',
      matrixBorder: '#a7f3d0',
      bg: '#ffffff',
      text: '#064e3b',
      subtext: '#047857',
      grid: '#ecfdf5',
      hudBg: '#f0fdf4',
      hudBorder: '#a7f3d0',
      baseline: '#6ee7b7'
    },
    sunset_media: {
      name: 'Sunset Media',
      curvePrimary: '#c2410c',
      curveSecondary: '#991b1b',
      f1Color: '#059669',
      accColor: '#d97706',
      tpColor: '#047857',
      fpColor: '#b91c1c',
      tnColor: '#c2410c',
      fnColor: '#ea580c',
      matrixBg: '#fff7ed',
      matrixBorder: '#fed7aa',
      bg: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      grid: '#fff7ed',
      hudBg: '#fff7ed',
      hudBorder: '#fed7aa',
      baseline: '#fdba74'
    },
    wellverse_healthcare: {
      name: 'Wellverse Healthcare',
      curvePrimary: '#143359',
      curveSecondary: '#b42318',
      f1Color: '#006b40',
      accColor: '#0284c7',
      tpColor: '#006b40',
      fpColor: '#b42318',
      tnColor: '#143359',
      fnColor: '#b54708',
      matrixBg: '#eef2f7',
      matrixBorder: '#cbd5e1',
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      grid: '#eef2f7',
      hudBg: '#ffffff',
      hudBorder: '#e2e8f0',
      baseline: '#94a3b8'
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

  function formatNumber(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    var absVal = Math.abs(val);
    var sign = val < 0 ? '-' : '';

    if (fmt === 'percentage') {
      return (val * (absVal <= 1.0 ? 100 : 1)).toFixed(1) + '%';
    }
    if (fmt === 'decimal_2') {
      return sign + absVal.toFixed(3);
    }
    if (fmt === 'compact_number') {
      if (absVal >= 1e9) return sign + (absVal / 1e9).toFixed(2) + 'B';
      if (absVal >= 1e6) return sign + (absVal / 1e6).toFixed(2) + 'M';
      if (absVal >= 1e3) return sign + (absVal / 1e3).toFixed(1) + 'K';
      return sign + (absVal >= 10 ? Math.round(absVal).toLocaleString() : absVal.toFixed(1));
    }
    if (fmt === 'compact_currency') {
      if (absVal >= 1e9) return sign + '$' + (absVal / 1e9).toFixed(2) + 'B';
      if (absVal >= 1e6) return sign + '$' + (absVal / 1e6).toFixed(2) + 'M';
      if (absVal >= 1e3) return sign + '$' + (absVal / 1e3).toFixed(1) + 'K';
      return sign + '$' + Math.round(absVal).toLocaleString();
    }
    // Auto default
    if (absVal <= 1.0 && val !== 0) return val.toFixed(3);
    return absVal >= 1000 ? Math.round(absVal).toLocaleString() : absVal.toFixed(1);
  }

  // Calculate Trapezoidal Area Under Curve (AUC)
  function computeAUC(points, xProp, yProp) {
    if (!points || points.length < 2) return 0;
    // Sort by X ascending
    var sorted = points.slice().sort(function (a, b) { return a[xProp] - b[xProp]; });
    var auc = 0;
    for (var i = 1; i < sorted.length; i++) {
      var x0 = sorted[i - 1][xProp];
      var x1 = sorted[i][xProp];
      var y0 = sorted[i - 1][yProp];
      var y1 = sorted[i][yProp];
      var dx = x1 - x0;
      var avgY = (y0 + y1) / 2;
      auc += Math.abs(dx * avgY);
    }
    return Math.min(1.0, Math.max(0.0, auc));
  }

  var visObject = {
    id: 'roc_curve_evaluator',
    label: 'ROC / PR & Confusion Matrix Evaluator',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      curveType: {
        type: 'string',
        label: 'Evaluation View Mode',
        display: 'select',
        values: [
          { 'Dual View: Side-by-Side ROC & PR Curves': 'dual_view' },
          { 'ROC Curve (True Positive Rate vs False Positive Rate)': 'roc' },
          { 'Precision-Recall Curve (Precision vs Recall)': 'pr' },
          { 'Threshold Tradeoff Curves (F1, Accuracy, Prec, Rec vs T)': 'threshold_metrics' }
        ],
        default: 'dual_view',
        section: 'Display',
        order: 1
      },
      thresholdFieldOverride: {
        type: 'string',
        label: 'Decision Threshold Field Index or Name',
        default: '1',
        section: 'Display',
        order: 2
      },
      fprFieldOverride: {
        type: 'string',
        label: 'False Positive Rate (FPR) Field Index or Name',
        default: '2',
        section: 'Display',
        order: 3
      },
      recallFieldOverride: {
        type: 'string',
        label: 'Recall / True Positive Rate (TPR) Field Index or Name',
        default: '3',
        section: 'Display',
        order: 4
      },
      precisionFieldOverride: {
        type: 'string',
        label: 'Precision Field Index or Name',
        default: '4',
        section: 'Display',
        order: 5
      },
      f1FieldOverride: {
        type: 'string',
        label: 'F1 Score Field Index or Name (Optional)',
        default: '5',
        section: 'Display',
        order: 6
      },
      accuracyFieldOverride: {
        type: 'string',
        label: 'Accuracy Field Index or Name (Optional)',
        default: '6',
        section: 'Display',
        order: 7
      },
      tpFieldOverride: {
        type: 'string',
        label: 'True Positives (TP) Count Field Index or Name',
        default: '7',
        section: 'Display',
        order: 8
      },
      fpFieldOverride: {
        type: 'string',
        label: 'False Positives (FP) Count Field Index or Name',
        default: '8',
        section: 'Display',
        order: 9
      },
      tnFieldOverride: {
        type: 'string',
        label: 'True Negatives (TN) Count Field Index or Name',
        default: '9',
        section: 'Display',
        order: 10
      },
      fnFieldOverride: {
        type: 'string',
        label: 'False Negatives (FN) Count Field Index or Name',
        default: '10',
        section: 'Display',
        order: 11
      },
      optimalMarker: {
        type: 'string',
        label: 'Optimal Operating Point Recommendation',
        display: 'select',
        values: [
          { "Youden's Index J (Max Sensitivity + Specificity - 1)": 'youden_j' },
          { 'Maximum F1-Score Operating Point': 'max_f1' },
          { 'None (Manual Slider Only)': 'none' }
        ],
        default: 'youden_j',
        section: 'Display',
        order: 12
      },
      initialThreshold: {
        type: 'number',
        label: 'Initial Decision Threshold (0.00 to 1.00)',
        default: 0.50,
        section: 'Display',
        order: 13
      },
      showConfusionMatrix: {
        type: 'boolean',
        label: 'Show Live 2x2 Confusion Matrix Card',
        default: true,
        section: 'Display',
        order: 14
      },
      showAUCScore: {
        type: 'boolean',
        label: 'Show AUROC & AUPRC in Scorecard HUD',
        default: true,
        section: 'Display',
        order: 15
      },
      showCostModel: {
        type: 'boolean',
        label: 'Enable Financial Impact / Error Cost Calculator',
        default: true,
        section: 'Display',
        order: 16
      },
      costPerFP: {
        type: 'number',
        label: 'Cost per False Positive / False Alarm ($)',
        default: 15,
        section: 'Display',
        order: 17
      },
      costPerFN: {
        type: 'number',
        label: 'Cost per False Negative / Missed Incident ($)',
        default: 350,
        section: 'Display',
        order: 18
      },
      hudMode: {
        type: 'string',
        label: 'Executive Model Scorecard HUD',
        display: 'select',
        values: [
          { 'Full Scorecard HUD (Top Band)': 'scorecard' },
          { 'Compact Metric Strip': 'compact_strip' },
          { 'Hidden': 'hidden' }
        ],
        default: 'scorecard',
        section: 'Display',
        order: 19
      },
      customTitleOverride: {
        type: 'string',
        label: 'Custom Scorecard Title Override',
        default: '',
        section: 'Display',
        order: 20
      },
      showGridLines: {
        type: 'boolean',
        label: 'Show Axis Grid Lines',
        default: true,
        section: 'Display',
        order: 21
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorTheme: {
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
        label: 'Custom ROC Curve Color (Hex)',
        display: 'color',
        default: '',
        section: 'Style',
        order: 2
      },
      customAccentHex: {
        type: 'string',
        label: 'Custom PR Curve Color (Hex)',
        display: 'color',
        default: '',
        section: 'Style',
        order: 3
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
        order: 4
      },
      valueFormat: {
        type: 'string',
        label: 'Number & Probability Formatting',
        display: 'select',
        values: [
          { 'Percentage (89.4%)': 'percentage' },
          { 'Decimal 3dp (0.894)': 'decimal_2' },
          { 'Compact Count (12.4K)': 'compact_number' }
        ],
        default: 'percentage',
        section: 'Style',
        order: 5
      },
      curveStrokeWidth: {
        type: 'number',
        label: 'Curve Stroke Width (px)',
        default: 3,
        section: 'Style',
        order: 6
      },
      enableAreaFill: {
        type: 'boolean',
        label: 'Enable Gradient Fill Under Curves',
        default: true,
        section: 'Style',
        order: 7
      },
      enableAnimation: {
        type: 'boolean',
        label: 'Enable Smooth Entry Transitions',
        default: true,
        section: 'Style',
        order: 8
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
      container.className = 'looker-roc-container';
      container.style.width = '100%';
      container.style.flex = '1 1 auto';
      container.style.minHeight = '0';
      container.style.position = 'relative';
      container.style.overflowX = 'hidden';
      container.style.overflowY = 'auto';
      container.style.boxSizing = 'border-box';
      element.appendChild(container);

      // Tooltip
      var tooltip = document.createElement('div');
      tooltip.className = 'looker-roc-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.display = 'none';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.zIndex = '99999';
      tooltip.style.padding = '10px 14px';
      tooltip.style.borderRadius = '8px';
      tooltip.style.fontSize = '12px';
      tooltip.style.lineHeight = '1.45';
      tooltip.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.25), 0 8px 10px -6px rgba(0,0,0,0.15)';
      tooltip.style.transition = 'opacity 0.12s ease-out, transform 0.12s ease-out';
      tooltip.style.backdropFilter = 'blur(8px)';
      tooltip.style.webkitBackdropFilter = 'blur(8px)';
      document.body.appendChild(tooltip);

      this._tooltip = tooltip;
      this._element = element;
      this._activeThreshold = 0.50;
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

      if (!data || data.length === 0) {
        this.addError({
          title: 'No Data',
          message: 'The query returned no threshold evaluation rows to visualize.'
        });
        done();
        return;
      }

      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
        } catch (err) {
          console.error('ROC Curve Evaluator render error:', err);
          self.addError({
            title: 'Rendering Error',
            message: err.message || 'An error occurred while rendering the ML classifier evaluation.'
          });
        }
        done();
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;
      var container = element.querySelector('.looker-roc-container');
      if (!container) return;
      container.innerHTML = '';

      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var measures = fields.measures || [];
      var allFields = dims.concat(measures);

      // --- 1. FIELD RESOLUTION ---
      var fThreshold = resolveField(allFields, config.thresholdFieldOverride, 0);
      var fFPR = resolveField(allFields, config.fprFieldOverride, 1);
      var fRecall = resolveField(allFields, config.recallFieldOverride, 2);
      var fPrecision = resolveField(allFields, config.precisionFieldOverride, 3);
      var fF1 = resolveField(allFields, config.f1FieldOverride, 4);
      var fAccuracy = resolveField(allFields, config.accuracyFieldOverride, 5);
      var fTP = resolveField(allFields, config.tpFieldOverride, 6);
      var fFP = resolveField(allFields, config.fpFieldOverride, 7);
      var fTN = resolveField(allFields, config.tnFieldOverride, 8);
      var fFN = resolveField(allFields, config.fnFieldOverride, 9);

      // --- 2. THEMES & COLOR RESOLUTION ---
      var themeKey = config.colorTheme || 'google_enterprise';
      var theme = THEMES[themeKey] ? Object.assign({}, THEMES[themeKey]) : Object.assign({}, THEMES.google_enterprise);

      if (themeKey === 'custom' || config.customPrimaryHex || config.customAccentHex) {
        if (config.customPrimaryHex) theme.curvePrimary = config.customPrimaryHex;
        if (config.customAccentHex) theme.curveSecondary = config.customAccentHex;
      }

      element.style.backgroundColor = theme.bg;
      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      // Font Scale
      var fontScale = config.fontScale || 'standard';
      var fontScaleMap = {
        compact: { title: '13px', subtitle: '11px', statNum: '13px', statLbl: '9px', matrixNum: '13px' },
        standard: { title: '15px', subtitle: '12px', statNum: '15px', statLbl: '10px', matrixNum: '15px' },
        large: { title: '18px', subtitle: '13px', statNum: '18px', statLbl: '11px', matrixNum: '18px' }
      };
      var fSizes = fontScaleMap[fontScale] || fontScaleMap.standard;

      // --- 3. PARSE POINTS & METRICS ---
      var rawPoints = [];
      data.forEach(function (row, idx) {
        var t = fThreshold && row[fThreshold.name] ? Number(row[fThreshold.name].value) : (idx / (data.length - 1));
        var fpr = fFPR && row[fFPR.name] ? Number(row[fFPR.name].value) : 0;
        var rec = fRecall && row[fRecall.name] ? Number(row[fRecall.name].value) : 0;
        var prec = fPrecision && row[fPrecision.name] ? Number(row[fPrecision.name].value) : 0;
        var f1 = fF1 && row[fF1.name] ? Number(row[fF1.name].value) : (rec + prec > 0 ? (2 * prec * rec) / (prec + rec) : 0);
        var acc = fAccuracy && row[fAccuracy.name] ? Number(row[fAccuracy.name].value) : 0;
        var tp = fTP && row[fTP.name] ? Number(row[fTP.name].value) : 0;
        var fp = fFP && row[fFP.name] ? Number(row[fFP.name].value) : 0;
        var tn = fTN && row[fTN.name] ? Number(row[fTN.name].value) : 0;
        var fn = fFN && row[fFN.name] ? Number(row[fFN.name].value) : 0;

        var youdenJ = rec - fpr;

        var drillLinks = (fRecall && row[fRecall.name] && row[fRecall.name].links) ||
          (fThreshold && row[fThreshold.name] && row[fThreshold.name].links) || [];

        rawPoints.push({
          idx: idx,
          threshold: t,
          fpr: Math.min(1.0, Math.max(0.0, fpr)),
          recall: Math.min(1.0, Math.max(0.0, rec)),
          precision: Math.min(1.0, Math.max(0.0, prec)),
          f1: Math.min(1.0, Math.max(0.0, f1)),
          accuracy: Math.min(1.0, Math.max(0.0, acc)),
          tp: tp,
          fp: fp,
          tn: tn,
          fn: fn,
          youdenJ: youdenJ,
          links: drillLinks
        });
      });

      if (rawPoints.length === 0) return;

      // Sort points by threshold ascending
      rawPoints.sort(function (a, b) { return a.threshold - b.threshold; });

      // Compute Global AUROC & AUPRC
      var auroc = computeAUC(rawPoints, 'fpr', 'recall');
      var auprc = computeAUC(rawPoints, 'recall', 'precision');

      // Find optimal points
      var optimalYouden = rawPoints.slice().sort(function (a, b) { return b.youdenJ - a.youdenJ; })[0];
      var optimalF1 = rawPoints.slice().sort(function (a, b) { return b.f1 - a.f1; })[0];

      // Set or restore active threshold
      if (self._activeThreshold === undefined || self._activeThreshold === null) {
        self._activeThreshold = Number(config.initialThreshold) || 0.50;
      }
      var targetT = self._activeThreshold;

      // Find closest point to active threshold
      function getClosestPoint(valT) {
        var closest = rawPoints[0];
        var minDiff = Math.abs(closest.threshold - valT);
        for (var i = 1; i < rawPoints.length; i++) {
          var diff = Math.abs(rawPoints[i].threshold - valT);
          if (diff < minDiff) {
            minDiff = diff;
            closest = rawPoints[i];
          }
        }
        return closest;
      }

      var activePoint = getClosestPoint(targetT);

      // Discrimination Quality Rating
      var aurocRating = 'Acceptable (0.7-0.8)';
      if (auroc >= 0.90) aurocRating = 'Outstanding (≥0.90)';
      else if (auroc >= 0.80) aurocRating = 'Excellent (0.80-0.90)';
      else if (auroc < 0.60) aurocRating = 'Poor / No Discrimination (<0.60)';

      // --- 4. EXECUTIVE SCORECARD HUD ---
      var hudMode = config.hudMode || 'scorecard';
      if (hudMode !== 'hidden') {
        var hud = document.createElement('div');
        hud.className = 'roc-header-hud';
        hud.style.display = 'flex';
        hud.style.flexWrap = 'wrap';
        hud.style.alignItems = 'center';
        hud.style.justifyContent = 'space-between';
        hud.style.gap = '12px';
        hud.style.padding = hudMode === 'compact_strip' ? '6px 16px' : '12px 18px';
        hud.style.borderBottom = '1px solid ' + theme.grid;
        hud.style.backgroundColor = theme.hudBg;

        var titleBox = document.createElement('div');
        var mainTitle = document.createElement('div');
        mainTitle.style.fontSize = fSizes.title;
        mainTitle.style.fontWeight = '700';
        mainTitle.style.color = theme.text;
        mainTitle.textContent = config.customTitleOverride || 'Machine Learning Classifier Evaluator — ROC & Precision-Recall Suite';

        var subTitle = document.createElement('div');
        subTitle.style.fontSize = fSizes.subtitle;
        subTitle.style.color = theme.subtext;
        subTitle.style.marginTop = '2px';
        subTitle.textContent = 'AUROC: ' + auroc.toFixed(3) + ' (' + aurocRating + ') • AUPRC: ' + auprc.toFixed(3) + ' • Operating Threshold T: ' + activePoint.threshold.toFixed(2);

        titleBox.appendChild(mainTitle);
        titleBox.appendChild(subTitle);
        hud.appendChild(titleBox);

        // Metric Scorecard Pills
        var statCards = document.createElement('div');
        statCards.style.display = 'flex';
        statCards.style.gap = '8px';
        statCards.style.flexWrap = 'wrap';

        function makeHudCard(label, val, col, sub) {
          var card = document.createElement('div');
          card.style.background = themeKey === 'cyberpunk_dark' ? '#1e293b' : '#ffffff';
          card.style.border = '1px solid ' + (themeKey === 'cyberpunk_dark' ? '#334155' : theme.matrixBorder);
          card.style.borderRadius = '6px';
          card.style.padding = hudMode === 'compact_strip' ? '4px 8px' : '6px 12px';
          card.style.display = 'flex';
          card.style.flexDirection = 'column';

          var l = document.createElement('span');
          l.style.fontSize = fSizes.statLbl;
          l.style.textTransform = 'uppercase';
          l.style.letterSpacing = '0.05em';
          l.style.color = theme.subtext;
          l.textContent = label;

          var v = document.createElement('span');
          v.style.fontSize = fSizes.statNum;
          v.style.fontWeight = '700';
          v.style.color = col || theme.text;
          v.textContent = val;

          card.appendChild(l);
          card.appendChild(v);
          if (sub) {
            var s = document.createElement('span');
            s.style.fontSize = '9.5px';
            s.style.color = theme.subtext;
            s.textContent = sub;
            card.appendChild(s);
          }
          return card;
        }

        if (config.showAUCScore !== false) {
          statCards.appendChild(makeHudCard('AUROC', auroc.toFixed(3), theme.curvePrimary, aurocRating));
          statCards.appendChild(makeHudCard('AUPRC', auprc.toFixed(3), theme.curveSecondary, 'Avg Precision'));
        }
        statCards.appendChild(makeHudCard('F1 Score', (activePoint.f1 * 100).toFixed(1) + '%', theme.f1Color, 'Balance'));
        statCards.appendChild(makeHudCard('Precision (PPV)', (activePoint.precision * 100).toFixed(1) + '%', theme.curveSecondary, 'True Alarm Rate'));
        statCards.appendChild(makeHudCard('Recall (TPR)', (activePoint.recall * 100).toFixed(1) + '%', theme.curvePrimary, 'Incident Capture'));
        statCards.appendChild(makeHudCard('Accuracy', (activePoint.accuracy * 100).toFixed(1) + '%', theme.accColor, 'Overall Correct'));

        hud.appendChild(statCards);
        container.appendChild(hud);
      }

      // --- 5. INTERACTIVE THRESHOLD SLIDER & OPERATING PRESETS ---
      var controlBar = document.createElement('div');
      controlBar.style.padding = '10px 18px';
      controlBar.style.backgroundColor = themeKey === 'cyberpunk_dark' ? '#1e293b' : '#f8fafc';
      controlBar.style.borderBottom = '1px solid ' + theme.grid;
      controlBar.style.display = 'flex';
      controlBar.style.flexWrap = 'wrap';
      controlBar.style.alignItems = 'center';
      controlBar.style.justifyContent = 'space-between';
      controlBar.style.gap = '14px';

      // Left: Slider
      var sliderBox = document.createElement('div');
      sliderBox.style.display = 'flex';
      sliderBox.style.alignItems = 'center';
      sliderBox.style.gap = '10px';
      sliderBox.style.fontSize = '12px';

      var sliderLabel = document.createElement('span');
      sliderLabel.style.fontWeight = '600';
      sliderLabel.style.color = theme.text;
      sliderLabel.innerHTML = '⚡ Decision Threshold (<em>T</em>): <strong id="roc-thresh-val" style="color:' + theme.curvePrimary + ';font-size:13px;">' + activePoint.threshold.toFixed(2) + '</strong>';

      var slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '1';
      slider.step = '0.01';
      slider.value = String(activePoint.threshold);
      slider.style.width = '140px';
      slider.style.cursor = 'pointer';

      sliderBox.appendChild(sliderLabel);
      sliderBox.appendChild(slider);

      // Right: Presets
      var presetsBox = document.createElement('div');
      presetsBox.style.display = 'flex';
      presetsBox.style.alignItems = 'center';
      presetsBox.style.gap = '6px';
      presetsBox.style.flexWrap = 'wrap';

      function makePresetBtn(label, targetVal, titleText) {
        var btn = document.createElement('button');
        btn.textContent = label;
        btn.title = titleText;
        btn.style.fontSize = '11px';
        btn.style.fontWeight = '600';
        btn.style.padding = '4px 10px';
        btn.style.borderRadius = '5px';
        btn.style.border = '1px solid ' + (themeKey === 'cyberpunk_dark' ? '#475569' : '#cbd5e1');
        btn.style.background = themeKey === 'cyberpunk_dark' ? '#334155' : '#ffffff';
        btn.style.color = theme.text;
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.15s ease';

        btn.addEventListener('mouseenter', function () {
          btn.style.background = theme.curvePrimary;
          btn.style.color = '#ffffff';
        });
        btn.addEventListener('mouseleave', function () {
          btn.style.background = themeKey === 'cyberpunk_dark' ? '#334155' : '#ffffff';
          btn.style.color = theme.text;
        });

        btn.addEventListener('click', function () {
          self._activeThreshold = targetVal;
          slider.value = String(targetVal);
          updateThresholdState(targetVal);
        });
        return btn;
      }

      if (optimalYouden) {
        presetsBox.appendChild(makePresetBtn("⚖️ Youden's J (" + optimalYouden.threshold.toFixed(2) + ")", optimalYouden.threshold, "Optimal Youden's J statistic maximizing sensitivity and specificity"));
      }
      if (optimalF1) {
        presetsBox.appendChild(makePresetBtn("🎯 Max F1 (" + optimalF1.threshold.toFixed(2) + ")", optimalF1.threshold, "Threshold maximizing harmonic mean of Precision and Recall"));
      }
      presetsBox.appendChild(makePresetBtn("🛡️ High Precision (0.80)", 0.80, "Aggressive filtering: Minimize False Alarms (Type I error)"));
      presetsBox.appendChild(makePresetBtn("⚡ High Recall (0.20)", 0.20, "Sensitive trigger: Maximize Incident Capture (Type II error)"));

      controlBar.appendChild(sliderBox);
      controlBar.appendChild(presetsBox);
      container.appendChild(controlBar);

      // --- 6. SPLIT LAYOUT: CURVE CANVAS (LEFT) & CONFUSION MATRIX (RIGHT) ---
      var contentWrapper = document.createElement('div');
      contentWrapper.className = 'roc-content-wrapper';
      contentWrapper.style.display = 'flex';
      contentWrapper.style.flexWrap = 'wrap';
      contentWrapper.style.padding = '14px';
      contentWrapper.style.gap = '16px';
      contentWrapper.style.alignItems = 'flex-start';

      var curveBox = document.createElement('div');
      curveBox.className = 'roc-curve-box';
      curveBox.style.flex = config.showConfusionMatrix !== false ? '1 1 540px' : '1 1 100%';
      curveBox.style.minWidth = '320px';

      var matrixBox = document.createElement('div');
      matrixBox.className = 'roc-matrix-box';
      matrixBox.style.flex = '0 0 280px';
      matrixBox.style.minWidth = '260px';

      contentWrapper.appendChild(curveBox);
      if (config.showConfusionMatrix !== false) {
        contentWrapper.appendChild(matrixBox);
      }
      container.appendChild(contentWrapper);

      // --- 7. D3 SVG CURVES ---
      var viewMode = config.curveType || 'dual_view';
      var svgW = curveBox.clientWidth || 540;
      var svgH = viewMode === 'dual_view' ? 440 : 360;

      var svg = d3.select(curveBox)
        .append('svg')
        .attr('width', '100%')
        .attr('height', svgH)
        .attr('viewBox', '0 0 ' + svgW + ' ' + svgH)
        .style('display', 'block')
        .style('overflow', 'visible');

      var defs = svg.append('defs');

      // Gradients
      if (config.enableAreaFill !== false) {
        var gradROC = defs.append('linearGradient')
          .attr('id', 'roc-grad')
          .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
        gradROC.append('stop').attr('offset', '0%').attr('stop-color', theme.curvePrimary).attr('stop-opacity', 0.25);
        gradROC.append('stop').attr('offset', '100%').attr('stop-color', theme.curvePrimary).attr('stop-opacity', 0.02);

        var gradPR = defs.append('linearGradient')
          .attr('id', 'pr-grad')
          .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
        gradPR.append('stop').attr('offset', '0%').attr('stop-color', theme.curveSecondary).attr('stop-opacity', 0.25);
        gradPR.append('stop').attr('offset', '100%').attr('stop-color', theme.curveSecondary).attr('stop-opacity', 0.02);
      }

      // Drawing function based on viewMode
      var activeMarkerDots = [];

      if (viewMode === 'dual_view') {
        // Dual view: side-by-side or stacked
        var isWide = svgW >= 640;
        var pW = isWide ? (svgW / 2) - 24 : svgW - 40;
        var pH = isWide ? svgH - 60 : (svgH / 2) - 50;

        // Subplot 1: ROC Curve
        var gROC = svg.append('g').attr('transform', 'translate(45, 30)');
        drawROCSubplot(gROC, pW, pH, rawPoints, 'ROC Curve (AUROC: ' + auroc.toFixed(3) + ')');

        // Subplot 2: PR Curve
        var xOffset = isWide ? (svgW / 2) + 25 : 45;
        var yOffset = isWide ? 30 : (svgH / 2) + 15;
        var gPR = svg.append('g').attr('transform', 'translate(' + xOffset + ', ' + yOffset + ')');
        drawPRSubplot(gPR, pW, pH, rawPoints, 'Precision-Recall (AUPRC: ' + auprc.toFixed(3) + ')');
      } else if (viewMode === 'roc') {
        var gSingleROC = svg.append('g').attr('transform', 'translate(50, 35)');
        drawROCSubplot(gSingleROC, svgW - 75, svgH - 75, rawPoints, 'Receiver Operating Characteristic (AUROC: ' + auroc.toFixed(3) + ')');
      } else if (viewMode === 'pr') {
        var gSinglePR = svg.append('g').attr('transform', 'translate(50, 35)');
        drawPRSubplot(gSinglePR, svgW - 75, svgH - 75, rawPoints, 'Precision-Recall Curve (AUPRC: ' + auprc.toFixed(3) + ')');
      } else if (viewMode === 'threshold_metrics') {
        var gMetrics = svg.append('g').attr('transform', 'translate(50, 35)');
        drawThresholdTradeoffSubplot(gMetrics, svgW - 75, svgH - 75, rawPoints);
      }

      function drawROCSubplot(g, width, height, points, title) {
        var x = d3.scaleLinear().domain([0, 1]).range([0, width]);
        var y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

        // Title
        g.append('text')
          .attr('x', width / 2).attr('y', -12)
          .attr('text-anchor', 'middle')
          .attr('fill', theme.text).attr('font-size', '12px').attr('font-weight', '700')
          .text(title);

        // Grid lines
        if (config.showGridLines !== false) {
          x.ticks(5).forEach(function (t) {
            g.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', 0).attr('y2', height)
              .attr('stroke', theme.grid).attr('stroke-dasharray', '2 2');
          });
          y.ticks(5).forEach(function (t) {
            g.append('line').attr('x1', 0).attr('x2', width).attr('y1', y(t)).attr('y2', y(t))
              .attr('stroke', theme.grid).attr('stroke-dasharray', '2 2');
          });
        }

        // Axes
        var xAxis = d3.axisBottom(x).ticks(5).tickFormat(function (d) { return d.toFixed(1); });
        var yAxis = d3.axisLeft(y).ticks(5).tickFormat(function (d) { return d.toFixed(1); });
        g.append('g').attr('transform', 'translate(0,' + height + ')').call(xAxis).attr('color', theme.subtext);
        g.append('g').call(yAxis).attr('color', theme.subtext);

        // Axis labels
        g.append('text')
          .attr('x', width / 2).attr('y', height + 30)
          .attr('text-anchor', 'middle').attr('fill', theme.subtext).attr('font-size', '10.5px')
          .text('False Positive Rate (1 - Specificity)');

        g.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', -height / 2).attr('y', -32)
          .attr('text-anchor', 'middle').attr('fill', theme.subtext).attr('font-size', '10.5px')
          .text('True Positive Rate (Recall)');

        // Baseline diagonal (Random chance)
        g.append('line')
          .attr('x1', 0).attr('y1', height).attr('x2', width).attr('y2', 0)
          .attr('stroke', theme.baseline).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 4');

        // Curve Area
        if (config.enableAreaFill !== false) {
          var area = d3.area()
            .x(function (d) { return x(d.fpr); })
            .y0(height)
            .y1(function (d) { return y(d.recall); })
            .curve(d3.curveMonotoneX);

          g.append('path')
            .datum(points)
            .attr('fill', 'url(#roc-grad)')
            .attr('d', area);
        }

        // Line
        var line = d3.line()
          .x(function (d) { return x(d.fpr); })
          .y(function (d) { return y(d.recall); })
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(points)
          .attr('fill', 'none')
          .attr('stroke', theme.curvePrimary)
          .attr('stroke-width', Number(config.curveStrokeWidth) || 3)
          .attr('d', line);

        // Optimal marker if requested
        if (config.optimalMarker === 'youden_j' && optimalYouden) {
          g.append('circle')
            .attr('cx', x(optimalYouden.fpr))
            .attr('cy', y(optimalYouden.recall))
            .attr('r', 5)
            .attr('fill', theme.f1Color)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2);

          g.append('text')
            .attr('x', x(optimalYouden.fpr) + 8)
            .attr('y', y(optimalYouden.recall) - 6)
            .attr('fill', theme.f1Color)
            .attr('font-size', '10px')
            .attr('font-weight', '700')
            .text("Youden's J (" + optimalYouden.threshold.toFixed(2) + ')');
        }

        // Active Operating Threshold Marker Dot
        var activeDot = g.append('circle')
          .attr('class', 'roc-active-marker-dot')
          .attr('cx', x(activePoint.fpr))
          .attr('cy', y(activePoint.recall))
          .attr('r', 7)
          .attr('fill', theme.curvePrimary)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2.5)
          .style('filter', 'drop-shadow(0 2px 5px rgba(0,0,0,0.3))');

        activeMarkerDots.push({
          element: activeDot,
          xScale: x,
          yScale: y,
          xProp: 'fpr',
          yProp: 'recall'
        });
      }

      function drawPRSubplot(g, width, height, points, title) {
        var x = d3.scaleLinear().domain([0, 1]).range([0, width]);
        var y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

        // Title
        g.append('text')
          .attr('x', width / 2).attr('y', -12)
          .attr('text-anchor', 'middle')
          .attr('fill', theme.text).attr('font-size', '12px').attr('font-weight', '700')
          .text(title);

        // Grid lines
        if (config.showGridLines !== false) {
          x.ticks(5).forEach(function (t) {
            g.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', 0).attr('y2', height)
              .attr('stroke', theme.grid).attr('stroke-dasharray', '2 2');
          });
          y.ticks(5).forEach(function (t) {
            g.append('line').attr('x1', 0).attr('x2', width).attr('y1', y(t)).attr('y2', y(t))
              .attr('stroke', theme.grid).attr('stroke-dasharray', '2 2');
          });
        }

        // Axes
        var xAxis = d3.axisBottom(x).ticks(5).tickFormat(function (d) { return d.toFixed(1); });
        var yAxis = d3.axisLeft(y).ticks(5).tickFormat(function (d) { return d.toFixed(1); });
        g.append('g').attr('transform', 'translate(0,' + height + ')').call(xAxis).attr('color', theme.subtext);
        g.append('g').call(yAxis).attr('color', theme.subtext);

        // Axis labels
        g.append('text')
          .attr('x', width / 2).attr('y', height + 30)
          .attr('text-anchor', 'middle').attr('fill', theme.subtext).attr('font-size', '10.5px')
          .text('Recall (TPR)');

        g.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', -height / 2).attr('y', -32)
          .attr('text-anchor', 'middle').attr('fill', theme.subtext).attr('font-size', '10.5px')
          .text('Precision (PPV)');

        // Prevalence baseline
        var basePrev = points[0] ? (points[0].tp / ((points[0].tp + points[0].tn + points[0].fp + points[0].fn) || 1)) : 0.05;
        g.append('line')
          .attr('x1', 0).attr('y1', y(basePrev)).attr('x2', width).attr('y2', y(basePrev))
          .attr('stroke', theme.baseline).attr('stroke-width', 1).attr('stroke-dasharray', '3 3');

        // Curve Area
        if (config.enableAreaFill !== false) {
          var area = d3.area()
            .x(function (d) { return x(d.recall); })
            .y0(height)
            .y1(function (d) { return y(d.precision); })
            .curve(d3.curveMonotoneX);

          g.append('path')
            .datum(points)
            .attr('fill', 'url(#pr-grad)')
            .attr('d', area);
        }

        // Line
        var line = d3.line()
          .x(function (d) { return x(d.recall); })
          .y(function (d) { return y(d.precision); })
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(points)
          .attr('fill', 'none')
          .attr('stroke', theme.curveSecondary)
          .attr('stroke-width', Number(config.curveStrokeWidth) || 3)
          .attr('d', line);

        // Optimal marker
        if (config.optimalMarker === 'max_f1' && optimalF1) {
          g.append('circle')
            .attr('cx', x(optimalF1.recall))
            .attr('cy', y(optimalF1.precision))
            .attr('r', 5)
            .attr('fill', theme.f1Color)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2);

          g.append('text')
            .attr('x', x(optimalF1.recall) + 8)
            .attr('y', y(optimalF1.precision) - 6)
            .attr('fill', theme.f1Color)
            .attr('font-size', '10px')
            .attr('font-weight', '700')
            .text('Max F1 (' + optimalF1.threshold.toFixed(2) + ')');
        }

        // Active Operating Threshold Marker Dot
        var activeDot = g.append('circle')
          .attr('class', 'pr-active-marker-dot')
          .attr('cx', x(activePoint.recall))
          .attr('cy', y(activePoint.precision))
          .attr('r', 7)
          .attr('fill', theme.curveSecondary)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2.5)
          .style('filter', 'drop-shadow(0 2px 5px rgba(0,0,0,0.3))');

        activeMarkerDots.push({
          element: activeDot,
          xScale: x,
          yScale: y,
          xProp: 'recall',
          yProp: 'precision'
        });
      }

      function drawThresholdTradeoffSubplot(g, width, height, points) {
        var x = d3.scaleLinear().domain([0, 1]).range([0, width]);
        var y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

        // Title
        g.append('text')
          .attr('x', width / 2).attr('y', -12)
          .attr('text-anchor', 'middle')
          .attr('fill', theme.text).attr('font-size', '12px').attr('font-weight', '700')
          .text('Classification Metric Tradeoffs vs Decision Threshold (T)');

        // Axes
        var xAxis = d3.axisBottom(x).ticks(10).tickFormat(function (d) { return d.toFixed(1); });
        var yAxis = d3.axisLeft(y).ticks(5).tickFormat(function (d) { return (d * 100).toFixed(0) + '%'; });
        g.append('g').attr('transform', 'translate(0,' + height + ')').call(xAxis).attr('color', theme.subtext);
        g.append('g').call(yAxis).attr('color', theme.subtext);

        // Lines
        var metrics = [
          { name: 'F1 Score', prop: 'f1', color: theme.f1Color },
          { name: 'Recall', prop: 'recall', color: theme.curvePrimary },
          { name: 'Precision', prop: 'precision', color: theme.curveSecondary },
          { name: 'Accuracy', prop: 'accuracy', color: theme.accColor }
        ];

        metrics.forEach(function (m) {
          var l = d3.line()
            .x(function (d) { return x(d.threshold); })
            .y(function (d) { return y(d[m.prop]); })
            .curve(d3.curveMonotoneX);

          g.append('path')
            .datum(points)
            .attr('fill', 'none')
            .attr('stroke', m.color)
            .attr('stroke-width', 2.5)
            .attr('d', l);
        });

        // Threshold vertical reference line
        var refLine = g.append('line')
          .attr('class', 'tradeoff-thresh-line')
          .attr('x1', x(activePoint.threshold))
          .attr('x2', x(activePoint.threshold))
          .attr('y1', 0)
          .attr('y2', height)
          .attr('stroke', theme.text)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4 4');

        activeMarkerDots.push({
          refLine: refLine,
          xScale: x
        });
      }

      // --- 8. LIVE 2x2 CONFUSION MATRIX CARD ---
      function renderConfusionMatrix(pt) {
        matrixBox.innerHTML = '';

        var totalPop = (pt.tp + pt.fp + pt.tn + pt.fn) || 1;
        var tpPct = (pt.tp / totalPop) * 100;
        var fpPct = (pt.fp / totalPop) * 100;
        var tnPct = (pt.tn / totalPop) * 100;
        var fnPct = (pt.fn / totalPop) * 100;

        var card = document.createElement('div');
        card.style.background = themeKey === 'cyberpunk_dark' ? '#1e293b' : '#ffffff';
        card.style.border = '1px solid ' + (themeKey === 'cyberpunk_dark' ? '#334155' : theme.matrixBorder);
        card.style.borderRadius = '8px';
        card.style.padding = '14px';
        card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';

        var mHeader = document.createElement('div');
        mHeader.style.display = 'flex';
        mHeader.style.justifyContent = 'space-between';
        mHeader.style.alignItems = 'center';
        mHeader.style.marginBottom = '10px';

        mHeader.innerHTML = '' +
          '<div>' +
          '  <div style="font-weight:700;font-size:13px;color:' + theme.text + ';">2x2 Confusion Matrix</div>' +
          '  <div style="font-size:11px;color:' + theme.subtext + ';">At Threshold T = ' + pt.threshold.toFixed(2) + '</div>' +
          '</div>' +
          '<div style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;background:' + (themeKey === 'cyberpunk_dark' ? '#334155' : '#f1f5f9') + ';color:' + theme.text + ';">' +
          '  N = ' + formatNumber(totalPop, 'compact_number') +
          '</div>';

        card.appendChild(mHeader);

        // 2x2 Grid
        var grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '1fr 1fr';
        grid.style.gap = '8px';
        grid.style.marginBottom = '12px';

        function makeMatrixCell(title, count, pct, subtitle, bgCol, textCol) {
          var cell = document.createElement('div');
          cell.style.padding = '10px';
          cell.style.borderRadius = '6px';
          cell.style.backgroundColor = bgCol;
          cell.style.border = '1px solid rgba(0,0,0,0.06)';
          cell.style.display = 'flex';
          cell.style.flexDirection = 'column';

          cell.innerHTML = '' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '  <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:' + textCol + ';">' + title + '</span>' +
            '  <span style="font-size:10px;font-weight:600;color:' + textCol + ';">' + pct.toFixed(1) + '%</span>' +
            '</div>' +
            '<div style="font-size:' + fSizes.matrixNum + ';font-weight:700;color:' + textCol + ';margin:4px 0 2px 0;">' + formatNumber(count, 'compact_number') + '</div>' +
            '<div style="font-size:9.5px;color:' + theme.subtext + ';">' + subtitle + '</div>';
          return cell;
        }

        // TP (Top Left)
        grid.appendChild(makeMatrixCell('True Positive (TP)', pt.tp, tpPct, 'Caught Incidents', themeKey === 'cyberpunk_dark' ? '#064e3b' : '#dcfce7', themeKey === 'cyberpunk_dark' ? '#6ee7b7' : '#15803d'));
        // FP (Top Right)
        grid.appendChild(makeMatrixCell('False Positive (FP)', pt.fp, fpPct, 'Type I (False Alarm)', themeKey === 'cyberpunk_dark' ? '#4c0519' : '#fee2e2', themeKey === 'cyberpunk_dark' ? '#fda4af' : '#b91c1c'));
        // FN (Bottom Left)
        grid.appendChild(makeMatrixCell('False Negative (FN)', pt.fn, fnPct, 'Type II (Missed Fraud)', themeKey === 'cyberpunk_dark' ? '#451a03' : '#fef3c7', themeKey === 'cyberpunk_dark' ? '#fcd34d' : '#92400e'));
        // TN (Bottom Right)
        grid.appendChild(makeMatrixCell('True Negative (TN)', pt.tn, tnPct, 'Correct Rejections', themeKey === 'cyberpunk_dark' ? '#1e293b' : '#f1f5f9', themeKey === 'cyberpunk_dark' ? '#94a3b8' : '#334155'));

        card.appendChild(grid);

        // Financial Impact Model
        if (config.showCostModel !== false) {
          var costFP = Number(config.costPerFP) || 15;
          var costFN = Number(config.costPerFN) || 350;
          var totalCost = (pt.fp * costFP) + (pt.fn * costFN);

          var costBox = document.createElement('div');
          costBox.style.padding = '8px 10px';
          costBox.style.borderRadius = '6px';
          costBox.style.backgroundColor = themeKey === 'cyberpunk_dark' ? '#0f172a' : '#f8fafc';
          costBox.style.border = '1px solid ' + (themeKey === 'cyberpunk_dark' ? '#334155' : '#e2e8f0');
          costBox.style.fontSize = '11px';

          costBox.innerHTML = '' +
            '<div style="display:flex;justify-content:space-between;font-weight:600;color:' + theme.text + ';margin-bottom:3px;">' +
            '  <span>Estimated Error Cost:</span>' +
            '  <span style="color:#ef4444;font-weight:700;">' + formatNumber(totalCost, 'compact_currency') + '</span>' +
            '</div>' +
            '<div style="font-size:9.5px;color:' + theme.subtext + ';">' +
            '  FP @ $' + costFP + ' + FN @ $' + costFN + ' per missed event' +
            '</div>';

          card.appendChild(costBox);
        }

        matrixBox.appendChild(card);
      }

      // Initial matrix render
      if (config.showConfusionMatrix !== false) {
        renderConfusionMatrix(activePoint);
      }

      // Update function when threshold changes
      function updateThresholdState(newT) {
        activePoint = getClosestPoint(newT);
        var labelEl = container.querySelector('#roc-thresh-val');
        if (labelEl) labelEl.textContent = activePoint.threshold.toFixed(2);

        // Update markers on curve
        activeMarkerDots.forEach(function (m) {
          if (m.element) {
            m.element
              .attr('cx', m.xScale(activePoint[m.xProp]))
              .attr('cy', m.yScale(activePoint[m.yProp]));
          }
          if (m.refLine) {
            m.refLine
              .attr('x1', m.xScale(activePoint.threshold))
              .attr('x2', m.xScale(activePoint.threshold));
          }
        });

        // Update Matrix
        if (config.showConfusionMatrix !== false) {
          renderConfusionMatrix(activePoint);
        }
      }

      slider.addEventListener('input', function (e) {
        var val = parseFloat(e.target.value);
        self._activeThreshold = val;
        updateThresholdState(val);
      });
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
