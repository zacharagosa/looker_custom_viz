/**
 * Zero-Trust Blast Radius & Attack Surface Exposure Graph - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Implements enterprise cybersecurity zero-trust perimeter & blast radius modeling:
 * - 4 Multi-Modal Layouts:
 *   1. "blast_radius_rings": Concentric lateral impact rings with compromised core, quarantine boundary & containment SLA ring
 *   2. "containment_sankey": Ingress Threat Vector -> Enforcement Action (Block/Deny/Allow) -> Target Zone / Severity flow
 *   3. "exposure_matrix": 2D Threat Category vs Enforcement Action containment heatmap matrix
 *   4. "executive_soc_scorecard": Executive SOC zero-trust posture scorecard & high-risk vector audit table
 * - 5,000+ Row client-side aggregation for high-density firewall & EDR security logs
 * - Strictly minimized 2-tab configuration options: "Display" and "Style"
 * - Full Looker drill-down menu support (LookerCharts.Utils.openDrillMenu)
 * - Executive KPI HUD scorecard, real-time search filter bar, and debounced ResizeObserver (<4px guard)
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === 'function' && typeof window.d3.arc === 'function') {
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
    cyber_dark: {
      name: 'Cyber NOC Dark',
      bg: '#0b0f19',
      cardBg: '#111827',
      border: '#1f2937',
      text: '#f9fafb',
      subtext: '#9ca3af',
      columnHeaderBg: '#1e293b',
      columnHeaderText: '#38bdf8',
      cellNormalBg: '#1f2937',
      cellBorder: '#374151',
      safeColor: '#10b981',
      warningColor: '#f59e0b',
      criticalColor: '#ef4444',
      pulseColor: '#00f0ff',
      ringStroke: '#1f2937',
      hudBg: 'rgba(17, 24, 39, 0.95)',
      hudText: '#f3f4f6'
    },
    google_enterprise: {
      name: 'Google Enterprise / Chronicle',
      bg: '#ffffff',
      cardBg: '#f8fafc',
      border: '#e2e8f0',
      text: '#202124',
      subtext: '#5f6368',
      columnHeaderBg: '#e8f0fe',
      columnHeaderText: '#1a73e8',
      cellNormalBg: '#f8fafd',
      cellBorder: '#cbd5e1',
      safeColor: '#34a853',
      warningColor: '#fbbc04',
      criticalColor: '#ea4335',
      pulseColor: '#4285f4',
      ringStroke: '#e2e8f0',
      hudBg: 'rgba(255, 255, 255, 0.96)',
      hudText: '#202124'
    },
    modern_slate: {
      name: 'Executive Defense Slate',
      bg: '#ffffff',
      cardBg: '#f1f5f9',
      border: '#cbd5e1',
      text: '#1e293b',
      subtext: '#64748b',
      columnHeaderBg: '#334155',
      columnHeaderText: '#f8fafc',
      cellNormalBg: '#f8fafc',
      cellBorder: '#e2e8f0',
      safeColor: '#059669',
      warningColor: '#d97706',
      criticalColor: '#dc2626',
      pulseColor: '#475569',
      ringStroke: '#cbd5e1',
      hudBg: 'rgba(255, 255, 255, 0.96)',
      hudText: '#1e293b'
    },
    emerald_finops: {
      name: 'Emerald SOC Shield',
      bg: '#fcfdfd',
      cardBg: '#f0fdf4',
      border: '#dcfce7',
      text: '#064e3b',
      subtext: '#047857',
      columnHeaderBg: '#ecfdf5',
      columnHeaderText: '#059669',
      cellNormalBg: '#ffffff',
      cellBorder: '#a7f3d0',
      safeColor: '#10b981',
      warningColor: '#f59e0b',
      criticalColor: '#e11d48',
      pulseColor: '#10b981',
      ringStroke: '#d1fae5',
      hudBg: 'rgba(240, 253, 244, 0.96)',
      hudText: '#064e3b'
    },
    sunset_media: {
      name: 'Sunset Threat Crimson',
      bg: '#0f0b14',
      cardBg: '#1a1025',
      border: '#2d1f42',
      text: '#fdf2f8',
      subtext: '#f472b6',
      columnHeaderBg: '#3b1d54',
      columnHeaderText: '#f43f5e',
      cellNormalBg: '#241438',
      cellBorder: '#4a286d',
      safeColor: '#10b981',
      warningColor: '#fb923c',
      criticalColor: '#f43f5e',
      pulseColor: '#ec4899',
      ringStroke: '#3b1d54',
      hudBg: 'rgba(26, 16, 37, 0.96)',
      hudText: '#fdf2f8'
    },
    wellverse_healthcare: {
      name: 'Wellverse Healthcare Cyber',
      bg: '#ffffff',
      cardBg: '#f0fdfa',
      border: '#ccfbf1',
      text: '#134e4a',
      subtext: '#0d9488',
      columnHeaderBg: '#ccfbf1',
      columnHeaderText: '#0f766e',
      cellNormalBg: '#ffffff',
      cellBorder: '#99f6e4',
      safeColor: '#0d9488',
      warningColor: '#f59e0b',
      criticalColor: '#e11d48',
      pulseColor: '#0d9488',
      ringStroke: '#ccfbf1',
      hudBg: 'rgba(240, 253, 250, 0.96)',
      hudText: '#134e4a'
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
      return sign + '$' + abs.toLocaleString();
    }
    if (formatType === 'percentage') {
      return (num * (abs <= 1 ? 100 : 1)).toFixed(1) + '%';
    }
    if (formatType === 'decimal_2') {
      return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (formatType === 'raw') {
      return String(num);
    }
    // compact_num default
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
    return sign + Math.round(abs).toLocaleString();
  }

  var visObject = {
    id: 'zero_trust_blast_radius',
    label: 'Zero-Trust Blast Radius & Attack Surface Exposure Graph',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'Zero-Trust Layout Mode',
        display: 'select',
        values: [
          { 'Concentric Blast Radius Rings (Lateral Spread)': 'blast_radius_rings' },
          { 'Ingress & Containment Flow (Sankey)': 'containment_sankey' },
          { 'Attack Surface Exposure Matrix (Heatmap)': 'exposure_matrix' },
          { 'Executive SOC Zero-Trust Scorecard': 'executive_soc_scorecard' }
        ],
        default: 'blast_radius_rings',
        section: 'Display',
        order: 1
      },
      threatCategoryDimOverride: {
        type: 'string',
        label: 'Threat Category / Vector Dimension',
        display: 'select',
        values: [{ 'Auto (run query to populate choices)': '' }],
        default: '',
        section: 'Display',
        order: 2
      },
      actionDimOverride: {
        type: 'string',
        label: 'Enforcement Action Dimension (Allow/Deny/Drop)',
        display: 'select',
        values: [{ 'Auto (run query to populate choices)': '' }],
        default: '',
        section: 'Display',
        order: 3
      },
      severityDimOverride: {
        type: 'string',
        label: 'Threat Severity Dimension (Optional)',
        display: 'select',
        values: [{ 'Auto / None (run query to populate)': '' }],
        default: '',
        section: 'Display',
        order: 4
      },
      threatCountMeasOverride: {
        type: 'string',
        label: 'Primary Threat Count Measure',
        display: 'select',
        values: [{ 'Auto (run query to populate choices)': '' }],
        default: '',
        section: 'Display',
        order: 5
      },
      blockedCountMeasOverride: {
        type: 'string',
        label: 'Blocked / Contained Threat Count Measure (Optional)',
        display: 'select',
        values: [{ 'Auto / None (run query to populate)': '' }],
        default: '',
        section: 'Display',
        order: 6
      },
      targetMode: {
        type: 'string',
        label: 'Containment Benchmark SLA Mode',
        display: 'select',
        values: [
          { 'Fixed Containment Rate Target (%)': 'fixed_target' },
          { 'Dataset Mean Containment Rate': 'dataset_mean' },
          { 'Top Decile (90% Containment SLA)': 'percentile_p90' },
          { 'None / No Benchmark': 'none' }
        ],
        default: 'fixed_target',
        section: 'Display',
        order: 7
      },
      targetContainmentPct: {
        type: 'number',
        label: 'Fixed Target Containment SLA (%)',
        default: 95,
        section: 'Display',
        order: 8
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Benchmark Reference Ring Label',
        default: 'Target Containment SLA (95%)',
        section: 'Display',
        order: 9
      },
      criticalAlertThreshold: {
        type: 'number',
        label: 'Critical Exposure Alert Threshold (Threats)',
        default: 100,
        section: 'Display',
        order: 10
      },
      sortBy: {
        type: 'string',
        label: 'Sorting & Vector Ordering',
        display: 'select',
        values: [
          { 'Threat Volume Descending': 'threat_desc' },
          { 'Containment Rate Ascending (Highest Risk First)': 'containment_asc' },
          { 'Alphabetical / Vector Name': 'alphabetical' },
          { 'Natural Query Order': 'natural' }
        ],
        default: 'threat_desc',
        section: 'Display',
        order: 11
      },
      topN: {
        type: 'number',
        label: 'Top-N Vectors Displayed (0 = All)',
        default: 12,
        section: 'Display',
        order: 12
      },
      enableOtherRollup: {
        type: 'boolean',
        label: 'Group Remaining into "Other Vectors"',
        default: true,
        section: 'Display',
        order: 13
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Suppress Zero / Clean Vectors',
        default: false,
        section: 'Display',
        order: 14
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
        order: 15
      },
      dataLabels: {
        type: 'string',
        label: 'Data Value Labels & Markers',
        display: 'select',
        values: [
          { 'Show All Node Labels': 'all' },
          { 'Min/Max Peaks & Alerts Only': 'peaks_only' },
          { 'Hidden': 'hidden' }
        ],
        default: 'all',
        section: 'Display',
        order: 16
      },
      showSearch: {
        type: 'boolean',
        label: 'Enable Threat & Asset Search Bar',
        default: true,
        section: 'Display',
        order: 17
      },
      customTitle: {
        type: 'string',
        label: 'Custom Chart Title Override',
        default: '',
        section: 'Display',
        order: 18
      },
      customSubtitle: {
        type: 'string',
        label: 'Custom Chart Subtitle Override',
        default: '',
        section: 'Display',
        order: 19
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorPalette: {
        type: 'string',
        label: 'Color Theme & Brand Palette',
        display: 'select',
        values: [
          { 'Cyber NOC Dark (Default)': 'cyber_dark' },
          { 'Google Enterprise / Chronicle': 'google_enterprise' },
          { 'Executive Defense Slate': 'modern_slate' },
          { 'Emerald SOC Shield': 'emerald_finops' },
          { 'Sunset Threat Crimson': 'sunset_media' },
          { 'Wellverse Healthcare Cyber': 'wellverse_healthcare' },
          { 'Custom Hex Palette Override': 'custom_hex' }
        ],
        default: 'cyber_dark',
        section: 'Style',
        order: 1
      },
      customPrimaryColor: {
        type: 'string',
        label: 'Custom Primary Accent Color',
        display: 'color',
        default: '#38bdf8',
        section: 'Style',
        order: 2
      },
      customPositiveColor: {
        type: 'string',
        label: 'Custom Contained / Blocked Color',
        display: 'color',
        default: '#34a853',
        section: 'Style',
        order: 3
      },
      customNegativeColor: {
        type: 'string',
        label: 'Custom Breach / Exposed Color',
        display: 'color',
        default: '#ea4335',
        section: 'Style',
        order: 4
      },
      metricPolarity: {
        type: 'string',
        label: 'Metric Polarity (Alert Logic)',
        display: 'select',
        values: [
          { 'Lower is Better (Active Threats, Unmitigated Exposure)': 'lower_is_better' },
          { 'Higher is Better (Containment Rate, Policy Coverage)': 'higher_is_better' }
        ],
        default: 'lower_is_better',
        section: 'Style',
        order: 5
      },
      valueFormat: {
        type: 'string',
        label: 'Value Number Format',
        display: 'select',
        values: [
          { 'Compact Numbers (1.2K, 3.4M)': 'compact_num' },
          { 'Financial Impact Currency ($1.2K)': 'compact_currency' },
          { 'Percentage (12.4%)': 'percentage' },
          { 'Decimal (1,234.56)': 'decimal_2' },
          { 'Raw Numbers': 'raw' }
        ],
        default: 'compact_num',
        section: 'Style',
        order: 6
      },
      fontScale: {
        type: 'string',
        label: 'Typography Font Scale',
        display: 'select',
        values: [
          { 'Compact (Dense SOC Wallboard)': 'compact' },
          { 'Standard (Default)': 'standard' },
          { 'Large Presentation': 'large' }
        ],
        default: 'standard',
        section: 'Style',
        order: 7
      }
    },

    // ------------------------------------------------------------------
    // Dynamic Field-Role Dropdowns
    // ------------------------------------------------------------------
    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        threatCategoryDimOverride: { role: 'dimension', defaultIdx: 0 },
        actionDimOverride: { role: 'dimension', defaultIdx: 1 },
        severityDimOverride: { role: 'dimension', defaultIdx: 2 },
        threatCountMeasOverride: { role: 'measure', defaultIdx: 0 },
        blockedCountMeasOverride: { role: 'measure', defaultIdx: 1 }
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
        var autoField = spec.defaultIdx >= 0 && spec.defaultIdx < list.length ? list[spec.defaultIdx] : null;
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
      element.style.boxSizing = 'border-box';
      element.style.padding = '0';
      element.style.overflow = 'hidden';
      element.style.position = 'relative';
      element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

      var container = document.createElement('div');
      container.className = 'zero-trust-root';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.boxSizing = 'border-box';
      container.style.overflow = 'hidden';
      element.appendChild(container);

      // Floating Tooltip
      var tooltip = document.createElement('div');
      tooltip.className = 'zero-trust-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.display = 'none';
      tooltip.style.padding = '10px 14px';
      tooltip.style.background = 'rgba(15, 23, 42, 0.96)';
      tooltip.style.color = '#f8fafc';
      tooltip.style.borderRadius = '8px';
      tooltip.style.fontSize = '12px';
      tooltip.style.fontWeight = '500';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.boxShadow = '0 10px 25px rgba(0,0,0,0.35)';
      tooltip.style.zIndex = '9999';
      tooltip.style.backdropFilter = 'blur(6px)';
      element.appendChild(tooltip);

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
      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

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
      var root = element.querySelector('.zero-trust-root');
      var tooltip = element.querySelector('.zero-trust-tooltip');
      if (!root) {
        done();
        return;
      }
      root.innerHTML = '';

      if (!data || data.length === 0) {
        if (this.addError) {
          this.addError({
            title: 'No Data',
            message: 'The query returned no security event results for Zero-Trust Blast Radius analysis.'
          });
        }
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dimensions = (fields && fields.dimensions) || [];
      var measures = (fields && fields.measures) || [];

      if (dimensions.length === 0 || measures.length === 0) {
        if (this.addError) {
          this.addError({
            title: 'Dimensions & Measures Required',
            message: 'Please provide at least 1 Dimension (Threat Category) and 1 Measure (Threat Count).'
          });
        }
        done();
        return;
      }

      // --- 1. RESOLVE FIELD OVERRIDES ---
      function resolve(list, overrideVal, defaultIdx) {
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
        return (defaultIdx >= 0 && defaultIdx < list.length) ? list[defaultIdx] : (list[0] || null);
      }

      var dimCategory = resolve(dimensions, config.threatCategoryDimOverride, 0);
      var dimAction = dimensions.length > 1 ? resolve(dimensions, config.actionDimOverride, 1) : null;
      var dimSeverity = dimensions.length > 2 ? resolve(dimensions, config.severityDimOverride, 2) : null;
      var measThreat = resolve(measures, config.threatCountMeasOverride, 0);
      var measBlocked = measures.length > 1 ? resolve(measures, config.blockedCountMeasOverride, 1) : null;

      // Theme & Palette
      var paletteKey = config.colorPalette || 'cyber_dark';
      var theme = Object.assign({}, THEMES[paletteKey] || THEMES.cyber_dark);

      if (paletteKey === 'custom_hex') {
        var prim = config.customPrimaryColor || '#38bdf8';
        var pos = config.customPositiveColor || '#34a853';
        var neg = config.customNegativeColor || '#ea4335';
        theme.bg = '#0b0f19';
        theme.cardBg = '#111827';
        theme.border = '#1f2937';
        theme.text = '#f9fafb';
        theme.subtext = '#9ca3af';
        theme.columnHeaderBg = '#1e293b';
        theme.columnHeaderText = prim;
        theme.cellNormalBg = '#1f2937';
        theme.cellBorder = '#374151';
        theme.safeColor = pos;
        theme.warningColor = '#f59e0b';
        theme.criticalColor = neg;
        theme.pulseColor = prim;
        theme.ringStroke = '#1f2937';
        theme.hudBg = 'rgba(17, 24, 39, 0.95)';
        theme.hudText = '#f3f4f6';
      }

      root.style.backgroundColor = theme.bg;
      root.style.color = theme.text;

      // Typography
      var fontScale = config.fontScale || 'standard';
      var baseFontSize = fontScale === 'compact' ? 10 : (fontScale === 'large' ? 13 : 11);
      var titleFontSize = fontScale === 'compact' ? 12 : (fontScale === 'large' ? 16 : 13);
      var hudValueSize = fontScale === 'compact' ? 13 : (fontScale === 'large' ? 18 : 15);

      // --- 2. O(N) AGGREGATION & ZERO-TRUST CALCULATION ---
      var categoryMap = {};
      var totalThreats = 0;
      var totalBlocked = 0;
      var totalUnmitigated = 0;
      var criticalThreats = 0;

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var catName = (row[dimCategory.name] && (row[dimCategory.name].rendered || row[dimCategory.name].value)) || 'Unclassified Threat';
        var action = dimAction && row[dimAction.name] ? String(row[dimAction.name].rendered || row[dimAction.name].value).toLowerCase() : 'unknown';
        var severity = dimSeverity && row[dimSeverity.name] ? String(row[dimSeverity.name].rendered || row[dimSeverity.name].value).toUpperCase() : 'MEDIUM';

        var threatCount = Number(row[measThreat.name] && row[measThreat.name].value) || 0;
        var blockedCount = measBlocked && row[measBlocked.name] ? (Number(row[measBlocked.name].value) || 0) : 0;

        // In absence of explicit blocked measure, infer from action
        if (!measBlocked) {
          if (action.indexOf('block') !== -1 || action.indexOf('deny') !== -1 || action.indexOf('drop') !== -1 || action.indexOf('reset') !== -1) {
            blockedCount = threatCount;
          } else {
            blockedCount = 0;
          }
        }

        var unmitigated = Math.max(0, threatCount - blockedCount);
        if (severity === 'CRITICAL' || severity === 'HIGH') {
          criticalThreats += threatCount;
        }

        catName = String(catName).trim();
        if (!categoryMap[catName]) {
          categoryMap[catName] = {
            category: catName,
            threats: 0,
            blocked: 0,
            unmitigated: 0,
            criticalCount: 0,
            actions: {},
            drillLinks: (row[measThreat.name] && row[measThreat.name].links) || (row[dimCategory.name] && row[dimCategory.name].links) || []
          };
        }

        categoryMap[catName].threats += threatCount;
        categoryMap[catName].blocked += blockedCount;
        categoryMap[catName].unmitigated += unmitigated;
        if (severity === 'CRITICAL' || severity === 'HIGH') {
          categoryMap[catName].criticalCount += threatCount;
        }

        if (!categoryMap[catName].actions[action]) {
          categoryMap[catName].actions[action] = 0;
        }
        categoryMap[catName].actions[action] += threatCount;

        totalThreats += threatCount;
        totalBlocked += blockedCount;
        totalUnmitigated += unmitigated;
      }

      var overallContainmentPct = totalThreats > 0 ? (totalBlocked / totalThreats) * 100 : 100;

      // Convert to vector array
      var vectorList = Object.values(categoryMap);
      vectorList.forEach(function (v) {
        v.containmentRate = v.threats > 0 ? (v.blocked / v.threats) * 100 : 100;
        v.blastRadiusScore = Math.min(100, Math.round((v.unmitigated / Math.max(1, totalUnmitigated || 1)) * 100));
      });

      // Filter & Sort
      var sortBy = config.sortBy || 'threat_desc';
      if (sortBy === 'threat_desc') {
        vectorList.sort(function (a, b) { return b.threats - a.threats; });
      } else if (sortBy === 'containment_asc') {
        vectorList.sort(function (a, b) { return a.containmentRate - b.containmentRate; });
      } else if (sortBy === 'alphabetical') {
        vectorList.sort(function (a, b) { return a.category.localeCompare(b.category); });
      }

      var topN = Number(config.topN) || 12;
      var groupOther = config.enableOtherRollup !== false;
      if (topN > 0 && vectorList.length > topN) {
        var topSlice = vectorList.slice(0, topN);
        var overflow = vectorList.slice(topN);
        if (groupOther && overflow.length > 0) {
          var otherThreats = d3.sum(overflow, function (d) { return d.threats; });
          var otherBlocked = d3.sum(overflow, function (d) { return d.blocked; });
          var otherUnmitigated = d3.sum(overflow, function (d) { return d.unmitigated; });
          topSlice.push({
            category: 'Other ' + overflow.length + ' Vectors',
            threats: otherThreats,
            blocked: otherBlocked,
            unmitigated: otherUnmitigated,
            containmentRate: otherThreats > 0 ? (otherBlocked / otherThreats) * 100 : 100,
            blastRadiusScore: 50,
            actions: {},
            drillLinks: overflow[0].drillLinks || [],
            isOtherRollup: true
          });
        }
        vectorList = topSlice;
      }

      var maxVectorThreats = d3.max(vectorList, function (d) { return d.threats; }) || 1;

      // Target SLA calculation
      var targetMode = config.targetMode || 'fixed_target';
      var targetPct = Number(config.targetContainmentPct) || 95;
      if (targetMode === 'dataset_mean') {
        targetPct = Math.round(overallContainmentPct);
      } else if (targetMode === 'percentile_p90') {
        targetPct = 90;
      } else if (targetMode === 'none') {
        targetPct = 0;
      }

      // --- 3. EXECUTIVE SOC KPI HUD ---
      var hudMode = config.hudMode || 'scorecard';
      if (hudMode !== 'hidden') {
        var hud = document.createElement('div');
        hud.className = 'zero-trust-hud';
        hud.style.width = '100%';
        hud.style.display = 'flex';
        hud.style.flexWrap = 'wrap';
        hud.style.alignItems = 'center';
        hud.style.justifyContent = 'space-between';
        hud.style.padding = hudMode === 'compact_strip' ? '4px 12px' : '8px 16px';
        hud.style.backgroundColor = theme.hudBg;
        hud.style.borderBottom = '1px solid ' + theme.border;
        hud.style.gap = '10px';
        hud.style.flexShrink = '0';
        hud.style.zIndex = '10';

        var alertThresh = Number(config.criticalAlertThreshold) || 100;
        var isBreachAlert = totalUnmitigated >= alertThresh || (targetPct > 0 && overallContainmentPct < targetPct);

        var hudHtml = '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">';

        if (config.customTitle) {
          hudHtml += '<div style="display:flex;flex-direction:column;">' +
            '<span style="font-size:' + titleFontSize + 'px;font-weight:800;color:' + theme.text + ';">' + config.customTitle + '</span>' +
            (config.customSubtitle ? '<span style="font-size:' + (baseFontSize - 1) + 'px;color:' + theme.subtext + ';">' + config.customSubtitle + '</span>' : '') +
            '</div>';
        }

        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:' + theme.subtext + ';font-weight:600;">Total Ingress Threats</span>' +
          '<span style="font-size:' + hudValueSize + 'px;font-weight:700;color:' + theme.text + ';">🛡️ ' + formatNumber(totalThreats, config.valueFormat || 'compact_num') + '</span>' +
          '</div>';

        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:' + theme.subtext + ';font-weight:600;">Blast Containment Rate</span>' +
          '<span style="font-size:' + hudValueSize + 'px;font-weight:700;color:' + (overallContainmentPct >= targetPct ? theme.safeColor : theme.criticalColor) + ';">' + overallContainmentPct.toFixed(1) + '%</span>' +
          '</div>';

        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:' + theme.subtext + ';font-weight:600;">Unmitigated Exposure</span>' +
          '<span style="font-size:' + hudValueSize + 'px;font-weight:700;color:' + (totalUnmitigated > 0 ? theme.criticalColor : theme.safeColor) + ';">' + formatNumber(totalUnmitigated, config.valueFormat || 'compact_num') + '</span>' +
          '</div>';

        if (targetPct > 0) {
          hudHtml += '<div style="display:flex;flex-direction:column;">' +
            '<span style="font-size:10px;text-transform:uppercase;color:' + theme.subtext + ';font-weight:600;">' + (config.referenceLineLabel || 'Containment SLA') + '</span>' +
            '<span style="font-size:' + (hudValueSize - 2) + 'px;font-weight:600;color:' + theme.text + ';">🎯 ' + targetPct + '%</span>' +
            '</div>';
        }

        if (isBreachAlert) {
          hudHtml += '<div style="background:#fee2e2;border:1px solid #fecaca;color:#991b1b;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;display:flex;align-items:center;gap:4px;">' +
            '<span>🚨 BLAST RADIUS RISK: Unmitigated Breaches</span>' +
            '</div>';
        }
        hudHtml += '</div>';

        if (config.showSearch !== false) {
          hudHtml += '<div style="display:flex;align-items:center;">' +
            '<input type="text" class="zero-trust-search-input" placeholder="Search threat vectors..." style="padding:4px 10px;font-size:' + baseFontSize + 'px;background:' + theme.cardBg + ';color:' + theme.text + ';border:1px solid ' + theme.border + ';border-radius:6px;outline:none;width:170px;" />' +
            '</div>';
        }

        hud.innerHTML = hudHtml;
        root.appendChild(hud);

        var searchInput = hud.querySelector('.zero-trust-search-input');
        if (searchInput) {
          searchInput.addEventListener('input', function (e) {
            var q = e.target.value.toLowerCase();
            d3.select(root).selectAll('.blast-node, .sankey-ribbon-group, .exposure-row').style('opacity', function () {
              var txt = (this.textContent || '').toLowerCase();
              return (!q || txt.indexOf(q) !== -1) ? 1.0 : 0.15;
            });
          });
        }
      }

      // --- 4. VIEWPORT LAYOUT DISPATCH ---
      var layoutMode = config.layoutMode || 'blast_radius_rings';
      var chartContainer = document.createElement('div');
      chartContainer.className = 'zero-trust-viewport';
      chartContainer.style.width = '100%';
      chartContainer.style.flex = '1 1 auto';
      chartContainer.style.minHeight = '0';
      chartContainer.style.boxSizing = 'border-box';
      chartContainer.style.position = 'relative';
      chartContainer.style.overflow = layoutMode === 'executive_soc_scorecard' ? 'auto' : 'hidden';
      root.appendChild(chartContainer);

      var width = chartContainer.clientWidth || element.clientWidth || 800;
      var height = chartContainer.clientHeight || element.clientHeight || 500;

      var dataLabelsMode = config.dataLabels || 'all';

      // --- PARADIGM 1: CONCENTRIC BLAST RADIUS RINGS ---
      if (layoutMode === 'blast_radius_rings') {
        var svg = d3.select(chartContainer)
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .attr('viewBox', '0 0 ' + width + ' ' + height)
          .style('display', 'block');

        var centerX = width / 2;
        var centerY = height / 2;
        var maxRadius = Math.min(width, height) / 2 - 40;

        // Concentric Zones
        // Ring 1: Core Critical Compromise (0 to 30%)
        // Ring 2: Lateral Spread Perimeter (30% to 65%)
        // Ring 3: Quarantined Containment Boundary (65% to 100%)
        var zones = [
          { name: 'Patient Zero / Compromised Core', r: maxRadius * 0.28, color: 'rgba(239, 68, 68, 0.08)', stroke: theme.criticalColor },
          { name: 'Lateral Microsegmentation Zone', r: maxRadius * 0.62, color: 'rgba(245, 158, 11, 0.05)', stroke: theme.warningColor },
          { name: 'Secure Zero-Trust Perimeter', r: maxRadius * 0.95, color: 'rgba(16, 185, 129, 0.04)', stroke: theme.safeColor }
        ];

        var gMain = svg.append('g');

        zones.forEach(function (z) {
          gMain.append('circle')
            .attr('cx', centerX)
            .attr('cy', centerY)
            .attr('r', z.r)
            .attr('fill', z.color)
            .attr('stroke', z.stroke)
            .attr('stroke-width', 1.2)
            .attr('stroke-dasharray', '4 4')
            .attr('opacity', 0.85);

          gMain.append('text')
            .attr('x', centerX)
            .attr('y', centerY - z.r + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', z.stroke)
            .attr('font-size', '9px')
            .attr('font-weight', '700')
            .attr('letter-spacing', '0.5px')
            .text(z.name.toUpperCase());
        });

        // Center Patient Zero Pin
        gMain.append('circle')
          .attr('cx', centerX)
          .attr('cy', centerY)
          .attr('r', 12)
          .attr('fill', theme.criticalColor)
          .attr('opacity', 0.85);

        gMain.append('text')
          .attr('x', centerX)
          .attr('y', centerY + 4)
          .attr('text-anchor', 'middle')
          .attr('fill', '#ffffff')
          .attr('font-size', '10px')
          .attr('font-weight', '900')
          .text('CORE');

        // Angular placement of vectors
        var angleStep = (2 * Math.PI) / Math.max(vectorList.length, 1);
        vectorList.forEach(function (v, idx) {
          var angle = idx * angleStep - Math.PI / 2;
          // Radius based on containment: lower containment = closer to center core (high blast radius!)
          var distanceFactor = 0.28 + (v.containmentRate / 100) * (0.95 - 0.28);
          var nodeR = maxRadius * distanceFactor;
          var x = centerX + Math.cos(angle) * nodeR;
          var y = centerY + Math.sin(angle) * nodeR;

          // Connecting lateral line from center
          gMain.append('line')
            .attr('x1', centerX)
            .attr('y1', centerY)
            .attr('x2', x)
            .attr('y2', y)
            .attr('stroke', v.unmitigated > 0 ? theme.criticalColor : theme.ringStroke)
            .attr('stroke-width', v.unmitigated > 0 ? 1.5 : 0.8)
            .attr('stroke-opacity', v.unmitigated > 0 ? 0.6 : 0.3);

          var bubbleR = Math.max(7, Math.min(24, Math.sqrt(v.threats / maxVectorThreats) * 22));
          var nodeColor = v.containmentRate >= 95 ? theme.safeColor : (v.containmentRate >= 70 ? theme.warningColor : theme.criticalColor);

          var gNode = gMain.append('g')
            .attr('class', 'blast-node')
            .attr('transform', 'translate(' + x + ',' + y + ')')
            .style('cursor', 'pointer');

          gNode.append('circle')
            .attr('r', bubbleR)
            .attr('fill', nodeColor)
            .attr('fill-opacity', 0.82)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.5);

          // Pulse ring for critical exposure
          if (v.unmitigated > 0) {
            gNode.append('circle')
              .attr('r', bubbleR + 4)
              .attr('fill', 'none')
              .attr('stroke', theme.criticalColor)
              .attr('stroke-width', 1.2)
              .attr('stroke-opacity', 0.7);
          }

          if (dataLabelsMode !== 'hidden') {
            gNode.append('text')
              .attr('y', bubbleR + 12)
              .attr('text-anchor', 'middle')
              .attr('fill', theme.text)
              .attr('font-size', '10px')
              .attr('font-weight', '700')
              .text(v.category.length > 18 ? v.category.slice(0, 16) + '...' : v.category);

            gNode.append('text')
              .attr('y', 3)
              .attr('text-anchor', 'middle')
              .attr('fill', '#ffffff')
              .attr('font-size', '9px')
              .attr('font-weight', '800')
              .text(v.containmentRate.toFixed(0) + '%');
          }

          // Tooltip & Drill
          gNode.on('mouseenter', function (ev) {
            tooltip.style.display = 'block';
            tooltip.innerHTML = '<div style="font-weight:700;font-size:13px;color:' + theme.columnHeaderText + ';">' + v.category + '</div>' +
              '<div>Ingress Threats: <b>' + formatNumber(v.threats, config.valueFormat || 'compact_num') + '</b></div>' +
              '<div>Contained / Blocked: <b>' + formatNumber(v.blocked, config.valueFormat || 'compact_num') + ' (' + v.containmentRate.toFixed(1) + '%)</b></div>' +
              '<div>Unmitigated Exposure: <b style="color:' + (v.unmitigated > 0 ? '#ef4444' : '#10b981') + ';">' + formatNumber(v.unmitigated, config.valueFormat || 'compact_num') + '</b></div>' +
              (v.drillLinks && v.drillLinks.length > 0 ? '<div style="margin-top:4px;font-size:10px;color:#93c5fd;font-style:italic;">🔎 Click to Drill</div>' : '');
          })
          .on('mousemove', function (ev) {
            tooltip.style.left = (ev.clientX + 14) + 'px';
            tooltip.style.top = (ev.clientY + 14) + 'px';
          })
          .on('mouseleave', function () {
            tooltip.style.display = 'none';
          })
          .on('click', function (ev) {
            if (v.drillLinks && v.drillLinks.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({
                links: v.drillLinks,
                event: ev
              });
            }
          });
        });

      // --- PARADIGM 2: INGRESS & CONTAINMENT FLOW (SANKEY) ---
      } else if (layoutMode === 'containment_sankey') {
        var svg = d3.select(chartContainer)
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .attr('viewBox', '0 0 ' + width + ' ' + height)
          .style('display', 'block');

        var margin = { top: 40, right: 180, bottom: 30, left: 180 };
        var colW = (width - margin.left - margin.right);

        // Column 1: Threat Vectors
        var col1Nodes = vectorList.slice(0, 8);
        var totalCol1 = d3.sum(col1Nodes, function (d) { return d.threats; }) || 1;
        var y1 = margin.top;
        var h1 = height - margin.top - margin.bottom;

        // Column 2: Enforcement (Blocked vs Allowed)
        var blockedTotal = d3.sum(col1Nodes, function (d) { return d.blocked; });
        var unmitigatedTotal = d3.sum(col1Nodes, function (d) { return d.unmitigated; });

        var gFlow = svg.append('g');

        // Draw Left Nodes
        var currY1 = margin.top;
        col1Nodes.forEach(function (n) {
          var nodeH = Math.max(16, (n.threats / totalCol1) * (h1 - (col1Nodes.length * 6)));
          n.sankeyX = margin.left;
          n.sankeyY = currY1;
          n.sankeyH = nodeH;

          // Node Rect
          gFlow.append('rect')
            .attr('x', margin.left - 16)
            .attr('y', currY1)
            .attr('width', 16)
            .attr('height', nodeH)
            .attr('rx', 3)
            .attr('fill', theme.pulseColor);

          // Node Text
          gFlow.append('text')
            .attr('x', margin.left - 22)
            .attr('y', currY1 + nodeH / 2 + 4)
            .attr('text-anchor', 'end')
            .attr('fill', theme.text)
            .attr('font-size', '10px')
            .attr('font-weight', '600')
            .text(n.category.length > 20 ? n.category.slice(0, 18) + '...' : n.category);

          currY1 += nodeH + 6;
        });

        // Draw Right Enforcement Nodes (Contained vs Exposed)
        var rightY = margin.top;
        var rightBlockedH = (blockedTotal / (blockedTotal + unmitigatedTotal || 1)) * (h1 - 20);
        var rightExposedH = (unmitigatedTotal / (blockedTotal + unmitigatedTotal || 1)) * (h1 - 20);

        // Contained Bar
        gFlow.append('rect')
          .attr('x', width - margin.right)
          .attr('y', rightY)
          .attr('width', 16)
          .attr('height', rightBlockedH)
          .attr('rx', 3)
          .attr('fill', theme.safeColor);

        gFlow.append('text')
          .attr('x', width - margin.right + 22)
          .attr('y', rightY + rightBlockedH / 2 + 4)
          .attr('fill', theme.safeColor)
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .text('CONTAINED (' + formatNumber(blockedTotal, config.valueFormat || 'compact_num') + ')');

        // Exposed Bar
        var exposedY = rightY + rightBlockedH + 16;
        gFlow.append('rect')
          .attr('x', width - margin.right)
          .attr('y', exposedY)
          .attr('width', 16)
          .attr('height', Math.max(12, rightExposedH))
          .attr('rx', 3)
          .attr('fill', theme.criticalColor);

        gFlow.append('text')
          .attr('x', width - margin.right + 22)
          .attr('y', exposedY + Math.max(12, rightExposedH) / 2 + 4)
          .attr('fill', theme.criticalColor)
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .text('UNMITIGATED (' + formatNumber(unmitigatedTotal, config.valueFormat || 'compact_num') + ')');

        // Connecting Bezier Ribbons
        col1Nodes.forEach(function (n) {
          // Flow to Contained
          var path1 = d3.path();
          var x0 = n.sankeyX;
          var y0 = n.sankeyY + n.sankeyH * 0.4;
          var x1 = width - margin.right;
          var y1_target = rightY + (rightBlockedH * 0.5);
          var xMid = (x0 + x1) / 2;

          path1.moveTo(x0, y0);
          path1.bezierCurveTo(xMid, y0, xMid, y1_target, x1, y1_target);

          gFlow.append('path')
            .attr('d', path1.toString())
            .attr('fill', 'none')
            .attr('stroke', theme.safeColor)
            .attr('stroke-width', Math.max(1, (n.blocked / totalCol1) * 35))
            .attr('stroke-opacity', 0.25);

          // Flow to Exposed
          if (n.unmitigated > 0) {
            var path2 = d3.path();
            var y0_exp = n.sankeyY + n.sankeyH * 0.8;
            var y2_target = exposedY + (Math.max(12, rightExposedH) * 0.5);

            path2.moveTo(x0, y0_exp);
            path2.bezierCurveTo(xMid, y0_exp, xMid, y2_target, x1, y2_target);

            gFlow.append('path')
              .attr('d', path2.toString())
              .attr('fill', 'none')
              .attr('stroke', theme.criticalColor)
              .attr('stroke-width', Math.max(1, (n.unmitigated / totalCol1) * 35))
              .attr('stroke-opacity', 0.45);
          }
        });

      // --- PARADIGM 3: ATTACK SURFACE EXPOSURE MATRIX (HEATMAP) ---
      } else if (layoutMode === 'exposure_matrix') {
        var gridSvg = d3.select(chartContainer)
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .style('display', 'block');

        var actionColumns = ['allow', 'deny', 'drop', 'alert'];
        var margin = { top: 50, right: 40, bottom: 20, left: 160 };
        var cellW = Math.max(60, (width - margin.left - margin.right) / actionColumns.length);
        var cellH = Math.max(24, (height - margin.top - margin.bottom) / Math.max(vectorList.length, 1));

        var gMat = gridSvg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        // Column Headers
        actionColumns.forEach(function (act, idx) {
          gMat.append('text')
            .attr('x', idx * cellW + cellW / 2)
            .attr('y', -14)
            .attr('text-anchor', 'middle')
            .attr('fill', act === 'allow' ? theme.criticalColor : theme.safeColor)
            .attr('font-size', '11px')
            .attr('font-weight', '700')
            .text(act.toUpperCase());
        });

        // Rows
        vectorList.forEach(function (v, rowIdx) {
          // Label
          gMat.append('text')
            .attr('x', -10)
            .attr('y', rowIdx * cellH + cellH / 2 + 4)
            .attr('text-anchor', 'end')
            .attr('fill', theme.text)
            .attr('font-size', '10px')
            .attr('font-weight', '600')
            .text(v.category.length > 20 ? v.category.slice(0, 18) + '...' : v.category);

          actionColumns.forEach(function (act, colIdx) {
            var val = v.actions[act] || 0;
            var cellColor = val === 0 ? theme.cellNormalBg : (act === 'allow' ? theme.criticalColor : theme.safeColor);
            var opacity = val === 0 ? 0.3 : Math.min(0.9, 0.2 + (val / maxVectorThreats) * 0.7);

            var rect = gMat.append('rect')
              .attr('class', 'exposure-row')
              .attr('x', colIdx * cellW + 3)
              .attr('y', rowIdx * cellH + 3)
              .attr('width', cellW - 6)
              .attr('height', cellH - 6)
              .attr('rx', 4)
              .attr('fill', cellColor)
              .attr('fill-opacity', opacity)
              .attr('stroke', theme.border)
              .attr('stroke-width', 1)
              .style('cursor', val > 0 ? 'pointer' : 'default');

            if (val > 0) {
              gMat.append('text')
                .attr('x', colIdx * cellW + cellW / 2)
                .attr('y', rowIdx * cellH + cellH / 2 + 4)
                .attr('text-anchor', 'middle')
                .attr('fill', '#ffffff')
                .attr('font-size', '10px')
                .attr('font-weight', '700')
                .text(formatNumber(val, config.valueFormat || 'compact_num'));

              rect.on('mouseenter', function (ev) {
                tooltip.style.display = 'block';
                tooltip.innerHTML = '<div style="font-weight:700;font-size:13px;color:' + theme.columnHeaderText + ';">' + v.category + '</div>' +
                  '<div>Action: <b>' + act.toUpperCase() + '</b></div>' +
                  '<div>Volume: <b>' + formatNumber(val, config.valueFormat || 'compact_num') + '</b></div>' +
                  (v.drillLinks && v.drillLinks.length > 0 ? '<div style="margin-top:4px;font-size:10px;color:#93c5fd;font-style:italic;">🔎 Click to Drill</div>' : '');
              })
              .on('mousemove', function (ev) {
                tooltip.style.left = (ev.clientX + 14) + 'px';
                tooltip.style.top = (ev.clientY + 14) + 'px';
              })
              .on('mouseleave', function () {
                tooltip.style.display = 'none';
              });
            }
          });
        });

      // --- PARADIGM 4: EXECUTIVE SOC POSTURE SCORECARD ---
      } else {
        var cardGrid = document.createElement('div');
        cardGrid.style.display = 'flex';
        cardGrid.style.flexDirection = 'column';
        cardGrid.style.gap = '10px';
        cardGrid.style.padding = '16px';
        cardGrid.style.boxSizing = 'border-box';
        chartContainer.appendChild(cardGrid);

        // Header Table
        var table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = baseFontSize + 'px';
        table.innerHTML = '<thead style="background:' + theme.columnHeaderBg + ';color:' + theme.columnHeaderText + ';text-align:left;">' +
          '<tr>' +
          '<th style="padding:8px 12px;border-radius:4px 0 0 4px;">Threat Vector Category</th>' +
          '<th style="padding:8px 12px;">Ingress Threats</th>' +
          '<th style="padding:8px 12px;">Contained (Blocked)</th>' +
          '<th style="padding:8px 12px;">Unmitigated Exposure</th>' +
          '<th style="padding:8px 12px;">Containment Rate</th>' +
          '<th style="padding:8px 12px;border-radius:0 4px 4px 0;">Zero-Trust Blast Status</th>' +
          '</tr>' +
          '</thead>' +
          '<tbody></tbody>';

        var tbody = table.querySelector('tbody');
        vectorList.forEach(function (v) {
          var tr = document.createElement('tr');
          tr.style.borderBottom = '1px solid ' + theme.border;
          tr.style.backgroundColor = theme.cellNormalBg;
          tr.style.cursor = 'pointer';

          var statusBadge = v.containmentRate >= 95 ?
            '<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">SECURE</span>' :
            (v.containmentRate >= 70 ?
              '<span style="background:#fef3c7;color:#b45309;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">ELEVATED</span>' :
              '<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">CRITICAL BREACH</span>');

          tr.innerHTML = '<td style="padding:10px 12px;font-weight:600;">' + v.category + '</td>' +
            '<td style="padding:10px 12px;">' + formatNumber(v.threats, config.valueFormat || 'compact_num') + '</td>' +
            '<td style="padding:10px 12px;color:' + theme.safeColor + ';font-weight:700;">' + formatNumber(v.blocked, config.valueFormat || 'compact_num') + '</td>' +
            '<td style="padding:10px 12px;color:' + (v.unmitigated > 0 ? theme.criticalColor : theme.text) + ';font-weight:700;">' + formatNumber(v.unmitigated, config.valueFormat || 'compact_num') + '</td>' +
            '<td style="padding:10px 12px;font-weight:700;">' + v.containmentRate.toFixed(1) + '%</td>' +
            '<td style="padding:10px 12px;">' + statusBadge + '</td>';

          tr.addEventListener('click', function (ev) {
            if (v.drillLinks && v.drillLinks.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({
                links: v.drillLinks,
                event: ev
              });
            }
          });

          tbody.appendChild(tr);
        });

        cardGrid.appendChild(table);
      }

      done();
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
