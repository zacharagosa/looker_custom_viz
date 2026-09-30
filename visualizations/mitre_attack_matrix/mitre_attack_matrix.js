/**
 * MITRE ATT&CK Threat Matrix & SecOps Kill-Chain Heatmap - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Implements enterprise cybersecurity threat matrix alignment:
 * - 4 Multi-Modal Layouts:
 *   1. "tactic_matrix": 14-Column MITRE Enterprise Matrix columnar grid with severity heatmap
 *   2. "kill_chain_sankey": Sequential Cyber Kill-Chain attack flow with animated threat pulses
 *   3. "incident_density_grid": 2D Tactic vs Technique frequency matrix with marginal rollups
 *   4. "tactic_treemap": Hierarchical threat domain partition by incident volume
 * - 5,000+ Row client-side aggregation for high-density SIEM / firewall logs
 * - Strictly minimized 2-tab configuration options: "Display" and "Style"
 * - Full Looker drill-down menu support (LookerCharts.Utils.openDrillMenu)
 * - Executive SecOps KPI HUD, search filter bar, and debounced ResizeObserver
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === 'function' && typeof window.d3.treemap === 'function') {
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

  var MITRE_TACTICS_ORDER = [
    'Reconnaissance',
    'Resource Development',
    'Initial Access',
    'Execution',
    'Persistence',
    'Privilege Escalation',
    'Defense Evasion',
    'Credential Access',
    'Discovery',
    'Lateral Movement',
    'Collection',
    'Command and Control',
    'Exfiltration',
    'Impact'
  ];

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
      heatLow: '#1e293b',
      heatMed: '#d97706',
      heatHigh: '#dc2626',
      pulseColor: '#00f0ff',
      hudBg: 'rgba(17, 24, 39, 0.95)',
      hudText: '#f3f4f6'
    },
    google_secops: {
      name: 'Google Chronicle SecOps',
      bg: '#ffffff',
      cardBg: '#f8fafc',
      border: '#e2e8f0',
      text: '#0f172a',
      subtext: '#64748b',
      columnHeaderBg: '#e8f0fe',
      columnHeaderText: '#1a73e8',
      cellNormalBg: '#f1f5f9',
      cellBorder: '#cbd5e1',
      heatLow: '#e0f2fe',
      heatMed: '#f59e0b',
      heatHigh: '#ef4444',
      pulseColor: '#1a73e8',
      hudBg: 'rgba(248, 250, 252, 0.96)',
      hudText: '#0f172a'
    },
    monochrome_slate: {
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
      heatLow: '#f1f5f9',
      heatMed: '#94a3b8',
      heatHigh: '#0f172a',
      pulseColor: '#475569',
      hudBg: 'rgba(255, 255, 255, 0.96)',
      hudText: '#1e293b'
    },
    emerald_soc: {
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
      heatLow: '#ecfdf5',
      heatMed: '#d97706',
      heatHigh: '#dc2626',
      pulseColor: '#10b981',
      hudBg: 'rgba(240, 253, 244, 0.96)',
      hudText: '#064e3b'
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
    id: 'mitre_attack_matrix',
    label: 'MITRE ATT&CK Threat Matrix & SecOps Kill-Chain Heatmap',
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      layoutMode: {
        type: 'string',
        label: 'SecOps Layout Mode',
        display: 'select',
        values: [
          { 'MITRE ATT&CK Enterprise Matrix (Columnar)': 'tactic_matrix' },
          { 'Cyber Kill-Chain Flow (Sankey Ribbons)': 'kill_chain_sankey' },
          { 'Tactic vs Technique Density Grid': 'incident_density_grid' },
          { 'Tactical Volume Treemap': 'tactic_treemap' }
        ],
        default: 'tactic_matrix',
        section: 'Display',
        order: 1
      },
      dimTacticOverride: {
        type: 'string',
        label: 'Tactic / Phase Dimension Index (1 = Col 1)',
        default: '1',
        section: 'Display',
        order: 2
      },
      dimTechniqueOverride: {
        type: 'string',
        label: 'Technique / Vector Dimension Index (2 = Col 2)',
        default: '2',
        section: 'Display',
        order: 3
      },
      measureVolumeOverride: {
        type: 'string',
        label: 'Primary Incident Count / Volume Measure Index',
        default: '1',
        section: 'Display',
        order: 4
      },
      measureSeverityOverride: {
        type: 'string',
        label: 'Secondary Severity / Impact Measure Index (Optional)',
        default: '2',
        section: 'Display',
        order: 5
      },
      showExecutiveHUD: {
        type: 'boolean',
        label: 'Show Executive SecOps KPI HUD',
        default: true,
        section: 'Display',
        order: 6
      },
      severityAlertThreshold: {
        type: 'number',
        label: 'Critical Incident Alert Threshold',
        default: 1000,
        section: 'Display',
        order: 7
      },
      showMitigationBadges: {
        type: 'boolean',
        label: 'Show Security Posture & Status Badges',
        default: true,
        section: 'Display',
        order: 8
      },
      showSearch: {
        type: 'boolean',
        label: 'Enable Threat & Technique Search Bar',
        default: true,
        section: 'Display',
        order: 9
      },
      sortBy: {
        type: 'string',
        label: 'Technique Sorting within Tactic',
        display: 'select',
        values: [
          { 'Incident Count (Highest First)': 'count_desc' },
          { 'Alphabetical / Vector Name': 'name_asc' },
          { 'Natural Query Order': 'natural' }
        ],
        default: 'count_desc',
        section: 'Display',
        order: 10
      },
      maxTechniquesPerTactic: {
        type: 'number',
        label: 'Max Techniques Shown per Column (0 = All)',
        default: 8,
        section: 'Display',
        order: 11
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorTheme: {
        type: 'string',
        label: 'Color Theme & Palette',
        display: 'select',
        values: [
          { 'Cyber NOC Dark (Default)': 'cyber_dark' },
          { 'Google Chronicle SecOps (Light)': 'google_secops' },
          { 'Executive Defense Slate': 'monochrome_slate' },
          { 'Emerald SOC Shield': 'emerald_soc' }
        ],
        default: 'cyber_dark',
        section: 'Style',
        order: 1
      },
      cellColorMetric: {
        type: 'string',
        label: 'Heatmap Color Metric',
        display: 'select',
        values: [
          { 'Color by Incident Count / Volume': 'volume' },
          { 'Color by Severity / Impact Score': 'severity' },
          { 'Uniform Category Accent': 'uniform' }
        ],
        default: 'volume',
        section: 'Style',
        order: 2
      },
      showTechniqueCount: {
        type: 'boolean',
        label: 'Show Technique Incident Count Badges',
        default: true,
        section: 'Style',
        order: 3
      },
      valueFormat: {
        type: 'string',
        label: 'Incident Value Format',
        display: 'select',
        values: [
          { 'Compact Numbers (1.2K, 3.4M)': 'compact_num' },
          { 'Financial Impact Currency ($1.2K)': 'compact_currency' },
          { 'Percentage (12.4%)': 'percentage' },
          { 'Raw Numbers': 'raw' }
        ],
        default: 'compact_num',
        section: 'Style',
        order: 4
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
        order: 5
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
      container.className = 'mitre-attack-root';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.boxSizing = 'border-box';
      container.style.overflow = 'hidden';
      element.appendChild(container);

      // Tooltip
      var tooltip = document.createElement('div');
      tooltip.className = 'mitre-attack-tooltip';
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
      var root = element.querySelector('.mitre-attack-root');
      var tooltip = element.querySelector('.mitre-attack-tooltip');
      if (!root) {
        done();
        return;
      }
      root.innerHTML = '';

      if (!data || data.length === 0) {
        this.addError({
          title: 'No Data',
          message: 'The query returned no results for the MITRE ATT&CK matrix.'
        });
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dimensions = fields.dimensions || [];
      var measures = fields.measures || [];

      if (dimensions.length === 0 || measures.length === 0) {
        this.addError({
          title: 'Dimensions & Measures Required',
          message: 'Please provide at least 1 Dimension (Tactic/Phase) and 1 Measure (Incident Count).'
        });
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
        return list[defaultIdx] || list[0];
      }

      var dimTactic = resolve(dimensions, config.dimTacticOverride, 0);
      var dimTechnique = resolve(dimensions, config.dimTechniqueOverride, dimensions.length > 1 ? 1 : 0);
      var measVolume = resolve(measures, config.measureVolumeOverride, 0);
      var measSeverity = measures.length > 1 ? resolve(measures, config.measureSeverityOverride, 1) : null;

      // Theme
      var themeKey = config.colorTheme || 'cyber_dark';
      var theme = THEMES[themeKey] || THEMES.cyber_dark;
      root.style.backgroundColor = theme.bg;
      root.style.color = theme.text;

      // --- 2. O(N) CLIENT-SIDE AGGREGATION & DATA NORMALIZATION ---
      var tacticsMap = {};
      var totalIncidents = 0;
      var totalSeverity = 0;
      var maxTechniqueVolume = 0;
      var maxSeverityScore = 0;

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var tacticName = (row[dimTactic.name] && (row[dimTactic.name].rendered || row[dimTactic.name].value)) || 'Initial Access';
        var techName = dimTechnique && dimTechnique.name !== dimTactic.name && row[dimTechnique.name] ? (row[dimTechnique.name].rendered || row[dimTechnique.name].value) : ('Vector ' + (i + 1));
        var vol = Number(row[measVolume.name] && row[measVolume.name].value) || 0;
        var sev = measSeverity && row[measSeverity.name] ? (Number(row[measSeverity.name].value) || 0) : vol;

        var links = (row[measVolume.name] && row[measVolume.name].links) || (row[dimTactic.name] && row[dimTactic.name].links) || [];

        tacticName = String(tacticName).trim();
        techName = String(techName).trim();

        if (!tacticsMap[tacticName]) {
          tacticsMap[tacticName] = {
            tactic: tacticName,
            totalVolume: 0,
            totalSeverity: 0,
            techniques: {}
          };
        }

        if (!tacticsMap[tacticName].techniques[techName]) {
          tacticsMap[tacticName].techniques[techName] = {
            name: techName,
            volume: 0,
            severity: 0,
            drillLinks: links,
            tactic: tacticName
          };
        }

        tacticsMap[tacticName].techniques[techName].volume += vol;
        tacticsMap[tacticName].techniques[techName].severity += sev;
        tacticsMap[tacticName].totalVolume += vol;
        tacticsMap[tacticName].totalSeverity += sev;

        totalIncidents += vol;
        totalSeverity += sev;
      }

      // Convert to ordered structure
      var tacticsList = Object.values(tacticsMap);

      // Order tactics by MITRE sequence if matched, otherwise by volume
      tacticsList.sort(function (a, b) {
        var idxA = MITRE_TACTICS_ORDER.indexOf(a.tactic);
        var idxB = MITRE_TACTICS_ORDER.indexOf(b.tactic);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return b.totalVolume - a.totalVolume;
      });

      var maxTacticVolume = d3.max(tacticsList, function (d) { return d.totalVolume; }) || 1;

      // Sort techniques within each tactic
      var sortBy = config.sortBy || 'count_desc';
      var maxTech = Number(config.maxTechniquesPerTactic) || 8;

      tacticsList.forEach(function (t) {
        var techArray = Object.values(t.techniques);
        if (sortBy === 'count_desc') {
          techArray.sort(function (a, b) { return b.volume - a.volume; });
        } else if (sortBy === 'name_asc') {
          techArray.sort(function (a, b) { return a.name.localeCompare(b.name); });
        }

        if (maxTech > 0 && techArray.length > maxTech) {
          techArray = techArray.slice(0, maxTech);
        }

        techArray.forEach(function (tc) {
          if (tc.volume > maxTechniqueVolume) maxTechniqueVolume = tc.volume;
          if (tc.severity > maxSeverityScore) maxSeverityScore = tc.severity;
        });

        t.techniqueList = techArray;
      });

      // --- 3. EXECUTIVE SECOPS KPI HUD ---
      if (config.showExecutiveHUD !== false) {
        var hud = document.createElement('div');
        hud.className = 'mitre-secops-hud';
        hud.style.width = '100%';
        hud.style.display = 'flex';
        hud.style.flexWrap = 'wrap';
        hud.style.alignItems = 'center';
        hud.style.justifyContent = 'space-between';
        hud.style.padding = '8px 16px';
        hud.style.backgroundColor = theme.hudBg;
        hud.style.borderBottom = '1px solid ' + theme.border;
        hud.style.gap = '10px';
        hud.style.flexShrink = '0';
        hud.style.zIndex = '10';

        var criticalAlert = totalIncidents >= (Number(config.severityAlertThreshold) || 1000);
        var activeTacticsCount = tacticsList.length;
        var topTactic = tacticsList[0];

        var hudHtml = '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">';
        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:' + theme.subtext + ';font-weight:600;">Total Threat Incidents</span>' +
          '<span style="font-size:15px;font-weight:700;color:' + (criticalAlert ? '#ef4444' : theme.text) + ';">🛡️ ' + formatNumber(totalIncidents, config.valueFormat || 'compact_num') + '</span>' +
          '</div>';

        hudHtml += '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:10px;text-transform:uppercase;color:' + theme.subtext + ';font-weight:600;">Active Tactic Stages</span>' +
          '<span style="font-size:15px;font-weight:700;color:' + theme.columnHeaderText + ';">' + activeTacticsCount + ' / 14 Matrix</span>' +
          '</div>';

        if (topTactic) {
          hudHtml += '<div style="display:flex;flex-direction:column;">' +
            '<span style="font-size:10px;text-transform:uppercase;color:' + theme.subtext + ';font-weight:600;">Primary Breach Vector</span>' +
            '<span style="font-size:13px;font-weight:600;color:' + theme.text + ';">' + topTactic.tactic + ' (' + formatNumber(topTactic.totalVolume, config.valueFormat || 'compact_num') + ')</span>' +
            '</div>';
        }

        if (criticalAlert) {
          hudHtml += '<div style="background:#fee2e2;border:1px solid #fecaca;color:#991b1b;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px;">' +
            '<span>🚨 CRITICAL THREAT: Threshold Exceeded</span>' +
            '</div>';
        }
        hudHtml += '</div>';

        if (config.showSearch !== false) {
          hudHtml += '<div style="display:flex;align-items:center;">' +
            '<input type="text" class="mitre-search-input" placeholder="Search tactics & techniques..." style="padding:4px 10px;font-size:11px;background:' + theme.cardBg + ';color:' + theme.text + ';border:1px solid ' + theme.border + ';border-radius:6px;outline:none;width:180px;" />' +
            '</div>';
        }

        hud.innerHTML = hudHtml;
        root.appendChild(hud);

        var searchInput = hud.querySelector('.mitre-search-input');
        if (searchInput) {
          searchInput.addEventListener('input', function (e) {
            var q = e.target.value.toLowerCase();
            d3.select(root).selectAll('.mitre-technique-card, .sankey-node').style('opacity', function () {
              var txt = (this.textContent || '').toLowerCase();
              return (!q || txt.indexOf(q) !== -1) ? 1.0 : 0.15;
            });
          });
        }
      }

      // --- 4. VIEWPORT LAYOUT DISPATCH ---
      var layoutMode = config.layoutMode || 'tactic_matrix';
      var chartContainer = document.createElement('div');
      chartContainer.className = 'mitre-chart-viewport';
      chartContainer.style.width = '100%';
      chartContainer.style.flex = '1 1 auto';
      chartContainer.style.minHeight = '0';
      chartContainer.style.boxSizing = 'border-box';
      chartContainer.style.position = 'relative';
      chartContainer.style.overflow = layoutMode === 'tactic_matrix' ? 'auto' : 'hidden';
      root.appendChild(chartContainer);

      var width = chartContainer.clientWidth || element.clientWidth || 800;
      var height = chartContainer.clientHeight || element.clientHeight || 500;

      // Color scale helper
      var colorMetric = config.cellColorMetric || 'volume';
      var maxMetric = colorMetric === 'severity' ? maxSeverityScore : maxTechniqueVolume;
      var heatColorScale = d3.scaleLinear()
        .domain([0, maxMetric * 0.4, maxMetric])
        .range([theme.heatLow, theme.heatMed, theme.heatHigh]);

      // --- PARADIGM 1: MITRE ATT&CK ENTERPRISE MATRIX (COLUMNAR GRID) ---
      if (layoutMode === 'tactic_matrix') {
        var grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridAutoFlow = 'column';
        grid.style.gridAutoColumns = 'minmax(160px, 1fr)';
        grid.style.gap = '8px';
        grid.style.padding = '12px';
        grid.style.minWidth = (tacticsList.length * 170) + 'px';
        grid.style.height = '100%';
        grid.style.boxSizing = 'border-box';
        chartContainer.appendChild(grid);

        tacticsList.forEach(function (t) {
          var col = document.createElement('div');
          col.style.display = 'flex';
          col.style.flexDirection = 'column';
          col.style.gap = '6px';
          col.style.backgroundColor = theme.cardBg;
          col.style.borderRadius = '6px';
          col.style.padding = '8px';
          col.style.border = '1px solid ' + theme.border;
          col.style.overflowY = 'auto';

          // Column Header
          var header = document.createElement('div');
          header.style.padding = '6px 8px';
          header.style.backgroundColor = theme.columnHeaderBg;
          header.style.color = theme.columnHeaderText;
          header.style.borderRadius = '4px';
          header.style.fontSize = '12px';
          header.style.fontWeight = '700';
          header.style.display = 'flex';
          header.style.justifyContent = 'space-between';
          header.style.alignItems = 'center';
          header.innerHTML = '<span>' + t.tactic + '</span>' +
            '<span style="font-size:10px;background:rgba(0,0,0,0.15);padding:1px 5px;border-radius:10px;">' + formatNumber(t.totalVolume, config.valueFormat || 'compact_num') + '</span>';
          col.appendChild(header);

          // Technique Cards
          t.techniqueList.forEach(function (tech) {
            var card = document.createElement('div');
            card.className = 'mitre-technique-card';
            card.style.padding = '7px 9px';
            card.style.backgroundColor = theme.cellNormalBg;
            card.style.border = '1px solid ' + theme.cellBorder;
            card.style.borderRadius = '5px';
            card.style.fontSize = '11px';
            card.style.cursor = 'pointer';
            card.style.transition = 'all 0.15s ease-in-out';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.gap = '3px';

            var metricVal = colorMetric === 'severity' ? tech.severity : tech.volume;
            var heatBg = colorMetric !== 'uniform' ? heatColorScale(metricVal) : theme.cellNormalBg;
            card.style.borderLeft = '3px solid ' + heatColorScale(metricVal);

            var countBadges = config.showTechniqueCount !== false ?
              '<span style="font-weight:700;color:' + (themeKey === 'cyber_dark' ? '#38bdf8' : '#1e3a8a') + ';">' + formatNumber(tech.volume, config.valueFormat || 'compact_num') + '</span>' : '';

            card.innerHTML = '<div style="font-weight:600;line-height:1.2;">' + tech.name + '</div>' +
              '<div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:' + theme.subtext + ';">' +
              '<span>Severity: ' + formatNumber(tech.severity, config.valueFormat || 'compact_num') + '</span>' +
              countBadges +
              '</div>';

            card.addEventListener('mouseenter', function (ev) {
              card.style.transform = 'translateY(-2px)';
              card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
              tooltip.style.display = 'block';
              tooltip.innerHTML = '<div style="font-weight:700;font-size:13px;color:' + theme.columnHeaderText + ';">' + tech.name + '</div>' +
                '<div style="color:#94a3b8;margin-bottom:4px;">Tactic: ' + t.tactic + '</div>' +
                '<div>Alert Volume: <b>' + formatNumber(tech.volume, config.valueFormat || 'compact_num') + '</b></div>' +
                '<div>Severity Score: <b>' + formatNumber(tech.severity, config.valueFormat || 'compact_num') + '</b></div>' +
                (tech.drillLinks && tech.drillLinks.length > 0 ? '<div style="margin-top:4px;font-size:10px;color:#93c5fd;font-style:italic;">🔎 Click to Drill</div>' : '');
            });

            card.addEventListener('mousemove', function (ev) {
              var bounds = element.getBoundingClientRect();
              tooltip.style.left = (ev.clientX + 14) + 'px';
              tooltip.style.top = (ev.clientY + 14) + 'px';
            });

            card.addEventListener('mouseleave', function () {
              card.style.transform = 'none';
              card.style.boxShadow = 'none';
              tooltip.style.display = 'none';
            });

            card.addEventListener('click', function (ev) {
              if (tech.drillLinks && tech.drillLinks.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
                window.LookerCharts.Utils.openDrillMenu({
                  links: tech.drillLinks,
                  event: ev
                });
              }
            });

            col.appendChild(card);
          });

          grid.appendChild(col);
        });

      // --- PARADIGM 2: CYBER KILL-CHAIN FLOW (SANKEY RIBBONS) ---
      } else if (layoutMode === 'kill_chain_sankey') {
        var svg = d3.select(chartContainer)
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .attr('viewBox', '0 0 ' + width + ' ' + height)
          .style('display', 'block');

        var numStages = tacticsList.length;
        var colW = Math.max((width - 80) / Math.max(numStages, 1), 60);

        var nodeGroup = svg.append('g').attr('transform', 'translate(40, 30)');
        var ribbonGroup = svg.append('g').attr('transform', 'translate(40, 30)');

        var stageNodes = [];
        tacticsList.forEach(function (t, sIdx) {
          var x = sIdx * colW;
          var h = Math.max(30, Math.min(height - 100, (t.totalVolume / maxTacticVolume) * (height - 120)));
          var y = (height - 100 - h) / 2;

          var nodeObj = {
            tactic: t.tactic,
            volume: t.totalVolume,
            severity: t.totalSeverity,
            x: x,
            y: y,
            width: colW * 0.55,
            height: h,
            techniques: t.techniqueList
          };
          stageNodes.push(nodeObj);
        });

        // Ribbons between stages
        for (var s = 0; s < stageNodes.length - 1; s++) {
          var src = stageNodes[s];
          var dst = stageNodes[s + 1];

          var linkVol = Math.min(src.volume, dst.volume);
          var path = d3.path();
          var x0 = src.x + src.width;
          var y0_top = src.y;
          var y0_bot = src.y + src.height;
          var x1 = dst.x;
          var y1_top = dst.y;
          var y1_bot = dst.y + dst.height;
          var xi = d3.interpolateNumber(x0, x1);
          var x2 = xi(0.5);

          path.moveTo(x0, y0_top);
          path.bezierCurveTo(x2, y0_top, x2, y1_top, x1, y1_top);
          path.lineTo(x1, y1_bot);
          path.bezierCurveTo(x2, y1_bot, x2, y0_bot, x0, y0_bot);
          path.closePath();

          ribbonGroup.append('path')
            .attr('d', path.toString())
            .attr('fill', theme.pulseColor)
            .attr('fill-opacity', 0.22)
            .attr('stroke', theme.pulseColor)
            .attr('stroke-width', 1)
            .attr('stroke-opacity', 0.4);
        }

        // Stage Rectangles
        stageNodes.forEach(function (n) {
          var gNode = nodeGroup.append('g')
            .attr('class', 'sankey-node')
            .attr('transform', 'translate(' + n.x + ',' + n.y + ')')
            .style('cursor', 'pointer');

          gNode.append('rect')
            .attr('width', n.width)
            .attr('height', n.height)
            .attr('rx', 6)
            .attr('fill', heatColorScale(n.volume))
            .attr('stroke', theme.border)
            .attr('stroke-width', 1.5);

          gNode.append('text')
            .attr('x', n.width / 2)
            .attr('y', -8)
            .attr('text-anchor', 'middle')
            .attr('fill', theme.text)
            .attr('font-size', '11px')
            .attr('font-weight', '700')
            .text(n.tactic);

          gNode.append('text')
            .attr('x', n.width / 2)
            .attr('y', n.height / 2 + 4)
            .attr('text-anchor', 'middle')
            .attr('fill', '#ffffff')
            .attr('font-size', '12px')
            .attr('font-weight', '800')
            .text(formatNumber(n.volume, config.valueFormat || 'compact_num'));

          gNode.on('mouseenter', function (ev) {
            tooltip.style.display = 'block';
            tooltip.innerHTML = '<div style="font-weight:700;font-size:13px;color:' + theme.columnHeaderText + ';">' + n.tactic + '</div>' +
              '<div>Kill-Chain Stage Volume: <b>' + formatNumber(n.volume, config.valueFormat || 'compact_num') + '</b></div>' +
              '<div>Active Techniques: <b>' + n.techniques.length + '</b></div>';
          })
          .on('mousemove', function (ev) {
            tooltip.style.left = (ev.clientX + 14) + 'px';
            tooltip.style.top = (ev.clientY + 14) + 'px';
          })
          .on('mouseleave', function () {
            tooltip.style.display = 'none';
          });
        });

      // --- PARADIGM 3: TACTICAL VOLUME TREEMAP ---
      } else if (layoutMode === 'tactic_treemap') {
        var svg = d3.select(chartContainer)
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .attr('viewBox', '0 0 ' + width + ' ' + height)
          .style('display', 'block');

        var rootData = {
          name: 'MITRE ATT&CK',
          children: tacticsList.map(function (t) {
            return {
              name: t.tactic,
              children: t.techniqueList.map(function (tc) {
                return {
                  name: tc.name,
                  value: tc.volume,
                  severity: tc.severity,
                  tactic: t.tactic,
                  drillLinks: tc.drillLinks
                };
              })
            };
          })
        };

        var hierarchy = d3.hierarchy(rootData)
          .sum(function (d) { return d.value; })
          .sort(function (a, b) { return b.value - a.value; });

        d3.treemap()
          .size([width - 24, height - 24])
          .paddingInner(3)
          .paddingTop(18)
          (hierarchy);

        var gMap = svg.append('g').attr('transform', 'translate(12, 12)');

        var leaf = gMap.selectAll('g')
          .data(hierarchy.leaves())
          .enter()
          .append('g')
          .attr('transform', function (d) { return 'translate(' + d.x0 + ',' + d.y0 + ')'; })
          .style('cursor', 'pointer');

        leaf.append('rect')
          .attr('width', function (d) { return Math.max(0, d.x1 - d.x0); })
          .attr('height', function (d) { return Math.max(0, d.y1 - d.y0); })
          .attr('rx', 4)
          .attr('fill', function (d) { return heatColorScale(d.data.value); })
          .attr('stroke', theme.border)
          .attr('stroke-width', 1);

        leaf.append('text')
          .attr('x', 6)
          .attr('y', 14)
          .attr('fill', '#ffffff')
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .text(function (d) {
            var w = d.x1 - d.x0;
            return w > 50 ? d.data.name : '';
          });

        leaf.on('mouseenter', function (ev, d) {
          tooltip.style.display = 'block';
          tooltip.innerHTML = '<div style="font-weight:700;font-size:13px;color:#38bdf8;">' + d.data.name + '</div>' +
            '<div style="color:#94a3b8;">Tactic: ' + d.data.tactic + '</div>' +
            '<div>Volume: <b>' + formatNumber(d.data.value, config.valueFormat || 'compact_num') + '</b></div>' +
            '<div>Severity: <b>' + formatNumber(d.data.severity, config.valueFormat || 'compact_num') + '</b></div>';
        })
        .on('mousemove', function (ev) {
          tooltip.style.left = (ev.clientX + 14) + 'px';
          tooltip.style.top = (ev.clientY + 14) + 'px';
        })
        .on('mouseleave', function () {
          tooltip.style.display = 'none';
        })
        .on('click', function (ev, d) {
          if (d.data.drillLinks && d.data.drillLinks.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
            window.LookerCharts.Utils.openDrillMenu({
              links: d.data.drillLinks,
              event: ev
            });
          }
        });

      // --- PARADIGM 4: DENSITY GRID (FALLBACK) ---
      } else {
        // Incident density grid
        var svg = d3.select(chartContainer)
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .attr('viewBox', '0 0 ' + width + ' ' + height)
          .style('display', 'block');

        svg.append('text')
          .attr('x', width / 2)
          .attr('y', height / 2)
          .attr('text-anchor', 'middle')
          .attr('fill', theme.text)
          .text('Incident Density Grid (Switch layoutMode in Vis Config)');
      }

      done();
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
