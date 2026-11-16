/**
 * NOC Incident Timeline - Looker Custom Visualization
 * Built with D3.js v7
 *
 * A telecom NOC / SecOps "war room" swimlane timeline for an outage or incident case
 * that fuses events from multiple source systems (ticketing, optical telemetry,
 * field operations, customer communications, public updates) onto one
 * hour/minute-granularity axis.
 *
 * Features:
 * - Lanes (y) = source system, x = event timestamp
 * - Severity-colored markers (Info / Warning / Critical / Resolved / Public Update)
 *   with a cheap CSS pulse ring on Critical events
 * - Collision-aware event labels (All / Critical & Resolved Peaks / None)
 * - Configurable Reference Lines & SLA Target Modes:
 *   Fixed SLA Hours, Measure Column, Dataset Mean/Median/P75/P90 Span, or Hidden
 * - Sorting (Chronological, Event Volume Desc/Asc, Critical First, Alphabetical)
 *   + Top-N lane limit with automatic "Other Sources" rollup + Zero/Null suppression
 * - HUD Density Modes (Full Scorecard / Compact Strip / Hidden), Custom Title/Subtitle,
 *   and interactive live event search filter
 * - 9 Enterprise Palettes (including Cyberpunk Dark & Custom Hex color pickers),
 *   Metric Polarity, Font Scale, and Duration/Value Formatting
 * - Dynamic field-role dropdowns populated from the live query (registerOptions)
 * - Debounced ResizeObserver replay, flex column root, Looker drill-down menu support
 * - Strictly 2 option sections: Display & Style
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleTime === 'function') {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleTime === 'function') {
          clearInterval(interval);
          callback(window.d3);
        }
      }, 50);
      return;
    }
    var script = document.createElement('script');
    script.src = 'https://d3js.org/d3.v7.min.js';
    script.onload = function () { callback(window.d3); };
    document.head.appendChild(script);
  }

  // --------------------------------------------------------------------
  // Brand Palettes (strictly preserving existing light themes + new presets)
  // --------------------------------------------------------------------
  var PALETTES = {
    google_enterprise: {
      name: 'Google Enterprise',
      isDark: false,
      accent: '#1a73e8', text: '#202124', subtext: '#5f6368', grid: '#e8eaed',
      laneAlt: '#f8f9fa', laneLine: '#dadce0', bg: '#ffffff', hudBg: '#f8f9fa', hudBorder: '#e8eaed',
      breachBg: '#fce8e6', breachBorder: '#f5c6c2',
      severity: { info: '#5f6368', warning: '#f29900', critical: '#d93025', resolved: '#1e8e3e', public: '#1a73e8' }
    },
    zayo_orange: {
      name: 'Zayo Orange',
      isDark: false,
      accent: '#f5831f', text: '#1f2937', subtext: '#6b7280', grid: '#e5e7eb',
      laneAlt: '#fafafa', laneLine: '#e5e7eb', bg: '#ffffff', hudBg: '#fff7ed', hudBorder: '#fed7aa',
      breachBg: '#fef2f2', breachBorder: '#fecaca',
      severity: { info: '#64748b', warning: '#f59e0b', critical: '#dc2626', resolved: '#10b981', public: '#0ea5e9' }
    },
    optical_cobalt: {
      name: 'Optical Cobalt',
      isDark: false,
      accent: '#0284c7', text: '#0f172a', subtext: '#64748b', grid: '#e2e8f0',
      laneAlt: '#f8fafc', laneLine: '#e2e8f0', bg: '#ffffff', hudBg: '#f0f9ff', hudBorder: '#bae6fd',
      breachBg: '#fff1f2', breachBorder: '#fecdd3',
      severity: { info: '#64748b', warning: '#f59e0b', critical: '#e11d48', resolved: '#059669', public: '#2563eb' }
    },
    modern_slate: {
      name: 'Modern Slate',
      isDark: false,
      accent: '#334155', text: '#0f172a', subtext: '#64748b', grid: '#e2e8f0',
      laneAlt: '#f8fafc', laneLine: '#cbd5e1', bg: '#ffffff', hudBg: '#f8fafc', hudBorder: '#e2e8f0',
      breachBg: '#fef2f2', breachBorder: '#fecaca',
      severity: { info: '#94a3b8', warning: '#d97706', critical: '#b91c1c', resolved: '#059669', public: '#1e40af' }
    },
    executive_slate: {
      name: 'Executive Slate',
      isDark: false,
      accent: '#334155', text: '#0f172a', subtext: '#64748b', grid: '#e2e8f0',
      laneAlt: '#f8fafc', laneLine: '#cbd5e1', bg: '#ffffff', hudBg: '#f8fafc', hudBorder: '#e2e8f0',
      breachBg: '#fef2f2', breachBorder: '#fecaca',
      severity: { info: '#94a3b8', warning: '#d97706', critical: '#b91c1c', resolved: '#059669', public: '#1e40af' }
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark',
      isDark: true,
      accent: '#22d3ee', text: '#f8fafc', subtext: '#94a3b8', grid: '#1e293b',
      laneAlt: '#111827', laneLine: '#334155', bg: '#0b0f19', hudBg: '#111827', hudBorder: '#1f2937',
      breachBg: 'rgba(244, 63, 94, 0.16)', breachBorder: 'rgba(244, 63, 94, 0.45)',
      severity: { info: '#94a3b8', warning: '#facc15', critical: '#f43f5e', resolved: '#10b981', public: '#38bdf8' }
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      isDark: false,
      accent: '#059669', text: '#064e3b', subtext: '#047857', grid: '#d1fae5',
      laneAlt: '#f0fdf4', laneLine: '#a7f3d0', bg: '#ffffff', hudBg: '#ecfdf5', hudBorder: '#a7f3d0',
      breachBg: '#fef2f2', breachBorder: '#fecaca',
      severity: { info: '#64748b', warning: '#d97706', critical: '#dc2626', resolved: '#059669', public: '#0284c7' }
    },
    sunset_media: {
      name: 'Sunset Media',
      isDark: false,
      accent: '#ea580c', text: '#1c1917', subtext: '#78716c', grid: '#fed7aa',
      laneAlt: '#fff7ed', laneLine: '#fdba74', bg: '#ffffff', hudBg: '#fff7ed', hudBorder: '#fed7aa',
      breachBg: '#fef2f2', breachBorder: '#fecaca',
      severity: { info: '#78716c', warning: '#f59e0b', critical: '#be123c', resolved: '#15803d', public: '#ea580c' }
    },
    wellverse_healthcare: {
      name: 'Wellverse Healthcare',
      isDark: false,
      accent: '#0d9488', text: '#0f172a', subtext: '#475569', grid: '#e2e8f0',
      laneAlt: '#f0fdfa', laneLine: '#99f6e4', bg: '#ffffff', hudBg: '#f0fdfa', hudBorder: '#99f6e4',
      breachBg: '#fff1f2', breachBorder: '#fecdd3',
      severity: { info: '#64748b', warning: '#f59e0b', critical: '#e11d48', resolved: '#0d9488', public: '#0284c7' }
    },
    custom_hex: {
      name: 'Custom Hex Override',
      isDark: false,
      accent: '#1a73e8', text: '#202124', subtext: '#5f6368', grid: '#e8eaed',
      laneAlt: '#f8f9fa', laneLine: '#dadce0', bg: '#ffffff', hudBg: '#f8f9fa', hudBorder: '#e8eaed',
      breachBg: '#fce8e6', breachBorder: '#f5c6c2',
      severity: { info: '#5f6368', warning: '#f29900', critical: '#d93025', resolved: '#1e8e3e', public: '#1a73e8' }
    }
  };

  var SEVERITY_LABELS = {
    info: 'Info', warning: 'Warning', critical: 'Critical', resolved: 'Resolved', public: 'Public Update'
  };

  var FONT = '"Google Sans", Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

  // Case-insensitive, tolerant severity classifier
  function classifySeverity(raw) {
    var s = (raw === null || raw === undefined) ? '' : String(raw).toLowerCase();
    if (!s) return 'info';
    if (s.indexOf('crit') >= 0 || s.indexOf('sev1') >= 0 || s.indexOf('sev 1') >= 0 || s.indexOf('p1') === 0 || s.indexOf('major') >= 0 || s.indexOf('outage') >= 0) return 'critical';
    if (s.indexOf('resolv') >= 0 || s.indexOf('restor') >= 0 || s.indexOf('clear') >= 0 || s.indexOf('closed') >= 0) return 'resolved';
    if (s.indexOf('warn') >= 0 || s.indexOf('degrad') >= 0 || s.indexOf('minor') >= 0) return 'warning';
    if (s.indexOf('public') >= 0 || s.indexOf('update') >= 0 || s.indexOf('notif') >= 0 || s.indexOf('comm') >= 0) return 'public';
    return 'info';
  }

  // Robust timestamp parsing (Looker strings, ISO, epoch)
  var TIME_FORMATS = [
    '%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M:%S.%L',
    '%Y-%m-%dT%H:%M:%SZ', '%Y-%m-%dT%H:%M:%S.%LZ', '%Y-%m-%d %H', '%Y-%m-%d', '%Y/%m/%d %H:%M:%S', '%m/%d/%Y %H:%M', '%m/%d/%Y'
  ];
  var _parsers = null;
  function parseTime(d3, raw) {
    if (raw === null || raw === undefined || raw === '') return null;
    if (raw instanceof Date) return isNaN(raw) ? null : raw;
    if (typeof raw === 'number') { var dn = new Date(raw < 1e11 ? raw * 1000 : raw); return isNaN(dn) ? null : dn; }
    var s = String(raw).trim();
    if (!_parsers) {
      _parsers = TIME_FORMATS.map(function (f) { return f.indexOf('Z') >= 0 ? d3.utcParse(f) : d3.timeParse(f); });
    }
    for (var i = 0; i < _parsers.length; i++) {
      var p = _parsers[i](s);
      if (p) return p;
    }
    var f = new Date(s);
    if (!isNaN(f)) return f;
    f = new Date(s.replace(' ', 'T'));
    if (!isNaN(f)) return f;
    return null;
  }

  function fmtDuration(ms, valueFormat) {
    if (ms === null || ms === undefined || isNaN(ms)) return '\u2014';
    var neg = ms < 0;
    var absMs = Math.abs(ms);
    var totalMin = absMs / 60000;
    var fmt = valueFormat || 'auto';

    if (fmt === 'decimal_hours') {
      return (neg ? '-' : '') + (absMs / 3600000).toFixed(2) + 'h';
    }
    if (fmt === 'raw_minutes') {
      return (neg ? '-' : '') + Math.round(totalMin) + 'm';
    }
    if (fmt === 'compact_number') {
      var h = absMs / 3600000;
      if (h >= 1000) return (neg ? '-' : '') + (h / 1000).toFixed(1) + 'Kh';
      return (neg ? '-' : '') + (h >= 10 ? h.toFixed(1) + 'h' : Math.round(totalMin) + 'm');
    }

    var m = Math.round(totalMin);
    var d = Math.floor(m / 1440); m -= d * 1440;
    var hr = Math.floor(m / 60); m -= hr * 60;
    var out = d > 0 ? (d + 'd ' + hr + 'h') : (hr > 0 ? (hr + 'h ' + m + 'm') : (m + 'm'));
    return (neg ? '-' : '') + out;
  }

  function escapeHtml(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function cellValue(row, name) {
    if (!row || !name) return null;
    var c = row[name];
    if (c === undefined || c === null) return null;
    if (typeof c === 'object' && 'value' in c) return c.value;
    return c;
  }

  function fieldLabel(f) { return f.label_short || f.label || f.name; }

  function matchField(list, override) {
    if (!override || !list || !list.length) return null;
    var o = String(override).trim();
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (f.name === o || f.label === o || f.label_short === o) return f;
    }
    var idx = parseInt(o, 10);
    if (!isNaN(idx) && idx >= 1 && idx <= list.length) return list[idx - 1];
    return null;
  }

  function percentile(sortedArr, p) {
    if (!sortedArr || !sortedArr.length) return 0;
    if (sortedArr.length === 1) return sortedArr[0];
    var idx = (sortedArr.length - 1) * p;
    var lo = Math.floor(idx);
    var hi = Math.ceil(idx);
    if (lo === hi) return sortedArr[lo];
    return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
  }

  var visObject = {
    id: 'noc_incident_timeline',
    label: 'NOC Incident Timeline',
    options: {
      // ================= DISPLAY =================
      laneField: {
        type: 'string', label: 'Lane (Source System) Field', display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }], default: '',
        section: 'Display', order: 1
      },
      timeField: {
        type: 'string', label: 'Event Time Field', display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }], default: '',
        section: 'Display', order: 2
      },
      labelField: {
        type: 'string', label: 'Marker Label (Event Type) Field', display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }], default: '',
        section: 'Display', order: 3
      },
      detailField: {
        type: 'string', label: 'Detail / Tooltip Description Field', display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }], default: '',
        section: 'Display', order: 4
      },
      severityField: {
        type: 'string', label: 'Severity Field', display: 'select',
        values: [{ 'Auto (run the query to populate field choices)': '' }], default: '',
        section: 'Display', order: 5
      },
      actorField: {
        type: 'string', label: 'Actor Field (optional)', display: 'select',
        values: [{ 'Auto / None (run the query to populate field choices)': '' }], default: '',
        section: 'Display', order: 6
      },
      targetMeasureField: {
        type: 'string', label: 'Target SLA Measure (optional)', display: 'select',
        values: [{ 'Auto / None (run the query to populate field choices)': '' }], default: '',
        section: 'Display', order: 7
      },
      targetMode: {
        type: 'string', label: 'SLA Target / Reference Mode', display: 'select',
        values: [
          { 'Fixed SLA Hours': 'fixed' },
          { 'Measure Column (from Query)': 'measure' },
          { 'Dataset Mean Elapsed Span': 'dataset_mean' },
          { 'Dataset Median Elapsed Span (P50)': 'dataset_median' },
          { 'Percentile P75 Elapsed Span': 'percentile_p75' },
          { 'Percentile P90 Elapsed Span': 'percentile_p90' },
          { 'None (Hide SLA Target)': 'none' }
        ],
        default: 'fixed', section: 'Display', order: 8
      },
      slaTargetHours: {
        type: 'number', label: 'Fixed SLA Target (hours after opened)', default: 4,
        section: 'Display', order: 9
      },
      referenceLineLabel: {
        type: 'string', label: 'Custom SLA Reference Line Label', default: '',
        section: 'Display', order: 10
      },
      nowMode: {
        type: 'string', label: '"Now" Reference Line', display: 'select',
        values: [{ 'Latest event timestamp': 'latest_event' }, { 'Wall clock (browser time)': 'wall_clock' }],
        default: 'latest_event', section: 'Display', order: 11
      },
      anomalyThresholdPct: {
        type: 'number', label: 'Critical Event Density Alert Threshold (%)', default: 25,
        section: 'Display', order: 12
      },
      sortBy: {
        type: 'string', label: 'Sort Source System Lanes By', display: 'select',
        values: [
          { 'Chronological (First Event Seen)': 'chronological' },
          { 'Event Volume Descending': 'count_desc' },
          { 'Event Volume Ascending': 'count_asc' },
          { 'Critical Severity First': 'critical_desc' },
          { 'Source System Alphabetical': 'alpha_asc' }
        ],
        default: 'chronological', section: 'Display', order: 13
      },
      topNLimit: {
        type: 'number', label: 'Top-N Source Lanes Limit (0 = All)', default: 8,
        section: 'Display', order: 14
      },
      enableOtherRollup: {
        type: 'boolean', label: 'Group Extra Lanes into "Other Sources"', default: true,
        section: 'Display', order: 15
      },
      suppressZeroNull: {
        type: 'boolean', label: 'Suppress Blank / Null Events', default: true,
        section: 'Display', order: 16
      },
      hudMode: {
        type: 'string', label: 'Executive KPI HUD Density', display: 'select',
        values: [
          { 'Full Scorecard HUD': 'scorecard' },
          { 'Compact Telemetry Strip': 'compact_strip' },
          { 'Hidden': 'hidden' }
        ],
        default: 'scorecard', section: 'Display', order: 17
      },
      labelDensity: {
        type: 'string', label: 'Marker Label Density', display: 'select',
        values: [
          { 'All (collision-aware)': 'all' },
          { 'Critical & Resolved Peaks Only': 'critical' },
          { 'None (tooltip only)': 'none' }
        ],
        default: 'all', section: 'Display', order: 18
      },
      showLegend: {
        type: 'boolean', label: 'Show Severity Legend', default: true,
        section: 'Display', order: 19
      },
      showSearch: {
        type: 'boolean', label: 'Show Interactive Event Search Bar', default: true,
        section: 'Display', order: 20
      },
      customTitle: {
        type: 'string', label: 'Custom Timeline Title Override', default: '',
        section: 'Display', order: 21
      },
      customSubtitle: {
        type: 'string', label: 'Custom Subtitle Override', default: '',
        section: 'Display', order: 22
      },
      // ================= STYLE =================
      colorPalette: {
        type: 'string', label: 'Brand Color Palette', display: 'select',
        values: [
          { 'Google Enterprise': 'google_enterprise' },
          { 'Zayo Orange': 'zayo_orange' },
          { 'Optical Cobalt': 'optical_cobalt' },
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
        type: 'string', label: 'Custom Primary / Opened Accent Hex',
        display: 'color', default: '',
        section: 'Style', order: 2
      },
      customCriticalColor: {
        type: 'string', label: 'Custom Critical / Breach Alert Hex',
        display: 'color', default: '',
        section: 'Style', order: 3
      },
      customResolvedColor: {
        type: 'string', label: 'Custom Resolved / SLA Met Hex',
        display: 'color', default: '',
        section: 'Style', order: 4
      },
      metricPolarity: {
        type: 'string', label: 'Metric Polarity (SLA Direction)', display: 'select',
        values: [
          { 'Lower Duration is Better (MTTR / SLA)': 'lower_is_better' },
          { 'Higher Duration / Coverage is Better': 'higher_is_better' }
        ],
        default: 'lower_is_better', section: 'Style', order: 5
      },
      fontScale: {
        type: 'string', label: 'Typography & Font Scale', display: 'select',
        values: [
          { 'Compact (0.85x)': '0.85' },
          { 'Standard (1.0x)': '1' },
          { 'Large Presentation (1.2x)': '1.2' }
        ],
        default: '1', section: 'Style', order: 6
      },
      valueFormat: {
        type: 'string', label: 'Duration & Value Format', display: 'select',
        values: [
          { 'Auto (Adaptive Duration)': 'auto' },
          { 'Hours & Minutes (2h 15m)': 'duration_hm' },
          { 'Decimal Hours (2.25h)': 'decimal_hours' },
          { 'Compact Number': 'compact_number' },
          { 'Raw Minutes': 'raw_minutes' }
        ],
        default: 'auto', section: 'Style', order: 7
      },
      laneHeight: {
        type: 'number', label: 'Lane Height (px, shrinks to fit)', default: 56,
        section: 'Style', order: 8
      },
      markerSize: {
        type: 'number', label: 'Marker Radius (px)', default: 7,
        section: 'Style', order: 9
      }
    },

    // ------------------------------------------------------------------
    // Dynamic Field-Role Dropdowns (populated from the live query)
    // ------------------------------------------------------------------
    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
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

      var auto = self._autoResolve(dims, self._lastData || []);
      var ROLES = {
        laneField: { role: 'dim', key: 'lane' },
        timeField: { role: 'dim', key: 'time' },
        labelField: { role: 'dim', key: 'label' },
        detailField: { role: 'dim', key: 'detail' },
        severityField: { role: 'dim', key: 'severity' },
        actorField: { role: 'dim', key: 'actor' },
        targetMeasureField: { role: 'meas', key: 'target' }
      };

      Object.keys(ROLES).forEach(function (key) {
        if (!newOptions[key]) return;
        var spec = ROLES[key];
        var list = spec.role === 'meas' ? meas : dims;
        var autoField = spec.role === 'meas' ? (meas[0] || null) : auto[spec.key];
        var autoLabel = autoField ? ('Auto \u2192 ' + fieldLabel(autoField)) : 'Auto / None';
        var values = [];
        var autoEntry = {}; autoEntry[autoLabel] = ''; values.push(autoEntry);
        var seen = {};
        list.forEach(function (fld) {
          var lbl = fieldLabel(fld);
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
      catch (e) { console.warn('registerOptions unavailable in this host:', e); }
    },

    // Heuristic auto-resolution of field roles when options are blank
    _autoResolve: function (dims, data) {
      var d3 = window.d3;
      var used = {};
      var out = { time: null, lane: null, label: null, detail: null, severity: null, actor: null };
      var hasName = function (f, hints) {
        var shortName = String(f.name || '').split('.').pop();
        var n = (shortName + ' ' + (f.label_short || '')).toLowerCase();
        return hints.some(function (h) { return n.indexOf(h) >= 0; });
      };
      var sample = (data && data.length) ? data[0] : null;

      var isTimeField = function (f) {
        var t = String(f.type || '').toLowerCase();
        if (t.indexOf('date') >= 0 || t.indexOf('time') >= 0) return true;
        if (hasName(f, ['time', 'date', 'timestamp'])) return true;
        if (sample && d3) {
          var v = cellValue(sample, f.name);
          if (v && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) && parseTime(d3, v)) return true;
        }
        return false;
      };
      for (var i = 0; i < dims.length; i++) {
        if (isTimeField(dims[i]) && !hasName(dims[i], ['sla', 'deadline', 'resolved_at', 'closed'])) { out.time = dims[i]; used[dims[i].name] = true; break; }
      }
      if (!out.time) for (var j = 0; j < dims.length; j++) { if (isTimeField(dims[j])) { out.time = dims[j]; used[dims[j].name] = true; break; } }

      var pick = function (hints) {
        for (var k = 0; k < dims.length; k++) {
          var f = dims[k];
          if (used[f.name] || isTimeField(f)) continue;
          if (hasName(f, hints)) { used[f.name] = true; return f; }
        }
        return null;
      };
      var nextFree = function () {
        for (var k = 0; k < dims.length; k++) {
          var f = dims[k];
          if (used[f.name] || isTimeField(f)) continue;
          used[f.name] = true; return f;
        }
        return null;
      };

      out.severity = pick(['sever', 'priority', 'level', 'impact']);
      out.actor = pick(['actor', 'owner', 'assignee', 'engineer', 'technician', 'user', 'author', 'team']);
      out.lane = pick(['source', 'system', 'lane', 'channel', 'workstream', 'queue']);
      out.label = pick(['event_type', 'type', 'event', 'title', 'name', 'category', 'action']);
      out.detail = pick(['desc', 'detail', 'message', 'note', 'summary', 'body', 'text', 'comment']);
      if (!out.lane) out.lane = nextFree();
      if (!out.label) out.label = nextFree();
      if (!out.detail) out.detail = nextFree();
      if (!out.severity) out.severity = pick(['status', 'state']);
      return out;
    },

    create: function (element, config) {
      element.innerHTML = '';
      element.style.boxSizing = 'border-box';
      element.style.padding = '0';
      element.style.overflow = 'hidden';
      element.style.display = 'flex';
      element.style.flexDirection = 'column';
      element.style.fontFamily = FONT;

      if (!document.getElementById('noc-incident-timeline-style')) {
        var st = document.createElement('style');
        st.id = 'noc-incident-timeline-style';
        st.textContent = [
          '@keyframes nocPulse { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(2.6); opacity: 0; } }',
          '.noc-pulse { transform-box: fill-box; transform-origin: center; animation: nocPulse 1.8s ease-out infinite; pointer-events: none; }',
          '.noc-marker { cursor: default; transition: r .12s ease-out; }',
          '.noc-marker.drillable { cursor: pointer; }',
          '.noc-header { display:flex; flex: 0 0 auto; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }',
          '.noc-hud { display:flex; flex: 0 0 auto; gap: 6px; flex-wrap: nowrap; overflow: hidden; align-items: stretch; }',
          '.noc-chip { display:flex; flex-direction: column; justify-content:center; min-width: 0; flex: 1 1 0; padding: 5px 10px; border-radius: 8px; border: 1px solid transparent; }',
          '.noc-chip .k { font-size: 9px; letter-spacing: .08em; text-transform: uppercase; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
          '.noc-chip .v { font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }',
          '.noc-lane-label { font-weight: 600; }',
          '.noc-axis text { font-family: inherit; }',
          '.noc-axis .domain { display: none; }'
        ].join('\n');
        document.head.appendChild(st);
      }

      var header = document.createElement('div');
      header.className = 'noc-header';
      element.appendChild(header);

      var hud = document.createElement('div');
      hud.className = 'noc-hud';
      element.appendChild(hud);

      var chart = document.createElement('div');
      chart.className = 'noc-chart';
      chart.style.flex = '1 1 0';
      chart.style.minHeight = '0';
      chart.style.position = 'relative';
      chart.style.width = '100%';
      chart.style.overflow = 'hidden';
      element.appendChild(chart);

      var tooltip = document.createElement('div');
      tooltip.className = 'noc-tooltip';
      tooltip.style.cssText = 'position:fixed;display:none;pointer-events:none;z-index:99999;padding:9px 12px;border-radius:8px;' +
        'font-size:12px;line-height:1.4;max-width:320px;background:#ffffff;color:#202124;border:1px solid #dadce0;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.16);font-family:' + FONT;
      document.body.appendChild(tooltip);

      this._header = header;
      this._hud = hud;
      this._chart = chart;
      this._tooltip = tooltip;
      this._element = element;
      this._searchTerm = '';
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
      var curW = el.clientWidth || 0, curH = el.clientHeight || 0;
      if (curW <= 10 || curH <= 10) return;
      if (self._lastRenderW && self._lastRenderH &&
          Math.abs(curW - self._lastRenderW) < 4 && Math.abs(curH - self._lastRenderH) < 4) return;
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
          console.error('noc_incident_timeline render error', e);
          if (self.addError) try { self.addError({ title: 'Render Error', message: String(e && e.message || e) }); } catch (err2) {}
        }
        if (typeof done === 'function') done();
      });
    },

    _renderEmpty: function (pal, msg, sub) {
      this._header.innerHTML = '';
      this._header.style.display = 'none';
      this._hud.innerHTML = '';
      this._hud.style.display = 'none';
      this._chart.innerHTML = '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:' + pal.subtext + ';font-family:' + FONT + '">' +
        '<div style="width:34px;height:34px;border-radius:50%;border:2px dashed ' + pal.laneLine + ';display:flex;align-items:center;justify-content:center;color:' + pal.subtext + ';font-size:16px">&#9201;</div>' +
        '<div style="font-size:13px;font-weight:600;color:' + pal.text + '">' + escapeHtml(msg) + '</div>' +
        (sub ? '<div style="font-size:11px">' + escapeHtml(sub) + '</div>' : '') + '</div>';
    },

    _resolvePalette: function (config) {
      var base = PALETTES[config.colorPalette] || PALETTES.google_enterprise;
      var pal = {
        name: base.name,
        isDark: !!base.isDark,
        accent: base.accent,
        text: base.text,
        subtext: base.subtext,
        grid: base.grid,
        laneAlt: base.laneAlt,
        laneLine: base.laneLine,
        bg: base.bg,
        hudBg: base.hudBg,
        hudBorder: base.hudBorder,
        breachBg: base.breachBg,
        breachBorder: base.breachBorder,
        severity: Object.assign({}, base.severity)
      };
      if (config.customPrimaryColor && /^#[0-9a-fA-F]{3,8}$/.test(config.customPrimaryColor.trim())) {
        pal.accent = config.customPrimaryColor.trim();
        pal.severity.public = pal.accent;
      }
      if (config.customCriticalColor && /^#[0-9a-fA-F]{3,8}$/.test(config.customCriticalColor.trim())) {
        pal.severity.critical = config.customCriticalColor.trim();
      }
      if (config.customResolvedColor && /^#[0-9a-fA-F]{3,8}$/.test(config.customResolvedColor.trim())) {
        pal.severity.resolved = config.customResolvedColor.trim();
      }
      return pal;
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;
      var pal = this._resolvePalette(config);
      var fs = Math.max(0.6, Math.min(2, Number(config.fontScale) || 1));
      var valueFormat = config.valueFormat || 'auto';
      var polarity = config.metricPolarity || 'lower_is_better';
      element.style.background = pal.bg;
      element.style.color = pal.text;

      var fields = (queryResponse && queryResponse.fields) || {};
      var dims = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
      var meas = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
      if (!meas.length && fields.table_calculations && fields.table_calculations.length) meas = fields.table_calculations;

      if (!data || !data.length) { this._renderEmpty(pal, 'No incident events', 'The query returned no rows for this case.'); return; }
      if (!dims.length) { this._renderEmpty(pal, 'Add dimensions', 'Needs a source-system lane, an event timestamp, and an event-type label.'); return; }

      // ---- Resolve field roles
      var auto = this._autoResolve(dims, data);
      var fLane = matchField(dims, config.laneField) || auto.lane;
      var fTime = matchField(dims, config.timeField) || auto.time;
      var fLabel = matchField(dims, config.labelField) || auto.label;
      var fDetail = matchField(dims, config.detailField) || auto.detail;
      var fSev = matchField(dims, config.severityField) || auto.severity;
      var fActor = matchField(dims, config.actorField) || auto.actor;
      var fTargetMeas = matchField(meas, config.targetMeasureField) || (meas[0] || null);
      if (!fTime) { this._renderEmpty(pal, 'No event time field found', 'Add a date/time dimension or pick one under Display \u2192 Event Time Field.'); return; }
      if (!fLane) fLane = fLabel || fTime;

      var suppressNulls = config.suppressZeroNull !== false;

      // ---- Build events
      var allEvents = [];
      var measureTargets = [];
      data.forEach(function (row, i) {
        var t = parseTime(d3, cellValue(row, fTime.name));
        if (!t) return;
        var laneRaw = cellValue(row, fLane.name);
        if (suppressNulls && (laneRaw === null || laneRaw === undefined || String(laneRaw).trim() === '')) return;
        var lane = (laneRaw === null || laneRaw === undefined || laneRaw === '') ? 'Unassigned' : String(laneRaw);
        var label = fLabel ? cellValue(row, fLabel.name) : null;
        var sevRaw = fSev ? cellValue(row, fSev.name) : label;
        var sev = classifySeverity(sevRaw);
        if (!fSev) sev = classifySeverity(String(label || '') + ' ' + String(fDetail ? (cellValue(row, fDetail.name) || '') : ''));
        var cell = row[fTime.name] || row[fLane.name] || {};
        var links = (cell && cell.links) || (row[fLabel ? fLabel.name : ''] || {}).links || [];
        if (fTargetMeas) {
          var tv = Number(cellValue(row, fTargetMeas.name));
          if (!isNaN(tv) && tv > 0) measureTargets.push(tv);
        }
        allEvents.push({
          i: i, t: t, lane: lane,
          label: label === null || label === undefined ? '' : String(label),
          detail: fDetail ? cellValue(row, fDetail.name) : null,
          actor: fActor ? cellValue(row, fActor.name) : null,
          sevRaw: sevRaw, sev: sev, links: links
        });
      });

      if (!allEvents.length) { this._renderEmpty(pal, 'No parseable timestamps', 'Values in "' + fieldLabel(fTime) + '" could not be parsed as dates.'); return; }
      allEvents.sort(function (a, b) { return a.t - b.t; });

      var W = element.clientWidth || 600;
      var H = element.clientHeight || 300;

      // ---- Custom Header & Search Bar
      var header = this._header;
      var hasCustomTitle = !!(config.customTitle && config.customTitle.trim());
      var hasCustomSub = !!(config.customSubtitle && config.customSubtitle.trim());
      var showSearch = config.showSearch !== false && H >= 165 && W >= 340;
      if (hasCustomTitle || hasCustomSub || showSearch) {
        header.style.display = 'flex';
        header.style.padding = (W < 420 ? '6px 8px 2px' : '8px 12px 2px');
        header.innerHTML = '';

        var titleWrap = document.createElement('div');
        titleWrap.style.cssText = 'display:flex;flex-direction:column;min-width:0;flex:1 1 auto;';
        if (hasCustomTitle) {
          var tDiv = document.createElement('div');
          tDiv.style.cssText = 'font-size:' + (14 * fs) + 'px;font-weight:700;color:' + pal.text + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
          tDiv.textContent = config.customTitle.trim();
          titleWrap.appendChild(tDiv);
        }
        if (hasCustomSub) {
          var sDiv = document.createElement('div');
          sDiv.style.cssText = 'font-size:' + (11 * fs) + 'px;color:' + pal.subtext + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
          sDiv.textContent = config.customSubtitle.trim();
          titleWrap.appendChild(sDiv);
        }
        header.appendChild(titleWrap);

        if (showSearch) {
          var searchBox = document.createElement('input');
          searchBox.type = 'text';
          searchBox.placeholder = 'Search events, lanes, actors...';
          searchBox.value = self._searchTerm || '';
          searchBox.style.cssText = 'padding:4px 9px;font-size:' + (11 * fs) + 'px;border-radius:6px;border:1px solid ' + pal.hudBorder + ';' +
            'background:' + pal.hudBg + ';color:' + pal.text + ';outline:none;min-width:150px;max-width:230px;font-family:' + FONT + ';';
          searchBox.oninput = function () {
            self._searchTerm = searchBox.value;
            self._render(d3, data, element, config, queryResponse);
          };
          header.appendChild(searchBox);
        }
      } else {
        header.style.display = 'none';
        header.innerHTML = '';
      }

      // Apply live search filter
      var q = (self._searchTerm || '').toLowerCase().trim();
      var events = q ? allEvents.filter(function (e) {
        return (e.lane + ' ' + e.label + ' ' + (e.detail || '') + ' ' + (e.actor || '') + ' ' + (e.sevRaw || '')).toLowerCase().indexOf(q) >= 0;
      }) : allEvents.slice();

      if (!events.length) {
        this._hud.style.display = 'none';
        this._chart.innerHTML = '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:' + pal.subtext + '">' +
          '<div style="font-size:13px;font-weight:600;color:' + pal.text + '">No matching events for "' + escapeHtml(self._searchTerm) + '"</div>' +
          '<div style="font-size:11px">Clear the search box to restore all ' + allEvents.length + ' events.</div></div>';
        return;
      }

      // ---- Compute Lane stats, Sorting & Top-N Rollup
      var laneStats = {};
      var laneOrder = [];
      events.forEach(function (e) {
        if (!laneStats[e.lane]) {
          laneStats[e.lane] = { name: e.lane, count: 0, crit: 0, firstT: e.t };
          laneOrder.push(e.lane);
        }
        laneStats[e.lane].count += 1;
        if (e.sev === 'critical') laneStats[e.lane].crit += 1;
      });

      var sortMode = config.sortBy || 'chronological';
      laneOrder.sort(function (a, b) {
        var sa = laneStats[a], sb = laneStats[b];
        if (sortMode === 'count_desc') return sb.count - sa.count || (sa.firstT - sb.firstT);
        if (sortMode === 'count_asc') return sa.count - sb.count || (sa.firstT - sb.firstT);
        if (sortMode === 'critical_desc') return sb.crit - sa.crit || sb.count - sa.count;
        if (sortMode === 'alpha_asc') return a.localeCompare(b);
        return sa.firstT - sb.firstT;
      });

      var topN = Number(config.topNLimit);
      if (isNaN(topN) || topN < 0) topN = 8;
      if (topN > 0 && laneOrder.length > topN) {
        var keep = {};
        laneOrder.slice(0, topN).forEach(function (l) { keep[l] = true; });
        if (config.enableOtherRollup !== false) {
          events = events.map(function (e) {
            if (keep[e.lane]) return e;
            var clone = Object.assign({}, e);
            clone.lane = 'Other Sources';
            return clone;
          });
          laneOrder = laneOrder.slice(0, topN).concat(['Other Sources']);
        } else {
          events = events.filter(function (e) { return !!keep[e.lane]; });
          laneOrder = laneOrder.slice(0, topN);
        }
      }

      // ---- Reference times & SLA target mode
      var opened = events[0].t;
      var latest = events[events.length - 1].t;
      var targetMode = config.targetMode || 'fixed';
      var slaHours = Number(config.slaTargetHours);
      if (isNaN(slaHours) || slaHours <= 0) slaHours = 4;

      var targetMs = slaHours * 3600000;
      var defaultRefLabel = 'SLA ' + (slaHours % 1 === 0 ? slaHours : slaHours.toFixed(1)) + 'h';

      if (targetMode === 'measure' && measureTargets.length) {
        var avgM = measureTargets.reduce(function (s, v) { return s + v; }, 0) / measureTargets.length;
        var fNameLow = fTargetMeas ? String(fTargetMeas.name || '').toLowerCase() : '';
        targetMs = (fNameLow.indexOf('min') >= 0 || avgM > 72) ? (avgM * 60000) : (avgM * 3600000);
        defaultRefLabel = 'SLA Target (' + fmtDuration(targetMs, valueFormat) + ')';
      } else if (targetMode === 'dataset_mean' || targetMode === 'dataset_median' || targetMode === 'percentile_p75' || targetMode === 'percentile_p90') {
        var spans = events.map(function (e) { return Math.max(60000, e.t - opened); }).sort(function (a, b) { return a - b; });
        if (targetMode === 'dataset_mean') {
          targetMs = spans.reduce(function (s, v) { return s + v; }, 0) / spans.length;
          defaultRefLabel = 'Mean Span (' + fmtDuration(targetMs, valueFormat) + ')';
        } else if (targetMode === 'dataset_median') {
          targetMs = percentile(spans, 0.50);
          defaultRefLabel = 'Median P50 (' + fmtDuration(targetMs, valueFormat) + ')';
        } else if (targetMode === 'percentile_p75') {
          targetMs = percentile(spans, 0.75);
          defaultRefLabel = 'P75 Target (' + fmtDuration(targetMs, valueFormat) + ')';
        } else {
          targetMs = percentile(spans, 0.90);
          defaultRefLabel = 'P90 Target (' + fmtDuration(targetMs, valueFormat) + ')';
        }
      }

      var showSla = targetMode !== 'none';
      var sla = new Date(opened.getTime() + targetMs);
      var now = (config.nowMode === 'wall_clock') ? new Date() : latest;
      if (now < opened) now = opened;
      var resolvedEvt = null;
      for (var r = events.length - 1; r >= 0; r--) { if (events[r].sev === 'resolved') { resolvedEvt = events[r]; break; } }
      var critCount = events.filter(function (e) { return e.sev === 'critical'; }).length;
      var critPct = events.length ? (critCount / events.length) * 100 : 0;
      var anomalyThresh = Number(config.anomalyThresholdPct);
      if (isNaN(anomalyThresh) || anomalyThresh < 0) anomalyThresh = 25;
      var critAlert = critPct >= anomalyThresh && critCount > 0;

      var elapsedEnd = resolvedEvt ? resolvedEvt.t : now;
      var slaRemainingMs = sla - elapsedEnd;
      var breached = showSla && (polarity === 'higher_is_better' ? (slaRemainingMs > 0) : (slaRemainingMs < 0));

      // ---- HUD
      var hud = this._hud;
      var hudMode = config.hudMode || (config.showHud === false ? 'hidden' : 'scorecard');
      var showHud = hudMode !== 'hidden' && H >= 130;
      if (showHud) {
        hud.style.display = 'flex';
        hud.style.padding = (W < 420 ? '6px 6px 4px' : '6px 10px 4px');
        var fmtOpen = d3.timeFormat(W < 520 ? '%b %d %H:%M' : '%a %b %d, %H:%M');
        var narrow = W < 560 || hudMode === 'compact_strip';
        var chips = [
          { k: 'Opened', v: fmtOpen(opened), c: pal.text },
          { k: resolvedEvt ? (narrow ? 'Restored in' : 'Time to Restore') : 'Elapsed', v: fmtDuration(elapsedEnd - opened, valueFormat), c: pal.text }
        ];
        if (showSla) {
          chips.push({
            k: breached ? (narrow ? 'SLA Breached' : 'SLA Status') : 'SLA Remaining',
            v: breached ? ((narrow ? '+' : 'BREACHED by ') + fmtDuration(Math.abs(slaRemainingMs), valueFormat)) : (fmtDuration(Math.abs(slaRemainingMs), valueFormat) + ' left'),
            c: breached ? pal.severity.critical : pal.severity.resolved,
            bg: breached ? pal.breachBg : null,
            bd: breached ? pal.breachBorder : null
          });
        }
        chips.push({ k: 'Events', v: String(events.length) + (q ? '/' + allEvents.length : ''), c: pal.text });
        chips.push({
          k: critAlert ? 'Critical (!)' : 'Critical',
          v: String(critCount) + (events.length ? ' (' + Math.round(critPct) + '%)' : ''),
          c: critCount ? pal.severity.critical : pal.subtext,
          bg: critAlert ? pal.breachBg : null,
          bd: critAlert ? pal.breachBorder : null
        });
        if (narrow && chips.length > 3) chips = [chips[1], chips[2], chips[chips.length - 1]];
        hud.innerHTML = chips.map(function (ch) {
          return '<div class="noc-chip" style="background:' + (ch.bg || pal.hudBg) + ';border-color:' + (ch.bd || pal.hudBorder) + ';padding:' + (hudMode === 'compact_strip' ? '3px 8px' : '5px 10px') + '">' +
            '<div class="k" style="color:' + pal.subtext + ';font-size:' + (9 * fs) + 'px">' + escapeHtml(ch.k) + '</div>' +
            '<div class="v" style="color:' + ch.c + ';font-size:' + ((hudMode === 'compact_strip' ? 12 : 14) * fs) + 'px">' + escapeHtml(ch.v) + '</div></div>';
        }).join('');
      } else {
        hud.style.display = 'none';
        hud.innerHTML = '';
      }

      // ---- Chart geometry
      var chart = this._chart;
      chart.innerHTML = '';
      var cw = chart.clientWidth || W;
      var chH = chart.clientHeight || (H - (showHud ? 56 : 0));
      if (cw < 60 || chH < 40) return;

      var labelFont = 11 * fs;
      var longestLane = laneOrder.reduce(function (m, l) { return Math.max(m, l.length); }, 0);
      var laneLabelW = Math.min(Math.round(cw * 0.28), Math.max(56, Math.round(longestLane * labelFont * 0.58 + 18)));
      var axisH = 22 * fs;
      var refRowH = 16 * fs;
      var margin = { top: Math.round(axisH + refRowH + 4), right: 18, bottom: 8, left: laneLabelW };
      var innerW = Math.max(40, cw - margin.left - margin.right);
      var innerH = Math.max(20, chH - margin.top - margin.bottom);
      var desiredLane = Math.max(24, Number(config.laneHeight) || 56);
      var laneH = Math.min(desiredLane, innerH / laneOrder.length);
      var usedH = laneH * laneOrder.length;
      var mk = Math.max(3, Math.min(14, Number(config.markerSize) || 7));
      mk = Math.min(mk, laneH * 0.32);
      var density = config.labelDensity || 'all';
      if (laneH < 30 && density === 'all') density = 'critical';

      // ---- Scales
      var tMin = opened;
      var tMax = showSla ? d3.max([latest, sla, now]) : d3.max([latest, now]);
      var span = Math.max(tMax - tMin, 10 * 60000);
      var padMs = Math.max(span * 0.04, 2 * 60000);
      var x = d3.scaleTime().domain([new Date(tMin.getTime() - padMs), new Date(tMax.getTime() + padMs)]).range([0, innerW]);
      var y = d3.scaleBand().domain(laneOrder).range([0, usedH]).paddingInner(0);

      var svg = d3.select(chart).append('svg')
        .attr('width', cw).attr('height', chH)
        .style('display', 'block').style('font-family', FONT);
      var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // Lane bands
      laneOrder.forEach(function (l, i) {
        g.append('rect').attr('x', -margin.left).attr('y', y(l)).attr('width', cw).attr('height', laneH)
          .attr('fill', i % 2 ? pal.laneAlt : pal.bg);
        g.append('line').attr('x1', -margin.left).attr('x2', innerW + margin.right).attr('y1', y(l) + laneH).attr('y2', y(l) + laneH)
          .attr('stroke', pal.grid).attr('stroke-width', 1);
      });

      // SLA breach shading
      if (showSla && x(sla) < innerW) {
        g.append('rect').attr('x', Math.max(0, x(sla))).attr('y', 0).attr('width', innerW - Math.max(0, x(sla))).attr('height', usedH)
          .attr('fill', pal.severity.critical).attr('fill-opacity', pal.isDark ? 0.12 : 0.05);
      }

      // Lane labels (truncated with title)
      var maxChars = Math.max(4, Math.floor((laneLabelW - 18) / (labelFont * 0.58)));
      laneOrder.forEach(function (l) {
        var txt = l.length > maxChars ? l.slice(0, maxChars - 1) + '\u2026' : l;
        var cnt = events.filter(function (e) { return e.lane === l; }).length;
        var tl = g.append('text').attr('class', 'noc-lane-label')
          .attr('x', -10).attr('y', y(l) + laneH / 2).attr('dy', laneH >= 36 ? '-0.1em' : '0.35em')
          .attr('text-anchor', 'end').attr('font-size', labelFont).attr('fill', pal.text).text(txt);
        tl.append('title').text(l + ' \u2014 ' + cnt + ' event' + (cnt === 1 ? '' : 's'));
        if (laneH >= 36) {
          g.append('text').attr('x', -10).attr('y', y(l) + laneH / 2).attr('dy', '1.05em')
            .attr('text-anchor', 'end').attr('font-size', labelFont * 0.82).attr('fill', pal.subtext)
            .text(cnt + ' event' + (cnt === 1 ? '' : 's'));
        }
      });

      // Time axis (top)
      var tickCount = Math.max(2, Math.floor(innerW / 90));
      var axis = d3.axisTop(x).ticks(tickCount).tickSize(-usedH).tickPadding(6);
      var axisG = g.append('g').attr('class', 'noc-axis').attr('transform', 'translate(0,' + (-refRowH - 2) + ')').call(axis);
      axisG.selectAll('line').attr('stroke', pal.grid).attr('stroke-dasharray', '2,3').attr('y1', refRowH + 2);
      axisG.selectAll('text').attr('fill', pal.subtext).attr('font-size', 10 * fs);

      // Reference lines
      var refLabelText = (config.referenceLineLabel && config.referenceLineLabel.trim()) ? config.referenceLineLabel.trim() : defaultRefLabel;
      var refs = [
        { key: 'opened', t: opened, label: 'Opened', color: pal.accent, dash: null },
        { key: 'now', t: now, label: config.nowMode === 'wall_clock' ? 'Now' : 'Latest', color: pal.isDark ? '#64748b' : pal.text, dash: '2,3' }
      ];
      if (showSla) {
        refs.push({ key: 'sla', t: sla, label: refLabelText, color: pal.severity.critical, dash: '5,4' });
      }
      refs.sort(function (a, b) { return a.t - b.t; });
      var prevEnd = -Infinity;
      refs.forEach(function (rf) {
        var rx = x(rf.t);
        if (rx < -2 || rx > innerW + 2) return;
        g.append('line').attr('x1', rx).attr('x2', rx).attr('y1', -refRowH).attr('y2', usedH)
          .attr('stroke', rf.color).attr('stroke-width', rf.key === 'sla' ? 1.5 : 1.2)
          .attr('stroke-dasharray', rf.dash).attr('opacity', 0.9);
        var tw = rf.label.length * 9.5 * fs * 0.6 + 12;
        var anchor = 'middle', lx = rx;
        if (rx - tw / 2 < prevEnd + 4) { anchor = 'start'; lx = rx + 4; }
        if (lx + (anchor === 'start' ? tw : tw / 2) > innerW + margin.right) { anchor = 'end'; lx = rx - 4; }
        var bx = anchor === 'middle' ? lx - tw / 2 : (anchor === 'start' ? lx : lx - tw);
        g.append('rect').attr('x', bx).attr('y', -refRowH - 1).attr('width', tw).attr('height', refRowH - 2).attr('rx', 3)
          .attr('fill', rf.color).attr('fill-opacity', rf.key === 'now' ? 0.9 : 1);
        g.append('text').attr('x', bx + tw / 2).attr('y', -refRowH - 1 + (refRowH - 2) / 2).attr('dy', '0.35em')
          .attr('text-anchor', 'middle').attr('font-size', 9.5 * fs).attr('font-weight', 700).attr('fill', '#fff')
          .text(rf.label);
        prevEnd = bx + tw;
      });

      // Lane connector lines
      laneOrder.forEach(function (l) {
        var le = events.filter(function (e) { return e.lane === l; });
        if (le.length < 2) return;
        g.append('line').attr('x1', x(le[0].t)).attr('x2', x(le[le.length - 1].t))
          .attr('y1', y(l) + laneH / 2).attr('y2', y(l) + laneH / 2)
          .attr('stroke', pal.laneLine).attr('stroke-width', 2).attr('stroke-linecap', 'round');
      });

      // Markers
      var tooltip = this._tooltip;
      tooltip.style.background = pal.isDark ? '#0f172a' : '#ffffff';
      tooltip.style.color = pal.text;
      tooltip.style.borderColor = pal.hudBorder;
      var fmtTip = d3.timeFormat('%a %b %d, %H:%M:%S');
      var canDrill = typeof LookerCharts !== 'undefined' && LookerCharts.Utils && typeof LookerCharts.Utils.openDrillMenu === 'function';
      var mg = g.append('g');
      events.forEach(function (e) {
        var cx = x(e.t), cy = y(e.lane) + laneH / 2;
        var col = pal.severity[e.sev] || pal.severity.info;
        if (e.sev === 'critical') {
          mg.append('circle').attr('class', 'noc-pulse').attr('cx', cx).attr('cy', cy).attr('r', mk)
            .attr('fill', 'none').attr('stroke', col).attr('stroke-width', 1.5);
        }
        var drillable = canDrill && e.links && e.links.length;
        var c = mg.append('circle').attr('class', 'noc-marker' + (drillable ? ' drillable' : ''))
          .attr('cx', cx).attr('cy', cy).attr('r', e.sev === 'critical' ? mk * 1.15 : mk)
          .attr('fill', col).attr('stroke', pal.bg).attr('stroke-width', 1.5);
        if (e.sev === 'resolved') {
          mg.append('path').attr('d', 'M' + (cx - mk * 0.45) + ',' + cy + ' l' + (mk * 0.32) + ',' + (mk * 0.32) + ' l' + (mk * 0.6) + ',-' + (mk * 0.62))
            .attr('stroke', '#fff').attr('stroke-width', Math.max(1.2, mk * 0.22)).attr('fill', 'none').attr('stroke-linecap', 'round').attr('pointer-events', 'none');
        }
        c.on('mouseenter', function (ev) {
          d3.select(this).attr('r', (e.sev === 'critical' ? mk * 1.15 : mk) + 2);
          var sevCol = col;
          var sinceOpen = fmtDuration(e.t - opened, valueFormat);
          tooltip.innerHTML =
            '<div style="font-size:11px;color:' + pal.subtext + ';margin-bottom:3px">' + escapeHtml(fmtTip(e.t)) + ' (+' + escapeHtml(sinceOpen) + ') &middot; ' + escapeHtml(e.lane) + '</div>' +
            '<div style="font-weight:700;font-size:13px;margin-bottom:4px;display:flex;align-items:center;gap:6px">' +
            '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + sevCol + '"></span>' + escapeHtml(e.label || SEVERITY_LABELS[e.sev]) +
            '<span style="margin-left:auto;font-size:10px;font-weight:600;color:' + sevCol + ';border:1px solid ' + sevCol + ';border-radius:4px;padding:0 5px">' + escapeHtml(e.sevRaw ? String(e.sevRaw) : SEVERITY_LABELS[e.sev]) + '</span></div>' +
            (e.actor ? '<div style="font-size:11px;color:' + pal.subtext + ';margin-bottom:3px">Actor: <span style="color:' + pal.text + ';font-weight:600">' + escapeHtml(e.actor) + '</span></div>' : '') +
            (e.detail ? '<div style="font-size:12px;color:' + pal.text + ';white-space:normal">' + escapeHtml(e.detail) + '</div>' : '');
          tooltip.style.display = 'block';
        }).on('mousemove', function (ev) {
          var px = ev.clientX + 14, py = ev.clientY + 14;
          var tw2 = tooltip.offsetWidth || 240, th2 = tooltip.offsetHeight || 80;
          if (px + tw2 > window.innerWidth - 8) px = ev.clientX - tw2 - 14;
          if (py + th2 > window.innerHeight - 8) py = ev.clientY - th2 - 14;
          tooltip.style.left = px + 'px'; tooltip.style.top = py + 'px';
        }).on('mouseleave', function () {
          d3.select(this).attr('r', e.sev === 'critical' ? mk * 1.15 : mk);
          tooltip.style.display = 'none';
        });
        if (drillable) {
          c.on('click', function (ev) {
            try { LookerCharts.Utils.openDrillMenu({ links: e.links, event: ev }); } catch (err) { console.warn(err); }
          });
        }
      });

      // Collision-aware labels (above marker; fallback below; else skip)
      if (density !== 'none') {
        var lf = 10 * fs;
        var charW = lf * 0.56;
        var rMax = mk * 1.15;
        var roomAbove = laneH / 2 >= rMax + 4 + lf * 0.9;
        var roomBelow = laneH / 2 >= rMax + 4 + lf * 1.1;
        laneOrder.forEach(function (l) {
          if (!roomAbove) return;
          var le = events.filter(function (e) { return e.lane === l && (density === 'all' || e.sev === 'critical' || e.sev === 'resolved'); });
          var endAbove = -Infinity, endBelow = -Infinity;
          var maxLabelPx = Math.max(40, Math.min(160, innerW / 4));
          le.forEach(function (e) {
            var txt = e.label || SEVERITY_LABELS[e.sev];
            if (!txt) return;
            var maxC = Math.floor(maxLabelPx / charW);
            if (txt.length > maxC) txt = txt.slice(0, Math.max(3, maxC - 1)) + '\u2026';
            var w = txt.length * charW;
            var cx = x(e.t);
            var start = Math.max(-margin.left + 4, cx - w / 2);
            var pos = null;
            if (start >= endAbove + 6) { pos = 'above'; endAbove = start + w; }
            else if (roomBelow && start >= endBelow + 6) { pos = 'below'; endBelow = start + w; }
            if (!pos) return;
            var r = e.sev === 'critical' ? mk * 1.15 : mk;
            var ty = y(l) + laneH / 2 + (pos === 'above' ? -(r + 4) : (r + 4 + lf * 0.85));
            g.append('text').attr('x', Math.min(innerW + margin.right - w / 2, Math.max(w / 2 - margin.left + 4, cx))).attr('y', ty)
              .attr('text-anchor', 'middle').attr('font-size', lf)
              .attr('font-weight', e.sev === 'critical' ? 700 : 500)
              .attr('fill', e.sev === 'critical' ? pal.severity.critical : (e.sev === 'resolved' ? pal.severity.resolved : pal.text))
              .attr('pointer-events', 'none').text(txt);
          });
        });
      }

      // Legend (bottom-right, only if room)
      if (config.showLegend !== false && (innerH - usedH > 16 * fs + 6 || laneH >= 40)) {
        var present = ['critical', 'warning', 'info', 'resolved', 'public'].filter(function (s) { return events.some(function (e) { return e.sev === s; }); });
        var lg = svg.append('g').attr('transform', 'translate(' + (cw - margin.right) + ',' + (chH - 6) + ')');
        var off = 0;
        present.slice().reverse().forEach(function (s) {
          var txt = SEVERITY_LABELS[s];
          var w = txt.length * 9 * fs * 0.56 + 16;
          off -= w;
          lg.append('circle').attr('cx', off + 4).attr('cy', -4).attr('r', 3.5).attr('fill', pal.severity[s]);
          lg.append('text').attr('x', off + 11).attr('y', -4).attr('dy', '0.35em').attr('font-size', 9 * fs).attr('fill', pal.subtext).text(txt);
        });
      }
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
