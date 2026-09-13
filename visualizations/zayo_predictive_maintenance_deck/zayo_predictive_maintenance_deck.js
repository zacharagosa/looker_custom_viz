/**
 * Zayo AutoML Predictive Maintenance & OTDR Span Diagnostics Deck
 * Bespoke Looker Custom Visualization for Fiber Telecom Operations
 *
 * Features:
 * - Zayo Corporate Light Theme (#f5831f Orange, #0f172a Slate, #e11d48 Crimson, #10b981 Emerald)
 * - Executive Summary Ribbon (Total Spans, Immediate Dispatch Count, Total SLA Exposure Protected)
 * - Interactive Priority Filter Tabs (All, P1 Immediate, P2 High, P3 Watchlist, Nominal) + Search Bar
 * - Inline SVG OTDR Optical Reflectometry Trace simulating distance-to-fault waveform per fiber span
 * - AutoML Failure Probability Gauge & SLA Financial Risk pills
 * - Native Looker drill-down support
 */

(function () {
  function getRiskColor(prob, tier) {
    var t = (tier || "").toUpperCase();
    if (t.indexOf("CRITICAL") !== -1 || prob >= 0.85) {
      return { main: "#e11d48", bg: "#fff1f2", border: "#fecdd3", text: "#be123c", label: "CRITICAL" };
    }
    if (t.indexOf("HIGH") !== -1 || prob >= 0.75) {
      return { main: "#f5831f", bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", label: "HIGH" };
    }
    if (t.indexOf("ELEVATED") !== -1 || prob >= 0.55) {
      return { main: "#d97706", bg: "#fffbeb", border: "#fde68a", text: "#b45309", label: "ELEVATED" };
    }
    if (t.indexOf("MODERATE") !== -1 || prob >= 0.25) {
      return { main: "#334155", bg: "#f1f5f9", border: "#cbd5e1", text: "#1e293b", label: "MODERATE" };
    }
    return { main: "#10b981", bg: "#ecfdf5", border: "#a7f3d0", text: "#047857", label: "NOMINAL" };
  }

  function formatCurrency(val) {
    if (val === null || val === undefined || isNaN(val)) return "$0";
    var n = Number(val);
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
    return "$" + n.toLocaleString();
  }

  function generateOtdrSvg(spanId, prob, color) {
    // Deterministic hash from spanId to place fault spike along span
    var hash = 0;
    for (var i = 0; i < spanId.length; i++) {
      hash = (hash * 31 + spanId.charCodeAt(i)) % 1000;
    }
    var faultRatio = 0.28 + (hash % 55) / 100; // between 28% and 83% of span
    var w = 150;
    var h = 34;
    var faultX = Math.round(faultRatio * (w - 24)) + 12;
    var kmMarker = Math.round(faultRatio * 118);

    // Baseline slope with attenuation drop/spike at faultX
    var pts = [];
    for (var x = 4; x <= w - 4; x += 4) {
      var baseSlope = 8 + (x / w) * 14;
      var dist = Math.abs(x - faultX);
      var spike = 0;
      if (prob > 0.25 && dist < 8) {
        spike = (1 - dist / 8) * (prob * 16);
      }
      var y = Math.min(h - 3, Math.max(3, baseSlope - spike));
      pts.push(x + "," + y.toFixed(1));
    }

    var svg =
      '<div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;">' +
        '<div style="display:flex;justify-content:space-between;width:150px;font-size:9px;font-family:monospace;color:#64748b;">' +
          '<span>OTDR TRACE</span>' +
          (prob > 0.25
            ? '<span style="color:' + color + ';font-weight:700;">FAULT @ KM ' + kmMarker + '</span>'
            : '<span style="color:#10b981;font-weight:700;">CLEAR 118 KM</span>') +
        '</div>' +
        '<svg width="' + w + '" height="' + h + '" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">' +
          '<line x1="0" y1="17" x2="' + w + '" y2="17" stroke="#e2e8f0" stroke-dasharray="2,2" stroke-width="1"/>' +
          '<polyline fill="none" stroke="' + (prob > 0.25 ? color : "#10b981") + '" stroke-width="1.8" points="' + pts.join(" ") + '"/>' +
          (prob > 0.25
            ? '<circle cx="' + faultX + '" cy="' + Math.max(5, 8 + (faultX / w) * 14 - prob * 14).toFixed(1) + '" r="3.5" fill="' + color + '" stroke="#ffffff" stroke-width="1.2"/>'
            : '') +
        '</svg>' +
      '</div>';
    return svg;
  }

  looker.plugins.visualizations.add({
    id: "zayo_predictive_maintenance_deck",
    label: "Zayo AutoML Predictive Maintenance Deck",
    options: {
      default_filter: {
        type: "string",
        label: "Default Filter Tab",
        display: "select",
        values: [
          { "All Monitored Spans": "ALL" },
          { "P1 Immediate Dispatch Only": "P1" },
          { "High & Elevated Risk (P1/P2)": "HIGH_PLUS" }
        ],
        default: "ALL",
        section: "Display",
        order: 1
      },
      show_otdr_trace: {
        type: "boolean",
        label: "Show Simulated OTDR Distance-to-Fault Waveform",
        default: true,
        section: "Display",
        order: 2
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      element.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
      element.style.width = "100%";
      element.style.height = "100%";
      element.style.overflow = "auto";
      element.style.background = "#ffffff";
      this._activeFilter = "ALL";
      this._searchQuery = "";
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();
      var self = this;

      if (!data || data.length === 0) {
        element.innerHTML = "<div style='padding:20px;color:#64748b;font-size:13px;'>No predictive maintenance spans found.</div>";
        done();
        return;
      }

      // Helper to extract cell value safely
      function val(row, suffix, fallback) {
        for (var k in row) {
          if (k.indexOf(suffix) !== -1 && row[k] && row[k].value !== undefined && row[k].value !== null) {
            return row[k].value;
          }
        }
        return fallback;
      }

      function cellObj(row, suffix) {
        for (var k in row) {
          if (k.indexOf(suffix) !== -1 && row[k]) return row[k];
        }
        return null;
      }

      var parsedRows = data.map(function (row) {
        var spanId = val(row, "span_id", val(row, "span_name", "SPAN-UNKNOWN"));
        var spanName = val(row, "span_name", spanId);
        var routeName = val(row, "route_name", "Zayo Core Backbone");
        var riskTier = val(row, "risk_tier", "MODERATE");
        var probRaw = Number(val(row, "predicted_failure_prob", 0.5));
        if (probRaw > 1) probRaw = probRaw / 100.0;
        var timeframe = val(row, "failure_timeframe", "Next 48 Hours");
        var trigger = val(row, "primary_anomaly_trigger", "Optical Attenuation Drift");
        var metricVal = val(row, "anomaly_metric_value", "0.28 dB/km");
        var action = val(row, "recommended_action", "Dispatch OTDR splicer crew");
        var priority = val(row, "dispatch_priority", "P2 - High Priority");
        var slaRisk = Number(val(row, "sla_financial_risk_usd", val(row, "total_sla_risk_exposure", 0)));
        var drillCell = cellObj(row, "predicted_failure_prob") || cellObj(row, "sla_financial_risk_usd");

        return {
          spanId: String(spanId),
          spanName: String(spanName),
          routeName: String(routeName),
          riskTier: String(riskTier),
          prob: probRaw,
          timeframe: String(timeframe),
          trigger: String(trigger),
          metricVal: String(metricVal),
          action: String(action),
          priority: String(priority),
          slaRisk: slaRisk,
          drillCell: drillCell
        };
      });

      // Sort by highest failure probability first
      parsedRows.sort(function (a, b) {
        return b.prob - a.prob;
      });

      var totalSpans = parsedRows.length;
      var immediateCount = parsedRows.filter(function (r) {
        return r.priority.indexOf("P1") !== -1 || r.prob >= 0.75;
      }).length;
      var totalSlaProtected = parsedRows.reduce(function (acc, r) {
        return acc + (r.slaRisk || 0);
      }, 0);

      function renderUI() {
        var filtered = parsedRows.filter(function (r) {
          if (self._activeFilter === "P1") {
            return r.priority.indexOf("P1") !== -1 || r.prob >= 0.80;
          }
          if (self._activeFilter === "P2") {
            return r.priority.indexOf("P2") !== -1 || (r.prob >= 0.55 && r.prob < 0.80);
          }
          if (self._activeFilter === "P3") {
            return r.priority.indexOf("P3") !== -1 || (r.prob >= 0.25 && r.prob < 0.55);
          }
          if (self._activeFilter === "NOMINAL") {
            return r.prob < 0.25;
          }
          return true;
        });

        if (self._searchQuery) {
          var q = self._searchQuery.toLowerCase();
          filtered = filtered.filter(function (r) {
            return (
              r.spanId.toLowerCase().indexOf(q) !== -1 ||
              r.spanName.toLowerCase().indexOf(q) !== -1 ||
              r.trigger.toLowerCase().indexOf(q) !== -1 ||
              r.action.toLowerCase().indexOf(q) !== -1
            );
          });
        }

        var html =
          '<div style="padding:14px 16px;background:#ffffff;box-sizing:border-box;">' +
            // Top Executive Header Bar
            '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;margin-bottom:12px;">' +
              '<div style="display:flex;align-items:center;gap:14px;">' +
                '<div style="display:flex;align-items:center;gap:8px;">' +
                  '<span style="width:10px;height:10px;border-radius:50%;background:#f5831f;display:inline-block;box-shadow:0 0 0 3px #ffedd5;"></span>' +
                  '<span style="font-size:13px;font-weight:800;color:#0f172a;letter-spacing:-0.01em;">AUTOML OPTICAL SPAN FAILURE PREDICTOR & OTDR DISPATCH DECK</span>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:8px;">' +
                  '<span style="font-size:11px;font-family:monospace;font-weight:700;padding:3px 8px;border-radius:6px;background:#fff7ed;color:#ea580c;border:1px solid #fed7aa;">' +
                    totalSpans + ' SPANS MONITORED' +
                  '</span>' +
                  '<span style="font-size:11px;font-family:monospace;font-weight:700;padding:3px 8px;border-radius:6px;background:#fff1f2;color:#e11d48;border:1px solid #fecdd3;">' +
                    immediateCount + ' IMMEDIATE INTERVENTION' +
                  '</span>' +
                  '<span style="font-size:11px;font-family:monospace;font-weight:700;padding:3px 8px;border-radius:6px;background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;">' +
                    formatCurrency(totalSlaProtected) + ' SLA EXPOSURE GUARDED' +
                  '</span>' +
                '</div>' +
              '</div>' +

              // Filter Tabs & Search
              '<div style="display:flex;align-items:center;gap:6px;">' +
                ["ALL", "P1", "P2", "P3", "NOMINAL"].map(function (tab) {
                  var isActive = self._activeFilter === tab;
                  var label = tab === "ALL" ? "All (" + totalSpans + ")" : tab;
                  return (
                    '<button data-filter="' + tab + '" style="cursor:pointer;font-size:11px;font-weight:700;padding:5px 10px;border-radius:6px;border:1px solid ' +
                    (isActive ? "#f5831f" : "#cbd5e1") +
                    ";background:" +
                    (isActive ? "#f5831f" : "#ffffff") +
                    ";color:" +
                    (isActive ? "#ffffff" : "#475569") +
                    ';transition:all 0.15s;">' +
                      label +
                    '</button>'
                  );
                }).join("") +
                '<input id="zayo-deck-search" type="text" placeholder="Search span or trigger..." value="' + (self._searchQuery || "") + '" ' +
                  'style="font-size:11px;padding:5px 10px;border:1px solid #cbd5e1;border-radius:6px;outline:none;width:160px;color:#0f172a;margin-left:4px;" />' +
              '</div>' +
            '</div>' +

            // Table Header
            '<div style="display:grid;grid-template-columns:1.8fr 1.1fr ' + (config.show_otdr_trace !== false ? '160px ' : '') + '1.8fr 2.2fr 1.1fr;gap:12px;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#475569;margin-bottom:8px;">' +
              '<div>Span Identifier & Corridor</div>' +
              '<div>AutoML Failure Risk</div>' +
              (config.show_otdr_trace !== false ? '<div>OTDR Distance-to-Fault</div>' : '') +
              '<div>Primary Physical Anomaly Trigger</div>' +
              '<div>Autonomous NOC Dispatch Action</div>' +
              '<div style="text-align:right;">SLA Risk Protected</div>' +
            '</div>' +

            // Rows
            '<div style="display:flex;flex-direction:column;gap:8px;">' +
              filtered.map(function (r, idx) {
                var rc = getRiskColor(r.prob, r.riskTier);
                var pctStr = (r.prob * 100).toFixed(0) + "%";
                return (
                  '<div class="zayo-span-row" data-idx="' + idx + '" style="display:grid;grid-template-columns:1.8fr 1.1fr ' +
                  (config.show_otdr_trace !== false ? '160px ' : '') +
                  '1.8fr 2.2fr 1.1fr;gap:12px;align-items:center;padding:10px 12px;background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid ' +
                  rc.main +
                  ';border-radius:8px;box-shadow:0 1px 2px rgba(15,23,42,0.03);transition:all 0.15s;">' +
                    // Column 1: Span ID & Route
                    '<div>' +
                      '<div style="display:flex;align-items:center;gap:6px;">' +
                        '<span style="font-family:\'JetBrains Mono\',monospace;font-size:12px;font-weight:800;color:#0f172a;">' + r.spanId + '</span>' +
                        '<span style="font-size:9px;font-weight:700;font-family:monospace;padding:1.5px 6px;border-radius:4px;background:' + rc.bg + ';color:' + rc.text + ';border:1px solid ' + rc.border + ';">' +
                          rc.label +
                        '</span>' +
                      '</div>' +
                      '<div style="font-size:11px;color:#475569;font-weight:500;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
                        r.spanName +
                      '</div>' +
                      '<div style="font-size:10px;color:#64748b;font-family:monospace;margin-top:1px;">' +
                        r.priority + ' • Window: ' + r.timeframe +
                      '</div>' +
                    '</div>' +

                    // Column 2: AutoML Failure Risk Bar
                    '<div>' +
                      '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px;">' +
                        '<span style="font-size:16px;font-weight:800;font-family:\'JetBrains Mono\',monospace;color:' + rc.main + ';">' + pctStr + '</span>' +
                        '<span style="font-size:10px;color:#64748b;font-weight:600;">ML Prob</span>' +
                      '</div>' +
                      '<div style="width:100%;height:7px;background:#f1f5f9;border-radius:999px;overflow:hidden;">' +
                        '<div style="width:' + pctStr + ';height:100%;background:' + rc.main + ';border-radius:999px;"></div>' +
                      '</div>' +
                    '</div>' +

                    // Column 3: OTDR Trace
                    (config.show_otdr_trace !== false ? '<div>' + generateOtdrSvg(r.spanId, r.prob, rc.main) + '</div>' : '') +

                    // Column 4: Primary Anomaly Trigger
                    '<div>' +
                      '<div style="font-size:11px;font-weight:700;color:#0f172a;">' + r.trigger + '</div>' +
                      '<div style="font-size:11px;font-family:\'JetBrains Mono\',monospace;color:#ea580c;background:#fff7ed;border:1px solid #ffedd5;display:inline-block;padding:1.5px 6px;border-radius:4px;margin-top:3px;">' +
                        r.metricVal +
                      '</div>' +
                    '</div>' +

                    // Column 5: Action & Crew
                    '<div>' +
                      '<div style="font-size:11px;color:#1e293b;font-weight:600;line-height:1.35;">' + r.action + '</div>' +
                    '</div>' +

                    // Column 6: SLA Financial Risk Protected
                    '<div style="text-align:right;">' +
                      '<div style="font-size:14px;font-weight:800;font-family:\'JetBrains Mono\',monospace;color:#0f172a;">' +
                        formatCurrency(r.slaRisk) +
                      '</div>' +
                      '<div style="font-size:10px;color:#059669;font-weight:600;margin-top:2px;">Proactive Guard</div>' +
                    '</div>' +
                  '</div>'
                );
              }).join("") +
            '</div>' +
          '</div>';

        element.innerHTML = html;

        // Wire filter buttons
        var btns = element.querySelectorAll("button[data-filter]");
        for (var i = 0; i < btns.length; i++) {
          btns[i].addEventListener("click", function (e) {
            self._activeFilter = e.currentTarget.getAttribute("data-filter");
            renderUI();
          });
        }

        // Wire search input
        var searchInput = element.querySelector("#zayo-deck-search");
        if (searchInput) {
          searchInput.addEventListener("input", function (e) {
            self._searchQuery = e.target.value;
            renderUI();
            var newInput = element.querySelector("#zayo-deck-search");
            if (newInput) {
              newInput.focus();
              newInput.setSelectionRange(newInput.value.length, newInput.value.length);
            }
          });
        }

        // Wire click-to-drill on rows
        var rowEls = element.querySelectorAll(".zayo-span-row");
        for (var j = 0; j < rowEls.length; j++) {
          rowEls[j].addEventListener("click", function (e) {
            var idx = Number(e.currentTarget.getAttribute("data-idx"));
            var rowObj = filtered[idx];
            if (rowObj && rowObj.drillCell && rowObj.drillCell.links && typeof LookerCharts !== "undefined") {
              LookerCharts.Utils.openDrillMenu({
                links: rowObj.drillCell.links,
                event: e
              });
            }
          });
        }
      }

      renderUI();
      done();
    }
  });
})();
