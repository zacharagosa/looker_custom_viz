/**
 * Marimekko / Mosaic Market Share Matrix - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Implements a 2-dimensional market share Marimekko matrix where both
 * column widths and segment heights are proportionally scaled to quantitative values.
 *
 * Features:
 * - 3 Analytical Layout Paradigms:
 *   1) Marimekko (Variable-Width Mosaic Matrix)
 *   2) 100% Stacked Market Share
 *   3) Heatmap Affinity Matrix
 * - Dynamic Field-Role Mapping (Primary Column Dim, Sub-Segment Dim, Primary Volume Measure, Secondary Measure)
 * - Reference Targets & Benchmark Modes (Dataset Mean, Median, Fixed, P75, P90)
 * - Interactive sorting, Top-N column limits with "Other" rollup, zero/null suppression
 * - Executive KPI Scorecard HUD modes (Full Scorecard, Compact Strip, Hidden)
 * - Value label density (All, Dominant Peaks, Hidden), search bar filter, title override
 * - Enterprise color palettes (Google Enterprise, Modern Slate, Cyberpunk Dark,
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

  var PALETTES = {
    google_enterprise: {
      name: 'Google Enterprise',
      colors: ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#9334e6', '#00acc1', '#ff7043', '#5c6bc0'],
      bg: '#ffffff',
      text: '#202124',
      subtext: '#5f6368',
      border: '#e8eaed',
      hudBg: '#f8f9fa'
    },
    modern_slate: {
      name: 'Modern Slate',
      colors: ['#0f172a', '#e11d48', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#64748b'],
      bg: '#ffffff',
      text: '#0f172a',
      subtext: '#64748b',
      border: '#e2e8f0',
      hudBg: '#f8fafc'
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark',
      colors: ['#00f5d4', '#d946ef', '#8b5cf6', '#38bdf8', '#f43f5e', '#fbbf24', '#4ade80', '#ec4899'],
      bg: '#0f172a',
      text: '#f8fafc',
      subtext: '#94a3b8',
      border: '#334155',
      hudBg: '#1e293b'
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      colors: ['#047857', '#10b981', '#34d399', '#059669', '#0f766e', '#0d9488', '#14b8a6', '#6ee7b7'],
      bg: '#ffffff',
      text: '#064e3b',
      subtext: '#047857',
      border: '#d1fae5',
      hudBg: '#ecfdf5'
    },
    sunset_media: {
      name: 'Sunset Media',
      colors: ['#c2410c', '#ea580c', '#fb923c', '#e11d48', '#db2777', '#f59e0b', '#d97706', '#b45309'],
      bg: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      border: '#fed7aa',
      hudBg: '#fff7ed'
    },
    wellverse_healthcare: {
      name: 'Wellverse Healthcare',
      colors: ['#143359', '#00AF68', '#2E7CF6', '#F59E0B', '#64748B', '#0EA5E9', '#8B5CF6', '#10B981'],
      bg: '#ffffff',
      text: '#143359',
      subtext: '#64748B',
      border: '#CBD5E1',
      hudBg: '#EEF2F7'
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
    id: 'marimekko_market_matrix',
    label: 'Marimekko / Mosaic Market Matrix',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'Mosaic Paradigm Mode',
        display: 'select',
        values: [
          { 'Marimekko (Variable Width & Height Mosaic)': 'marimekko' },
          { '100% Stacked Category Share (Equal Width)': 'stacked_100' },
          { 'Cross-Tab Affinity Heatmap Matrix': 'heatmap_matrix' }
        ],
        default: 'marimekko',
        section: 'Display',
        order: 1
      },
      dimFieldOverride: {
        type: 'string',
        label: 'Primary Column Dimension (1 = Col 1, e.g. Network)',
        default: '1',
        section: 'Display',
        order: 2
      },
      subDimOverride: {
        type: 'string',
        label: 'Sub-Segment Dimension (2 = Col 2, e.g. Genre)',
        default: '2',
        section: 'Display',
        order: 3
      },
      measureFieldOverride: {
        type: 'string',
        label: 'Primary Volume Measure (1 = Measure 1, e.g. Spend)',
        default: '1',
        section: 'Display',
        order: 4
      },
      secondaryMeasureOverride: {
        type: 'string',
        label: 'Secondary Measure (2 = Measure 2, e.g. Spots)',
        default: '2',
        section: 'Display',
        order: 5
      },
      targetMode: {
        type: 'string',
        label: 'Market Benchmark Mode',
        display: 'select',
        values: [
          { 'Dataset Mean (Market Average Share)': 'dataset_mean' },
          { 'Dataset Median (Market Median)': 'dataset_median' },
          { 'Fixed Target %': 'fixed' },
          { 'Top Percentile P75 Target': 'percentile_p75' },
          { 'Top Percentile P90 Target': 'percentile_p90' }
        ],
        default: 'dataset_mean',
        section: 'Display',
        order: 6
      },
      fixedTargetValue: {
        type: 'number',
        label: 'Fixed Benchmark % (when Fixed Mode, 0 = Auto)',
        default: 0,
        section: 'Display',
        order: 7
      },
      referenceLineLabel: {
        type: 'string',
        label: 'Reference Benchmark Label',
        default: 'Market Benchmark',
        section: 'Display',
        order: 8
      },
      anomalyThresholdPct: {
        type: 'number',
        label: 'Dominance Anomaly Alert Threshold (%)',
        default: 35,
        section: 'Display',
        order: 9
      },
      sortBy: {
        type: 'string',
        label: 'Column Sort Order',
        display: 'select',
        values: [
          { 'Total Volume (Metric Descending)': 'metric_desc' },
          { 'Total Volume (Metric Ascending)': 'metric_asc' },
          { 'Column Name (Alphabetical A-Z)': 'label_asc' },
          { 'Natural / Query Order': 'natural' }
        ],
        default: 'metric_desc',
        section: 'Display',
        order: 10
      },
      topNLimit: {
        type: 'number',
        label: 'Top-N Column Categories (0 = All, Max 15)',
        default: 0,
        section: 'Display',
        order: 11
      },
      enableOtherRollup: {
        type: 'boolean',
        label: 'Group Remaining into "Other" Column',
        default: true,
        section: 'Display',
        order: 12
      },
      suppressZeroNull: {
        type: 'boolean',
        label: 'Suppress Zero / Null Data Cells',
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
        label: 'Segment Data Labels',
        display: 'select',
        values: [
          { 'Show All Segments': 'all' },
          { 'Dominant Peaks Only (>15% Share)': 'peaks_only' },
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
      showLegend: {
        type: 'boolean',
        label: 'Show Sub-Segment Color Legend',
        default: true,
        section: 'Display',
        order: 17
      },
      showSearch: {
        type: 'boolean',
        label: 'Show Interactive Search / Filter Bar',
        default: true,
        section: 'Display',
        order: 18
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
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
        label: 'Custom Dominant Brand Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 2
      },
      customPositiveHex: {
        type: 'string',
        label: 'Custom Positive / Success Hex',
        display: 'color',
        default: '',
        section: 'Style',
        order: 3
      },
      customNegativeHex: {
        type: 'string',
        label: 'Custom Alert / Deficit Hex',
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
          { 'Higher is Better (Market Volume, Revenue)': 'higher_is_better' },
          { 'Lower is Better (Concentration Risk, Cost)': 'lower_is_better' }
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

      var root = document.createElement('div');
      root.className = 'marimekko-root';
      root.style.width = '100%';
      root.style.flex = '1 1 auto';
      root.style.minHeight = '0';
      root.style.boxSizing = 'border-box';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      root.style.overflow = 'hidden';
      element.appendChild(root);

      var tooltip = document.createElement('div');
      tooltip.className = 'marimekko-tooltip';
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
      element._marimekkoTooltip = tooltip;

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
      var root = element.querySelector('.marimekko-root');
      var tooltip = element._marimekkoTooltip;
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

      if (dimensions.length === 0 || measures.length === 0) {
        this.addError({
          title: 'Fields Required',
          message: 'Marimekko Matrix requires at least 1 Dimension (Categories) and 1 Measure (Volume/Spend). An optional second dimension provides internal segment breakdown.'
        });
        done();
        return;
      }

      // --- 1. FIELD RESOLUTION WITH USER OVERRIDES ---
      var primaryDim = resolveField(dimensions, config.dimFieldOverride, 0);
      var subDim = (dimensions.length > 1) ? resolveField(dimensions, config.subDimOverride, 1) : null;
      var primaryMeas = resolveField(measures, config.measureFieldOverride, 0);
      var secMeas = (measures.length > 1) ? resolveField(measures, config.secondaryMeasureOverride, 1) : null;

      // --- 2. PALETTE & BRAND COLOR RESOLUTION ---
      var paletteKey = config.colorPalette || 'google_enterprise';
      var theme = PALETTES[paletteKey] ? Object.assign({}, PALETTES[paletteKey]) : Object.assign({}, PALETTES.google_enterprise);
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
        if (paletteKey === 'cyberpunk_dark') {
          tooltip.style.background = 'rgba(15, 23, 42, 0.94)';
          tooltip.style.color = '#f8fafc';
          tooltip.style.border = '1px solid #334155';
        } else {
          tooltip.style.background = 'rgba(15, 23, 42, 0.92)';
          tooltip.style.color = '#ffffff';
          tooltip.style.border = '1px solid rgba(255,255,255,0.1)';
        }
      }

      function formatVal(val, lookerRendered) {
        return formatNumber(val, config.valueFormat || 'auto', lookerRendered);
      }

      // --- 3. AGGREGATE 2D HIERARCHY MATRIX ---
      var colMap = {};
      var allSubSegments = {};
      var grandTotal = 0;

      data.forEach(function (row, rIdx) {
        var colVal = primaryDim ? (row[primaryDim.name] && (row[primaryDim.name].rendered || row[primaryDim.name].value)) : 'Total';
        var colKey = String(colVal || 'Unknown');
        var subVal = subDim ? (row[subDim.name] && (row[subDim.name].rendered || row[subDim.name].value)) : 'Volume';
        var subKey = String(subVal || 'Other');
        var metricVal = Number(row[primaryMeas.name] && row[primaryMeas.name].value) || 0;
        var secVal = secMeas && row[secMeas.name] ? Number(row[secMeas.name].value) || 0 : null;

        if (config.suppressZeroNull && (metricVal === 0 || isNaN(metricVal))) {
          return;
        }

        var drillLinks = (row[primaryMeas.name] && row[primaryMeas.name].links) ||
          (primaryDim && row[primaryDim.name] && row[primaryDim.name].links) ||
          (subDim && row[subDim.name] && row[subDim.name].links) || [];

        if (!colMap[colKey]) {
          colMap[colKey] = {
            name: colKey,
            totalVolume: 0,
            secVolume: 0,
            segments: {},
            drillLinks: drillLinks
          };
        }

        if (!colMap[colKey].segments[subKey]) {
          colMap[colKey].segments[subKey] = {
            name: subKey,
            colName: colKey,
            volume: 0,
            secVolume: 0,
            rendered: row[primaryMeas.name] && row[primaryMeas.name].rendered,
            drillLinks: drillLinks
          };
        }

        colMap[colKey].totalVolume += metricVal;
        if (secVal !== null) colMap[colKey].secVolume += secVal;
        colMap[colKey].segments[subKey].volume += metricVal;
        if (secVal !== null) colMap[colKey].segments[subKey].secVolume += secVal;

        allSubSegments[subKey] = (allSubSegments[subKey] || 0) + metricVal;
        grandTotal += metricVal;
      });

      var colList = Object.values(colMap);
      if (colList.length === 0 || grandTotal <= 0) {
        this.addError({
          title: 'No Active Volume',
          message: 'All returned items evaluated to zero or null.'
        });
        done();
        return;
      }

      // Assign stable colors to sub-segments
      var subKeysSorted = Object.keys(allSubSegments).sort(function (a, b) {
        return allSubSegments[b] - allSubSegments[a];
      });
      var subColorMap = {};
      subKeysSorted.forEach(function (sk, idx) {
        subColorMap[sk] = colorList[idx % colorList.length];
      });

      // Sort Columns
      var sortBy = config.sortBy || 'metric_desc';
      if (sortBy === 'metric_desc') {
        colList.sort(function (a, b) { return b.totalVolume - a.totalVolume; });
      } else if (sortBy === 'metric_asc') {
        colList.sort(function (a, b) { return a.totalVolume - b.totalVolume; });
      } else if (sortBy === 'label_asc') {
        colList.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }

      // Top-N Column Limiter with "Other" rollup
      var topN = Number(config.topNLimit) || 0;
      if (topN > 0 && colList.length > topN) {
        var topCols = colList.slice(0, topN);
        if (config.enableOtherRollup) {
          var remCols = colList.slice(topN);
          var otherCol = {
            name: 'Other (' + remCols.length + ' categories)',
            totalVolume: 0,
            secVolume: 0,
            segments: {},
            drillLinks: []
          };
          remCols.forEach(function (rc) {
            otherCol.totalVolume += rc.totalVolume;
            otherCol.secVolume += rc.secVolume;
            Object.values(rc.segments).forEach(function (sg) {
              if (!otherCol.segments[sg.name]) {
                otherCol.segments[sg.name] = {
                  name: sg.name,
                  colName: otherCol.name,
                  volume: 0,
                  secVolume: 0,
                  rendered: null,
                  drillLinks: []
                };
              }
              otherCol.segments[sg.name].volume += sg.volume;
              otherCol.segments[sg.name].secVolume += sg.secVolume;
            });
          });
          topCols.push(otherCol);
        }
        colList = topCols;
      }

      // Compute Column & Segment Share Proportions
      colList.forEach(function (col) {
        col.share = col.totalVolume / grandTotal;
        var segArray = Object.values(col.segments);
        segArray.sort(function (a, b) { return b.volume - a.volume; });
        var cumHeight = 0;
        segArray.forEach(function (seg) {
          seg.shareInCol = col.totalVolume > 0 ? (seg.volume / col.totalVolume) : 0;
          seg.shareGlobal = grandTotal > 0 ? (seg.volume / grandTotal) : 0;
          seg.y0 = cumHeight;
          cumHeight += seg.shareInCol;
          seg.y1 = cumHeight;
          seg.color = subColorMap[seg.name] || '#64748b';
        });
        col.segmentList = segArray;
      });

      // --- 4. EXECUTIVE SCORECARD HUD ---
      var hudMode = config.hudMode || 'scorecard';
      var topCol = colList[0];
      var topSub = subKeysSorted[0];
      var isLowerBetter = config.metricPolarity === 'lower_is_better';
      var topColSharePct = (topCol.share * 100).toFixed(1);
      var dominanceAlert = (topCol.share * 100) >= (Number(config.anomalyThresholdPct) || 35);

      var fontScale = config.fontScale || 'standard';
      var fontScaleMap = {
        compact: { title: '13px', subtitle: '11px', statNum: '13px', statLbl: '9px', label: '10px' },
        standard: { title: '15px', subtitle: '12px', statNum: '15px', statLbl: '10px', label: '11px' },
        large: { title: '18px', subtitle: '13px', statNum: '18px', statLbl: '11px', label: '12px' }
      };
      var fSizes = fontScaleMap[fontScale] || fontScaleMap.standard;

      if (hudMode !== 'hidden') {
        var header = document.createElement('div');
        header.className = 'marimekko-header-hud';
        header.style.display = 'flex';
        header.style.flexWrap = 'wrap';
        header.style.alignItems = 'center';
        header.style.justifyContent = 'space-between';
        header.style.gap = '12px';
        header.style.padding = hudMode === 'compact_strip' ? '6px 14px' : '10px 16px';
        header.style.backgroundColor = hudMode === 'compact_strip' ? theme.hudBg : (paletteKey === 'cyberpunk_dark' ? '#0f172a' : '#f1f5f9');
        header.style.borderBottom = '1px solid ' + theme.border;
        header.style.flexShrink = '0';

        var titleBox = document.createElement('div');
        var mainTitle = document.createElement('div');
        mainTitle.style.fontSize = fSizes.title;
        mainTitle.style.fontWeight = '700';
        mainTitle.style.letterSpacing = '-0.02em';
        mainTitle.textContent = config.customTitleOverride || ((primaryDim ? primaryDim.label_short || primaryDim.label : 'Network') + ' & ' + (subDim ? subDim.label_short || subDim.label : 'Genre') + ' — 2D Market Share Matrix');

        var subtitle = document.createElement('div');
        subtitle.style.fontSize = fSizes.subtitle;
        subtitle.style.color = theme.subtext;
        subtitle.style.marginTop = '2px';
        subtitle.textContent = colList.length + ' Categories • ' + subKeysSorted.length + ' Segments • Total Market ' + formatVal(grandTotal, null);
        titleBox.appendChild(mainTitle);
        titleBox.appendChild(subtitle);
        header.appendChild(titleBox);

        var statsBox = document.createElement('div');
        statsBox.style.display = 'flex';
        statsBox.style.gap = '10px';
        statsBox.style.flexWrap = 'wrap';

        function createStatCard(label, val, alertStatus) {
          var card = document.createElement('div');
          card.style.background = paletteKey === 'cyberpunk_dark' ? '#1e293b' : '#ffffff';
          card.style.border = '1px solid ' + theme.border;
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
          v.style.color = alertStatus === 'alert' ? '#dc2626' : (alertStatus === 'success' ? '#16a34a' : theme.text);
          v.textContent = val;

          card.appendChild(lbl);
          card.appendChild(v);
          return card;
        }

        statsBox.appendChild(createStatCard('Market Volume', formatVal(grandTotal, null), 'normal'));
        statsBox.appendChild(createStatCard('Top ' + (primaryDim ? primaryDim.label_short || 'Category' : 'Category'), topCol.name + ' (' + topColSharePct + '%)', dominanceAlert ? 'alert' : 'normal'));
        if (topSub) {
          statsBox.appendChild(createStatCard('Leading Segment', topSub + ' (' + ((allSubSegments[topSub] / grandTotal) * 100).toFixed(1) + '%)', 'normal'));
        }

        // Search Bar
        if (config.showSearch !== false) {
          var searchWrapper = document.createElement('div');
          searchWrapper.style.display = 'flex';
          searchWrapper.style.alignItems = 'center';
          searchWrapper.style.marginLeft = '4px';

          var searchInput = document.createElement('input');
          searchInput.type = 'text';
          searchInput.placeholder = 'Search categories...';
          searchInput.style.padding = '5px 10px';
          searchInput.style.fontSize = '11px';
          searchInput.style.borderRadius = '6px';
          searchInput.style.border = '1px solid ' + (paletteKey === 'cyberpunk_dark' ? '#334155' : '#cbd5e1');
          searchInput.style.background = paletteKey === 'cyberpunk_dark' ? '#0f172a' : '#ffffff';
          searchInput.style.color = theme.text;
          searchInput.style.outline = 'none';
          searchInput.style.width = '130px';

          searchInput.addEventListener('input', function (e) {
            var q = e.target.value.toLowerCase().trim();
            var cols = root.querySelectorAll('.marimekko-col-group, .marimekko-heatmap-row');
            cols.forEach(function (c) {
              var lbl = c.getAttribute('data-col-name') || '';
              if (!q || lbl.toLowerCase().indexOf(q) !== -1) {
                c.style.opacity = '1';
                c.style.pointerEvents = 'auto';
              } else {
                c.style.opacity = '0.15';
                c.style.pointerEvents = 'none';
              }
            });
          });
          searchWrapper.appendChild(searchInput);
          statsBox.appendChild(searchWrapper);
        }

        header.appendChild(statsBox);
        root.appendChild(header);
      }

      // --- 5. SUB-SEGMENT LEGEND ---
      if (config.showLegend !== false && subKeysSorted.length > 1) {
        var legend = document.createElement('div');
        legend.className = 'marimekko-legend';
        legend.style.display = 'flex';
        legend.style.alignItems = 'center';
        legend.style.gap = '14px';
        legend.style.fontSize = '11px';
        legend.style.color = theme.subtext;
        legend.style.padding = '4px 16px 8px 16px';
        legend.style.flexWrap = 'wrap';
        legend.style.flexShrink = '0';

        subKeysSorted.slice(0, 10).forEach(function (sk) {
          var itemDiv = document.createElement('div');
          itemDiv.style.display = 'flex';
          itemDiv.style.alignItems = 'center';
          itemDiv.style.gap = '5px';
          itemDiv.innerHTML = '<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:' + subColorMap[sk] + ';"></span>' +
            '<strong>' + sk + '</strong> (' + ((allSubSegments[sk] / grandTotal) * 100).toFixed(0) + '%)';
          legend.appendChild(itemDiv);
        });

        var hasDrills = colList.some(function (c) {
          return (c.drillLinks && c.drillLinks.length > 0) || c.segmentList.some(function (s) { return s.drillLinks && s.drillLinks.length > 0; });
        });
        if (hasDrills) {
          var drillPill = document.createElement('div');
          drillPill.style.marginLeft = 'auto';
          drillPill.style.fontSize = '10px';
          drillPill.style.fontWeight = '700';
          drillPill.style.color = paletteKey === 'cyberpunk_dark' ? '#38bdf8' : '#1e3a8a';
          drillPill.style.padding = '2px 8px';
          drillPill.style.borderRadius = '12px';
          drillPill.style.background = paletteKey === 'cyberpunk_dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 58, 138, 0.08)';
          drillPill.textContent = '🔎 CLICK ANY SEGMENT TO DRILL';
          legend.appendChild(drillPill);
        }

        root.appendChild(legend);
      }

      // --- 6. MARIMEKKO CANVAS BODY ---
      var chartWrapper = document.createElement('div');
      chartWrapper.className = 'marimekko-canvas-wrapper';
      chartWrapper.style.width = '100%';
      chartWrapper.style.flex = '1 1 auto';
      chartWrapper.style.minHeight = '0';
      chartWrapper.style.overflow = 'auto';
      chartWrapper.style.padding = '0 16px 16px 16px';
      chartWrapper.style.boxSizing = 'border-box';
      root.appendChild(chartWrapper);

      var layoutMode = config.layoutMode || 'marimekko';
      if (layoutMode === 'heatmap_matrix') {
        renderHeatmapMatrix(chartWrapper, colList, subKeysSorted, grandTotal, theme, config, tooltip, formatVal, fSizes);
      } else {
        renderMarimekkoChart(d3, chartWrapper, colList, grandTotal, layoutMode, theme, config, tooltip, formatVal, fSizes);
      }

      done();
    }
  };

  function renderMarimekkoChart(d3, container, colList, grandTotal, layoutMode, theme, config, tooltip, formatVal, fSizes) {
    var width = container.clientWidth || 900;
    var height = container.clientHeight || 450;
    if (height < 280) height = 360;

    var margin = { top: 20, right: 20, bottom: 60, left: 20 };
    var innerW = Math.max(width - margin.left - margin.right, 300);
    var innerH = Math.max(height - margin.top - margin.bottom, 200);

    var isStacked100 = (layoutMode === 'stacked_100');

    var svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      .style('display', 'block');

    var g = svg.append('g')
      .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

    var cumX = 0;
    var colGap = 4;
    var totalGapWidth = colGap * (colList.length - 1);
    var availableW = innerW - totalGapWidth;

    colList.forEach(function (col, idx) {
      var colWidth = isStacked100 ? (availableW / colList.length) : Math.max(col.share * availableW, 14);
      var colX = cumX;
      cumX += colWidth + colGap;

      var colG = g.append('g')
        .attr('class', 'marimekko-col-group')
        .attr('data-col-name', col.name)
        .attr('transform', 'translate(' + colX + ', 0)');

      // Draw segments
      col.segmentList.forEach(function (seg) {
        var segY = seg.y0 * innerH;
        var segH = Math.max((seg.y1 - seg.y0) * innerH, 2);

        var segRect = colG.append('rect')
          .attr('x', 0)
          .attr('y', segY)
          .attr('width', colWidth)
          .attr('height', segH)
          .attr('fill', seg.color)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5)
          .attr('rx', 3)
          .style('cursor', 'pointer')
          .style('transition', 'filter 0.15s ease');

        // Segment text label if space permits
        var showLabels = config.showValueLabels || 'all';
        var isDominant = seg.shareInCol >= 0.15;
        var allowLabel = (showLabels === 'all' && colWidth >= 40 && segH >= 24) ||
          (showLabels === 'peaks_only' && isDominant && colWidth >= 40 && segH >= 20);

        if (allowLabel) {
          colG.append('text')
            .attr('x', colWidth / 2)
            .attr('y', segY + segH / 2 + 4)
            .attr('text-anchor', 'middle')
            .attr('font-size', fSizes.label)
            .attr('font-weight', '700')
            .attr('fill', '#ffffff')
            .style('pointer-events', 'none')
            .text(colWidth > 75 ? seg.name + ' (' + (seg.shareInCol * 100).toFixed(0) + '%)' : (seg.shareInCol * 100).toFixed(0) + '%');
        }

        // Hover & Drill
        segRect.on('mouseenter', function (event) {
          segRect.style('filter', 'brightness(1.15)');
          showTooltip(tooltip, event, col, seg, grandTotal, formatVal, theme, config);
        })
        .on('mousemove', function (event) {
          moveTooltip(tooltip, event);
        })
        .on('mouseleave', function () {
          segRect.style('filter', 'none');
          hideTooltip(tooltip);
        })
        .on('click', function (event) {
          var links = seg.drillLinks && seg.drillLinks.length > 0 ? seg.drillLinks : col.drillLinks;
          if (links && links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
            window.LookerCharts.Utils.openDrillMenu({
              links: links,
              event: event
            });
          }
        });
      });

      // Bottom Category Label
      var labelY = innerH + 16;
      colG.append('text')
        .attr('x', colWidth / 2)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('font-size', fSizes.label)
        .attr('font-weight', '700')
        .attr('fill', theme.text)
        .text(truncateString(col.name, Math.max(Math.floor(colWidth / 7), 5)));

      colG.append('text')
        .attr('x', colWidth / 2)
        .attr('y', labelY + 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', theme.subtext)
        .text(colWidth > 45 ? formatVal(col.totalVolume, null) + ' (' + (col.share * 100).toFixed(0) + '%)' : (col.share * 100).toFixed(0) + '%');
    });
  }

  function renderHeatmapMatrix(container, colList, subKeysSorted, grandTotal, theme, config, tooltip, formatVal, fSizes) {
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

    var thCorner = document.createElement('th');
    thCorner.style.textAlign = 'left';
    thCorner.style.padding = '8px 12px';
    thCorner.textContent = 'Category / Segment';
    trHead.appendChild(thCorner);

    subKeysSorted.forEach(function (sk) {
      var th = document.createElement('th');
      th.style.textAlign = 'right';
      th.style.padding = '8px 12px';
      th.textContent = sk;
      trHead.appendChild(th);
    });

    var thTot = document.createElement('th');
    thTot.style.textAlign = 'right';
    thTot.style.padding = '8px 12px';
    thTot.textContent = 'Total Volume';
    trHead.appendChild(thTot);
    thead.appendChild(trHead);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    colList.forEach(function (col) {
      var tr = document.createElement('tr');
      tr.className = 'marimekko-heatmap-row';
      tr.setAttribute('data-col-name', col.name);
      tr.style.borderBottom = '1px solid ' + theme.border;

      var tdName = document.createElement('td');
      tdName.style.padding = '8px 12px';
      tdName.style.fontWeight = '600';
      tdName.textContent = col.name;
      tr.appendChild(tdName);

      subKeysSorted.forEach(function (sk) {
        var seg = col.segments[sk];
        var td = document.createElement('td');
        td.style.textAlign = 'right';
        td.style.padding = '8px 12px';
        if (seg) {
          var intensity = (seg.volume / (col.totalVolume || 1));
          td.style.backgroundColor = 'rgba(66, 133, 244, ' + (0.1 + intensity * 0.7) + ')';
          td.style.color = intensity > 0.4 ? '#ffffff' : theme.text;
          td.style.fontWeight = '600';
          td.style.cursor = 'pointer';
          td.textContent = formatVal(seg.volume, seg.rendered);

          td.addEventListener('mouseenter', function (e) {
            showTooltip(tooltip, e, col, seg, grandTotal, formatVal, theme, config);
          });
          td.addEventListener('mouseleave', function () {
            hideTooltip(tooltip);
          });
          td.addEventListener('click', function (e) {
            var links = seg.drillLinks && seg.drillLinks.length > 0 ? seg.drillLinks : col.drillLinks;
            if (links && links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({ links: links, event: e });
            }
          });
        } else {
          td.style.color = theme.subtext;
          td.textContent = '-';
        }
        tr.appendChild(td);
      });

      var tdTotal = document.createElement('td');
      tdTotal.style.textAlign = 'right';
      tdTotal.style.padding = '8px 12px';
      tdTotal.style.fontWeight = '700';
      tdTotal.textContent = formatVal(col.totalVolume, null) + ' (' + (col.share * 100).toFixed(1) + '%)';
      tr.appendChild(tdTotal);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
  }

  function showTooltip(tooltip, event, col, seg, grandTotal, formatVal, theme, config) {
    if (!tooltip) return;

    var drillHint = (seg.drillLinks && seg.drillLinks.length > 0) || (col.drillLinks && col.drillLinks.length > 0) ?
      '<div style="margin-top:6px;font-size:10px;color:#93c5fd;font-style:italic;">🔎 Click segment to open Looker Drill Menu</div>' : '';

    var secMetricHtml = (seg.secVolume !== null && seg.secVolume > 0) ?
      `<span style="color:#94a3b8;">Secondary Volume:</span>
       <span style="font-weight:700;text-align:right;">${formatNumber(seg.secVolume, 'compact_number')}</span>` : '';

    var html = `
      <div style="font-weight:700;font-size:13px;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
        <span>${escapeHtml(col.name)} — ${escapeHtml(seg.name)}</span>
        <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${seg.color}33;color:${seg.color};border:1px solid ${seg.color}66;">
          ${(seg.shareInCol * 100).toFixed(1)}% of Column
        </span>
      </div>
      <div style="display:grid;grid-template-columns:auto auto;gap:4px 16px;font-size:11px;">
        <span style="color:#94a3b8;">Segment Volume:</span>
        <span style="font-weight:700;text-align:right;">${formatVal(seg.volume, seg.rendered)}</span>
        
        <span style="color:#94a3b8;">Column Total:</span>
        <span style="font-weight:700;text-align:right;">${formatVal(col.totalVolume, null)} (${(col.share * 100).toFixed(1)}% market)</span>
        
        <span style="color:#94a3b8;">Global Market Share:</span>
        <span style="font-weight:700;text-align:right;color:#38bdf8;">${(seg.shareGlobal * 100).toFixed(2)}%</span>
        ${secMetricHtml}
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
