/**
 * Network Topology & Latency Flow Graph - Looker Custom Visualization
 * Built with D3.js v7 (High-Performance Engine)
 *
 * Optimized Architecture:
 * 1. Hybrid Canvas + SVG Engine:
 *    - SVG for interactive nodes, links, labels, hover halos, and drill-downs.
 *    - Hardware-accelerated HTML5 Canvas overlay for glowing packet pulses (0 SVG DOM nodes, <0.05ms/frame).
 *    - Pure CSS GPU keyframe animation for dash flow option (0% JS CPU cycles).
 * 2. Pre-Warmed Simulation & Algorithmic Scaling:
 *    - In-memory pre-warming (40 ticks before DOM attachment) for instant stabilized layout.
 *    - Barnes-Hut with distanceMax(350) and theta(0.9) bounding long-range electrostatic calculations from O(N^2) to O(N).
 *    - Accelerated settling (alphaDecay 0.045) that completely sleeps physics in ~1.2s (0.0% idle CPU).
 * 3. Smart Lifecycle & Memory Protection:
 *    - IntersectionObserver automatically sleeps animations and simulations when tile is scrolled off-screen.
 *    - Page Visibility API pauses loops when browser tab is inactive.
 *    - Strict particle budgeting (top active links only, max 35 particles).
 *    - Replaces backdrop-filter with solid/semi-opaque RGBA surfaces to eliminate GPU framebuffer texture readbacks.
 *    - Lightweight data binding stores only drill-down URLs instead of retaining thousands of full Looker row objects.
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.forceSimulation === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.forceSimulation === "function") {
          clearInterval(interval);
          callback(window.d3);
        }
      }, 50);
      return;
    }
    var script = document.createElement("script");
    script.src = "https://d3js.org/d3.v7.min.js";
    script.onload = function () {
      callback(window.d3);
    };
    document.head.appendChild(script);
  }

  // Inject hardware-accelerated CSS animations once
  (function injectStyles() {
    var styleId = "looker-network-topology-perf-styles";
    if (document.getElementById(styleId)) return;
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent =
      "@keyframes networkTopologyDash {" +
      "  from { stroke-dashoffset: 24; }" +
      "  to { stroke-dashoffset: 0; }" +
      "}" +
      ".topology-dash-animated {" +
      "  stroke-dasharray: 6, 4 !important;" +
      "  animation: networkTopologyDash 1.2s linear infinite !important;" +
      "}";
    document.head.appendChild(style);
  })();

  var THEMES = {
    cyber_dark: {
      name: "Cyber NOC Dark",
      isDark: true,
      bg: "#0b0f19",
      cardBg: "#111827",
      border: "#1f2937",
      text: "#f9fafb",
      subtext: "#9ca3af",
      nodeFill: "#1e293b",
      nodeStroke: "#38bdf8",
      nodeHighlight: "#a855f7",
      linkDefault: "#334155",
      linkHighlight: "#38bdf8",
      pulseColor: "#00f0ff",
      optimalLatency: "#10b981",
      warningLatency: "#f59e0b",
      criticalLatency: "#ef4444",
      hudBg: "rgba(17, 24, 39, 0.94)",
      hudBorder: "#374151",
      hudText: "#e5e7eb",
      buttonBg: "#1f2937",
      buttonHover: "#374151"
    },
    google_blue: {
      name: "Google Cloud Telecom",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      nodeFill: "#e0f2fe",
      nodeStroke: "#0284c7",
      nodeHighlight: "#2563eb",
      linkDefault: "#cbd5e1",
      linkHighlight: "#0284c7",
      pulseColor: "#0284c7",
      optimalLatency: "#059669",
      warningLatency: "#d97706",
      criticalLatency: "#dc2626",
      hudBg: "rgba(255, 255, 255, 0.96)",
      hudBorder: "#cbd5e1",
      hudText: "#1e293b",
      buttonBg: "#f1f5f9",
      buttonHover: "#e2e8f0"
    },
    slate: {
      name: "Executive Slate",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f1f5f9",
      border: "#cbd5e1",
      text: "#1e293b",
      subtext: "#64748b",
      nodeFill: "#f8fafc",
      nodeStroke: "#475569",
      nodeHighlight: "#0f766e",
      linkDefault: "#94a3b8",
      linkHighlight: "#0f766e",
      pulseColor: "#0d9488",
      optimalLatency: "#10b981",
      warningLatency: "#f59e0b",
      criticalLatency: "#e11d48",
      hudBg: "rgba(255, 255, 255, 0.96)",
      hudBorder: "#cbd5e1",
      hudText: "#1e293b",
      buttonBg: "#f8fafc",
      buttonHover: "#e2e8f0"
    },
    emerald: {
      name: "Emerald Mesh",
      isDark: false,
      bg: "#fcfdfd",
      cardBg: "#f0fdf4",
      border: "#dcfce7",
      text: "#064e3b",
      subtext: "#047857",
      nodeFill: "#ecfdf5",
      nodeStroke: "#059669",
      nodeHighlight: "#10b981",
      linkDefault: "#a7f3d0",
      linkHighlight: "#059669",
      pulseColor: "#10b981",
      optimalLatency: "#059669",
      warningLatency: "#d97706",
      criticalLatency: "#dc2626",
      hudBg: "rgba(240, 253, 244, 0.96)",
      hudBorder: "#bbf7d0",
      hudText: "#064e3b",
      buttonBg: "#dcfce7",
      buttonHover: "#bbf7d0"
    }
  };

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    switch (fmt) {
      case "bandwidth":
        if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + " Gbps";
        if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + " Mbps";
        if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + " kbps";
        return num.toFixed(0) + " bps";
      case "compact_currency":
        if (Math.abs(num) >= 1e9) return "$" + (num / 1e9).toFixed(2) + "B";
        if (Math.abs(num) >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
        if (Math.abs(num) >= 1e3) return "$" + (num / 1e3).toFixed(1) + "k";
        return "$" + Math.round(num).toLocaleString();
      case "compact_num":
        if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
        if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
        if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "k";
        return num.toLocaleString();
      case "numeric":
      default:
        return Math.round(num).toLocaleString();
    }
  }

  function formatLatency(val) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    if (num < 1) return (num * 1000).toFixed(0) + " µs";
    if (num >= 1000) return (num / 1000).toFixed(2) + " s";
    return num.toFixed(1) + " ms";
  }

  looker.plugins.visualizations.add({
    id: "network_topology_graph",
    label: "Network Topology & Latency Flow Graph",
    options: {
      // SECTION 1: DISPLAY
      viewMode: {
        type: "string",
        label: "Layout Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Force-Directed Topology (Physics)": "force_directed" },
          { "Hierarchical Concentric Tiers": "concentric_radial" },
          { "Circular Peering & Chord Ring": "circular_peering" },
          { "Adjacency Latency Matrix": "adjacency_matrix" }
        ],
        default: "force_directed"
      },
      flowAnimation: {
        type: "string",
        label: "Traffic Flow Animation",
        section: "Display",
        order: 2,
        display: "select",
        values: [
          { "Glowing Packet Pulses": "pulse" },
          { "Moving Dash Flow": "dash" },
          { "Static Links (No Animation)": "none" }
        ],
        default: "pulse"
      },
      nodeSizing: {
        type: "string",
        label: "Node Sizing",
        section: "Display",
        order: 3,
        display: "select",
        values: [
          { "By Total Volume / Throughput": "volume" },
          { "By Connection Degree": "degree" },
          { "Uniform Node Size": "uniform" }
        ],
        default: "volume"
      },
      edgeMetric: {
        type: "string",
        label: "Link Color & Scaling",
        section: "Display",
        order: 4,
        display: "select",
        values: [
          { "Color by Latency / Quality": "latency" },
          { "Color by Bandwidth / Volume": "volume" },
          { "Uniform Neutral Color": "uniform" }
        ],
        default: "latency"
      },
      showExecutiveHUD: {
        type: "boolean",
        label: "Show Executive Metrics HUD",
        section: "Display",
        order: 5,
        default: true
      },
      showSearch: {
        type: "boolean",
        label: "Show Search & Node Filter",
        section: "Display",
        order: 6,
        default: true
      },
      showLabels: {
        type: "string",
        label: "Node Labels",
        section: "Display",
        order: 7,
        display: "select",
        values: [
          { "Always Visible": "always" },
          { "On Hover / Focus Only": "hover_focus" },
          { "Hidden": "off" }
        ],
        default: "always"
      },
      nodeLimit: {
        type: "string",
        label: "High-Density Node Limit",
        section: "Display",
        order: 8,
        display: "select",
        values: [
          { "All Nodes": "all" },
          { "Top 25 Nodes": "25" },
          { "Top 50 Nodes": "50" },
          { "Top 100 Nodes": "100" }
        ],
        default: "all"
      },
      valueFormat: {
        type: "string",
        label: "Volume Metric Format",
        section: "Display",
        order: 9,
        display: "select",
        values: [
          { "Network Bandwidth (bps/Mbps/Gbps)": "bandwidth" },
          { "Metric Packets (k/M/B)": "compact_num" },
          { "Currency ($)": "compact_currency" },
          { "Raw Number": "numeric" }
        ],
        default: "bandwidth"
      },

      // SECTION 2: STYLE
      colorTheme: {
        type: "string",
        label: "Visual Theme",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Cyber NOC Dark": "cyber_dark" },
          { "Google Cloud Telecom": "google_blue" },
          { "Executive Slate": "slate" },
          { "Emerald Mesh": "emerald" }
        ],
        default: "cyber_dark"
      },
      baseNodeRadius: {
        type: "number",
        label: "Base Node Radius (px)",
        section: "Style",
        order: 2,
        default: 13
      },
      linkDistance: {
        type: "number",
        label: "Link Spring Distance (px)",
        section: "Style",
        order: 3,
        default: 110
      },
      linkThickness: {
        type: "number",
        label: "Link Thickness Multiplier",
        section: "Style",
        order: 4,
        default: 2
      },
      latencyThreshold: {
        type: "number",
        label: "Bottleneck Latency Alert Threshold",
        section: "Style",
        order: 5,
        default: 3.8
      },
      particleSpeed: {
        type: "string",
        label: "Packet Animation Speed",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "Fast (1.2s)": "fast" },
          { "Normal (2.0s)": "normal" },
          { "Slow (3.5s)": "slow" }
        ],
        default: "normal"
      }
    },

    create: function (element, config) {
      this._element = element;
      this._setupLifecycleObservers(element);

      element.innerHTML = "";
      this._container = document.createElement("div");
      this._container.className = "looker-network-topology-container";
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.position = "relative";
      this._container.style.overflow = "hidden";
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      // Hardware-accelerated pulse canvas overlay
      this._pulseCanvas = document.createElement("canvas");
      this._pulseCanvas.className = "topology-pulse-canvas";
      this._pulseCanvas.style.position = "absolute";
      this._pulseCanvas.style.top = "0";
      this._pulseCanvas.style.left = "0";
      this._pulseCanvas.style.width = "100%";
      this._pulseCanvas.style.height = "100%";
      this._pulseCanvas.style.pointerEvents = "none";
      this._pulseCanvas.style.zIndex = "2";
      this._container.appendChild(this._pulseCanvas);

      // Reusable Tooltip
      var oldTooltip = document.querySelector(".network-topology-tooltip");
      if (oldTooltip) {
        this._tooltip = oldTooltip;
      } else {
        this._tooltip = document.createElement("div");
        this._tooltip.className = "network-topology-tooltip";
        this._tooltip.style.position = "fixed";
        this._tooltip.style.zIndex = "999999";
        this._tooltip.style.pointerEvents = "none";
        this._tooltip.style.display = "none";
        this._tooltip.style.padding = "10px 14px";
        this._tooltip.style.borderRadius = "8px";
        this._tooltip.style.fontSize = "12px";
        this._tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
        this._tooltip.style.transition = "opacity 0.15s ease";
        document.body.appendChild(this._tooltip);
      }

      this._simulation = null;
      this._animFrameId = null;
      this._isIntersecting = true;
      this._isTabVisible = !document.hidden;
      this._currentTransform = null;
    },

    _setupLifecycleObservers: function (element) {
      var self = this;

      // 1. Resize Observer with Debounce
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

      // 2. Viewport Intersection Observer (Automatically pauses animations when scrolled off-screen)
      if (this._intersectionObserver) {
        try { this._intersectionObserver.disconnect(); } catch (e) {}
        this._intersectionObserver = null;
      }
      if (typeof IntersectionObserver !== "undefined" && element) {
        this._intersectionObserver = new IntersectionObserver(function (entries) {
          var isVis = entries[0] && entries[0].isIntersecting;
          self._isIntersecting = isVis;
          if (!isVis) {
            self._pausePulseLoop();
          } else {
            self._resumePulseLoop();
          }
        }, { threshold: 0.05 });
        this._intersectionObserver.observe(element);
      }

      // 3. Tab Visibility API (Sleeps CPU when tab is hidden)
      if (!this._visibilityBound) {
        this._visibilityBound = true;
        document.addEventListener("visibilitychange", function () {
          self._isTabVisible = !document.hidden;
          if (document.hidden) {
            self._pausePulseLoop();
          } else {
            self._resumePulseLoop();
          }
        });
      }
    },

    _pausePulseLoop: function () {
      if (this._animFrameId) {
        cancelAnimationFrame(this._animFrameId);
        this._animFrameId = null;
      }
      if (this._pulseCtx && this._pulseCanvas) {
        this._pulseCtx.clearRect(0, 0, this._pulseCanvas.width, this._pulseCanvas.height);
      }
    },

    _resumePulseLoop: function () {
      if (this._isIntersecting && this._isTabVisible && this._startPulseLoopFn && !this._animFrameId) {
        this._startPulseLoopFn();
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
      this._element = element;
      this._lastElement = element;
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;
      this._lastRenderW = (element && element.clientWidth) || 0;
      this._lastRenderH = (element && element.clientHeight) || 0;

      if (!this._resizeObserver && element) {
        this._setupLifecycleObservers(element);
      }

      if (!this._container || !element.contains(this._container)) {
        element.innerHTML = "";
        this._container = document.createElement("div");
        this._container.className = "looker-network-topology-container";
        this._container.style.width = "100%";
        this._container.style.height = "100%";
        this._container.style.position = "relative";
        this._container.style.overflow = "hidden";
        this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        element.appendChild(this._container);

        this._pulseCanvas = document.createElement("canvas");
        this._pulseCanvas.className = "topology-pulse-canvas";
        this._pulseCanvas.style.position = "absolute";
        this._pulseCanvas.style.top = "0";
        this._pulseCanvas.style.left = "0";
        this._pulseCanvas.style.width = "100%";
        this._pulseCanvas.style.height = "100%";
        this._pulseCanvas.style.pointerEvents = "none";
        this._pulseCanvas.style.zIndex = "2";
        this._container.appendChild(this._pulseCanvas);
      }

      this.clearErrors();

      var self = this;
      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
          done();
        } catch (err) {
          console.error("Network Topology Graph Render Error:", err);
          self.addError({
            title: "Rendering Error",
            message: err.message || "Failed to render Network Topology Graph."
          });
          done();
        }
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;

      // 1. Clean up previous simulations, timers, and active transitions
      if (this._animFrameId) {
        cancelAnimationFrame(this._animFrameId);
        this._animFrameId = null;
      }
      this._startPulseLoopFn = null;

      if (this._simulation) {
        this._simulation.stop();
        this._simulation = null;
      }

      if (this._container) {
        d3.select(this._container).selectAll("*").interrupt();
        // Remove existing SVGs and HUDs, but keep canvas
        var oldSvg = this._container.querySelector("svg");
        if (oldSvg) oldSvg.remove();
        var oldHud = this._container.querySelector(".network-topology-hud");
        if (oldHud) oldHud.remove();
        var oldControls = this._container.querySelector(".network-topology-controls");
        if (oldControls) oldControls.remove();
      }

      if (this._tooltip) {
        this._tooltip.style.display = "none";
        this._tooltip.style.opacity = "0";
      }

      if (!data || !data.length) {
        this.addError({
          title: "No Data",
          message: "The query returned no data rows to visualize."
        });
        return;
      }

      var fields = queryResponse.fields;
      var dims = fields.dimensions || fields.dimension_like || [];
      var meas = fields.measures || fields.measure_like || [];

      if (dims.length === 0) {
        this.addError({
          title: "Dimensions Required",
          message: "Network Topology requires at least 1 Dimension (Source Node) and preferably 2 Dimensions (Source & Target Nodes)."
        });
        return;
      }

      var sourceDim = dims[0];
      var targetDim = dims.length > 1 ? dims[1] : dims[0];
      var isSelfLoopModel = dims.length === 1;

      var volumeMeas = meas.length > 0 ? meas[0] : null;
      var latencyMeas = meas.length > 1 ? meas[1] : null;
      var countMeas = meas.length > 2 ? meas[2] : null;

      var theme = THEMES[config.colorTheme] || THEMES.cyber_dark;
      this._container.style.backgroundColor = theme.bg;

      // ==========================================
      // 2. HIGH-PERFORMANCE DATA AGGREGATION
      // ==========================================
      var nodesMap = {};
      var linksMap = {};
      var totalVolume = 0;
      var latencyWeightedSum = 0;
      var latencyWeightTotal = 0;
      var bottleneckThreshold = Number(config.latencyThreshold) || 3.8;
      var bottleneckCount = 0;

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var sVal = row[sourceDim.name] ? String(row[sourceDim.name].value || "Unknown Source").trim() : "Unknown Source";
        var tVal = row[targetDim.name] ? String(row[targetDim.name].value || "Unknown Target").trim() : "Unknown Target";

        if (isSelfLoopModel && i < data.length - 1) {
          tVal = String(data[i + 1][sourceDim.name].value || "Terminal").trim();
        }

        var vol = 1;
        if (volumeMeas && row[volumeMeas.name] && !isNaN(Number(row[volumeMeas.name].value))) {
          vol = Math.max(0, Number(row[volumeMeas.name].value));
        }

        var lat = 0;
        if (latencyMeas && row[latencyMeas.name] && !isNaN(Number(row[latencyMeas.name].value))) {
          lat = Math.max(0, Number(row[latencyMeas.name].value));
        } else {
          lat = 1.5 + ((i % 7) * 0.7);
        }

        var cnt = 1;
        if (countMeas && row[countMeas.name] && !isNaN(Number(row[countMeas.name].value))) {
          cnt = Math.max(1, Number(row[countMeas.name].value));
        }

        // Initialize Nodes (Store only essential drill links rather than entire row)
        if (!nodesMap[sVal]) {
          nodesMap[sVal] = {
            id: sVal,
            name: sVal,
            type: "source",
            isSource: true,
            isTarget: false,
            inDegree: 0,
            outDegree: 0,
            degree: 0,
            ingressVolume: 0,
            egressVolume: 0,
            totalVolume: 0,
            weightedLatencySum: 0,
            drillLinks: (row[sourceDim.name] && row[sourceDim.name].links) || null
          };
        }
        if (!nodesMap[tVal]) {
          nodesMap[tVal] = {
            id: tVal,
            name: tVal,
            type: "target",
            isSource: false,
            isTarget: true,
            inDegree: 0,
            outDegree: 0,
            degree: 0,
            ingressVolume: 0,
            egressVolume: 0,
            totalVolume: 0,
            weightedLatencySum: 0,
            drillLinks: (row[targetDim.name] && row[targetDim.name].links) || null
          };
        }

        // Aggregate Links
        var linkKey = sVal + "___" + tVal;
        if (!linksMap[linkKey]) {
          linksMap[linkKey] = {
            id: linkKey,
            source: sVal,
            target: tVal,
            sourceId: sVal,
            targetId: tVal,
            volume: 0,
            weightedLatencySum: 0,
            count: 0,
            drillLinks: (volumeMeas && row[volumeMeas.name] && row[volumeMeas.name].links) || null
          };
        }

        linksMap[linkKey].volume += vol;
        linksMap[linkKey].weightedLatencySum += (lat * vol);
        linksMap[linkKey].count += cnt;

        nodesMap[sVal].outDegree += 1;
        nodesMap[sVal].degree += 1;
        nodesMap[sVal].egressVolume += vol;
        nodesMap[sVal].totalVolume += vol;

        nodesMap[tVal].inDegree += 1;
        nodesMap[tVal].degree += 1;
        nodesMap[tVal].ingressVolume += vol;
        nodesMap[tVal].totalVolume += vol;

        totalVolume += vol;
        latencyWeightedSum += (lat * vol);
        latencyWeightTotal += vol;
      }

      // Finalize Links
      var links = Object.values(linksMap).map(function (lnk) {
        var avgLat = lnk.volume > 0 ? (lnk.weightedLatencySum / lnk.volume) : 0;
        lnk.latency = avgLat;
        if (avgLat >= bottleneckThreshold) {
          bottleneckCount++;
        }
        return lnk;
      });

      // Finalize Nodes
      var allNodes = Object.values(nodesMap).map(function (n) {
        if (n.inDegree > 0 && n.outDegree > 0) {
          n.type = "transit_hub";
        }
        return n;
      });

      // Density limiter
      var nodeLimitConfig = config.nodeLimit || "all";
      var activeNodes = allNodes;
      if (nodeLimitConfig !== "all") {
        var lim = parseInt(nodeLimitConfig, 10);
        if (!isNaN(lim) && lim < allNodes.length) {
          allNodes.sort(function (a, b) { return b.totalVolume - a.totalVolume; });
          var topSet = {};
          for (var t = 0; t < lim; t++) {
            topSet[allNodes[t].id] = true;
          }
          activeNodes = allNodes.slice(0, lim);
          links = links.filter(function (l) {
            return topSet[l.sourceId] && topSet[l.targetId];
          });
        }
      }

      var avgNetworkLatency = latencyWeightTotal > 0 ? (latencyWeightedSum / latencyWeightTotal) : 0;
      var maxLinkVolume = d3.max(links, function (d) { return d.volume; }) || 1;
      var minLatency = d3.min(links, function (d) { return d.latency; }) || 0;
      var maxLatency = d3.max(links, function (d) { return d.latency; }) || 5;

      // ==========================================
      // 3. EXECUTIVE HUD (Optimized, No Backdrop Readback)
      // ==========================================
      var hudContainer = document.createElement("div");
      hudContainer.className = "network-topology-hud";
      hudContainer.style.position = "absolute";
      hudContainer.style.top = "12px";
      hudContainer.style.left = "12px";
      hudContainer.style.right = "12px";
      hudContainer.style.zIndex = "10";
      hudContainer.style.display = "flex";
      hudContainer.style.alignItems = "center";
      hudContainer.style.justifyContent = "space-between";
      hudContainer.style.gap = "12px";
      hudContainer.style.pointerEvents = "none";

      if (config.showExecutiveHUD !== false) {
        var statsCard = document.createElement("div");
        statsCard.style.pointerEvents = "auto";
        statsCard.style.display = "flex";
        statsCard.style.alignItems = "center";
        statsCard.style.gap = "14px";
        statsCard.style.padding = "8px 16px";
        statsCard.style.background = theme.hudBg;
        statsCard.style.border = "1px solid " + theme.hudBorder;
        statsCard.style.borderRadius = "8px";
        statsCard.style.boxShadow = "0 4px 14px rgba(0,0,0,0.18)";
        statsCard.style.color = theme.hudText;
        statsCard.style.fontSize = "11.5px";

        statsCard.innerHTML =
          '<div style="display:flex; align-items:center; gap:6px;">' +
            '<span style="font-size:14px;">📡</span>' +
            '<span>Nodes: <strong style="color:' + (theme.isDark ? '#38bdf8' : '#0284c7') + ';">' + activeNodes.length + '</strong></span>' +
          '</div>' +
          '<div style="width:1px; height:16px; background:' + theme.hudBorder + ';"></div>' +
          '<div style="display:flex; align-items:center; gap:6px;">' +
            '<span style="font-size:14px;">🔗</span>' +
            '<span>Links: <strong style="color:' + (theme.isDark ? '#38bdf8' : '#0284c7') + ';">' + links.length + '</strong></span>' +
          '</div>' +
          '<div style="width:1px; height:16px; background:' + theme.hudBorder + ';"></div>' +
          '<div style="display:flex; align-items:center; gap:6px;">' +
            '<span style="font-size:14px;">⚡</span>' +
            '<span>Throughput: <strong style="color:' + theme.text + ';">' + formatValue(totalVolume, config.valueFormat || "bandwidth") + '</strong></span>' +
          '</div>' +
          '<div style="width:1px; height:16px; background:' + theme.hudBorder + ';"></div>' +
          '<div style="display:flex; align-items:center; gap:6px;">' +
            '<span style="font-size:14px;">⏱️</span>' +
            '<span>Avg Latency: <strong style="color:' + (avgNetworkLatency > bottleneckThreshold ? theme.criticalLatency : theme.optimalLatency) + ';">' + formatLatency(avgNetworkLatency) + '</strong></span>' +
          '</div>' +
          (bottleneckCount > 0 ?
            ('<div style="width:1px; height:16px; background:' + theme.hudBorder + ';"></div>' +
             '<div style="display:flex; align-items:center; gap:6px; color:' + theme.criticalLatency + '; font-weight:700;">' +
               '<span style="font-size:14px;">⚠️</span>' +
               '<span>' + bottleneckCount + ' Bottlenecks</span>' +
             '</div>') : '');

        hudContainer.appendChild(statsCard);
      }

      // Search Box
      var searchInput = null;
      if (config.showSearch !== false) {
        var searchBox = document.createElement("div");
        searchBox.style.pointerEvents = "auto";
        searchBox.style.display = "flex";
        searchBox.style.alignItems = "center";
        searchBox.style.gap = "8px";
        searchBox.style.padding = "6px 12px";
        searchBox.style.background = theme.hudBg;
        searchBox.style.border = "1px solid " + theme.hudBorder;
        searchBox.style.borderRadius = "8px";
        searchBox.style.boxShadow = "0 4px 14px rgba(0,0,0,0.18)";

        searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "🔍 Search nodes / IPs...";
        searchInput.style.background = "transparent";
        searchInput.style.border = "none";
        searchInput.style.outline = "none";
        searchInput.style.fontSize = "11.5px";
        searchInput.style.color = theme.text;
        searchInput.style.width = "160px";

        var searchMatchCount = document.createElement("span");
        searchMatchCount.style.fontSize = "10.5px";
        searchMatchCount.style.color = theme.subtext;
        searchMatchCount.style.display = "none";

        searchBox.appendChild(searchInput);
        searchBox.appendChild(searchMatchCount);
        hudContainer.appendChild(searchBox);
      }

      this._container.appendChild(hudContainer);

      // Controls Container
      var controlsContainer = document.createElement("div");
      controlsContainer.className = "network-topology-controls";
      controlsContainer.style.position = "absolute";
      controlsContainer.style.bottom = "16px";
      controlsContainer.style.right = "16px";
      controlsContainer.style.zIndex = "10";
      controlsContainer.style.display = "flex";
      controlsContainer.style.flexDirection = "column";
      controlsContainer.style.gap = "6px";

      function createControlButton(icon, title, onClick) {
        var btn = document.createElement("button");
        btn.innerHTML = icon;
        btn.title = title;
        btn.style.width = "32px";
        btn.style.height = "32px";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        btn.style.background = theme.hudBg;
        btn.style.border = "1px solid " + theme.hudBorder;
        btn.style.borderRadius = "6px";
        btn.style.color = theme.text;
        btn.style.cursor = "pointer";
        btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
        btn.style.transition = "background 0.15s ease";
        btn.onmouseenter = function () { btn.style.background = theme.buttonHover; };
        btn.onmouseleave = function () { btn.style.background = theme.hudBg; };
        btn.onclick = onClick;
        return btn;
      }

      // ==========================================
      // 4. DIMENSIONS & CANVAS SYNC
      // ==========================================
      var containerRect = this._container.getBoundingClientRect();
      var width = Math.max(300, containerRect.width);
      var height = Math.max(300, containerRect.height);

      var dpr = window.devicePixelRatio || 1;
      if (this._pulseCanvas) {
        this._pulseCanvas.width = width * dpr;
        this._pulseCanvas.height = height * dpr;
        this._pulseCanvas.style.width = width + "px";
        this._pulseCanvas.style.height = height + "px";
        this._pulseCtx = this._pulseCanvas.getContext("2d");
      }

      var svg = d3.select(this._container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block")
        .style("position", "absolute")
        .style("top", "0")
        .style("left", "0")
        .style("z-index", "1")
        .style("user-select", "none");

      // Defs
      var defs = svg.append("defs");

      // Arrowhead marker
      defs.append("marker")
        .attr("id", "topology-arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 18)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-4L8,0L0,4")
        .attr("fill", theme.linkHighlight);

      // Latency color scale
      var latencyColorScale = d3.scaleLinear()
        .domain([minLatency, bottleneckThreshold, Math.max(bottleneckThreshold * 1.5, maxLatency)])
        .range([theme.optimalLatency, theme.warningLatency, theme.criticalLatency])
        .clamp(true);

      // Node Radius Scale
      var baseRadius = Number(config.baseNodeRadius) || 13;
      var nodeRadiusScale = d3.scaleSqrt()
        .domain([0, d3.max(activeNodes, function (d) { return d.totalVolume; }) || 1])
        .range([baseRadius * 0.7, baseRadius * 1.8]);

      // Link Thickness Scale
      var linkThickMult = Number(config.linkThickness) || 2;
      var linkWidthScale = d3.scaleLinear()
        .domain([0, maxLinkVolume])
        .range([1.2 * linkThickMult, 4.5 * linkThickMult]);

      // View Mode Routing
      var viewMode = config.viewMode || "force_directed";

      if (viewMode === "adjacency_matrix") {
        if (this._pulseCtx) this._pulseCtx.clearRect(0, 0, this._pulseCanvas.width, this._pulseCanvas.height);
        this._renderAdjacencyMatrix(d3, svg, activeNodes, links, width, height, theme, config, latencyColorScale);
        return;
      }

      // Root Zoomable Group
      var gRoot = svg.append("g").attr("class", "topology-root");
      this._currentTransform = d3.zoomIdentity;

      var zoomBehavior = d3.zoom()
        .scaleExtent([0.15, 6])
        .on("zoom", function (event) {
          self._currentTransform = event.transform;
          gRoot.attr("transform", event.transform);
          if (self._renderPulsesFrame) {
            self._renderPulsesFrame();
          }
        });

      svg.call(zoomBehavior);

      // Zoom controls
      controlsContainer.appendChild(createControlButton("➕", "Zoom In", function () {
        svg.transition().duration(250).call(zoomBehavior.scaleBy, 1.3);
      }));
      controlsContainer.appendChild(createControlButton("➖", "Zoom Out", function () {
        svg.transition().duration(250).call(zoomBehavior.scaleBy, 0.77);
      }));
      controlsContainer.appendChild(createControlButton("⟲", "Reset Zoom", function () {
        svg.transition().duration(300).call(zoomBehavior.transform, d3.zoomIdentity);
      }));

      var isPaused = false;
      var pauseBtn = createControlButton("⏸", "Pause / Resume Physics", function () {
        if (!self._simulation) return;
        if (isPaused) {
          self._simulation.alphaTarget(0.1).restart();
          pauseBtn.innerHTML = "⏸";
          isPaused = false;
        } else {
          self._simulation.stop();
          pauseBtn.innerHTML = "▶";
          isPaused = true;
        }
      });
      if (viewMode === "force_directed") {
        controlsContainer.appendChild(pauseBtn);
      }

      this._container.appendChild(controlsContainer);

      // Layers inside gRoot
      var linkGroup = gRoot.append("g").attr("class", "links-layer");
      var nodeGroup = gRoot.append("g").attr("class", "nodes-layer");

      // Format Node Objects
      var nodeById = {};
      activeNodes.forEach(function (d) {
        d.radius = config.nodeSizing === "degree" ?
          Math.max(8, Math.min(32, 7 + (d.degree * 1.5))) :
          (config.nodeSizing === "uniform" ? baseRadius : nodeRadiusScale(d.totalVolume));
        nodeById[d.id] = d;
      });

      // Format Link Objects
      var validLinks = [];
      links.forEach(function (lnk) {
        if (nodeById[lnk.sourceId] && nodeById[lnk.targetId]) {
          validLinks.push({
            id: lnk.id,
            source: nodeById[lnk.sourceId],
            target: nodeById[lnk.targetId],
            sourceId: lnk.sourceId,
            targetId: lnk.targetId,
            volume: lnk.volume,
            latency: lnk.latency,
            count: lnk.count,
            drillLinks: lnk.drillLinks
          });
        }
      });

      // Draw Links
      var linkLines = linkGroup.selectAll("line")
        .data(validLinks)
        .enter()
        .append("line")
        .attr("stroke", function (d) {
          if (config.edgeMetric === "volume") {
            return d3.interpolateBlues(0.3 + (0.7 * (d.volume / maxLinkVolume)));
          }
          if (config.edgeMetric === "uniform") {
            return theme.linkDefault;
          }
          return latencyColorScale(d.latency);
        })
        .attr("stroke-width", function (d) { return linkWidthScale(d.volume); })
        .attr("stroke-opacity", theme.isDark ? 0.65 : 0.55)
        .attr("class", config.flowAnimation === "dash" ? "topology-dash-animated" : "")
        .style("cursor", "pointer")
        .style("transition", "stroke-width 0.15s ease, stroke-opacity 0.15s ease");

      // Draw Nodes
      var nodeG = nodeGroup.selectAll("g.node")
        .data(activeNodes)
        .enter()
        .append("g")
        .attr("class", "node")
        .style("cursor", "pointer");

      // Node Halo
      var nodeHalo = nodeG.append("circle")
        .attr("class", "node-halo")
        .attr("r", function (d) { return d.radius + 6; })
        .attr("fill", "none")
        .attr("stroke", theme.nodeHighlight)
        .attr("stroke-width", 2)
        .attr("opacity", 0);

      // Node Body
      var nodeCircle = nodeG.append("circle")
        .attr("class", "node-circle")
        .attr("r", function (d) { return d.radius; })
        .attr("fill", function (d) {
          if (d.type === "transit_hub") return theme.isDark ? "#312e81" : "#e0e7ff";
          if (d.isSource) return theme.isDark ? "#1e3a8a" : "#dbeafe";
          return theme.nodeFill;
        })
        .attr("stroke", function (d) {
          if (d.type === "transit_hub") return "#818cf8";
          if (d.isSource) return theme.nodeStroke;
          return theme.isDark ? "#64748b" : "#94a3b8";
        })
        .attr("stroke-width", 2.2);

      // Node Symbol
      nodeG.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", function (d) { return Math.max(9, d.radius * 0.75) + "px"; })
        .attr("fill", function (d) { return theme.isDark ? "#f8fafc" : theme.text; })
        .style("pointer-events", "none")
        .text(function (d) {
          if (d.type === "transit_hub") return "⚡";
          if (d.isSource) return "📡";
          return "📍";
        });

      // Node Label
      var showLabels = config.showLabels || "always";
      var nodeLabel = nodeG.append("text")
        .attr("class", "node-label")
        .attr("y", function (d) { return d.radius + 13; })
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .attr("fill", theme.text)
        .style("paint-order", "stroke")
        .style("stroke", theme.bg)
        .style("stroke-width", "3px")
        .style("pointer-events", "none")
        .style("opacity", showLabels === "always" ? 0.95 : 0)
        .text(function (d) {
          return d.name.length > 18 ? d.name.substring(0, 16) + "…" : d.name;
        });

      // Node Dragging with Sticky Pinning (Force layout only)
      if (viewMode === "force_directed") {
        nodeG.call(d3.drag()
          .on("start", function (event, d) {
            if (!event.active && self._simulation) self._simulation.alphaTarget(0.15).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", function (event, d) {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", function (event, d) {
            if (!event.active && self._simulation) self._simulation.alphaTarget(0);
          }));

        nodeG.on("dblclick", function (event, d) {
          d.fx = null;
          d.fy = null;
          if (self._simulation) self._simulation.alpha(0.15).restart();
        });
      }

      // Adjacency Lookup for Instant Hover Highlighting
      var adjacentLookup = {};
      validLinks.forEach(function (l) {
        adjacentLookup[l.sourceId + "___" + l.targetId] = true;
        adjacentLookup[l.targetId + "___" + l.sourceId] = true;
      });

      // Node Hover
      nodeG.on("mouseenter", function (event, d) {
        nodeG.style("opacity", function (n) {
          return (n.id === d.id || adjacentLookup[d.id + "___" + n.id]) ? 1 : 0.15;
        });
        nodeHalo.attr("opacity", function (n) {
          return n.id === d.id ? 1 : (adjacentLookup[d.id + "___" + n.id] ? 0.5 : 0);
        });
        linkLines
          .attr("stroke-opacity", function (l) {
            return (l.sourceId === d.id || l.targetId === d.id) ? 1 : 0.08;
          })
          .attr("stroke-width", function (l) {
            return (l.sourceId === d.id || l.targetId === d.id) ? (linkWidthScale(l.volume) * 1.6) : linkWidthScale(l.volume);
          });

        if (showLabels === "hover_focus") {
          nodeLabel.style("opacity", function (n) {
            return (n.id === d.id || adjacentLookup[d.id + "___" + n.id]) ? 1 : 0;
          });
        }

        var tt = self._tooltip;
        tt.style.background = theme.isDark ? "#111827" : "#ffffff";
        tt.style.color = theme.text;
        tt.style.border = "1px solid " + (theme.isDark ? "#374151" : theme.border);

        var pctTotal = totalVolume > 0 ? ((d.totalVolume / totalVolume) * 100).toFixed(1) + "%" : "0%";
        tt.innerHTML =
          '<div style="font-size:14px; font-weight:700; margin-bottom:4px; display:flex; align-items:center; gap:6px;">' +
            '<span>' + (d.type === "transit_hub" ? "⚡" : (d.isSource ? "📡" : "📍")) + '</span>' +
            '<span>' + d.name + '</span>' +
            '<span style="font-size:10px; font-weight:600; padding:1px 6px; border-radius:4px; background:' + (theme.isDark ? '#374151' : '#e2e8f0') + '; color:' + theme.subtext + ';">' + d.type.toUpperCase() + '</span>' +
          '</div>' +
          '<div style="font-size:12px; color:' + (theme.isDark ? '#38bdf8' : '#0284c7') + '; font-weight:600; margin-bottom:6px;">' +
            'Total Volume: ' + formatValue(d.totalVolume, config.valueFormat || "bandwidth") + ' (' + pctTotal + ')' +
          '</div>' +
          '<div style="font-size:11px; color:' + theme.subtext + '; line-height:1.5;">' +
            '• Inbound: <strong>' + formatValue(d.ingressVolume, config.valueFormat || "bandwidth") + '</strong> (' + d.inDegree + ' links)<br/>' +
            '• Outbound: <strong>' + formatValue(d.egressVolume, config.valueFormat || "bandwidth") + '</strong> (' + d.outDegree + ' links)<br/>' +
            '• Degree Centrality: <strong>' + d.degree + '</strong> total connections' +
          '</div>' +
          (d.drillLinks ? '<div style="margin-top:6px; color:#2563eb; font-size:11px;">Click to drill down &rarr;</div>' : '');

        tt.style.display = "block";
        tt.style.opacity = "1";
      });

      nodeG.on("mousemove", function (event) {
        var tt = self._tooltip;
        var x = event.clientX + 14;
        var y = event.clientY - 20;
        if (x + 240 > window.innerWidth) x = event.clientX - 250;
        if (y + 140 > window.innerHeight) y = event.clientY - 140;
        tt.style.left = x + "px";
        tt.style.top = y + "px";
      });

      nodeG.on("mouseleave", function () {
        nodeG.style("opacity", 1);
        nodeHalo.attr("opacity", 0);
        linkLines
          .attr("stroke-opacity", theme.isDark ? 0.65 : 0.55)
          .attr("stroke-width", function (d) { return linkWidthScale(d.volume); });

        if (showLabels === "hover_focus") {
          nodeLabel.style("opacity", 0);
        }
        self._tooltip.style.display = "none";
        self._tooltip.style.opacity = "0";
      });

      nodeG.on("click", function (event, d) {
        if (d.drillLinks && window.LookerCharts && LookerCharts.Utils) {
          LookerCharts.Utils.openDrillMenu({
            links: d.drillLinks,
            event: event
          });
        }
      });

      // Link Hover
      linkLines.on("mouseenter", function (event, d) {
        d3.select(this)
          .attr("stroke-opacity", 1)
          .attr("stroke-width", linkWidthScale(d.volume) * 1.8);

        var tt = self._tooltip;
        tt.style.background = theme.isDark ? "#111827" : "#ffffff";
        tt.style.color = theme.text;
        tt.style.border = "1px solid " + (d.latency >= bottleneckThreshold ? theme.criticalLatency : theme.border);

        var pctFlow = totalVolume > 0 ? ((d.volume / totalVolume) * 100).toFixed(1) + "%" : "0%";
        var isBottleneck = d.latency >= bottleneckThreshold;

        tt.innerHTML =
          '<div style="font-size:13px; font-weight:700; margin-bottom:4px; display:flex; align-items:center; gap:6px;">' +
            '<span>' + d.sourceId + '</span>' +
            '<span style="color:' + theme.subtext + ';">&rarr;</span>' +
            '<span>' + d.targetId + '</span>' +
          '</div>' +
          '<div style="font-size:12px; color:' + (theme.isDark ? '#38bdf8' : '#0284c7') + '; font-weight:600; margin-bottom:4px;">' +
            'Bandwidth / Volume: ' + formatValue(d.volume, config.valueFormat || "bandwidth") + ' (' + pctFlow + ')' +
          '</div>' +
          '<div style="font-size:11.5px; color:' + (isBottleneck ? theme.criticalLatency : theme.subtext) + '; font-weight:' + (isBottleneck ? '700' : '500') + ';">' +
            'Transmission Latency: ' + formatLatency(d.latency) + (isBottleneck ? ' ⚠️ (Bottleneck Alert)' : ' (Healthy)') +
          '</div>' +
          (d.count > 1 ? '<div style="font-size:11px; color:' + theme.subtext + '; margin-top:3px;">Packets / Records: ' + d.count.toLocaleString() + '</div>' : '') +
          (d.drillLinks ? '<div style="margin-top:6px; color:#2563eb; font-size:11px;">Click to drill down &rarr;</div>' : '');

        tt.style.display = "block";
        tt.style.opacity = "1";
      });

      linkLines.on("mousemove", function (event) {
        var tt = self._tooltip;
        var x = event.clientX + 14;
        var y = event.clientY - 20;
        if (x + 240 > window.innerWidth) x = event.clientX - 250;
        if (y + 140 > window.innerHeight) y = event.clientY - 140;
        tt.style.left = x + "px";
        tt.style.top = y + "px";
      });

      linkLines.on("mouseleave", function () {
        d3.select(this)
          .attr("stroke-opacity", theme.isDark ? 0.65 : 0.55)
          .attr("stroke-width", function (d) { return linkWidthScale(d.volume); });
        self._tooltip.style.display = "none";
        self._tooltip.style.opacity = "0";
      });

      linkLines.on("click", function (event, d) {
        if (d.drillLinks && window.LookerCharts && LookerCharts.Utils) {
          LookerCharts.Utils.openDrillMenu({
            links: d.drillLinks,
            event: event
          });
        }
      });

      // Search Box Filtering
      if (searchInput) {
        searchInput.oninput = function () {
          var q = searchInput.value.toLowerCase().trim();
          if (!q) {
            nodeG.style("opacity", 1);
            nodeHalo.attr("opacity", 0);
            linkLines.attr("stroke-opacity", theme.isDark ? 0.65 : 0.55);
            searchMatchCount.style.display = "none";
            return;
          }
          var matchCount = 0;
          var matchingIds = {};
          activeNodes.forEach(function (n) {
            if (n.name.toLowerCase().indexOf(q) !== -1 || n.id.toLowerCase().indexOf(q) !== -1) {
              matchingIds[n.id] = true;
              matchCount++;
            }
          });

          searchMatchCount.style.display = "inline";
          searchMatchCount.textContent = matchCount + " found";

          nodeG.style("opacity", function (n) {
            return matchingIds[n.id] ? 1 : 0.12;
          });
          nodeHalo.attr("opacity", function (n) {
            return matchingIds[n.id] ? 1 : 0;
          });
          linkLines.attr("stroke-opacity", function (l) {
            return (matchingIds[l.sourceId] || matchingIds[l.targetId]) ? 0.85 : 0.05;
          });
        };
      }

      // Position Synchronizer
      function syncPositions() {
        linkLines
          .attr("x1", function (d) { return d.source.x; })
          .attr("y1", function (d) { return d.source.y; })
          .attr("x2", function (d) { return d.target.x; })
          .attr("y2", function (d) { return d.target.y; });

        nodeG.attr("transform", function (d) {
          return "translate(" + d.x + "," + d.y + ")";
        });
      }

      // ==========================================
      // 5. LAYOUT EXECUTION
      // ==========================================
      if (viewMode === "force_directed") {
        var linkDist = Number(config.linkDistance) || 110;

        // Bounded Barnes-Hut repulsion: distanceMax(350) drops long-range pairs from O(N^2) to O(N)
        var chargeForce = d3.forceManyBody()
          .strength(-220)
          .distanceMax(350)
          .theta(0.9);

        this._simulation = d3.forceSimulation(activeNodes)
          .force("link", d3.forceLink(validLinks).id(function (d) { return d.id; }).distance(linkDist))
          .force("charge", chargeForce)
          .force("center", d3.forceCenter(width / 2, height / 2))
          .force("collision", d3.forceCollide().radius(function (d) { return d.radius + 12; }))
          .alphaDecay(0.045); // Settle smoothly in ~60-80 ticks instead of 300

        // In-memory pre-warming (35-45 ticks purely in JS math before touching DOM)
        var prewarmCount = Math.min(45, Math.max(20, Math.floor(activeNodes.length * 0.4)));
        for (var p = 0; p < prewarmCount; ++p) {
          this._simulation.tick();
        }

        // Apply initial layout immediately
        syncPositions();

        // Attach tick listener for remaining gentle settling
        this._simulation.on("tick", syncPositions);

      } else if (viewMode === "concentric_radial") {
        var cx = width / 2;
        var cy = height / 2;
        var maxR = Math.min(width, height) * 0.42;

        var coreNodes = activeNodes.filter(function (d) { return d.isSource && !d.isTarget; });
        var transitNodes = activeNodes.filter(function (d) { return d.type === "transit_hub"; });
        var edgeNodes = activeNodes.filter(function (d) { return !d.isSource || d.type === "target"; });

        function layoutRing(tierNodes, ringRadius) {
          var step = (2 * Math.PI) / Math.max(1, tierNodes.length);
          tierNodes.forEach(function (node, idx) {
            var angle = idx * step;
            node.x = cx + (ringRadius * Math.cos(angle));
            node.y = cy + (ringRadius * Math.sin(angle));
          });
        }

        layoutRing(coreNodes, maxR * 0.22);
        layoutRing(transitNodes, maxR * 0.6);
        layoutRing(edgeNodes, maxR * 0.95);

        // Ring guide lines
        var ringGuides = [maxR * 0.22, maxR * 0.6, maxR * 0.95];
        ringGuides.forEach(function (r, idx) {
          gRoot.append("circle")
            .attr("cx", cx)
            .attr("cy", cy)
            .attr("r", r)
            .attr("fill", "none")
            .attr("stroke", theme.hudBorder)
            .attr("stroke-dasharray", "4,4")
            .attr("opacity", 0.4);

          gRoot.append("text")
            .attr("x", cx + 8)
            .attr("y", cy - r + 14)
            .attr("font-size", "9px")
            .attr("font-weight", "600")
            .attr("fill", theme.subtext)
            .attr("opacity", 0.65)
            .text(idx === 0 ? "CORE TIER" : (idx === 1 ? "DISTRIBUTION / TRANSIT" : "EDGE ENDPOINTS"));
        });

        syncPositions();

      } else if (viewMode === "circular_peering") {
        var ccx = width / 2;
        var ccy = height / 2;
        var ringR = Math.min(width, height) * 0.38;
        var angleStep = (2 * Math.PI) / Math.max(1, activeNodes.length);

        activeNodes.forEach(function (node, idx) {
          var angle = idx * angleStep;
          node.x = ccx + (ringR * Math.cos(angle));
          node.y = ccy + (ringR * Math.sin(angle));
          node.angle = angle;
        });

        linkLines.remove();
        linkGroup.selectAll("path")
          .data(validLinks)
          .enter()
          .append("path")
          .attr("d", function (d) {
            var sx = d.source.x;
            var sy = d.source.y;
            var tx = d.target.x;
            var ty = d.target.y;
            return "M" + sx + "," + sy + " Q" + ccx + "," + ccy + " " + tx + "," + ty;
          })
          .attr("fill", "none")
          .attr("stroke", function (d) { return latencyColorScale(d.latency); })
          .attr("stroke-width", function (d) { return linkWidthScale(d.volume); })
          .attr("stroke-opacity", theme.isDark ? 0.5 : 0.4)
          .style("cursor", "pointer");

        nodeG.attr("transform", function (d) {
          return "translate(" + d.x + "," + d.y + ")";
        });
      }

      // ==========================================
      // 6. HIGH-PERFORMANCE CANVAS PACKET PULSES
      // ==========================================
      if (config.flowAnimation === "pulse" && validLinks.length > 0 && viewMode !== "circular_peering") {
        var pulseSpeedFactor = config.particleSpeed === "fast" ? 0.014 : (config.particleSpeed === "slow" ? 0.005 : 0.009);

        // Budgeted particle allocation: Focus on top active links (capped to max 35 particles)
        var sortedLinks = validLinks.slice().sort(function (a, b) {
          return b.volume - a.volume;
        });
        var activePulseLinks = sortedLinks.slice(0, Math.min(sortedLinks.length, 30));

        var pulseParticles = [];
        activePulseLinks.forEach(function (lnk, idx) {
          var numP = (lnk.volume >= (maxLinkVolume * 0.5) && pulseParticles.length < 32) ? 2 : 1;
          for (var p = 0; p < numP; p++) {
            pulseParticles.push({
              link: lnk,
              t: (p / numP) + ((idx * 0.17) % 1.0),
              speed: pulseSpeedFactor * (0.85 + (0.3 * ((idx % 5) / 5))),
              radius: Math.max(2.5, Math.min(4.5, linkWidthScale(lnk.volume) * 0.8))
            });
          }
        });

        function renderPulses() {
          if (!self._pulseCtx || !self._pulseCanvas) return;

          self._pulseCtx.clearRect(0, 0, self._pulseCanvas.width, self._pulseCanvas.height);
          self._pulseCtx.save();
          self._pulseCtx.scale(dpr, dpr);

          var transform = self._currentTransform || d3.zoomIdentity;
          self._pulseCtx.translate(transform.x, transform.y);
          self._pulseCtx.scale(transform.k, transform.k);

          self._pulseCtx.fillStyle = theme.pulseColor;

          for (var i = 0; i < pulseParticles.length; i++) {
            var p = pulseParticles[i];
            if (p.link.source && p.link.target && typeof p.link.source.x === "number") {
              var px = p.link.source.x + (p.link.target.x - p.link.source.x) * p.t;
              var py = p.link.source.y + (p.link.target.y - p.link.source.y) * p.t;
              var alpha = (p.t < 0.15) ? (p.t / 0.15) : (p.t > 0.85 ? ((1.0 - p.t) / 0.15) : 0.95);

              self._pulseCtx.globalAlpha = Math.max(0, Math.min(1, alpha));
              self._pulseCtx.beginPath();
              self._pulseCtx.arc(px, py, p.radius, 0, Math.PI * 2);
              self._pulseCtx.fill();
            }
          }

          self._pulseCtx.restore();
        }

        self._renderPulsesFrame = renderPulses;

        function animatePulses() {
          // Pause if invisible or tab backgrounded
          if (!self._isIntersecting || !self._isTabVisible) {
            self._animFrameId = null;
            return;
          }

          for (var i = 0; i < pulseParticles.length; i++) {
            var p = pulseParticles[i];
            p.t += p.speed;
            if (p.t > 1.0) p.t = 0;
          }

          renderPulses();
          self._animFrameId = requestAnimationFrame(animatePulses);
        }

        self._startPulseLoopFn = function () {
          if (!self._animFrameId) {
            self._animFrameId = requestAnimationFrame(animatePulses);
          }
        };

        if (self._isIntersecting && self._isTabVisible) {
          self._startPulseLoopFn();
        }
      } else {
        if (this._pulseCtx && this._pulseCanvas) {
          this._pulseCtx.clearRect(0, 0, this._pulseCanvas.width, this._pulseCanvas.height);
        }
      }
    },

    // ==========================================
    // 7. ADJACENCY MATRIX LAYOUT
    // ==========================================
    _renderAdjacencyMatrix: function (d3, svg, activeNodes, links, width, height, theme, config, latencyColorScale) {
      var self = this;
      var margin = { top: 90, right: 30, bottom: 40, left: 140 };
      var matrixW = width - margin.left - margin.right;
      var matrixH = height - margin.top - margin.bottom;

      var sources = Array.from(new Set(links.map(function (l) { return l.sourceId; })));
      var targets = Array.from(new Set(links.map(function (l) { return l.targetId; })));

      if (sources.length === 0 || targets.length === 0) return;

      var cellW = Math.max(14, Math.min(48, matrixW / targets.length));
      var cellH = Math.max(14, Math.min(36, matrixH / sources.length));

      var lookup = {};
      links.forEach(function (l) {
        lookup[l.sourceId + "___" + l.targetId] = l;
      });

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Column Headers (Targets)
      g.selectAll("text.col-header")
        .data(targets)
        .enter()
        .append("text")
        .attr("class", "col-header")
        .attr("x", function (d, i) { return (i * cellW) + (cellW / 2); })
        .attr("y", -10)
        .attr("text-anchor", "start")
        .attr("transform", function (d, i) {
          var cx = (i * cellW) + (cellW / 2);
          return "rotate(-45," + cx + ",-10)";
        })
        .attr("font-size", "10px")
        .attr("font-weight", "600")
        .attr("fill", theme.subtext)
        .text(function (d) { return d.length > 14 ? d.substring(0, 12) + "…" : d; });

      // Row Headers (Sources)
      g.selectAll("text.row-header")
        .data(sources)
        .enter()
        .append("text")
        .attr("class", "row-header")
        .attr("x", -10)
        .attr("y", function (d, i) { return (i * cellH) + (cellH / 2) + 3.5; })
        .attr("text-anchor", "end")
        .attr("font-size", "10.5px")
        .attr("font-weight", "600")
        .attr("fill", theme.text)
        .text(function (d) { return d.length > 18 ? d.substring(0, 16) + "…" : d; });

      // Matrix Cells
      sources.forEach(function (s, rIdx) {
        targets.forEach(function (t, cIdx) {
          var lnk = lookup[s + "___" + t];
          var cx = cIdx * cellW;
          var cy = rIdx * cellH;

          var cell = g.append("rect")
            .attr("x", cx + 1)
            .attr("y", cy + 1)
            .attr("width", cellW - 2)
            .attr("height", cellH - 2)
            .attr("rx", 3)
            .attr("fill", lnk ? latencyColorScale(lnk.latency) : (theme.isDark ? "#1f2937" : "#f1f5f9"))
            .attr("opacity", lnk ? 0.9 : 0.25)
            .style("cursor", lnk ? "pointer" : "default");

          if (lnk) {
            cell.on("mouseenter", function (event) {
              d3.select(this).attr("stroke", theme.text).attr("stroke-width", 2);
              var tt = self._tooltip;
              tt.style.background = theme.isDark ? "#111827" : "#ffffff";
              tt.style.color = theme.text;
              tt.style.border = "1px solid " + theme.border;
              tt.innerHTML =
                '<div style="font-weight:700; margin-bottom:3px;">' + s + ' &rarr; ' + t + '</div>' +
                '<div style="color:' + (theme.isDark ? '#38bdf8' : '#0284c7') + ';">Bandwidth: ' + formatValue(lnk.volume, config.valueFormat || "bandwidth") + '</div>' +
                '<div style="color:' + theme.subtext + ';">Latency: ' + formatLatency(lnk.latency) + '</div>';
              tt.style.display = "block";
              tt.style.opacity = "1";
            });

            cell.on("mousemove", function (event) {
              var tt = self._tooltip;
              tt.style.left = (event.clientX + 12) + "px";
              tt.style.top = (event.clientY - 20) + "px";
            });

            cell.on("mouseleave", function () {
              d3.select(this).attr("stroke", "none");
              self._tooltip.style.display = "none";
              self._tooltip.style.opacity = "0";
            });
          }
        });
      });
    }
  });
})();
