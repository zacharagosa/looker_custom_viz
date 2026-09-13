/**
 * Zayo DWDM Optical Attenuation & Telemetry Spectrum Analyzer
 * Bespoke Multi-Modal Looker Custom Visualization built with D3.js v7
 *
 * Modes:
 * 1. "optical_threshold_envelope": High-precision D3 time-series optical attenuation / bandwidth chart
 *    with ITU-T G.652.D normal operating band, ARIMA_PLUS anomaly threshold line, and Zayo Orange/Crimson styling.
 * 2. "root_cause_lollipop": Dual-metric horizontal bar & lollipop chart for SLA penalties and incident/anomaly counts
 *    by root cause or corridor, styled in Zayo Orange (#f5831f) and Deep Slate (#0f172a).
 */

(function () {
  var ZAYO_COLORS = ["#f5831f", "#0f172a", "#10b981", "#e11d48", "#d97706", "#475569", "#ea580c", "#334155"];

  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === "function") {
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

  function formatVal(val, isCurrency) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var n = Number(val);
    if (isCurrency) {
      if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
      if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
      return "$" + n.toLocaleString();
    }
    if (Math.abs(n) < 10 && n !== Math.floor(n)) return n.toFixed(3);
    return n.toLocaleString();
  }

  looker.plugins.visualizations.add({
    id: "zayo_optical_spectrum_waterfall",
    label: "Zayo Optical Spectrum & SLA Analyzer",
    options: {
      chart_mode: {
        type: "string",
        label: "Visualization Mode",
        display: "select",
        values: [
          { "Auto-Detect from Query": "auto" },
          { "Optical Attenuation / Time-Series Envelope": "optical_threshold_envelope" },
          { "SLA Financial Risk & Root-Cause Lollipop": "root_cause_lollipop" }
        ],
        default: "auto",
        section: "Display",
        order: 1
      },
      anomaly_threshold: {
        type: "number",
        label: "Optical Anomaly Threshold (dB/km)",
        default: 0.25,
        section: "Display",
        order: 2
      },
      chart_subtitle: {
        type: "string",
        label: "Telemetry Subtitle",
        default: "",
        section: "Style",
        order: 1
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      element.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
      element.style.width = "100%";
      element.style.height = "100%";
      element.style.background = "#ffffff";
      element.style.boxSizing = "border-box";
      element.style.position = "relative";
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();
      if (!data || data.length === 0) {
        element.innerHTML = "<div style='padding:16px;color:#64748b;font-size:12px;'>No telemetry data</div>";
        done();
        return;
      }

      ensureD3(function (d3) {
        element.innerHTML = "";
        var rect = element.getBoundingClientRect();
        var width = Math.max(320, rect.width || 640);
        var height = Math.max(220, rect.height || 360);

        var dims = queryResponse.fields.dimension_like || [];
        var measures = queryResponse.fields.measure_like || [];
        var pivots = queryResponse.pivots || [];

        var dimField = dims[0] ? dims[0].name : Object.keys(data[0])[0];
        var m1Field = measures[0] ? measures[0].name : null;
        var m2Field = measures[1] ? measures[1].name : null;

        var mode = config.chart_mode || "auto";
        if (mode === "auto") {
          if (dimField.indexOf("date") !== -1 || dimField.indexOf("time") !== -1 || dimField.indexOf("week") !== -1) {
            mode = "optical_threshold_envelope";
          } else {
            mode = "root_cause_lollipop";
          }
        }

        // Top Header Ribbon inside chart container
        var headerHtml =
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px 4px 14px;border-bottom:1px solid #f1f5f9;">' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
              '<span style="width:8px;height:8px;border-radius:50%;background:#f5831f;display:inline-block;"></span>' +
              '<span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#334155;">' +
                (config.chart_subtitle || (mode === "optical_threshold_envelope" ? "ITU-T G.652.D Optical Spectrum & ARIMA_PLUS Anomaly Radar" : "Zayo Enterprise SLA Risk & Incident Root-Cause Breakdown")) +
              '</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:10px;font-size:10px;font-family:monospace;color:#64748b;">' +
              (mode === "optical_threshold_envelope"
                ? '<span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:8px;height:3px;background:#10b981;display:inline-block;"></span>Nominal (<0.22 dB/km)</span>' +
                  '<span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:8px;height:3px;background:#f5831f;display:inline-block;"></span>Telemetry</span>' +
                  '<span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:8px;height:3px;background:#e11d48;display:inline-block;"></span>Anomaly Breach (≥0.25)</span>'
                : '<span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:2px;background:#f5831f;display:inline-block;"></span>Primary Metric</span>' +
                  (m2Field ? '<span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#0f172a;display:inline-block;"></span>Secondary Volume</span>' : '')) +
            '</div>' +
          '</div>';

        var wrapper = document.createElement("div");
        wrapper.style.width = "100%";
        wrapper.style.height = "100%";
        wrapper.style.display = "flex";
        wrapper.style.flexDirection = "column";
        wrapper.innerHTML = headerHtml;
        element.appendChild(wrapper);

        var svgContainer = document.createElement("div");
        svgContainer.style.flex = "1";
        svgContainer.style.width = "100%";
        svgContainer.style.position = "relative";
        wrapper.appendChild(svgContainer);

        var svgH = Math.max(170, height - 38);
        var svgW = width;

        var svg = d3.select(svgContainer)
          .append("svg")
          .attr("width", svgW)
          .attr("height", svgH);

        if (mode === "root_cause_lollipop") {
          // Horizontal Bar + Lollipop for Root Cause / Corridor Analysis
          var rows = data.map(function (d) {
            var label = d[dimField] ? (d[dimField].rendered || d[dimField].value) : "Unknown";
            var v1 = m1Field && d[m1Field] ? Number(d[m1Field].value || 0) : 0;
            var v2 = m2Field && d[m2Field] ? Number(d[m2Field].value || 0) : null;
            var links = (m1Field && d[m1Field] && d[m1Field].links) || [];
            return { label: String(label), v1: v1, v2: v2, links: links };
          });

          rows.sort(function (a, b) { return b.v1 - a.v1; });
          rows = rows.slice(0, 12);

          var isCurr = m1Field && (m1Field.indexOf("usd") !== -1 || m1Field.indexOf("penalty") !== -1 || m1Field.indexOf("sla") !== -1);

          var margin = { top: 14, right: 80, bottom: 26, left: 190 };
          var innerW = Math.max(120, svgW - margin.left - margin.right);
          var innerH = Math.max(100, svgH - margin.top - margin.bottom);

          var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          var y = d3.scaleBand()
            .domain(rows.map(function (r) { return r.label; }))
            .range([0, innerH])
            .padding(0.28);

          var maxV1 = d3.max(rows, function (r) { return r.v1; }) || 1;
          var x = d3.scaleLinear()
            .domain([0, maxV1 * 1.12])
            .range([0, innerW]);

          // Gridlines
          g.append("g")
            .attr("transform", "translate(0," + innerH + ")")
            .call(d3.axisBottom(x).ticks(5).tickSize(-innerH).tickFormat(function (d) { return formatVal(d, isCurr); }))
            .call(function (sel) {
              sel.select(".domain").remove();
              sel.selectAll("line").attr("stroke", "#f1f5f9");
              sel.selectAll("text").attr("fill", "#64748b").attr("font-size", "10px").attr("font-family", "monospace");
            });

          // Left Labels
          g.append("g")
            .call(d3.axisLeft(y).tickSize(0))
            .call(function (sel) {
              sel.select(".domain").remove();
              sel.selectAll("text")
                .attr("fill", "#0f172a")
                .attr("font-size", "11px")
                .attr("font-weight", "600")
                .attr("dx", "-8px");
            });

          // Zayo Orange Horizontal Bars
          g.selectAll(".zayo-bar")
            .data(rows)
            .enter()
            .append("rect")
            .attr("class", "zayo-bar")
            .attr("y", function (d) { return y(d.label); })
            .attr("x", 0)
            .attr("height", y.bandwidth())
            .attr("width", function (d) { return Math.max(4, x(d.v1)); })
            .attr("rx", 4)
            .attr("fill", function (d, i) { return i === 0 ? "#e11d48" : (i === 1 ? "#f5831f" : "#fb923c"); })
            .style("cursor", "pointer")
            .on("click", function (event, d) {
              if (d.links && d.links.length && typeof LookerCharts !== "undefined") {
                LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
              }
            });

          // Value Labels on Right of Bars
          g.selectAll(".zayo-val-label")
            .data(rows)
            .enter()
            .append("text")
            .attr("x", function (d) { return x(d.v1) + 8; })
            .attr("y", function (d) { return y(d.label) + y.bandwidth() / 2 + 4; })
            .attr("fill", "#0f172a")
            .attr("font-family", "'JetBrains Mono', monospace")
            .attr("font-size", "11px")
            .attr("font-weight", "700")
            .text(function (d) {
              var base = formatVal(d.v1, isCurr);
              if (d.v2 !== null && !isNaN(d.v2)) {
                base += " (" + d.v2 + " incidents)";
              }
              return base;
            });

          done();
          return;
        }

        // Mode 1: Optical Attenuation / Time-Series Envelope (supports single or multi-series pivoted data)
        var marginTs = { top: 16, right: 32, bottom: 28, left: 56 };
        var tsW = Math.max(150, svgW - marginTs.left - marginTs.right);
        var tsH = Math.max(100, svgH - marginTs.top - marginTs.bottom);

        var gTs = svg.append("g").attr("transform", "translate(" + marginTs.left + "," + marginTs.top + ")");

        // Sort rows chronologically by dimField
        var sortedData = data.slice().sort(function (a, b) {
          var va = a[dimField] ? a[dimField].value : "";
          var vb = b[dimField] ? b[dimField].value : "";
          return String(va).localeCompare(String(vb));
        });

        var xLabels = sortedData.map(function (d) {
          return d[dimField] ? String(d[dimField].value) : "";
        });

        var xScale = d3.scalePoint()
          .domain(xLabels)
          .range([0, tsW]);

        // Extract series (either pivoted or single measure)
        var seriesList = [];
        if (pivots.length > 0 && m1Field) {
          pivots.forEach(function (piv, pIdx) {
            var pKey = piv.key;
            var pts = sortedData.map(function (d) {
              var cell = d[m1Field] && d[m1Field][pKey] ? d[m1Field][pKey] : null;
              return {
                x: d[dimField] ? String(d[dimField].value) : "",
                y: cell && cell.value !== null && cell.value !== undefined ? Number(cell.value) : null
              };
            }).filter(function (p) { return p.y !== null && !isNaN(p.y); });
            if (pts.length > 0) {
              seriesList.push({
                name: pKey,
                color: ZAYO_COLORS[pIdx % ZAYO_COLORS.length],
                points: pts
              });
            }
          });
        } else if (m1Field) {
          var ptsSingle = sortedData.map(function (d) {
            var cell = d[m1Field];
            return {
              x: d[dimField] ? String(d[dimField].value) : "",
              y: cell && cell.value !== null && cell.value !== undefined ? Number(cell.value) : null
            };
          }).filter(function (p) { return p.y !== null && !isNaN(p.y); });
          seriesList.push({
            name: (measures[0] && (measures[0].label_short || measures[0].label)) || "Telemetry",
            color: "#f5831f",
            points: ptsSingle
          });
        }

        var allY = [];
        seriesList.forEach(function (s) {
          s.points.forEach(function (p) { allY.push(p.y); });
        });

        var minY = d3.min(allY) || 0;
        var maxY = d3.max(allY) || 1;
        var isAttenuation = (m1Field && m1Field.indexOf("attenuation") !== -1) || maxY < 2.0;

        var yMinBound = isAttenuation ? Math.min(0.15, minY * 0.9) : minY * 0.85;
        var yMaxBound = isAttenuation ? Math.max(0.35, maxY * 1.12) : maxY * 1.12;

        var yScale = d3.scaleLinear()
          .domain([yMinBound, yMaxBound])
          .range([tsH, 0]);

        // Horizontal Gridlines
        gTs.append("g")
          .call(d3.axisLeft(yScale).ticks(5).tickSize(-tsW))
          .call(function (sel) {
            sel.select(".domain").remove();
            sel.selectAll("line").attr("stroke", "#f1f5f9");
            sel.selectAll("text").attr("fill", "#64748b").attr("font-size", "10px").attr("font-family", "monospace");
          });

        // X Axis ticks (every Nth date so no overlap)
        var tickStep = Math.max(1, Math.floor(xLabels.length / 8));
        var tickValues = xLabels.filter(function (_, idx) { return idx % tickStep === 0; });
        gTs.append("g")
          .attr("transform", "translate(0," + tsH + ")")
          .call(d3.axisBottom(xScale).tickValues(tickValues).tickSize(4))
          .call(function (sel) {
            sel.select(".domain").attr("stroke", "#cbd5e1");
            sel.selectAll("text").attr("fill", "#64748b").attr("font-size", "10px").attr("font-family", "monospace");
          });

        // If Optical Attenuation, draw ITU-T G.652.D Normal Operating Band (0.18 - 0.22 dB/km) + Anomaly Threshold (0.25 dB/km)
        var thresholdVal = Number(config.anomaly_threshold || 0.25);
        if (isAttenuation) {
          var bandTop = yScale(0.22);
          var bandBot = yScale(0.18);
          if (bandBot > bandTop) {
            gTs.append("rect")
              .attr("x", 0)
              .attr("y", bandTop)
              .attr("width", tsW)
              .attr("height", bandBot - bandTop)
              .attr("fill", "rgba(16, 185, 129, 0.08)");
          }

          var threshY = yScale(thresholdVal);
          if (threshY >= 0 && threshY <= tsH) {
            gTs.append("line")
              .attr("x1", 0)
              .attr("x2", tsW)
              .attr("y1", threshY)
              .attr("y2", threshY)
              .attr("stroke", "#e11d48")
              .attr("stroke-width", 1.5)
              .attr("stroke-dasharray", "4,4");

            gTs.append("text")
              .attr("x", tsW - 6)
              .attr("y", threshY - 5)
              .attr("text-anchor", "end")
              .attr("fill", "#e11d48")
              .attr("font-size", "9px")
              .attr("font-weight", "700")
              .attr("font-family", "monospace")
              .text("ANOMALY THRESHOLD (" + thresholdVal.toFixed(2) + " dB/km)");
          }
        }

        // Draw series lines + shaded gradient for primary series
        var lineGen = d3.line()
          .x(function (d) { return xScale(d.x); })
          .y(function (d) { return yScale(d.y); })
          .curve(d3.curveMonotoneX);

        if (seriesList.length === 1) {
          var areaGen = d3.area()
            .x(function (d) { return xScale(d.x); })
            .y0(tsH)
            .y1(function (d) { return yScale(d.y); })
            .curve(d3.curveMonotoneX);

          gTs.append("path")
            .datum(seriesList[0].points)
            .attr("fill", "rgba(245, 131, 31, 0.14)")
            .attr("d", areaGen);
        }

        seriesList.forEach(function (s, idx) {
          gTs.append("path")
            .datum(s.points)
            .attr("fill", "none")
            .attr("stroke", s.color)
            .attr("stroke-width", idx === 0 ? 2.4 : 1.8)
            .attr("d", lineGen);

          // Highlight anomaly points
          s.points.forEach(function (pt) {
            var isAnomalyPt = isAttenuation && pt.y >= thresholdVal;
            if (isAnomalyPt || s.points.length <= 35) {
              gTs.append("circle")
                .attr("cx", xScale(pt.x))
                .attr("cy", yScale(pt.y))
                .attr("r", isAnomalyPt ? 4 : 2.5)
                .attr("fill", isAnomalyPt ? "#e11d48" : s.color)
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 1.2);
            }
          });
        });

        done();
      });
    }
  });
})();
