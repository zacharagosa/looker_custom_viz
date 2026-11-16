/**
 * Cloud Governance & Multi-Cloud Posture Pack - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Solves Enterprise CISO & Cloud Governance Visualization Gaps (b/495201950, b/340585545, b/328594464):
 * Looker lacks native hierarchical circle packing, proportional unit waffle grids,
 * and threshold-anchored force beeswarm distributions for multi-cloud CSPM governance
 * (AWS, GCP, Azure across CIS, ISO 27001, NIST 800-53, PCI-DSS, SOC 2).
 *
 * 4 Multi-Modal Visual Paradigms:
 * 1. "circle_pack": Zoomable D3 Hierarchical Circle Packing (Cloud -> Framework -> Resource/Policy)
 *    with interactive click-to-zoom, breadcrumb bar, and SLA breach halo rings.
 * 2. "waffle_grid": 10x10 Proportional Governance Waffle Grid per Cloud x Framework showing exact
 *    Compliant vs Open Non-Critical vs Critical/High control percentages.
 * 3. "compliance_beeswarm": SLA-Threshold Force Beeswarm plotting every control cluster along a
 *    continuous Posture Compliance % (or Remediation Days) axis with CISO SLA threshold & breach zone.
 * 4. "remediation_ladder": Policy Exposure & Remediation Velocity Ladder contrasting Passed Controls
 *    vs Open/Critical Findings and Avg Days to Remediate against SLA benchmarks.
 *
 * Strictly 2 Option Tabs: Display & Style.
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.pack === 'function' && typeof window.d3.forceSimulation === 'function') {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var iv = setInterval(function () {
        if (window.d3 && typeof window.d3.pack === 'function' && typeof window.d3.forceSimulation === 'function') {
          clearInterval(iv);
          callback(window.d3);
        }
      }, 50);
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://d3js.org/d3.v7.min.js';
    s.onload = function () { callback(window.d3); };
    document.head.appendChild(s);
  }

  var PALETTES = {
    google_enterprise: {
      name: 'Google Enterprise', isDark: false,
      bg: '#ffffff', cardBg: '#f8fafd', text: '#202124', subtext: '#5f6368', border: '#dadce0',
      hudBg: '#f8fafd', hudBorder: '#dadce0', grid: '#e8eaed',
      primary: '#1a73e8', positive: '#1e8e3e', warning: '#f29900', negative: '#d93025',
      clouds: ['#1a73e8', '#00897b', '#9334e6', '#f29900', '#e37400'],
      breachBg: '#fce8e6', breachBorder: '#f5c6c2'
    },
    prisma_secops: {
      name: 'Prisma Cloud SecOps', isDark: false,
      bg: '#ffffff', cardBg: '#f8fafc', text: '#0f172a', subtext: '#475569', border: '#cbd5e1',
      hudBg: '#f1f5f9', hudBorder: '#cbd5e1', grid: '#e2e8f0',
      primary: '#0284c7', positive: '#059669', warning: '#d97706', negative: '#dc2626',
      clouds: ['#0284c7', '#0d9488', '#6366f1', '#f59e0b', '#ec4899'],
      breachBg: '#fef2f2', breachBorder: '#fecaca'
    },
    modern_slate: {
      name: 'Modern Slate', isDark: false,
      bg: '#ffffff', cardBg: '#f8fafc', text: '#0f172a', subtext: '#64748b', border: '#e2e8f0',
      hudBg: '#f8fafc', hudBorder: '#e2e8f0', grid: '#e2e8f0',
      primary: '#2563eb', positive: '#10b981', warning: '#f59e0b', negative: '#ef4444',
      clouds: ['#2563eb', '#0ea5e9', '#64748b', '#8b5cf6', '#14b8a6'],
      breachBg: '#fef2f2', breachBorder: '#fecaca'
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark', isDark: true,
      bg: '#0b0f19', cardBg: '#111827', text: '#f8fafc', subtext: '#94a3b8', border: '#1f2937',
      hudBg: '#111827', hudBorder: '#1f2937', grid: '#1e293b',
      primary: '#22d3ee', positive: '#10b981', warning: '#facc15', negative: '#f43f5e',
      clouds: ['#22d3ee', '#a855f7', '#ec4899', '#3b82f6', '#10b981'],
      breachBg: 'rgba(244, 63, 94, 0.16)', breachBorder: 'rgba(244, 63, 94, 0.45)'
    },
    emerald_finops: {
      name: 'Emerald FinOps', isDark: false,
      bg: '#ffffff', cardBg: '#f0fdf4', text: '#064e3b', subtext: '#047857', border: '#bbf7d0',
      hudBg: '#ecfdf5', hudBorder: '#a7f3d0', grid: '#d1fae5',
      primary: '#059669', positive: '#10b981', warning: '#d97706', negative: '#dc2626',
      clouds: ['#059669', '#0284c7', '#0d9488', '#6366f1', '#14b8a6'],
      breachBg: '#fef2f2', breachBorder: '#fecaca'
    },
    sunset_media: {
      name: 'Sunset Media', isDark: false,
      bg: '#ffffff', cardBg: '#fff7ed', text: '#1c1917', subtext: '#78716c', border: '#fed7aa',
      hudBg: '#fff7ed', hudBorder: '#fed7aa', grid: '#ffedd5',
      primary: '#ea580c', positive: '#16a34a', warning: '#f59e0b', negative: '#be123c',
      clouds: ['#ea580c', '#db2777', '#7c3aed', '#f59e0b', '#0284c7'],
      breachBg: '#fff1f2', breachBorder: '#fecdd3'
    },
    wellverse_healthcare: {
      name: 'Wellverse Healthcare', isDark: false,
      bg: '#ffffff', cardBg: '#f0fdfa', text: '#0f172a', subtext: '#475569', border: '#99f6e4',
      hudBg: '#f0fdfa', hudBorder: '#99f6e4', grid: '#ccfbf1',
      primary: '#0d9488', positive: '#059669', warning: '#f59e0b', negative: '#e11d48',
      clouds: ['#0d9488', '#0284c7', '#6366f1', '#14b8a6', '#f59e0b'],
      breachBg: '#fff1f2', breachBorder: '#fecdd3'
    },
    custom_hex: {
      name: 'Custom Hex Override', isDark: false,
      bg: '#ffffff', cardBg: '#f8fafc', text: '#1e293b', subtext: '#64748b', border: '#e2e8f0',
      hudBg: '#f8fafc', hudBorder: '#cbd5e1', grid: '#e2e8f0',
      primary: '#1a73e8', positive: '#10b981', warning: '#f59e0b', negative: '#ef4444',
      clouds: ['#1a73e8', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4'],
      breachBg: '#fef2f2', breachBorder: '#fecaca'
    }
  };

  var FONT = '"Google Sans", Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function cellVal(row, name) {
    if (!row || !name) return null;
    var c = row[name];
    if (c === undefined || c === null) return null;
    if (typeof c === 'object' && 'value' in c) return c.value;
    return c;
  }

  function cellLinks(row, fieldList) {
    for (var i = 0; i < fieldList.length; i++) {
      var f = fieldList[i];
      if (f && row[f.name] && Array.isArray(row[f.name].links) && row[f.name].links.length) {
        return row[f.name].links;
      }
    }
    var keys = Object.keys(row || {});
    for (var j = 0; j < keys.length; j++) {
      var cell = row[keys[j]];
      if (cell && Array.isArray(cell.links) && cell.links.length) return cell.links;
    }
    return [];
  }

  function fldLabel(f) { return f ? (f.label_short || f.label || f.name) : ''; }

  function resolveField(list, overrideVal, hints, fallbackIdx, usedSet) {
    if (!list || !list.length) return null;
    if (overrideVal) {
      var o = String(overrideVal).trim();
      for (var i = 0; i < list.length; i++) {
        if (list[i].name === o || list[i].label === o || list[i].label_short === o) return list[i];
      }
      var idx = parseInt(o, 10);
      if (!isNaN(idx) && idx >= 1 && idx <= list.length) return list[idx - 1];
    }
    if (hints && hints.length) {
      for (var j = 0; j < list.length; j++) {
        if (usedSet && usedSet[list[j].name]) continue;
        var sn = String(list[j].name || '').split('.').pop().toLowerCase();
        var sl = String(list[j].label_short || '').toLowerCase();
        for (var h = 0; h < hints.length; h++) {
          if (sn.indexOf(hints[h]) >= 0 || sl.indexOf(hints[h]) >= 0) return list[j];
        }
      }
    }
    if (fallbackIdx >= 0 && fallbackIdx < list.length && (!usedSet || !usedSet[list[fallbackIdx].name])) {
      return list[fallbackIdx];
    }
    if (fallbackIdx >= 0) {
      for (var k = 0; k < list.length; k++) {
        if (!usedSet || !usedSet[list[k].name]) return list[k];
      }
    }
    return null;
  }

  function formatVal(val, fmt, isScorePct) {
    if (val === null || val === undefined || isNaN(val)) return '\u2014';
    var n = Number(val);
    if ((fmt === 'auto' && isScorePct) || fmt === 'percentage') {
      var pct = Math.abs(n) <= 1.0001 ? n * 100 : n;
      return pct.toFixed(1) + '%';
    }
    if (fmt === 'compact_currency') {
      var a = Math.abs(n), sg = n < 0 ? '-$' : '$';
      if (a >= 1e9) return sg + (a / 1e9).toFixed(2) + 'B';
      if (a >= 1e6) return sg + (a / 1e6).toFixed(2) + 'M';
      if (a >= 1e3) return sg + (a / 1e3).toFixed(1) + 'K';
      return sg + a.toFixed(a % 1 === 0 ? 0 : 2);
    }
    if (fmt === 'compact_number' || fmt === 'auto') {
      var a2 = Math.abs(n), sg2 = n < 0 ? '-' : '';
      if (a2 >= 1e9) return sg2 + (a2 / 1e9).toFixed(2) + 'B';
      if (a2 >= 1e6) return sg2 + (a2 / 1e6).toFixed(2) + 'M';
      if (a2 >= 1e3) return sg2 + (a2 / 1e3).toFixed(1) + 'K';
      return sg2 + (a2 % 1 === 0 ? String(Math.round(a2)) : a2.toFixed(1));
    }
    if (fmt === 'decimal_1') return n.toFixed(1);
    if (fmt === 'decimal_2') return n.toFixed(2);
    if (fmt === 'raw') return String(n);
    return n.toLocaleString();
  }

  function normalizePct01(val) {
    if (val === null || val === undefined || isNaN(val)) return 0;
    var n = Number(val);
    return n > 1.0001 ? n / 100 : n;
  }

  function percentile(sortedArr, p) {
    if (!sortedArr || !sortedArr.length) return 0;
    if (sortedArr.length === 1) return sortedArr[0];
    var idx = (sortedArr.length - 1) * p;
    var lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sortedArr[lo];
    return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
  }

  var visObject = {
    id: 'cloud_governance_posture_pack',
    label: 'Cloud Governance & Multi-Cloud Posture Pack',
    options: {
      // =====================================================
      // SECTION 1: DISPLAY (Strictly 2 clean tabs)
      // =====================================================
      layoutMode: {
        type: 'string', label: 'Visual Paradigm Mode', display: 'select',
        values: [
          { 'Zoomable Hierarchical Circle Pack': 'circle_pack' },
          { '10x10 Proportional Governance Waffle Grid': 'waffle_grid' },
          { 'SLA-Threshold Force Beeswarm': 'compliance_beeswarm' },
          { 'Policy Remediation Velocity Ladder': 'remediation_ladder' }
        ],
        default: 'circle_pack', section: 'Display', order: 1
      },
      dimLevel1Override: {
        type: 'string', label: 'Tier 1 Dimension (Cloud Provider / Org)', display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }], default: '',
        section: 'Display', order: 2
      },
      dimLevel2Override: {
        type: 'string', label: 'Tier 2 Dimension (Compliance Framework)', display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }], default: '',
        section: 'Display', order: 3
      },
      dimLevel3Override: {
        type: 'string', label: 'Tier 3 Dimension (Resource / Policy Leaf)', display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }], default: '',
        section: 'Display', order: 4
      },
      sizeMeasureOverride: {
        type: 'string', label: 'Volume / Bubble Size Measure (Open Findings)', display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }], default: '',
        section: 'Display', order: 5
      },
      scoreMeasureOverride: {
        type: 'string', label: 'Compliance Posture Score Measure (%)', display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }], default: '',
        section: 'Display', order: 6
      },
      criticalMeasureOverride: {
        type: 'string', label: 'Critical / High Open Findings Measure', display: 'select',
        values: [{ 'Auto / None (run the query to populate field choices)': '' }], default: '',
        section: 'Display', order: 7
      },
      agingMeasureOverride: {
        type: 'string', label: 'Avg Remediation Days Measure', display: 'select',
        values: [{ 'Auto / None (run the query to populate field choices)': '' }], default: '',
        section: 'Display', order: 8
      },
      targetMeasureOverride: {
        type: 'string', label: 'Benchmark / Target Measure (optional)', display: 'select',
        values: [{ 'Auto / None (run the query to populate field choices)': '' }], default: '',
        section: 'Display', order: 9
      },
      targetMode: {
        type: 'string', label: 'CISO Compliance SLA Target Mode', display: 'select',
        values: [
          { 'Fixed SLA Compliance Target': 'fixed' },
          { 'Measure Column': 'measure' },
          { 'Dataset Mean Compliance': 'dataset_mean' },
          { 'Dataset Median (P50)': 'dataset_median' },
          { 'Percentile P75 Target': 'percentile_p75' },
          { 'Percentile P90 Target': 'percentile_p90' },
          { 'None (Hide Benchmark)': 'none' }
        ],
        default: 'fixed', section: 'Display', order: 10
      },
      fixedTargetValue: {
        type: 'number', label: 'Fixed Compliance SLA Target (0.85 = 85%)', default: 0.85,
        section: 'Display', order: 11
      },
      referenceLineLabel: {
        type: 'string', label: 'SLA Reference Label', default: 'CISO SLA Target (85%)',
        section: 'Display', order: 12
      },
      anomalyThresholdPct: {
        type: 'number', label: 'Critical Breach Alert Threshold (%)', default: 65,
        section: 'Display', order: 13
      },
      sortBy: {
        type: 'string', label: 'Sort Clusters & Policies By', display: 'select',
        values: [
          { 'Open Findings Descending': 'findings_desc' },
          { 'Compliance Score Ascending (Worst First)': 'compliance_asc' },
          { 'Compliance Score Descending (Best First)': 'compliance_desc' },
          { 'Remediation Days Descending (Slowest First)': 'aging_desc' },
          { 'Alphabetical': 'alpha_asc' }
        ],
        default: 'findings_desc', section: 'Display', order: 14
      },
      topNLimit: {
        type: 'number', label: 'Top-N Leaf Nodes Limit (0 = All)', default: 0,
        section: 'Display', order: 15
      },
      enableOtherRollup: {
        type: 'boolean', label: 'Group Excess Nodes into "Other Controls"', default: true,
        section: 'Display', order: 16
      },
      suppressZeroNull: {
        type: 'boolean', label: 'Suppress Zero / Null Findings', default: true,
        section: 'Display', order: 17
      },
      hudMode: {
        type: 'string', label: 'Executive Governance HUD Mode', display: 'select',
        values: [
          { 'Full Scorecard HUD': 'scorecard' },
          { 'Compact Strip': 'compact_strip' },
          { 'Hidden': 'hidden' }
        ],
        default: 'scorecard', section: 'Display', order: 18
      },
      labelDensity: {
        type: 'string', label: 'Bubble & Cell Label Density', display: 'select',
        values: [
          { 'All Eligible Labels': 'all' },
          { 'Peaks & Breach Clusters Only': 'peaks_only' },
          { 'Hidden (Hover Tooltip Only)': 'hidden' }
        ],
        default: 'all', section: 'Display', order: 19
      },
      showLegend: {
        type: 'boolean', label: 'Show Governance Status Legend', default: true,
        section: 'Display', order: 20
      },
      showSearch: {
        type: 'boolean', label: 'Show Interactive Cloud / Policy Search', default: true,
        section: 'Display', order: 21
      },
      customTitle: {
        type: 'string', label: 'Custom Title Override', default: '',
        section: 'Display', order: 22
      },
      customSubtitle: {
        type: 'string', label: 'Custom Subtitle Override', default: '',
        section: 'Display', order: 23
      },

      // =====================================================
      // SECTION 2: STYLE (Strictly 2 clean tabs)
      // =====================================================
      colorPalette: {
        type: 'string', label: 'Enterprise Brand Palette', display: 'select',
        values: [
          { 'Google Enterprise': 'google_enterprise' },
          { 'Prisma Cloud SecOps': 'prisma_secops' },
          { 'Modern Slate': 'modern_slate' },
          { 'Cyberpunk Dark': 'cyberpunk_dark' },
          { 'Emerald FinOps': 'emerald_finops' },
          { 'Sunset Media': 'sunset_media' },
          { 'Wellverse Healthcare': 'wellverse_healthcare' },
          { 'Custom Hex Override': 'custom_hex' }
        ],
        default: 'google_enterprise', section: 'Style', order: 1
      },
      customPrimaryColor: {
        type: 'string', label: 'Custom Primary Brand Hex', display: 'color', default: '',
        section: 'Style', order: 2
      },
      customPositiveColor: {
        type: 'string', label: 'Custom Compliant / Passing Hex', display: 'color', default: '',
        section: 'Style', order: 3
      },
      customNegativeColor: {
        type: 'string', label: 'Custom Breach / Critical Risk Hex', display: 'color', default: '',
        section: 'Style', order: 4
      },
      metricPolarity: {
        type: 'string', label: 'Metric Polarity', display: 'select',
        values: [
          { 'Higher Compliance Score is Better': 'higher_is_better' },
          { 'Lower Findings / Days is Better': 'lower_is_better' }
        ],
        default: 'higher_is_better', section: 'Style', order: 5
      },
      fontScale: {
        type: 'string', label: 'Typography Font Scale', display: 'select',
        values: [
          { 'Compact': 'compact' },
          { 'Standard': 'standard' },
          { 'Large Presentation': 'large' }
        ],
        default: 'standard', section: 'Style', order: 6
      },
      valueFormat: {
        type: 'string', label: 'Primary Value Format', display: 'select',
        values: [
          { 'Auto (Smart Score % / Counts)': 'auto' },
          { 'Percentage (84.2%)': 'percentage' },
          { 'Compact Number (1.2K)': 'compact_number' },
          { 'Compact Currency ($1.2M)': 'compact_currency' },
          { 'Decimal (1dp)': 'decimal_1' },
          { 'Raw': 'raw' }
        ],
        default: 'percentage', section: 'Style', order: 7
      },
      bubblePadding: {
        type: 'number', label: 'Circle Pack Bubble Padding (px)', default: 5,
        section: 'Style', order: 8
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      if (!queryResponse || !queryResponse.fields || typeof self.trigger !== 'function') return;
      var f = queryResponse.fields;
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (!meas.length && f.table_calculations && f.table_calculations.length) meas = f.table_calculations;

      var sig = dims.map(function (d) { return d.name; }).join('|') + '::' + meas.map(function (m) { return m.name; }).join('|');
      if (self._dynamicFieldSignature === sig) return;
      self._dynamicFieldSignature = sig;

      if (!self._baseOptions) self._baseOptions = self.options || {};
      var newOptions = {};
      Object.keys(self._baseOptions).forEach(function (k) {
        newOptions[k] = Object.assign({}, self._baseOptions[k]);
      });

      var usedD = {}, usedM = {};
      var dim1 = resolveField(dims, '', ['cloud_provider', 'provider', 'cloud', 'account'], 0, usedD); if (dim1) usedD[dim1.name] = true;
      var dim2 = resolveField(dims, '', ['framework', 'standard', 'compliance'], 1, usedD); if (dim2) usedD[dim2.name] = true;
      var dim3 = resolveField(dims, '', ['resource_type', 'policy_name', 'resource', 'policy'], 2, usedD); if (dim3) usedD[dim3.name] = true;
      var mSize = resolveField(meas, '', ['open_findings', 'open', 'findings', 'count'], 0, usedM); if (mSize) usedM[mSize.name] = true;
      var mScore = resolveField(meas, '', ['posture_compliance_score', 'compliance_score', 'score', 'posture'], 1, usedM); if (mScore) usedM[mScore.name] = true;
      var mCrit = resolveField(meas, '', ['critical_high', 'critical', 'high'], -1, usedM); if (mCrit) usedM[mCrit.name] = true;
      var mAge = resolveField(meas, '', ['avg_days_to_remediate', 'days', 'remediate', 'age'], -1, usedM); if (mAge) usedM[mAge.name] = true;

      var SPECS = {
        dimLevel1Override: { list: dims, auto: dim1 },
        dimLevel2Override: { list: dims, auto: dim2 },
        dimLevel3Override: { list: dims, auto: dim3 },
        sizeMeasureOverride: { list: meas, auto: mSize },
        scoreMeasureOverride: { list: meas, auto: mScore },
        criticalMeasureOverride: { list: meas, auto: mCrit },
        agingMeasureOverride: { list: meas, auto: mAge },
        targetMeasureOverride: { list: meas, auto: null }
      };

      Object.keys(SPECS).forEach(function (key) {
        if (!newOptions[key]) return;
        var sp = SPECS[key];
        var autoLbl = sp.auto ? ('Auto \u2192 ' + fldLabel(sp.auto)) : 'Auto / None';
        var values = [];
        var ae = {}; ae[autoLbl] = ''; values.push(ae);
        var seen = {};
        sp.list.forEach(function (fld) {
          var lbl = fldLabel(fld);
          if (seen[lbl]) lbl = lbl + ' (' + fld.name + ')';
          seen[lbl] = true;
          var e = {}; e[lbl] = fld.name; values.push(e);
        });
        newOptions[key].type = 'string';
        newOptions[key].display = 'select';
        newOptions[key].values = values;
        newOptions[key].default = '';
      });

      try { self.trigger('registerOptions', newOptions); }
      catch (e) { console.warn('registerOptions unavailable:', e); }
    },

    create: function (element, config) {
      element.innerHTML = '';
      element.style.boxSizing = 'border-box';
      element.style.padding = '0';
      element.style.overflow = 'hidden';
      element.style.display = 'flex';
      element.style.flexDirection = 'column';
      element.style.fontFamily = FONT;

      var header = document.createElement('div');
      header.className = 'cgp-header';
      header.style.cssText = 'display:flex;flex:0 0 auto;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;';
      element.appendChild(header);

      var hud = document.createElement('div');
      hud.className = 'cgp-hud';
      hud.style.cssText = 'display:flex;flex:0 0 auto;gap:8px;flex-wrap:wrap;align-items:stretch;';
      element.appendChild(hud);

      var crumb = document.createElement('div');
      crumb.className = 'cgp-crumb';
      crumb.style.cssText = 'display:none;flex:0 0 auto;align-items:center;gap:6px;flex-wrap:wrap;';
      element.appendChild(crumb);

      var chart = document.createElement('div');
      chart.className = 'cgp-chart';
      chart.style.cssText = 'flex:1 1 0;min-height:0;position:relative;width:100%;overflow:hidden;';
      element.appendChild(chart);

      var tooltip = document.createElement('div');
      tooltip.className = 'cgp-tooltip';
      tooltip.style.cssText = 'position:fixed;display:none;pointer-events:none;z-index:99999;padding:10px 13px;border-radius:8px;' +
        'font-size:12px;line-height:1.45;max-width:320px;box-shadow:0 10px 26px rgba(0,0,0,0.2);font-family:' + FONT + ';';
      document.body.appendChild(tooltip);

      this._header = header;
      this._hud = hud;
      this._crumb = crumb;
      this._chart = chart;
      this._tooltip = tooltip;
      this._element = element;
      this._searchTerm = '';
      this._zoomPath = null;
      this._setupResizeObserver(element);
    },

    _setupResizeObserver: function (element) {
      var self = this;
      if (this._resizeObserver) {
        try { this._resizeObserver.disconnect(); } catch (e) {}
        this._resizeObserver = null;
      }
      if (typeof ResizeObserver !== 'undefined' && element) {
        this._resizeObserver = new ResizeObserver(function () { self._onResize(); });
        this._resizeObserver.observe(element);
      }
      if (!this._windowResizeBound) {
        this._windowResizeBound = true;
        window.addEventListener('resize', function () { self._onResize(); });
      }
    },

    _onResize: function () {
      var self = this;
      if (!self._lastData || !self._lastQueryResponse) return;
      var el = self._element;
      if (!el) return;
      var cw = el.clientWidth || 0, ch = el.clientHeight || 0;
      if (cw <= 10 || ch <= 10) return;
      if (self._lastRenderW && self._lastRenderH &&
          Math.abs(cw - self._lastRenderW) < 4 && Math.abs(ch - self._lastRenderH) < 4) return;
      if (self._resizeTimer) clearTimeout(self._resizeTimer);
      self._resizeTimer = setTimeout(function () {
        if (self._lastData && self._lastQueryResponse) {
          self.updateAsync(self._lastData, el, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
        }
      }, 60);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      var self = this;
      this._lastData = data;
      this._registerDynamicFieldOptions(queryResponse);
      if (this.clearErrors) try { this.clearErrors(); } catch (e) {}
      this._element = element;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;
      this._lastRenderW = (element && element.clientWidth) || 0;
      this._lastRenderH = (element && element.clientHeight) || 0;
      if (!this._resizeObserver && element) this._setupResizeObserver(element);
      if (!this._chart || !this._chart.parentNode) this.create(element, config);

      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config || {}, queryResponse);
        } catch (e) {
          console.error('cloud_governance_posture_pack render error', e);
          if (self.addError) try { self.addError({ title: 'Render Error', message: String(e && e.message || e) }); } catch (e2) {}
        }
        if (typeof done === 'function') done();
      });
    },

    _resolvePalette: function (config) {
      var base = PALETTES[config.colorPalette] || PALETTES.google_enterprise;
      var pal = Object.assign({}, base, { clouds: base.clouds.slice() });
      if (config.customPrimaryColor && /^#[0-9a-fA-F]{3,8}$/.test(config.customPrimaryColor.trim())) {
        pal.primary = config.customPrimaryColor.trim();
        pal.clouds[0] = pal.primary;
      }
      if (config.customPositiveColor && /^#[0-9a-fA-F]{3,8}$/.test(config.customPositiveColor.trim())) {
        pal.positive = config.customPositiveColor.trim();
      }
      if (config.customNegativeColor && /^#[0-9a-fA-F]{3,8}$/.test(config.customNegativeColor.trim())) {
        pal.negative = config.customNegativeColor.trim();
      }
      return pal;
    },

    _renderEmpty: function (pal, msg, sub) {
      this._header.style.display = 'none';
      this._hud.style.display = 'none';
      this._crumb.style.display = 'none';
      this._chart.innerHTML = '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:' + pal.subtext + ';font-family:' + FONT + '">' +
        '<div style="font-size:14px;font-weight:700;color:' + pal.text + '">' + esc(msg) + '</div>' +
        (sub ? '<div style="font-size:11.5px">' + esc(sub) + '</div>' : '') + '</div>';
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;
      var pal = this._resolvePalette(config);
      var fs = config.fontScale === 'compact' ? 0.86 : (config.fontScale === 'large' ? 1.18 : 1.0);
      var valueFormat = config.valueFormat || 'percentage';
      var polarity = config.metricPolarity || 'higher_is_better';
      element.style.background = pal.bg;
      element.style.color = pal.text;

      var f = (queryResponse && queryResponse.fields) || {};
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (!meas.length && f.table_calculations && f.table_calculations.length) meas = f.table_calculations;

      if (!data || !data.length) { this._renderEmpty(pal, 'No compliance posture rows returned', 'Adjust filters or date ranges in the Looker Explore.'); return; }
      if (!dims.length || !meas.length) { this._renderEmpty(pal, 'Add dimensions & measures', 'Requires at least 1 Dimension (Cloud / Framework) and 1 Measure (Findings / Compliance Score).'); return; }

      var usedD = {}, usedM = {};
      var fD1 = resolveField(dims, config.dimLevel1Override, ['cloud_provider', 'provider', 'cloud', 'account'], 0, usedD); if (fD1) usedD[fD1.name] = true;
      var fD2 = resolveField(dims, config.dimLevel2Override, ['framework', 'standard', 'compliance'], 1, usedD); if (fD2) usedD[fD2.name] = true;
      var fD3 = resolveField(dims, config.dimLevel3Override, ['resource_type', 'policy_name', 'resource', 'policy'], 2, usedD); if (fD3) usedD[fD3.name] = true;

      var fSize = resolveField(meas, config.sizeMeasureOverride, ['open_findings', 'open', 'findings', 'count'], 0, usedM); if (fSize) usedM[fSize.name] = true;
      var fScore = resolveField(meas, config.scoreMeasureOverride, ['posture_compliance_score', 'compliance_score', 'score', 'posture'], 1, usedM); if (fScore) usedM[fScore.name] = true;
      var fCrit = resolveField(meas, config.criticalMeasureOverride, ['critical_high', 'critical', 'high'], -1, usedM); if (fCrit) usedM[fCrit.name] = true;
      var fAge = resolveField(meas, config.agingMeasureOverride, ['avg_days_to_remediate', 'days', 'remediate', 'age'], -1, usedM); if (fAge) usedM[fAge.name] = true;
      var fTarget = config.targetMeasureOverride ? resolveField(meas, config.targetMeasureOverride, [], -1, {}) : null;

      var fCount = meas.find(function (m) { return String(m.name || '').split('.').pop() === 'count'; }) || resolveField(meas, '', ['total_count', 'total_findings', 'evaluated'], -1, {});
      var fPassed = resolveField(meas, '', ['passed_count', 'passed'], -1, {});

      if (!fD1 || !fSize) { this._renderEmpty(pal, 'Missing required fields', 'Select a Tier 1 Dimension and Volume Measure under Display.'); return; }

      var suppressZeroNull = config.suppressZeroNull !== false;

      // Aggregate rows client-side O(N) into leaf records keyed by (d1, d2, d3)
      var leafMap = {};
      var leafList = [];
      var dimFieldsList = [fD1, fD2, fD3, fSize, fScore].filter(Boolean);

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var v1 = cellVal(row, fD1.name);
        if (v1 === null || v1 === undefined || String(v1).trim() === '') {
          if (suppressZeroNull) continue;
          v1 = '(Unassigned)';
        }
        v1 = String(v1);
        var v2 = fD2 ? cellVal(row, fD2.name) : 'All Controls';
        v2 = (v2 === null || v2 === undefined || String(v2).trim() === '') ? 'General' : String(v2);
        var v3 = fD3 ? cellVal(row, fD3.name) : v2;
        v3 = (v3 === null || v3 === undefined || String(v3).trim() === '') ? v2 : String(v3);

        var openVal = Number(cellVal(row, fSize.name));
        if (isNaN(openVal)) openVal = 0;
        var totalVal = fCount ? Number(cellVal(row, fCount.name)) : openVal;
        if (isNaN(totalVal) || totalVal <= 0) totalVal = Math.max(openVal, 1);
        var passedVal = fPassed ? Number(cellVal(row, fPassed.name)) : Math.max(0, totalVal - openVal);
        if (isNaN(passedVal)) passedVal = Math.max(0, totalVal - openVal);

        var critVal = fCrit ? Number(cellVal(row, fCrit.name)) : 0;
        if (isNaN(critVal)) critVal = 0;
        var ageVal = fAge ? Number(cellVal(row, fAge.name)) : 0;
        if (isNaN(ageVal)) ageVal = 0;

        var rawScore = fScore ? Number(cellVal(row, fScore.name)) : (totalVal > 0 ? passedVal / totalVal : 0);
        if (isNaN(rawScore)) rawScore = totalVal > 0 ? passedVal / totalVal : 0;
        var score01 = normalizePct01(rawScore);

        var tgtVal = fTarget ? Number(cellVal(row, fTarget.name)) : NaN;
        if (suppressZeroNull && openVal <= 0 && totalVal <= 0) continue;

        var key = v1 + '||' + v2 + '||' + v3;
        if (!leafMap[key]) {
          leafMap[key] = {
            key: key, d1: v1, d2: v2, d3: v3,
            open: 0, total: 0, passed: 0, crit: 0,
            weightedScoreSum: 0, weightedAgeSum: 0, weightSum: 0,
            targetSum: 0, targetCount: 0,
            links: cellLinks(row, dimFieldsList)
          };
          leafList.push(leafMap[key]);
        }
        var rec = leafMap[key];
        var w = Math.max(totalVal, 1);
        rec.open += openVal;
        rec.total += totalVal;
        rec.passed += passedVal;
        rec.crit += critVal;
        rec.weightedScoreSum += score01 * w;
        rec.weightedAgeSum += ageVal * w;
        rec.weightSum += w;
        if (!isNaN(tgtVal)) { rec.targetSum += normalizePct01(tgtVal); rec.targetCount += 1; }
      }

      leafList.forEach(function (r) {
        r.score01 = r.weightSum > 0 ? (r.weightedScoreSum / r.weightSum) : 0;
        r.avgAge = r.weightSum > 0 ? (r.weightedAgeSum / r.weightSum) : 0;
        r.sizeVal = Math.max(r.open, suppressZeroNull ? 0 : 1);
      });

      if (suppressZeroNull) {
        leafList = leafList.filter(function (r) { return r.sizeVal > 0 || r.total > 0; });
      }
      if (!leafList.length) { this._renderEmpty(pal, 'All rows suppressed', 'Disable "Suppress Zero / Null Findings" or broaden query filters.'); return; }

      // ---- Search Filter
      var W = element.clientWidth || 720;
      var H = element.clientHeight || 420;
      var q = (this._searchTerm || '').toLowerCase().trim();
      var filteredLeaves = q ? leafList.filter(function (r) {
        return (r.d1 + ' ' + r.d2 + ' ' + r.d3).toLowerCase().indexOf(q) >= 0;
      }) : leafList.slice();

      // ---- Sorting & Top-N Rollup
      var sortBy = config.sortBy || 'findings_desc';
      filteredLeaves.sort(function (a, b) {
        if (sortBy === 'compliance_asc') return a.score01 - b.score01 || b.open - a.open;
        if (sortBy === 'compliance_desc') return b.score01 - a.score01 || b.open - a.open;
        if (sortBy === 'aging_desc') return b.avgAge - a.avgAge || b.open - a.open;
        if (sortBy === 'alpha_asc') return (a.d1 + a.d2 + a.d3).localeCompare(b.d1 + b.d2 + b.d3);
        return b.open - a.open || a.score01 - b.score01;
      });

      var topN = Number(config.topNLimit);
      if (!isNaN(topN) && topN > 0 && filteredLeaves.length > topN) {
        var kept = filteredLeaves.slice(0, topN);
        if (config.enableOtherRollup !== false) {
          var rest = filteredLeaves.slice(topN);
          var other = {
            key: 'other||other||other', d1: 'Other Clouds', d2: 'Other Controls', d3: 'Other (' + rest.length + ')',
            open: 0, total: 0, passed: 0, crit: 0, weightedScoreSum: 0, weightedAgeSum: 0, weightSum: 0, links: []
          };
          rest.forEach(function (r) {
            other.open += r.open; other.total += r.total; other.passed += r.passed; other.crit += r.crit;
            other.weightedScoreSum += r.score01 * r.weightSum;
            other.weightedAgeSum += r.avgAge * r.weightSum;
            other.weightSum += r.weightSum;
          });
          other.score01 = other.weightSum > 0 ? other.weightedScoreSum / other.weightSum : 0;
          other.avgAge = other.weightSum > 0 ? other.weightedAgeSum / other.weightSum : 0;
          other.sizeVal = Math.max(other.open, 1);
          kept.push(other);
        }
        filteredLeaves = kept;
      }

      // ---- Benchmark Target SLA Calculation
      var targetMode = config.targetMode || 'fixed';
      var targetScore01 = normalizePct01(config.fixedTargetValue !== undefined ? Number(config.fixedTargetValue) : 0.85);
      if (isNaN(targetScore01) || targetScore01 <= 0) targetScore01 = 0.85;
      if (targetMode === 'measure') {
        var tVals = filteredLeaves.filter(function (r) { return r.targetCount > 0; }).map(function (r) { return r.targetSum / r.targetCount; });
        if (tVals.length) targetScore01 = tVals.reduce(function (s, v) { return s + v; }, 0) / tVals.length;
      } else if (targetMode === 'dataset_mean' || targetMode === 'dataset_median' || targetMode === 'percentile_p75' || targetMode === 'percentile_p90') {
        var sArr = filteredLeaves.map(function (r) { return r.score01; }).sort(function (a, b) { return a - b; });
        if (targetMode === 'dataset_mean') targetScore01 = sArr.reduce(function (s, v) { return s + v; }, 0) / sArr.length;
        else if (targetMode === 'dataset_median') targetScore01 = percentile(sArr, 0.50);
        else if (targetMode === 'percentile_p75') targetScore01 = percentile(sArr, 0.75);
        else targetScore01 = percentile(sArr, 0.90);
      }
      var showTarget = targetMode !== 'none';
      var refLabel = (config.referenceLineLabel && config.referenceLineLabel.trim())
        ? config.referenceLineLabel.trim()
        : ('SLA Target (' + (targetScore01 * 100).toFixed(0) + '%)');
      var anomalyThresh01 = normalizePct01(config.anomalyThresholdPct !== undefined ? Number(config.anomalyThresholdPct) : 65);
      if (isNaN(anomalyThresh01)) anomalyThresh01 = 0.65;

      // ---- Header (Title + Search + Legend)
      var header = this._header;
      header.innerHTML = '';
      var hasTitle = !!(config.customTitle && config.customTitle.trim());
      var hasSub = !!(config.customSubtitle && config.customSubtitle.trim());
      var showSearch = config.showSearch !== false && H >= 180 && W >= 360;
      if (hasTitle || hasSub || showSearch || config.showLegend !== false) {
        header.style.display = 'flex';
        header.style.padding = (W < 460 ? '6px 8px 3px' : '8px 12px 4px');

        var leftH = document.createElement('div');
        leftH.style.cssText = 'display:flex;flex-direction:column;min-width:0;flex:1 1 auto;';
        if (hasTitle) {
          var tEl = document.createElement('div');
          tEl.style.cssText = 'font-size:' + (14 * fs) + 'px;font-weight:700;color:' + pal.text + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
          tEl.textContent = config.customTitle.trim();
          leftH.appendChild(tEl);
        }
        if (hasSub) {
          var sEl = document.createElement('div');
          sEl.style.cssText = 'font-size:' + (11 * fs) + 'px;color:' + pal.subtext + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
          sEl.textContent = config.customSubtitle.trim();
          leftH.appendChild(sEl);
        }
        if (!hasTitle && config.showLegend !== false) {
          var leg = document.createElement('div');
          leg.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:' + (10.5 * fs) + 'px;color:' + pal.subtext + ';';
          var items = [
            { col: pal.positive, lbl: 'SLA Compliant (\u2265' + Math.round(targetScore01 * 100) + '%)' },
            { col: pal.warning, lbl: 'At-Risk (' + Math.round(anomalyThresh01 * 100) + '-' + Math.round(targetScore01 * 100) + '%)' },
            { col: pal.negative, lbl: 'Critical Breach (<' + Math.round(anomalyThresh01 * 100) + '%)' }
          ];
          items.forEach(function (it) {
            var sp = document.createElement('span');
            sp.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-weight:600;';
            sp.innerHTML = '<span style="width:9px;height:9px;border-radius:50%;background:' + it.col + ';display:inline-block;"></span>' + esc(it.lbl);
            leg.appendChild(sp);
          });
          leftH.appendChild(leg);
        }
        header.appendChild(leftH);

        if (showSearch) {
          var inp = document.createElement('input');
          inp.type = 'text';
          inp.placeholder = 'Filter cloud, framework, policy...';
          inp.value = self._searchTerm || '';
          inp.style.cssText = 'padding:4px 9px;font-size:' + (11 * fs) + 'px;border-radius:6px;border:1px solid ' + pal.border + ';' +
            'background:' + pal.hudBg + ';color:' + pal.text + ';outline:none;min-width:165px;max-width:230px;font-family:' + FONT + ';';
          inp.oninput = function () {
            self._searchTerm = inp.value;
            self._render(d3, data, element, config, queryResponse);
          };
          header.appendChild(inp);
        }
      } else {
        header.style.display = 'none';
      }

      if (!filteredLeaves.length) {
        this._hud.style.display = 'none';
        this._crumb.style.display = 'none';
        this._chart.innerHTML = '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:' + pal.subtext + '">' +
          '<div style="font-size:13px;font-weight:700;color:' + pal.text + '">No matching controls for "' + esc(this._searchTerm) + '"</div>' +
          '<div style="font-size:11px">Clear search to restore all ' + leafList.length + ' control clusters.</div></div>';
        return;
      }

      // ---- Aggregate KPIs for HUD
      var sumOpen = 0, sumTotal = 0, sumPassed = 0, sumCrit = 0, wScore = 0, wAge = 0, wTot = 0, breachCount = 0;
      filteredLeaves.forEach(function (r) {
        sumOpen += r.open; sumTotal += r.total; sumPassed += r.passed; sumCrit += r.crit;
        wScore += r.score01 * r.weightSum;
        wAge += r.avgAge * r.weightSum;
        wTot += r.weightSum;
        if (r.score01 < anomalyThresh01) breachCount += 1;
      });
      var fleetScore = wTot > 0 ? wScore / wTot : 0;
      var fleetAge = wTot > 0 ? wAge / wTot : 0;
      var slaPass = polarity === 'lower_is_better' ? (fleetScore <= targetScore01) : (fleetScore >= targetScore01);

      var hud = this._hud;
      var hudMode = config.hudMode || 'scorecard';
      if (hudMode !== 'hidden' && H >= 150) {
        hud.style.display = 'flex';
        hud.style.padding = (W < 460 ? '4px 8px 6px' : '4px 12px 6px');
        var compact = hudMode === 'compact_strip' || W < 560;
        var cards = [
          {
            k: 'Fleet Compliance Posture',
            v: formatVal(fleetScore, 'percentage', true),
            s: showTarget ? ((slaPass ? '\u2713 Meets ' : '\u26A0 Below ') + refLabel) : (filteredLeaves.length + ' control clusters'),
            sc: slaPass ? pal.positive : pal.negative,
            bg: !slaPass && showTarget ? pal.breachBg : pal.hudBg,
            bd: !slaPass && showTarget ? pal.breachBorder : pal.hudBorder
          },
          {
            k: 'Open Findings',
            v: formatVal(sumOpen, valueFormat === 'percentage' ? 'compact_number' : valueFormat, false),
            s: formatVal(sumTotal, 'compact_number', false) + ' total evaluated',
            sc: pal.subtext, bg: pal.hudBg, bd: pal.hudBorder
          },
          {
            k: 'Critical / High Open',
            v: formatVal(sumCrit, 'compact_number', false),
            s: breachCount + ' critical breach clusters',
            sc: breachCount > 0 ? pal.negative : pal.positive,
            bg: breachCount > 0 ? pal.breachBg : pal.hudBg,
            bd: breachCount > 0 ? pal.breachBorder : pal.hudBorder
          }
        ];
        if (!compact && fAge) {
          cards.push({
            k: 'Avg Remediation Velocity',
            v: fleetAge.toFixed(1) + 'd',
            s: formatVal(sumPassed, 'compact_number', false) + ' controls passed',
            sc: pal.primary, bg: pal.hudBg, bd: pal.hudBorder
          });
        }
        if (compact) cards = cards.slice(0, 3);
        hud.innerHTML = cards.map(function (c) {
          return '<div style="flex:1 1 0;min-width:110px;padding:' + (compact ? '4px 8px' : '6px 10px') + ';border-radius:8px;background:' + c.bg + ';border:1px solid ' + c.bd + ';display:flex;flex-direction:column;gap:1px;">' +
            '<div style="font-size:' + (9.5 * fs) + 'px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:' + pal.subtext + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(c.k) + '</div>' +
            '<div style="font-size:' + ((compact ? 13.5 : 16) * fs) + 'px;font-weight:700;color:' + pal.text + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(c.v) + '</div>' +
            (compact ? '' : '<div style="font-size:' + (10.5 * fs) + 'px;font-weight:600;color:' + c.sc + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(c.s) + '</div>') +
            '</div>';
        }).join('');
      } else {
        hud.style.display = 'none';
        hud.innerHTML = '';
      }

      // ---- Render Chosen Visual Paradigm
      var chart = this._chart;
      chart.innerHTML = '';
      this._crumb.style.display = 'none';
      this._crumb.innerHTML = '';

      var cw = chart.clientWidth || W;
      var ch = chart.clientHeight || Math.max(160, H - 100);
      if (cw < 80 || ch < 80) return;

      var mode = config.layoutMode || 'circle_pack';
      var ctx = {
        d3: d3, pal: pal, fs: fs, cw: cw, ch: ch,
        leaves: filteredLeaves, targetScore01: targetScore01, showTarget: showTarget,
        refLabel: refLabel, anomalyThresh01: anomalyThresh01, polarity: polarity,
        labelDensity: config.labelDensity || 'all', valueFormat: valueFormat,
        bubblePadding: Math.max(1, Math.min(18, Number(config.bubblePadding) || 5)),
        config: config
      };

      if (mode === 'waffle_grid') {
        this._renderWaffleGrid(ctx);
      } else if (mode === 'compliance_beeswarm') {
        this._renderBeeswarm(ctx);
      } else if (mode === 'remediation_ladder') {
        this._renderRemediationLadder(ctx);
      } else {
        this._renderCirclePack(ctx);
      }
    },

    _scoreColor: function (score01, ctx) {
      var pal = ctx.pal;
      var good = ctx.polarity === 'lower_is_better' ? (score01 <= ctx.targetScore01) : (score01 >= ctx.targetScore01);
      var crit = ctx.polarity === 'lower_is_better' ? (score01 > ctx.anomalyThresh01) : (score01 < ctx.anomalyThresh01);
      if (good) return pal.positive;
      if (crit) return pal.negative;
      return pal.warning;
    },

    _showTip: function (ev, html, pal) {
      var tip = this._tooltip;
      tip.style.background = pal.isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)';
      tip.style.color = pal.text;
      tip.style.border = '1px solid ' + pal.border;
      tip.innerHTML = html;
      tip.style.display = 'block';
      var px = ev.clientX + 14, py = ev.clientY + 14;
      var tw = tip.offsetWidth || 240, th = tip.offsetHeight || 100;
      if (px + tw > window.innerWidth - 10) px = ev.clientX - tw - 14;
      if (py + th > window.innerHeight - 10) py = ev.clientY - th - 14;
      tip.style.left = px + 'px';
      tip.style.top = py + 'px';
    },

    _hideTip: function () {
      this._tooltip.style.display = 'none';
    },

    _openDrill: function (ev, links) {
      if (links && links.length && typeof LookerCharts !== 'undefined' && LookerCharts.Utils && typeof LookerCharts.Utils.openDrillMenu === 'function') {
        try { LookerCharts.Utils.openDrillMenu({ links: links, event: ev }); } catch (e) {}
      }
    },

    // =========================================================================
    // MODE 1: Zoomable Hierarchical Circle Pack (d3.pack)
    // =========================================================================
    _renderCirclePack: function (ctx) {
      var self = this;
      var d3 = ctx.d3, pal = ctx.pal, cw = ctx.cw, ch = ctx.ch, fs = ctx.fs;

      // Build hierarchy: Root -> d1 (Cloud) -> d2 (Framework) -> leaf (d3)
      var rootObj = { name: 'All Clouds', pathId: 'root', children: [] };
      var d1Map = {};
      var cloudList = [];
      ctx.leaves.forEach(function (r) {
        if (!d1Map[r.d1]) {
          d1Map[r.d1] = { name: r.d1, pathId: 'root::' + r.d1, children: [], _d2: {} };
          rootObj.children.push(d1Map[r.d1]);
          cloudList.push(r.d1);
        }
        var n1 = d1Map[r.d1];
        if (!n1._d2[r.d2]) {
          n1._d2[r.d2] = { name: r.d2, pathId: 'root::' + r.d1 + '::' + r.d2, children: [] };
          n1.children.push(n1._d2[r.d2]);
        }
        var n2 = n1._d2[r.d2];
        // Avoid identical 3rd tier redundancy if d3 === d2
        n2.children.push({
          name: r.d3,
          pathId: 'root::' + r.d1 + '::' + r.d2 + '::' + r.d3,
          value: Math.max(r.sizeVal, 1),
          rec: r
        });
      });

      var cloudColor = d3.scaleOrdinal().domain(cloudList).range(pal.clouds);

      var root = d3.hierarchy(rootObj)
        .sum(function (d) { return d.value || 0; })
        .sort(function (a, b) { return (b.value || 0) - (a.value || 0); });

      // Compute weighted posture metrics bottom-up
      root.eachAfter(function (node) {
        if (!node.children) {
          var r = node.data.rec;
          node.open = r.open; node.total = r.total; node.passed = r.passed; node.crit = r.crit;
          node.score01 = r.score01; node.avgAge = r.avgAge; node.links = r.links;
        } else {
          var op = 0, tot = 0, pas = 0, cr = 0, ws = 0, wa = 0, wt = 0;
          node.children.forEach(function (chN) {
            op += chN.open; tot += chN.total; pas += chN.passed; cr += chN.crit;
            var w = Math.max(chN.total, 1);
            ws += chN.score01 * w; wa += chN.avgAge * w; wt += w;
          });
          node.open = op; node.total = tot; node.passed = pas; node.crit = cr;
          node.score01 = wt > 0 ? ws / wt : 0;
          node.avgAge = wt > 0 ? wa / wt : 0;
        }
      });

      var side = Math.max(120, Math.min(cw, ch) - 16);
      var pack = d3.pack().size([side, side]).padding(function (d) {
        return d.depth === 0 ? Math.max(8, ctx.bubblePadding + 4) : (d.depth === 1 ? Math.max(6, ctx.bubblePadding + 2) : ctx.bubblePadding);
      });
      pack(root);

      var focus = root;
      if (self._zoomPath) {
        root.each(function (n) { if (n.data.pathId === self._zoomPath) focus = n; });
      }

      // Breadcrumb strip
      var crumb = this._crumb;
      crumb.style.display = 'flex';
      crumb.style.padding = '2px 12px 4px';
      var renderCrumb = function (cur) {
        var ancestors = cur.ancestors().reverse();
        crumb.innerHTML = '';
        ancestors.forEach(function (anc, idx) {
          if (idx > 0) {
            var sep = document.createElement('span');
            sep.textContent = '\u203A';
            sep.style.color = pal.subtext;
            crumb.appendChild(sep);
          }
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = anc.data.name + ' (' + (anc.score01 * 100).toFixed(0) + '%)';
          var isLast = idx === ancestors.length - 1;
          btn.style.cssText = 'cursor:pointer;border:1px solid ' + pal.border + ';border-radius:12px;padding:2px 9px;font-size:' + (10.5 * fs) + 'px;font-weight:' + (isLast ? '700' : '600') + ';' +
            'background:' + (isLast ? pal.primary : pal.hudBg) + ';color:' + (isLast ? '#ffffff' : pal.text) + ';font-family:' + FONT + ';';
          btn.onclick = function () { zoomTo(anc); };
          crumb.appendChild(btn);
        });
        var hint = document.createElement('span');
        hint.textContent = 'Click any cluster to zoom \u2022 Click leaf bubble to drill';
        hint.style.cssText = 'margin-left:auto;font-size:' + (10 * fs) + 'px;color:' + pal.subtext + ';';
        crumb.appendChild(hint);
      };

      var svg = d3.select(this._chart).append('svg')
        .attr('width', cw).attr('height', ch)
        .style('display', 'block').style('cursor', 'pointer')
        .on('click', function () { if (focus !== root) zoomTo(root); });

      var g = svg.append('g').attr('transform', 'translate(' + (cw / 2) + ',' + (ch / 2) + ')');

      var nodes = root.descendants().slice(1);
      var nodeSel = g.selectAll('g.cgp-node').data(nodes).enter().append('g')
        .attr('class', 'cgp-node');

      var circles = nodeSel.append('circle')
        .attr('fill', function (d) {
          if (d.depth === 1) {
            var cc = d3.color(cloudColor(d.data.name));
            return pal.isDark ? cc.darker(1.8).formatRgb() : cc.copy({ opacity: 0.08 }).formatRgb();
          }
          if (d.depth === 2) {
            var cc2 = d3.color(cloudColor(d.parent.data.name));
            return pal.isDark ? cc2.darker(1.1).formatRgb() : cc2.copy({ opacity: 0.14 }).formatRgb();
          }
          return self._scoreColor(d.score01, ctx);
        })
        .attr('fill-opacity', function (d) { return d.children ? 1 : 0.88; })
        .attr('stroke', function (d) {
          if (d.depth === 1) return cloudColor(d.data.name);
          if (d.depth === 2) return d.score01 < ctx.anomalyThresh01 ? pal.negative : cloudColor(d.parent.data.name);
          return pal.bg;
        })
        .attr('stroke-width', function (d) { return d.depth === 1 ? 2 : (d.depth === 2 ? 1.4 : 1.2); })
        .attr('stroke-dasharray', function (d) { return (d.depth === 2 && d.score01 < ctx.anomalyThresh01) ? '4,3' : null; })
        .style('cursor', 'pointer')
        .on('mouseenter', function (ev, d) {
          d3.select(this).attr('stroke-width', 2.8);
          var cloudName = d.depth === 1 ? d.data.name : (d.depth === 2 ? d.parent.data.name : d.parent.parent.data.name);
          var badgeCol = self._scoreColor(d.score01, ctx);
          self._showTip(ev,
            '<div style="font-size:10.5px;color:' + pal.subtext + ';margin-bottom:2px;">' + esc(cloudName) + (d.depth >= 2 ? ' &rsaquo; ' + esc(d.depth === 2 ? d.data.name : d.parent.data.name) : '') + '</div>' +
            '<div style="font-weight:700;font-size:13px;margin-bottom:6px;display:flex;align-items:center;gap:6px;">' +
            '<span style="width:9px;height:9px;border-radius:50%;background:' + badgeCol + ';display:inline-block;"></span>' + esc(d.data.name) + '</div>' +
            '<div style="display:grid;grid-template-columns:auto auto;gap:3px 14px;font-size:11.5px;">' +
            '<span style="color:' + pal.subtext + ';">Compliance Posture:</span><strong style="color:' + badgeCol + ';">' + (d.score01 * 100).toFixed(1) + '%</strong>' +
            '<span style="color:' + pal.subtext + ';">Open Findings:</span><strong>' + formatVal(d.open, 'compact_number', false) + ' / ' + formatVal(d.total, 'compact_number', false) + '</strong>' +
            '<span style="color:' + pal.subtext + ';">Critical / High Open:</span><strong style="color:' + (d.crit > 0 ? pal.negative : pal.text) + ';">' + formatVal(d.crit, 'compact_number', false) + '</strong>' +
            '<span style="color:' + pal.subtext + ';">Avg Remediation:</span><strong>' + d.avgAge.toFixed(1) + ' days</strong>' +
            '</div>' +
            (d.links && d.links.length ? '<div style="margin-top:6px;font-size:10px;color:' + pal.primary + ';font-weight:600;">Click to open Looker drill menu</div>' : ''),
            pal
          );
        })
        .on('mousemove', function (ev) { self._showTip(ev, self._tooltip.innerHTML, pal); })
        .on('mouseleave', function (ev, d) {
          d3.select(this).attr('stroke-width', d.depth === 1 ? 2 : (d.depth === 2 ? 1.4 : 1.2));
          self._hideTip();
        })
        .on('click', function (ev, d) {
          ev.stopPropagation();
          if (d.children) {
            zoomTo(focus === d ? (d.parent || root) : d);
          } else if (d.links && d.links.length) {
            self._openDrill(ev, d.links);
          } else {
            zoomTo(d.parent || root);
          }
        });

      var labels = nodeSel.append('text')
        .attr('text-anchor', 'middle')
        .style('pointer-events', 'none')
        .style('font-family', FONT);

      var view = [focus.x, focus.y, focus.r * 2.08];
      function zoomApply(v) {
        var k = side / v[2];
        view = v;
        nodeSel.attr('transform', function (d) {
          return 'translate(' + ((d.x - v[0]) * k) + ',' + ((d.y - v[1]) * k) + ')';
        });
        circles.attr('r', function (d) { return Math.max(1, d.r * k); });

        labels.each(function (d) {
          var sel = d3.select(this);
          var rPx = d.r * k;
          var show = false;
          if (ctx.labelDensity !== 'hidden') {
            if (d.depth === focus.depth + 1 && rPx >= 24) show = true;
            else if (!d.children && rPx >= 26 && (ctx.labelDensity === 'all' || d.score01 < ctx.anomalyThresh01)) show = true;
          }
          if (!show) {
            sel.style('display', 'none');
            return;
          }
          sel.style('display', null);
          if (d.children) {
            var hdr = d.data.name + ' (' + (d.score01 * 100).toFixed(0) + '%)';
            var maxC = Math.max(6, Math.floor((rPx * 1.4) / (6.2 * fs)));
            if (hdr.length > maxC) hdr = hdr.slice(0, maxC - 1) + '\u2026';
            sel.attr('y', -rPx + 15 * fs)
              .attr('font-size', (d.depth === 1 ? 11.5 : 10) * fs)
              .attr('font-weight', 700)
              .attr('fill', d.depth === 1 ? cloudColor(d.data.name) : pal.text)
              .attr('paint-order', 'stroke')
              .attr('stroke', pal.bg)
              .attr('stroke-width', 3)
              .attr('stroke-linejoin', 'round')
              .text(hdr);
          } else {
            var nm = d.data.name;
            var maxC2 = Math.max(5, Math.floor((rPx * 1.6) / (6 * fs)));
            if (nm.length > maxC2) nm = nm.slice(0, maxC2 - 1) + '\u2026';
            sel.attr('y', -2 * fs)
              .attr('font-size', Math.min(12, Math.max(8.5, rPx * 0.24)) * fs)
              .attr('font-weight', 700)
              .attr('fill', '#ffffff')
              .text(nm);
            sel.selectAll('tspan').remove();
            if (rPx >= 34) {
              sel.append('tspan')
                .attr('x', 0).attr('dy', 12 * fs)
                .attr('font-size', Math.min(10.5, Math.max(8, rPx * 0.2)) * fs)
                .attr('font-weight', 600)
                .attr('fill', 'rgba(255,255,255,0.92)')
                .text((d.score01 * 100).toFixed(0) + '% \u2022 ' + formatVal(d.open, 'compact_number', false) + ' open');
            }
          }
        });
      }

      function zoomTo(d) {
        focus = d;
        self._zoomPath = d === root ? null : d.data.pathId;
        renderCrumb(focus);
        var targetView = [focus.x, focus.y, focus.r * 2.08];
        svg.transition().duration(480).tween('zoom', function () {
          var interp = d3.interpolateZoom(view, targetView);
          return function (t) { zoomApply(interp(t)); };
        });
      }

      renderCrumb(focus);
      zoomApply(view);
    },

    // =========================================================================
    // MODE 2: 10x10 Proportional Governance Waffle Grid (Cloud x Framework)
    // =========================================================================
    _renderWaffleGrid: function (ctx) {
      var self = this;
      var pal = ctx.pal, cw = ctx.cw, ch = ctx.ch, fs = ctx.fs;

      // Aggregate into Cloud (d1) x Framework (d2) cells
      var clouds = [], frameworks = [], cellMap = {};
      ctx.leaves.forEach(function (r) {
        if (clouds.indexOf(r.d1) < 0) clouds.push(r.d1);
        if (frameworks.indexOf(r.d2) < 0) frameworks.push(r.d2);
        var ck = r.d1 + '||' + r.d2;
        if (!cellMap[ck]) cellMap[ck] = { d1: r.d1, d2: r.d2, open: 0, total: 0, passed: 0, crit: 0, ws: 0, wt: 0, links: r.links };
        var c = cellMap[ck];
        c.open += r.open; c.total += r.total; c.passed += r.passed; c.crit += r.crit;
        c.ws += r.score01 * r.weightSum; c.wt += r.weightSum;
      });

      var wrap = document.createElement('div');
      wrap.style.cssText = 'width:100%;height:100%;overflow:auto;padding:8px 12px;box-sizing:border-box;';
      this._chart.appendChild(wrap);

      var table = document.createElement('div');
      table.style.cssText = 'display:grid;grid-template-columns:minmax(90px,130px) repeat(' + frameworks.length + ', minmax(110px, 1fr));gap:8px;align-items:stretch;min-width:' + (130 + frameworks.length * 115) + 'px;';
      wrap.appendChild(table);

      // Header row
      var corner = document.createElement('div');
      corner.style.cssText = 'font-size:' + (10.5 * fs) + 'px;font-weight:700;color:' + pal.subtext + ';display:flex;align-items:flex-end;padding:4px 6px;';
      corner.textContent = 'CLOUD \\ FRAMEWORK';
      table.appendChild(corner);

      frameworks.forEach(function (fw) {
        var fh = document.createElement('div');
        fh.style.cssText = 'font-size:' + (11 * fs) + 'px;font-weight:700;color:' + pal.text + ';text-align:center;padding:4px 6px;border-bottom:2px solid ' + pal.border + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        fh.textContent = fw;
        fh.title = fw;
        table.appendChild(fh);
      });

      var tileH = Math.max(84, Math.min(132, Math.floor((ch - 64) / Math.max(1, clouds.length))));

      clouds.forEach(function (cl) {
        var rh = document.createElement('div');
        rh.style.cssText = 'font-size:' + (12 * fs) + 'px;font-weight:700;color:' + pal.text + ';display:flex;align-items:center;padding:6px 8px;background:' + pal.cardBg + ';border:1px solid ' + pal.border + ';border-radius:8px;';
        rh.textContent = cl;
        table.appendChild(rh);

        frameworks.forEach(function (fw) {
          var c = cellMap[cl + '||' + fw];
          var card = document.createElement('div');
          card.style.cssText = 'background:' + pal.cardBg + ';border:1px solid ' + pal.border + ';border-radius:8px;padding:6px 8px;display:flex;flex-direction:column;justify-content:space-between;min-height:' + tileH + 'px;cursor:pointer;';
          if (!c) {
            card.innerHTML = '<div style="font-size:11px;color:' + pal.subtext + ';margin:auto;">No controls</div>';
            table.appendChild(card);
            return;
          }
          var score01 = c.wt > 0 ? c.ws / c.wt : 0;
          var scCol = self._scoreColor(score01, ctx);
          var passUnits = Math.max(0, Math.min(100, Math.round(score01 * 100)));
          var critRatio = c.open > 0 ? Math.min(1, c.crit / c.open) : 0;
          var openUnits = 100 - passUnits;
          var critUnits = Math.round(openUnits * critRatio);

          var top = document.createElement('div');
          top.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:4px;';
          top.innerHTML = '<span style="font-size:' + (13 * fs) + 'px;font-weight:700;color:' + scCol + ';">' + (score01 * 100).toFixed(1) + '%</span>' +
            '<span style="font-size:' + (10 * fs) + 'px;font-weight:600;color:' + pal.subtext + ';">' + formatVal(c.open, 'compact_number', false) + ' open</span>';
          card.appendChild(top);

          // 10x10 SVG waffle grid
          var wSize = Math.min(84, tileH - 32);
          var sq = (wSize - 9 * 1.5) / 10;
          var rects = [];
          for (var u = 0; u < 100; u++) {
            var row = 9 - Math.floor(u / 10);
            var col = u % 10;
            var fill = u < passUnits ? pal.positive : (u < passUnits + critUnits ? pal.negative : pal.warning);
            rects.push('<rect x="' + (col * (sq + 1.5)).toFixed(1) + '" y="' + (row * (sq + 1.5)).toFixed(1) + '" width="' + sq.toFixed(1) + '" height="' + sq.toFixed(1) + '" rx="1.2" fill="' + fill + '"/>');
          }
          var svgBox = document.createElement('div');
          svgBox.style.cssText = 'display:flex;justify-content:center;align-items:center;margin-top:3px;';
          svgBox.innerHTML = '<svg width="' + wSize + '" height="' + wSize + '">' + rects.join('') + '</svg>';
          card.appendChild(svgBox);

          card.onmouseenter = function (ev) {
            card.style.borderColor = scCol;
            self._showTip(ev,
              '<div style="font-weight:700;font-size:12.5px;margin-bottom:4px;">' + esc(cl) + ' &bull; ' + esc(fw) + '</div>' +
              '<div>Compliance Score: <strong style="color:' + scCol + ';">' + (score01 * 100).toFixed(1) + '%</strong> (' + passUnits + '/100 units)</div>' +
              '<div>Open Findings: <strong>' + formatVal(c.open, 'compact_number', false) + '</strong> (' + formatVal(c.crit, 'compact_number', false) + ' Crit/High)</div>',
              pal
            );
          };
          card.onmousemove = function (ev) { self._showTip(ev, self._tooltip.innerHTML, pal); };
          card.onmouseleave = function () { card.style.borderColor = pal.border; self._hideTip(); };
          card.onclick = function (ev) { self._openDrill(ev, c.links); };
          table.appendChild(card);
        });
      });
    },

    // =========================================================================
    // MODE 3: SLA-Threshold Force Beeswarm
    // =========================================================================
    _renderBeeswarm: function (ctx) {
      var self = this;
      var d3 = ctx.d3, pal = ctx.pal, cw = ctx.cw, ch = ctx.ch, fs = ctx.fs;
      var clouds = [];
      ctx.leaves.forEach(function (r) { if (clouds.indexOf(r.d1) < 0) clouds.push(r.d1); });

      var margin = { top: 28, right: 24, bottom: 36, left: Math.min(130, Math.max(72, cw * 0.16)) };
      var iw = Math.max(80, cw - margin.left - margin.right);
      var ih = Math.max(80, ch - margin.top - margin.bottom);

      var svg = d3.select(this._chart).append('svg').attr('width', cw).attr('height', ch).style('display', 'block');
      var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var minS = Math.max(0, d3.min(ctx.leaves, function (d) { return d.score01; }) - 0.08);
      var maxS = Math.min(1, Math.max(1, d3.max(ctx.leaves, function (d) { return d.score01; }) + 0.04));
      var x = d3.scaleLinear().domain([minS, maxS]).range([0, iw]);
      var yBand = d3.scaleBand().domain(clouds).range([0, ih]).padding(0.15);
      var rScale = d3.scaleSqrt().domain([0, d3.max(ctx.leaves, function (d) { return d.sizeVal; }) || 1]).range([5, Math.min(22, yBand.bandwidth() * 0.35)]);

      // Breach zone shading
      if (ctx.showTarget && x(ctx.targetScore01) > 0) {
        g.append('rect').attr('x', 0).attr('y', 0).attr('width', Math.max(0, Math.min(iw, x(ctx.targetScore01)))).attr('height', ih)
          .attr('fill', pal.negative).attr('fill-opacity', pal.isDark ? 0.12 : 0.045);
      }

      // Swimlanes
      clouds.forEach(function (cl, idx) {
        var cy = yBand(cl) + yBand.bandwidth() / 2;
        g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', cy).attr('y2', cy).attr('stroke', pal.grid).attr('stroke-dasharray', '3,3');
        g.append('text').attr('x', -10).attr('y', cy).attr('dy', '0.35em').attr('text-anchor', 'end')
          .attr('font-size', 11.5 * fs).attr('font-weight', 700).attr('fill', pal.text).text(cl);
      });

      // Pre-warmed force simulation (zero idle CPU!)
      var simNodes = ctx.leaves.map(function (r) {
        return {
          rec: r,
          r: rScale(r.sizeVal),
          tx: x(r.score01),
          ty: yBand(r.d1) + yBand.bandwidth() / 2,
          x: x(r.score01),
          y: yBand(r.d1) + yBand.bandwidth() / 2
        };
      });
      var sim = d3.forceSimulation(simNodes)
        .force('x', d3.forceX(function (d) { return d.tx; }).strength(0.95))
        .force('y', d3.forceY(function (d) { return d.ty; }).strength(0.25))
        .force('collide', d3.forceCollide(function (d) { return d.r + 1.8; }))
        .stop();
      for (var t = 0; t < 75; t++) sim.tick();

      // Target SLA vertical line
      if (ctx.showTarget) {
        var tx = x(ctx.targetScore01);
        if (tx >= 0 && tx <= iw) {
          g.append('line').attr('x1', tx).attr('x2', tx).attr('y1', -8).attr('y2', ih)
            .attr('stroke', pal.negative).attr('stroke-width', 1.8).attr('stroke-dasharray', '5,4');
          g.append('text').attr('x', tx).attr('y', -12).attr('text-anchor', 'middle')
            .attr('font-size', 10 * fs).attr('font-weight', 700).attr('fill', pal.negative).text(ctx.refLabel);
        }
      }

      // X Axis
      var xAxis = d3.axisBottom(x).ticks(6).tickFormat(function (v) { return Math.round(v * 100) + '%'; });
      var axG = g.append('g').attr('transform', 'translate(0,' + ih + ')').call(xAxis);
      axG.selectAll('text').attr('fill', pal.subtext).attr('font-size', 10 * fs);
      axG.selectAll('line, path').attr('stroke', pal.border);

      // Bubbles
      g.selectAll('circle.cgp-bee').data(simNodes).enter().append('circle')
        .attr('class', 'cgp-bee')
        .attr('cx', function (d) { return Math.max(d.r, Math.min(iw - d.r, d.x)); })
        .attr('cy', function (d) { return Math.max(d.r, Math.min(ih - d.r, d.y)); })
        .attr('r', function (d) { return d.r; })
        .attr('fill', function (d) { return self._scoreColor(d.rec.score01, ctx); })
        .attr('fill-opacity', 0.85)
        .attr('stroke', pal.bg).attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('mouseenter', function (ev, d) {
          d3.select(this).attr('stroke-width', 2.6).attr('fill-opacity', 1);
          var r = d.rec, sc = self._scoreColor(r.score01, ctx);
          self._showTip(ev,
            '<div style="font-size:10.5px;color:' + pal.subtext + ';">' + esc(r.d1) + ' &rsaquo; ' + esc(r.d2) + '</div>' +
            '<div style="font-weight:700;font-size:13px;margin-bottom:4px;">' + esc(r.d3) + '</div>' +
            '<div>Compliance: <strong style="color:' + sc + ';">' + (r.score01 * 100).toFixed(1) + '%</strong></div>' +
            '<div>Open Findings: <strong>' + formatVal(r.open, 'compact_number', false) + '</strong> (' + formatVal(r.crit, 'compact_number', false) + ' Crit/High)</div>',
            pal
          );
        })
        .on('mousemove', function (ev) { self._showTip(ev, self._tooltip.innerHTML, pal); })
        .on('mouseleave', function () { d3.select(this).attr('stroke-width', 1.5).attr('fill-opacity', 0.85); self._hideTip(); })
        .on('click', function (ev, d) { self._openDrill(ev, d.rec.links); });
    },

    // =========================================================================
    // MODE 4: Policy Exposure & Remediation Velocity Ladder
    // =========================================================================
    _renderRemediationLadder: function (ctx) {
      var self = this;
      var d3 = ctx.d3, pal = ctx.pal, cw = ctx.cw, ch = ctx.ch, fs = ctx.fs;

      // Aggregate by d3 (Policy / Resource)
      var polMap = {}, rows = [];
      ctx.leaves.forEach(function (r) {
        var k = r.d3;
        if (!polMap[k]) {
          polMap[k] = { name: k, open: 0, total: 0, passed: 0, crit: 0, ws: 0, wa: 0, wt: 0, links: r.links };
          rows.push(polMap[k]);
        }
        var p = polMap[k];
        p.open += r.open; p.total += r.total; p.passed += r.passed; p.crit += r.crit;
        p.ws += r.score01 * r.weightSum; p.wa += r.avgAge * r.weightSum; p.wt += r.weightSum;
      });
      rows.forEach(function (p) {
        p.score01 = p.wt > 0 ? p.ws / p.wt : 0;
        p.avgAge = p.wt > 0 ? p.wa / p.wt : 0;
      });
      rows.sort(function (a, b) { return a.score01 - b.score01; });

      var margin = { top: 24, right: 78, bottom: 26, left: Math.min(240, Math.max(110, cw * 0.3)) };
      var iw = Math.max(80, cw - margin.left - margin.right);
      var ih = Math.max(80, ch - margin.top - margin.bottom);

      var svg = d3.select(this._chart).append('svg').attr('width', cw).attr('height', ch).style('display', 'block');
      var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var x = d3.scaleLinear().domain([0, 1]).range([0, iw]);
      var y = d3.scaleBand().domain(rows.map(function (r) { return r.name; })).range([0, ih]).padding(0.28);

      var xAxis = d3.axisBottom(x).ticks(5).tickFormat(function (v) { return Math.round(v * 100) + '%'; });
      var axG = g.append('g').attr('transform', 'translate(0,' + ih + ')').call(xAxis);
      axG.selectAll('text').attr('fill', pal.subtext).attr('font-size', 10 * fs);
      axG.selectAll('line, path').attr('stroke', pal.border);

      var maxChars = Math.max(10, Math.floor((margin.left - 14) / (6.1 * fs)));

      rows.forEach(function (r) {
        var cy = y(r.name) + y.bandwidth() / 2;
        var col = self._scoreColor(r.score01, ctx);
        var lbl = r.name.length > maxChars ? r.name.slice(0, maxChars - 1) + '\u2026' : r.name;
        var tl = g.append('text').attr('x', -10).attr('y', cy).attr('dy', '0.35em').attr('text-anchor', 'end')
          .attr('font-size', 11 * fs).attr('font-weight', 600).attr('fill', pal.text).text(lbl);
        tl.append('title').text(r.name);

        g.append('rect').attr('x', 0).attr('y', y(r.name)).attr('width', iw).attr('height', y.bandwidth())
          .attr('rx', 4).attr('fill', pal.grid).attr('fill-opacity', 0.45);

        var bar = g.append('rect').attr('x', 0).attr('y', y(r.name)).attr('width', Math.max(2, x(r.score01))).attr('height', y.bandwidth())
          .attr('rx', 4).attr('fill', col).style('cursor', 'pointer');

        g.append('text').attr('x', iw + 8).attr('y', cy).attr('dy', '0.35em')
          .attr('font-size', 10.5 * fs).attr('font-weight', 700).attr('fill', col)
          .text((r.score01 * 100).toFixed(0) + '% \u2022 ' + r.avgAge.toFixed(0) + 'd');

        bar.on('mouseenter', function (ev) {
          self._showTip(ev,
            '<div style="font-weight:700;font-size:13px;margin-bottom:4px;">' + esc(r.name) + '</div>' +
            '<div>Compliance: <strong style="color:' + col + ';">' + (r.score01 * 100).toFixed(1) + '%</strong></div>' +
            '<div>Open Findings: <strong>' + formatVal(r.open, 'compact_number', false) + '</strong> (' + formatVal(r.crit, 'compact_number', false) + ' Crit/High)</div>' +
            '<div>Avg Remediation Time: <strong>' + r.avgAge.toFixed(1) + ' days</strong></div>',
            pal
          );
        }).on('mousemove', function (ev) { self._showTip(ev, self._tooltip.innerHTML, pal); })
          .on('mouseleave', function () { self._hideTip(); })
          .on('click', function (ev) { self._openDrill(ev, r.links); });
      });

      if (ctx.showTarget) {
        var tx = x(ctx.targetScore01);
        g.append('line').attr('x1', tx).attr('x2', tx).attr('y1', -6).attr('y2', ih)
          .attr('stroke', pal.negative).attr('stroke-width', 1.8).attr('stroke-dasharray', '5,4');
        g.append('text').attr('x', tx).attr('y', -10).attr('text-anchor', 'middle')
          .attr('font-size', 10 * fs).attr('font-weight', 700).attr('fill', pal.negative).text(ctx.refLabel);
      }
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
