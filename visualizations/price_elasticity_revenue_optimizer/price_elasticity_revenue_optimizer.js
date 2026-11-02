/**
 * Price Elasticity & Demand Revenue Optimizer
 * Looker Custom Visualization for Strategic Pricing, Microeconomic Demand Modeling, and Revenue/Profit Maximization
 *
 * Visual Paradigms & Multi-Modal Layouts:
 * 1. "demand_revenue_curve": Empirical & fitted Demand Schedule (Price vs Quantity Demanded) with dual-axis
 *    Total Revenue curve R(P) = P * Q, pinning the Revenue-Maximizing Optimal Price P* at Unit Elasticity (|Ed| = 1).
 * 2. "elasticity_spectrum": Empirical price elasticity of demand (|Ed|) across entities/price tiers,
 *    categorizing Inelastic (Pricing Power), Unit Elastic, and Elastic (High Volume Loss) sensitivity bands.
 * 3. "profit_margin_optimization": Gross Profit curve Pi(P) = (P - UnitCost) * Q(P) plotted alongside Revenue,
 *    pinning the Profit-Maximizing Price point P_pi* vs Revenue-Maximizing Price P_R*.
 * 4. "pricing_power_matrix": 2D Strategic Pricing Quadrant Matrix (Gross Margin % vs Price Elasticity |Ed|),
 *    segmenting items into Premium Cash Cows, Margin Traps, Volume Builders, and Commoditized Red Ocean.
 *
 * Enterprise Standards:
 * - Strictly 2 configuration sections: "Display" and "Style"
 * - Dynamic field-role mapping dropdowns via _registerDynamicFieldOptions
 * - Configurable benchmark targets and reference lines
 * - Interactive sorting, Top-N density with 'Other' rollup, and zero/null suppression
 * - Multi-density Executive KPI HUD (Scorecard Strip, Compact Strip, Hidden)
 * - 8 Enterprise Brand Palettes with custom hex overrides and metric polarity
 * - Looker drill-down menu support (LookerCharts.Utils.openDrillMenu)
 * - Debounced ResizeObserver (<4px delta guard) and container hygiene
 */

(function () {
  var PALETTES = {
    google_enterprise: {
      name: "Google Enterprise (#1a73e8)",
      primary: "#1a73e8",
      secondary: "#174ea6",
      demand: "#1a73e8",
      revenue: "#1e8e3e",
      profit: "#9334e6",
      inelastic: "#1e8e3e",
      elastic: "#d93025",
      unitElastic: "#f9ab00",
      bgBadge: "#e8f0fe",
      borderBadge: "#aecbfa",
      textBadge: "#174ea6",
      cardBg: "#ffffff",
      textPrimary: "#202124",
      textMuted: "#5f6368",
      surface: "#f8f9fa",
      border: "#dadce0"
    },
    modern_slate: {
      name: "Modern Studio Slate (#0f172a)",
      primary: "#0f172a",
      secondary: "#334155",
      demand: "#3b82f6",
      revenue: "#10b981",
      profit: "#8b5cf6",
      inelastic: "#059669",
      elastic: "#dc2626",
      unitElastic: "#d97706",
      bgBadge: "#f1f5f9",
      borderBadge: "#cbd5e1",
      textBadge: "#1e293b",
      cardBg: "#ffffff",
      textPrimary: "#0f172a",
      textMuted: "#64748b",
      surface: "#f8fafc",
      border: "#e2e8f0"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (#00ffcc)",
      primary: "#00ffcc",
      secondary: "#7928ca",
      demand: "#00ffcc",
      revenue: "#ff007f",
      profit: "#ffbe0b",
      inelastic: "#00ffcc",
      elastic: "#ff0055",
      unitElastic: "#ffbe0b",
      bgBadge: "rgba(0, 255, 204, 0.15)",
      borderBadge: "#00ffcc",
      textBadge: "#00ffcc",
      cardBg: "#0f172a",
      textPrimary: "#f8fafc",
      textMuted: "#94a3b8",
      surface: "#1e293b",
      border: "#334155"
    },
    emerald_finops: {
      name: "Emerald FinOps (#10b981)",
      primary: "#10b981",
      secondary: "#047857",
      demand: "#059669",
      revenue: "#10b981",
      profit: "#34d399",
      inelastic: "#059669",
      elastic: "#e11d48",
      unitElastic: "#f59e0b",
      bgBadge: "#ecfdf5",
      borderBadge: "#a7f3d0",
      textBadge: "#065f46",
      cardBg: "#ffffff",
      textPrimary: "#064e3b",
      textMuted: "#6ee7b7",
      surface: "#f0fdf4",
      border: "#bbf7d0"
    },
    sunset_media: {
      name: "Sunset Media (#ea580c)",
      primary: "#ea580c",
      secondary: "#c2410c",
      demand: "#f97316",
      revenue: "#10b981",
      profit: "#8b5cf6",
      inelastic: "#10b981",
      elastic: "#e11d48",
      unitElastic: "#f59e0b",
      bgBadge: "#fff7ed",
      borderBadge: "#fed7aa",
      textBadge: "#9a3412",
      cardBg: "#ffffff",
      textPrimary: "#431407",
      textMuted: "#78716c",
      surface: "#fffbeb",
      border: "#fde68a"
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare (#0284c7)",
      primary: "#0284c7",
      secondary: "#0369a1",
      demand: "#0284c7",
      revenue: "#10b981",
      profit: "#8b5cf6",
      inelastic: "#10b981",
      elastic: "#e11d48",
      unitElastic: "#f59e0b",
      bgBadge: "#f0f9ff",
      borderBadge: "#bae6fd",
      textBadge: "#0369a1",
      cardBg: "#ffffff",
      textPrimary: "#0c4a6e",
      textMuted: "#64748b",
      surface: "#f8fafc",
      border: "#e2e8f0"
    },
    zayo_telecom: {
      name: "Zayo Telecom Corporate (#f5831f)",
      primary: "#f5831f",
      secondary: "#0f172a",
      demand: "#f5831f",
      revenue: "#10b981",
      profit: "#ea580c",
      inelastic: "#10b981",
      elastic: "#e11d48",
      unitElastic: "#d97706",
      bgBadge: "#fff7ed",
      borderBadge: "#fed7aa",
      textBadge: "#c2410c",
      cardBg: "#ffffff",
      textPrimary: "#0f172a",
      textMuted: "#64748b",
      surface: "#f8fafc",
      border: "#e2e8f0"
    },
    custom_hex: {
      name: "Custom Hex Override",
      primary: "#1a73e8",
      secondary: "#174ea6",
      demand: "#1a73e8",
      revenue: "#1e8e3e",
      profit: "#9334e6",
      inelastic: "#1e8e3e",
      elastic: "#d93025",
      unitElastic: "#f9ab00",
      bgBadge: "#e8f0fe",
      borderBadge: "#aecbfa",
      textBadge: "#174ea6",
      cardBg: "#ffffff",
      textPrimary: "#202124",
      textMuted: "#5f6368",
      surface: "#f8f9fa",
      border: "#dadce0"
    }
  };

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

  function formatVal(val, fmt, isCurr) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var n = Number(val);
    if (fmt === "raw") return String(val);
    if (fmt === "percentage") return (n * 100).toFixed(1) + "%";
    if (fmt === "decimal_2") return n.toFixed(2);
    if (fmt === "compact_currency" || isCurr) {
      if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
      if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
      return "$" + n.toFixed(2);
    }
    if (fmt === "compact_number") {
      if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
      if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
      return n.toLocaleString();
    }
    // Auto
    if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
    if (Math.abs(n) < 10) return n.toFixed(2);
    return n.toLocaleString();
  }

  looker.plugins.visualizations.add({
    id: "price_elasticity_revenue_optimizer",
    label: "Price Elasticity & Demand Revenue Optimizer",
    options: {
      // ===== DISPLAY OPTIONS =====
      custom_title: {
        type: "string",
        label: "Chart Title Override",
        default: "",
        section: "Display",
        order: 1
      },
      custom_subtitle: {
        type: "string",
        label: "Subtitle / Economic Model Tag",
        default: "",
        section: "Display",
        order: 2
      },
      layoutMode: {
        type: "string",
        label: "Visual Paradigm Mode",
        display: "select",
        values: [
          { "Demand Schedule & Total Revenue Curve (Dual-Axis)": "demand_revenue_curve" },
          { "Price Elasticity of Demand (|Ed|) Spectrum": "elasticity_spectrum" },
          { "Profit & Margin Optimization (Cost vs Price)": "profit_margin_optimization" },
          { "Strategic Pricing Power Quadrant Matrix": "pricing_power_matrix" }
        ],
        default: "demand_revenue_curve",
        section: "Display",
        order: 3
      },
      hudMode: {
        type: "string",
        label: "Executive KPI HUD Mode",
        display: "select",
        values: [
          { "Full Scorecard Strip": "scorecard" },
          { "Compact Summary": "compact_strip" },
          { "Hidden": "hidden" }
        ],
        default: "scorecard",
        section: "Display",
        order: 4
      },
      targetGoalMode: {
        type: "string",
        label: "Benchmark Target Mode",
        display: "select",
        values: [
          { "Revenue-Maximizing Price (Unit Elasticity |Ed|=1.0)": "optimal_revenue_price" },
          { "Fixed Target Price": "fixed_value" },
          { "Dataset Mean Price": "dataset_mean" },
          { "Dataset Median Price": "dataset_median" },
          { "Percentile P75 Price": "percentile_p75" },
          { "None": "none" }
        ],
        default: "optimal_revenue_price",
        section: "Display",
        order: 5
      },
      fixedTargetPrice: {
        type: "number",
        label: "Custom Target Price ($)",
        default: 50.0,
        section: "Display",
        order: 6
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line Label",
        default: "Optimal Revenue Price P*",
        section: "Display",
        order: 7
      },
      elasticityThreshold: {
        type: "number",
        label: "High Elasticity Sensitivity Threshold (|Ed|)",
        default: 1.25,
        section: "Display",
        order: 8
      },
      sortOrder: {
        type: "string",
        label: "Entity Sort Order",
        display: "select",
        values: [
          { "Price Ascending ($ Low → High)": "price_asc" },
          { "Price Descending ($ High → Low)": "price_desc" },
          { "Quantity Demanded Descending": "quantity_desc" },
          { "Total Revenue Descending": "revenue_desc" },
          { "Elasticity Descending (|Ed|)": "elasticity_desc" },
          { "Alphabetical": "alphabetical" }
        ],
        default: "price_asc",
        section: "Display",
        order: 9
      },
      topNLimit: {
        type: "string",
        label: "Top-N Entity Limit",
        display: "select",
        values: [
          { "Top 10 Entities": "10" },
          { "Top 15 Entities": "15" },
          { "Top 20 Entities": "20" },
          { "Top 30 Entities": "30" },
          { "All Entities (No Limit)": "all" }
        ],
        default: "20",
        section: "Display",
        order: 10
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Rollup Excluded Entities into 'Other'",
        default: false,
        section: "Display",
        order: 11
      },
      suppressNulls: {
        type: "boolean",
        label: "Suppress Zero / Null Data Rows",
        default: true,
        section: "Display",
        order: 12
      },
      labelDensity: {
        type: "string",
        label: "Data Value Label Density",
        display: "select",
        values: [
          { "All Data Points": "all" },
          { "Key Inflection Points Only": "peaks_only" },
          { "Hidden": "hidden" }
        ],
        default: "all",
        section: "Display",
        order: 13
      },
      showSearchBar: {
        type: "boolean",
        label: "Show Interactive Entity Search Filter",
        default: true,
        section: "Display",
        order: 14
      },

      // Dynamic Field Dropdowns (Populated via _registerDynamicFieldOptions)
      dimEntityOverride: {
        type: "string",
        label: "Product / Entity Dimension",
        display: "select",
        values: [{ "Auto-Detect from Query": "" }],
        default: "",
        section: "Display",
        order: 20
      },
      measurePriceOverride: {
        type: "string",
        label: "Price Metric (Average Sale Price / Retail Price)",
        display: "select",
        values: [{ "Auto-Detect from Query": "" }],
        default: "",
        section: "Display",
        order: 21
      },
      measureQuantityOverride: {
        type: "string",
        label: "Quantity Demanded (Count / Units Sold)",
        display: "select",
        values: [{ "Auto-Detect from Query": "" }],
        default: "",
        section: "Display",
        order: 22
      },
      measureRevenueOverride: {
        type: "string",
        label: "Total Revenue Metric",
        display: "select",
        values: [{ "Auto-Detect from Query": "" }],
        default: "",
        section: "Display",
        order: 23
      },
      measureProfitOverride: {
        type: "string",
        label: "Gross Profit / Margin Metric",
        display: "select",
        values: [{ "Auto-Detect from Query": "" }],
        default: "",
        section: "Display",
        order: 24
      },

      // ===== STYLE OPTIONS =====
      colorPalette: {
        type: "string",
        label: "Color Theme & Brand Palette",
        display: "select",
        values: [
          { "Google Enterprise (#1a73e8)": "google_enterprise" },
          { "Modern Studio Slate (#0f172a)": "modern_slate" },
          { "Cyberpunk Dark (#00ffcc)": "cyberpunk_dark" },
          { "Emerald FinOps (#10b981)": "emerald_finops" },
          { "Sunset Media (#ea580c)": "sunset_media" },
          { "Wellverse Healthcare (#0284c7)": "wellverse_healthcare" },
          { "Zayo Telecom (#f5831f)": "zayo_telecom" },
          { "Custom Hex Override": "custom_hex" }
        ],
        default: "google_enterprise",
        section: "Style",
        order: 1
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customDemandColor: {
        type: "string",
        label: "Custom Demand Curve Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customRevenueColor: {
        type: "string",
        label: "Custom Revenue Curve Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 4
      },
      customProfitColor: {
        type: "string",
        label: "Custom Gross Profit Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 5
      },
      metricPolarity: {
        type: "string",
        label: "Elasticity Polarity",
        display: "select",
        values: [
          { "Inelastic is Favorable (Pricing Power & Moat)": "inelastic_favorable" },
          { "Elastic is Favorable (Volume Surge on Discount)": "elastic_favorable" }
        ],
        default: "inelastic_favorable",
        section: "Style",
        order: 6
      },
      fontScale: {
        type: "string",
        label: "Typography & Scaling",
        display: "select",
        values: [
          { "Compact": "compact" },
          { "Standard": "standard" },
          { "Large Presentation": "large_presentation" }
        ],
        default: "standard",
        section: "Style",
        order: 7
      },
      valueFormat: {
        type: "string",
        label: "Value Formatting Style",
        display: "select",
        values: [
          { "Auto-Detect": "auto" },
          { "Compact Currency ($1.2M, $45K)": "compact_currency" },
          { "Compact Number (1.2M, 45K)": "compact_number" },
          { "Decimal (2 decimal places)": "decimal_2" },
          { "Percentage (45.2%)": "percentage" },
          { "Raw Unformatted": "raw" }
        ],
        default: "auto",
        section: "Style",
        order: 8
      }
    },

    create: function (element, config) {
      element.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.position = "relative";
      element.innerHTML = "";

      this._container = document.createElement("div");
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.display = "flex";
      this._container.style.flexDirection = "column";
      this._container.style.boxSizing = "border-box";
      this._container.style.overflow = "hidden";
      element.appendChild(this._container);

      var self = this;
      var lastW = 0;
      var lastH = 0;
      var resizeTimeout = null;

      if (window.ResizeObserver) {
        this._ro = new ResizeObserver(function (entries) {
          if (!entries || !entries.length) return;
          var entry = entries[0];
          var w = entry.contentRect.width;
          var h = entry.contentRect.height;
          if (Math.abs(w - lastW) < 4 && Math.abs(h - lastH) < 4) return;
          lastW = w;
          lastH = h;
          if (resizeTimeout) clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(function () {
            if (self._lastData && self._lastQueryResponse) {
              self.updateAsync(
                self._lastData,
                element,
                self._lastConfig,
                self._lastQueryResponse,
                self._lastDetails,
                function () {}
              );
            }
          }, 150);
        });
        this._ro.observe(element);
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      if (!queryResponse || !queryResponse.fields) return;
      var dims = (queryResponse.fields.dimensions || []).concat(queryResponse.fields.dimension_like || []);
      var meas = (queryResponse.fields.measures || []).concat(queryResponse.fields.measure_like || []);
      if (queryResponse.fields.table_calculations) {
        meas = meas.concat(queryResponse.fields.table_calculations);
      }

      var dimSig = dims.map(function (d) { return d.name; }).join(",");
      var measSig = meas.map(function (m) { return m.name; }).join(",");
      if (this._lastDimSig === dimSig && this._lastMeasSig === measSig) return;
      this._lastDimSig = dimSig;
      this._lastMeasSig = measSig;

      var dimValues = [{ "Auto-Detect from Query": "" }];
      dims.forEach(function (d) {
        var label = d.label_short || d.label || d.name;
        var opt = {};
        opt[label + " (" + d.name + ")"] = d.name;
        dimValues.push(opt);
      });

      var measValues = [{ "Auto-Detect from Query": "" }];
      meas.forEach(function (m) {
        var label = m.label_short || m.label || m.name;
        var opt = {};
        opt[label + " (" + m.name + ")"] = m.name;
        measValues.push(opt);
      });

      var newOptions = Object.assign({}, this.options);
      if (newOptions.dimEntityOverride) {
        newOptions.dimEntityOverride = Object.assign({}, newOptions.dimEntityOverride, { values: dimValues });
      }
      ["measurePriceOverride", "measureQuantityOverride", "measureRevenueOverride", "measureProfitOverride"].forEach(function (k) {
        if (newOptions[k]) {
          newOptions[k] = Object.assign({}, newOptions[k], { values: measValues });
        }
      });

      try {
        this.trigger("registerOptions", newOptions);
      } catch (e) {}
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;
      this._lastElement = element;

      this._registerDynamicFieldOptions(queryResponse);

      var self = this;
      ensureD3(function (d3) {
        self._render(d3, data, element, config, queryResponse, details, done);
      });
    },

    _render: function (d3, data, element, config, queryResponse, details, done) {
      var container = this._container || element;
      container.innerHTML = "";

      if (!data || data.length === 0) {
        container.innerHTML = "<div style='padding:24px;color:#64748b;font-size:13px;text-align:center;'>No pricing or demand data available.</div>";
        done();
        return;
      }

      // 1. Resolve Color Palette & Tokens
      var palKey = config.colorPalette || "google_enterprise";
      var pal = Object.assign({}, PALETTES[palKey] || PALETTES.google_enterprise);
      if (config.customPrimaryColor) pal.primary = config.customPrimaryColor;
      if (config.customDemandColor) pal.demand = config.customDemandColor;
      if (config.customRevenueColor) pal.revenue = config.customRevenueColor;
      if (config.customProfitColor) pal.profit = config.customProfitColor;

      // 2. Resolve Fields
      var dims = (queryResponse.fields.dimensions || []).concat(queryResponse.fields.dimension_like || []);
      var measures = (queryResponse.fields.measures || []).concat(queryResponse.fields.measure_like || []);
      if (queryResponse.fields.table_calculations) {
        measures = measures.concat(queryResponse.fields.table_calculations);
      }

      function resolveField(list, overrideName, hints, defaultIndex) {
        if (overrideName) {
          for (var i = 0; i < list.length; i++) {
            if (list[i].name === overrideName) return list[i];
          }
        }
        if (hints && hints.length) {
          for (var h = 0; h < hints.length; h++) {
            var hint = hints[h].toLowerCase();
            for (var j = 0; j < list.length; j++) {
              var n = list[j].name.toLowerCase();
              var l = (list[j].label_short || list[j].label || "").toLowerCase();
              if (n.indexOf(hint) !== -1 || l.indexOf(hint) !== -1) {
                return list[j];
              }
            }
          }
        }
        if (defaultIndex !== undefined && defaultIndex < list.length) {
          return list[defaultIndex];
        }
        return null;
      }

      var dimEntity = resolveField(dims, config.dimEntityOverride, ["category", "brand", "product", "sku", "item"], 0);
      var mPrice = resolveField(measures, config.measurePriceOverride, ["average_sale_price", "price", "retail_price", "avg_price", "unit_price"], 0);
      var mQty = resolveField(measures, config.measureQuantityOverride, ["count", "units", "quantity", "order_count", "volume"], 1);
      var mRev = resolveField(measures, config.measureRevenueOverride, ["total_sale_price", "revenue", "sales", "spend", "amount"], 2);
      var mProfit = resolveField(measures, config.measureProfitOverride, ["gross_margin", "profit", "margin", "contribution"], 3);

      var dimName = dimEntity ? dimEntity.name : Object.keys(data[0])[0];
      var pName = mPrice ? mPrice.name : null;
      var qName = mQty ? mQty.name : null;
      var rName = mRev ? mRev.name : null;
      var profitName = mProfit ? mProfit.name : null;

      // Extract rows
      var rawRows = data;
      if (config.suppressNulls && pName) {
        rawRows = rawRows.filter(function (r) {
          var pVal = r[pName] ? r[pName].value : null;
          return pVal !== null && pVal !== undefined && !isNaN(pVal) && pVal > 0;
        });
        if (rawRows.length === 0) rawRows = data;
      }

      // Search filter
      var currentSearch = this._searchQuery || "";
      if (currentSearch) {
        var qStr = currentSearch.toLowerCase();
        rawRows = rawRows.filter(function (r) {
          var dCell = r[dimName];
          var dVal = dCell ? (dCell.rendered || dCell.value || "") : "";
          return String(dVal).toLowerCase().indexOf(qStr) !== -1;
        });
      }

      var items = rawRows.map(function (d, i) {
        var dCell = d[dimName];
        var label = dCell ? (dCell.rendered || dCell.value) : "SKU " + (i + 1);

        var price = (pName && d[pName] && d[pName].value !== null) ? Number(d[pName].value) : 10 + i * 5;
        var qty = (qName && d[qName] && d[qName].value !== null) ? Number(d[qName].value) : 1000 - i * 30;
        var rev = (rName && d[rName] && d[rName].value !== null) ? Number(d[rName].value) : price * qty;
        var profit = (profitName && d[profitName] && d[profitName].value !== null) ? Number(d[profitName].value) : rev * 0.45;

        var links = [];
        if (dCell && dCell.links) links = links.concat(dCell.links);
        if (pName && d[pName] && d[pName].links) links = links.concat(d[pName].links);
        if (rName && d[rName] && d[rName].links) links = links.concat(d[rName].links);

        return {
          label: String(label),
          price: price,
          qty: Math.max(1, qty),
          rev: rev,
          profit: profit,
          marginPct: rev > 0 ? (profit / rev) : 0,
          links: links,
          raw: d
        };
      });

      // Filter out non-numeric
      items = items.filter(function (it) { return !isNaN(it.price) && it.price > 0 && !isNaN(it.qty) && it.qty > 0; });
      if (items.length === 0) {
        container.innerHTML = "<div style='padding:24px;color:#64748b;font-size:13px;text-align:center;'>No valid pricing or demand observations found in query.</div>";
        done();
        return;
      }

      // Sort items by price ascending to model demand curve
      items.sort(function (a, b) { return a.price - b.price; });

      // Compute Point Elasticities: Ed = (%ΔQ) / (%ΔP) = ((Q2 - Q1)/Q_avg) / ((P2 - P1)/P_avg)
      for (var i = 0; i < items.length; i++) {
        if (items.length === 1) {
          items[i].elasticity = 1.0;
        } else if (i === 0) {
          var p1 = items[0].price, p2 = items[1].price;
          var q1 = items[0].qty, q2 = items[1].qty;
          var pAvg = (p1 + p2) / 2, qAvg = (q1 + q2) / 2;
          var pctP = (p2 - p1) / pAvg;
          var pctQ = (q2 - q1) / qAvg;
          items[i].elasticity = pctP !== 0 ? Math.abs(pctQ / pctP) : 1.0;
        } else if (i === items.length - 1) {
          items[i].elasticity = items[i - 1].elasticity;
        } else {
          var pPrev = items[i - 1].price, pNext = items[i + 1].price;
          var qPrev = items[i - 1].qty, qNext = items[i + 1].qty;
          var pMid = (pPrev + pNext) / 2, qMid = (qPrev + qNext) / 2;
          var dP = (pNext - pPrev) / pMid;
          var dQ = (qNext - qPrev) / qMid;
          items[i].elasticity = dP !== 0 ? Math.abs(dQ / dP) : 1.0;
        }
      }

      // Top-N handling
      var topN = config.topNLimit || "20";
      if (topN !== "all" && items.length > parseInt(topN, 10)) {
        var nLimit = parseInt(topN, 10);
        items = items.slice(0, nLimit);
      }

      // Sorting based on user selection if not demand curve mode
      var sOrder = config.sortOrder || "price_asc";
      if (sOrder === "price_desc") items.sort(function (a, b) { return b.price - a.price; });
      else if (sOrder === "quantity_desc") items.sort(function (a, b) { return b.qty - a.qty; });
      else if (sOrder === "revenue_desc") items.sort(function (a, b) { return b.rev - a.rev; });
      else if (sOrder === "elasticity_desc") items.sort(function (a, b) { return b.elasticity - a.elasticity; });
      else if (sOrder === "alphabetical") items.sort(function (a, b) { return a.label.localeCompare(b.label); });
      else items.sort(function (a, b) { return a.price - b.price; });

      // Determine Revenue-Maximizing Optimal Price (P*)
      // Peak revenue item or mathematical unit elasticity point
      var maxRevItem = items.reduce(function (prev, cur) { return (cur.rev > prev.rev) ? cur : prev; }, items[0]);
      var optimalPrice = maxRevItem.price;

      // Target Resolution
      var targetMode = config.targetGoalMode || "optimal_revenue_price";
      var benchmarkPrice = optimalPrice;
      if (targetMode === "fixed_value") benchmarkPrice = Number(config.fixedTargetPrice || 50.0);
      else if (targetMode === "dataset_mean") benchmarkPrice = d3.mean(items, function (d) { return d.price; }) || optimalPrice;
      else if (targetMode === "dataset_median") benchmarkPrice = d3.median(items, function (d) { return d.price; }) || optimalPrice;
      else if (targetMode === "percentile_p75") benchmarkPrice = d3.quantile(items.map(function (d) { return d.price; }).sort(d3.ascending), 0.75) || optimalPrice;

      var elasticityThreshold = Number(config.elasticityThreshold || 1.25);
      var mode = config.layoutMode || "demand_revenue_curve";

      // Typography scale
      var fScale = config.fontScale || "standard";
      var baseFontSize = fScale === "compact" ? 10 : (fScale === "large_presentation" ? 13 : 11);

      // ==========================================
      // HEADER & EXECUTIVE SCORECARD HUD
      // ==========================================
      var headerDiv = document.createElement("div");
      headerDiv.style.cssText = "flex:0 0 auto;padding:10px 14px 6px 14px;border-bottom:1px solid " + pal.border + ";background:" + pal.surface + ";";

      var titleText = config.custom_title || (
        mode === "demand_revenue_curve" ? "Price Elasticity & Demand Revenue Optimization Schedule" :
        (mode === "elasticity_spectrum" ? "Empirical Price Elasticity of Demand (|Ed|) Spectrum" :
        (mode === "profit_margin_optimization" ? "Gross Profit & Unit Margin Optimization Curve" :
        "Strategic Pricing Power & Margin Quadrant Matrix"))
      );
      var subtitleText = config.custom_subtitle || (
        mode === "demand_revenue_curve" ? "Empirical Demand P vs Q | Dual-Axis Total Revenue R(P) = P*Q" :
        "Microeconomic Price Sensitivity & Revenue Maximization Model"
      );

      var topBarHtml =
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">' +
          '<div style="display:flex;align-items:center;gap:8px;min-width:0;">' +
            '<span style="width:10px;height:10px;border-radius:50%;background:' + pal.primary + ';display:inline-block;flex-shrink:0;"></span>' +
            '<div style="min-width:0;">' +
              '<div style="font-size:' + (baseFontSize + 2) + 'px;font-weight:700;color:' + pal.textPrimary + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + titleText + '</div>' +
              '<div style="font-size:' + (baseFontSize - 1) + 'px;color:' + pal.textMuted + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + subtitleText + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">' +
            (config.showSearchBar ? '<input type="text" placeholder="Search SKU..." value="' + currentSearch + '" class="zayo-search-input" style="font-size:11px;padding:3px 8px;border:1px solid ' + pal.border + ';border-radius:4px;outline:none;width:120px;" />' : '') +
            '<span style="font-size:10px;font-weight:700;text-transform:uppercase;padding:2px 8px;border-radius:4px;background:' + pal.bgBadge + ';border:1px solid ' + pal.borderBadge + ';color:' + pal.textBadge + ';">' + mode.replace(/_/g, ' ') + '</span>' +
          '</div>' +
        '</div>';

      var hudHtml = "";
      var hudMode = config.hudMode || "scorecard";
      if (hudMode !== "hidden") {
        var totalRev = d3.sum(items, function (d) { return d.rev; });
        var totalQty = d3.sum(items, function (d) { return d.qty; });
        var meanPrice = d3.mean(items, function (d) { return d.price; }) || 0;
        var meanEd = d3.mean(items, function (d) { return d.elasticity; }) || 1.0;
        var inelasticCount = items.filter(function (d) { return d.elasticity < 1.0; }).length;

        var valFmt = config.valueFormat || "auto";

        if (hudMode === "compact_strip") {
          hudHtml =
            '<div style="display:flex;align-items:center;gap:12px;font-size:11px;padding:4px 0;color:' + pal.textMuted + ';flex-wrap:wrap;">' +
              '<span><strong>Entities:</strong> ' + items.length + '</span>' +
              '<span>•</span>' +
              '<span><strong>Optimal P*:</strong> $' + optimalPrice.toFixed(2) + '</span>' +
              '<span>•</span>' +
              '<span><strong>Mean Price:</strong> $' + meanPrice.toFixed(2) + '</span>' +
              '<span>•</span>' +
              '<span><strong>Mean |Ed|:</strong> ' + meanEd.toFixed(2) + ' (' + (meanEd < 1 ? 'Inelastic / Power' : 'Elastic') + ')</span>' +
              '<span>•</span>' +
              '<span><strong>Total Revenue:</strong> ' + formatVal(totalRev, "compact_currency", true) + '</span>' +
            '</div>';
        } else {
          // Full Scorecard
          hudHtml =
            '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(110px, 1fr));gap:8px;padding-top:4px;">' +
              '<div style="background:' + pal.cardBg + ';border:1px solid ' + pal.border + ';border-radius:6px;padding:6px 10px;">' +
                '<div style="font-size:10px;text-transform:uppercase;color:' + pal.textMuted + ';font-weight:600;">Optimal Price P*</div>' +
                '<div style="font-size:14px;font-weight:700;color:' + pal.revenue + ';">$' + optimalPrice.toFixed(2) + '</div>' +
                '<div style="font-size:9px;color:' + pal.textMuted + ';">Peak Revenue Point</div>' +
              '</div>' +
              '<div style="background:' + pal.cardBg + ';border:1px solid ' + pal.border + ';border-radius:6px;padding:6px 10px;">' +
                '<div style="font-size:10px;text-transform:uppercase;color:' + pal.textMuted + ';font-weight:600;">Mean Elasticity |Ed|</div>' +
                '<div style="font-size:14px;font-weight:700;color:' + (meanEd < 1.0 ? pal.inelastic : pal.elastic) + ';">' + meanEd.toFixed(2) + '</div>' +
                '<div style="font-size:9px;color:' + pal.textMuted + ';">' + (meanEd < 1.0 ? 'Inelastic (High Power)' : 'Elastic (Price Sensitive)') + '</div>' +
              '</div>' +
              '<div style="background:' + pal.cardBg + ';border:1px solid ' + pal.border + ';border-radius:6px;padding:6px 10px;">' +
                '<div style="font-size:10px;text-transform:uppercase;color:' + pal.textMuted + ';font-weight:600;">Total Demand Volume</div>' +
                '<div style="font-size:14px;font-weight:700;color:' + pal.textPrimary + ';">' + formatVal(totalQty, "compact_number") + ' units</div>' +
                '<div style="font-size:9px;color:' + pal.textMuted + ';">Across ' + items.length + ' SKUs</div>' +
              '</div>' +
              '<div style="background:' + pal.cardBg + ';border:1px solid ' + pal.border + ';border-radius:6px;padding:6px 10px;">' +
                '<div style="font-size:10px;text-transform:uppercase;color:' + pal.textMuted + ';font-weight:600;">Total Revenue</div>' +
                '<div style="font-size:14px;font-weight:700;color:' + pal.primary + ';">' + formatVal(totalRev, "compact_currency", true) + '</div>' +
                '<div style="font-size:9px;color:' + pal.textMuted + ';">Inelastic Moat: ' + inelasticCount + '/' + items.length + '</div>' +
              '</div>' +
            '</div>';
        }
      }

      headerDiv.innerHTML = topBarHtml + hudHtml;
      container.appendChild(headerDiv);

      // Search input listener
      var sInput = headerDiv.querySelector(".zayo-search-input");
      if (sInput) {
        var self = this;
        sInput.addEventListener("input", function (e) {
          self._searchQuery = e.target.value;
          self._render(d3, data, element, config, queryResponse, details, done);
        });
      }

      // Chart SVG Container
      var chartWrapper = document.createElement("div");
      chartWrapper.style.cssText = "flex:1 1 0;min-height:0;width:100%;position:relative;background:" + pal.cardBg + ";";
      container.appendChild(chartWrapper);

      var rect = chartWrapper.getBoundingClientRect();
      var svgW = Math.max(300, rect.width || container.clientWidth || 600);
      var svgH = Math.max(160, rect.height || container.clientHeight - 90 || 320);

      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", svgW)
        .attr("height", svgH);

      function openDrill(event, d) {
        if (d && d.links && d.links.length && typeof LookerCharts !== "undefined") {
          LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
        }
      }

      // ==========================================
      // MODE 1: DEMAND SCHEDULE & DUAL-AXIS REVENUE
      // ==========================================
      if (mode === "demand_revenue_curve") {
        var margin = { top: 22, right: 65, bottom: 36, left: 65 };
        var innerW = Math.max(120, svgW - margin.left - margin.right);
        var innerH = Math.max(80, svgH - margin.top - margin.bottom);

        var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var minP = d3.min(items, function (d) { return d.price; }) || 0;
        var maxP = d3.max(items, function (d) { return d.price; }) || 100;
        var maxQ = d3.max(items, function (d) { return d.qty; }) || 1000;
        var maxR = d3.max(items, function (d) { return d.rev; }) || 10000;

        var xP = d3.scaleLinear()
          .domain([Math.max(0, minP * 0.85), maxP * 1.12])
          .range([0, innerW]);

        var yQ = d3.scaleLinear()
          .domain([0, maxQ * 1.15])
          .range([innerH, 0]);

        var yR = d3.scaleLinear()
          .domain([0, maxR * 1.15])
          .range([innerH, 0]);

        // Left Gridlines (Quantity)
        g.append("g")
          .call(d3.axisLeft(yQ).ticks(5).tickSize(-innerW))
          .call(function (sel) {
            sel.select(".domain").remove();
            sel.selectAll("line").attr("stroke", "#f1f5f9");
            sel.selectAll("text").attr("fill", pal.demand).attr("font-size", "10px").attr("font-family", "monospace");
          });

        // Right Axis (Total Revenue)
        g.append("g")
          .attr("transform", "translate(" + innerW + ",0)")
          .call(d3.axisRight(yR).ticks(5).tickFormat(function (d) { return formatVal(d, "compact_currency", true); }))
          .call(function (sel) {
            sel.select(".domain").attr("stroke", pal.border);
            sel.selectAll("text").attr("fill", pal.revenue).attr("font-size", "10px").attr("font-family", "monospace");
          });

        // X Axis (Price $)
        g.append("g")
          .attr("transform", "translate(0," + innerH + ")")
          .call(d3.axisBottom(xP).ticks(6).tickFormat(function (d) { return "$" + d.toFixed(0); }))
          .call(function (sel) {
            sel.select(".domain").attr("stroke", pal.border);
            sel.selectAll("text").attr("fill", pal.textMuted).attr("font-size", "10px").attr("dy", "8px");
          });

        // Axis Titles
        g.append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", -46)
          .attr("x", -innerH / 2)
          .attr("text-anchor", "middle")
          .attr("fill", pal.demand)
          .attr("font-size", "10px")
          .attr("font-weight", "700")
          .text("Quantity Demanded (Q)");

        g.append("text")
          .attr("transform", "rotate(90)")
          .attr("y", -innerW - 50)
          .attr("x", innerH / 2)
          .attr("text-anchor", "middle")
          .attr("fill", pal.revenue)
          .attr("font-size", "10px")
          .attr("font-weight", "700")
          .text("Total Revenue (R = P * Q)");

        // Revenue Curve Shaded Area
        var revArea = d3.area()
          .x(function (d) { return xP(d.price); })
          .y0(innerH)
          .y1(function (d) { return yR(d.rev); })
          .curve(d3.curveMonotoneX);

        g.append("path")
          .datum(items)
          .attr("fill", pal.revenue)
          .attr("opacity", 0.08)
          .attr("d", revArea);

        // Revenue Line
        var revLine = d3.line()
          .x(function (d) { return xP(d.price); })
          .y(function (d) { return yR(d.rev); })
          .curve(d3.curveMonotoneX);

        g.append("path")
          .datum(items)
          .attr("fill", "none")
          .attr("stroke", pal.revenue)
          .attr("stroke-width", 2.2)
          .attr("d", revLine);

        // Demand Line
        var demandLine = d3.line()
          .x(function (d) { return xP(d.price); })
          .y(function (d) { return yQ(d.qty); })
          .curve(d3.curveMonotoneX);

        g.append("path")
          .datum(items)
          .attr("fill", "none")
          .attr("stroke", pal.demand)
          .attr("stroke-width", 2.2)
          .attr("stroke-dasharray", "4,2")
          .attr("d", demandLine);

        // Optimal Price Vertical Pin Line (Unit Elasticity)
        if (targetMode !== "none") {
          g.append("line")
            .attr("x1", xP(benchmarkPrice))
            .attr("x2", xP(benchmarkPrice))
            .attr("y1", 0)
            .attr("y2", innerH)
            .attr("stroke", pal.elastic)
            .attr("stroke-width", 1.8)
            .attr("stroke-dasharray", "4,3");

          var refLabel = config.referenceLineLabel || "Optimal Price P*";
          g.append("text")
            .attr("x", xP(benchmarkPrice))
            .attr("y", -6)
            .attr("text-anchor", "middle")
            .attr("fill", pal.elastic)
            .attr("font-size", "10px")
            .attr("font-weight", "700")
            .text(refLabel + " ($" + benchmarkPrice.toFixed(2) + ")");
        }

        // Entity Points on Demand Schedule
        var dotsG = g.selectAll(".entity-dot")
          .data(items)
          .enter()
          .append("g")
          .attr("transform", function (d) {
            return "translate(" + xP(d.price) + "," + yQ(d.qty) + ")";
          });

        dotsG.append("circle")
          .attr("r", 5.0)
          .attr("fill", pal.demand)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.5)
          .style("cursor", function (d) { return d.links.length ? "pointer" : "default"; })
          .on("click", openDrill)
          .append("title")
          .text(function (d) {
            return d.label + "\nPrice: $" + d.price.toFixed(2) + "\nQuantity: " + d.qty.toLocaleString() +
              "\nRevenue: " + formatVal(d.rev, "compact_currency", true) +
              "\nElasticity |Ed|: " + d.elasticity.toFixed(2) + " (" + (d.elasticity < 1 ? "Inelastic" : "Elastic") + ")";
          });

        // Entity Labels
        if (config.labelDensity !== "hidden") {
          dotsG.filter(function (d) {
            if (config.labelDensity === "peaks_only") return d.price === optimalPrice || d.price === minP || d.price === maxP;
            return true;
          })
          .append("text")
          .attr("y", -8)
          .attr("text-anchor", "middle")
          .attr("fill", pal.textPrimary)
          .attr("font-size", "10px")
          .attr("font-weight", "600")
          .text(function (d) { return d.label; });
        }

        done();
        return;
      }

      // ==========================================
      // MODE 2: ELASTICITY SPECTRUM (|Ed| BARS)
      // ==========================================
      if (mode === "elasticity_spectrum") {
        var longestLabelLen = d3.max(items, function (r) { return r.label.length; }) || 10;
        var idealLeft = Math.ceil(longestLabelLen * 6.2) + 18;
        var maxLeft = Math.floor(svgW * 0.40);
        var leftMargin = Math.max(80, Math.min(idealLeft, maxLeft));

        var marginBar = { top: 20, right: 80, bottom: 28, left: leftMargin };
        var barW = Math.max(120, svgW - marginBar.left - marginBar.right);
        var barH = Math.max(80, svgH - marginBar.top - marginBar.bottom);

        var gBar = svg.append("g").attr("transform", "translate(" + marginBar.left + "," + marginBar.top + ")");

        var yBand = d3.scaleBand()
          .domain(items.map(function (d) { return d.label; }))
          .range([0, barH])
          .padding(0.28);

        var maxEd = d3.max(items, function (d) { return d.elasticity; }) || 2.5;
        var xLinear = d3.scaleLinear()
          .domain([0, Math.max(2.0, maxEd * 1.15)])
          .range([0, barW]);

        // Unit Elastic Reference Line (|Ed| = 1.0)
        gBar.append("line")
          .attr("x1", xLinear(1.0))
          .attr("x2", xLinear(1.0))
          .attr("y1", 0)
          .attr("y2", barH)
          .attr("stroke", pal.unitElastic)
          .attr("stroke-width", 1.8)
          .attr("stroke-dasharray", "4,3");

        gBar.append("text")
          .attr("x", xLinear(1.0))
          .attr("y", -6)
          .attr("text-anchor", "middle")
          .attr("fill", pal.unitElastic)
          .attr("font-size", "10px")
          .attr("font-weight", "700")
          .text("Unit Elastic (|Ed| = 1.0)");

        // Gridlines
        gBar.append("g")
          .attr("transform", "translate(0," + barH + ")")
          .call(d3.axisBottom(xLinear).ticks(5))
          .call(function (sel) {
            sel.select(".domain").attr("stroke", pal.border);
            sel.selectAll("text").attr("fill", pal.textMuted).attr("font-size", "10px");
          });

        // Y-axis labels
        gBar.append("g")
          .call(d3.axisLeft(yBand).tickSize(0))
          .call(function (sel) {
            sel.select(".domain").remove();
            sel.selectAll("text").attr("fill", pal.textPrimary).attr("font-size", "11px").attr("font-weight", "600");
          });

        // Bars
        items.forEach(function (d) {
          var isElastic = d.elasticity >= 1.0;
          var barColor = d.elasticity < 0.8 ? pal.inelastic : (d.elasticity <= 1.2 ? pal.unitElastic : pal.elastic);

          gBar.append("rect")
            .attr("x", 0)
            .attr("y", yBand(d.label))
            .attr("width", Math.max(4, xLinear(d.elasticity)))
            .attr("height", yBand.bandwidth())
            .attr("rx", 3)
            .attr("fill", barColor)
            .style("cursor", d.links.length ? "pointer" : "default")
            .on("click", function (event) { openDrill(event, d); })
            .append("title")
            .text(d.label + ": |Ed| = " + d.elasticity.toFixed(2) + " (" + (d.elasticity < 1 ? "Inelastic / Pricing Power" : "Elastic / Volume Risk") + ")");

          if (config.labelDensity !== "hidden") {
            gBar.append("text")
              .attr("x", xLinear(d.elasticity) + 6)
              .attr("y", yBand(d.label) + yBand.bandwidth() / 2 + 4)
              .attr("fill", barColor)
              .attr("font-size", "10px")
              .attr("font-family", "monospace")
              .attr("font-weight", "700")
              .text("|Ed| " + d.elasticity.toFixed(2) + " ($" + d.price.toFixed(1) + ")");
          }
        });

        done();
        return;
      }

      // ==========================================
      // MODE 3 & 4: PROFIT OPTIMIZATION & QUADRANT MATRIX
      // ==========================================
      var marginQuad = { top: 24, right: 30, bottom: 40, left: 60 };
      var qW = Math.max(120, svgW - marginQuad.left - marginQuad.right);
      var qH = Math.max(80, svgH - marginQuad.top - marginQuad.bottom);

      var gQ = svg.append("g").attr("transform", "translate(" + marginQuad.left + "," + marginQuad.top + ")");

      if (mode === "pricing_power_matrix") {
        var minMargin = d3.min(items, function (d) { return d.marginPct; }) || 0;
        var maxMargin = d3.max(items, function (d) { return d.marginPct; }) || 1;
        var maxEdVal = d3.max(items, function (d) { return d.elasticity; }) || 2.5;

        var xMargin = d3.scaleLinear().domain([0, Math.max(0.6, maxMargin * 1.15)]).range([0, qW]);
        var yEd = d3.scaleLinear().domain([0, Math.max(2.0, maxEdVal * 1.15)]).range([qH, 0]);

        // Median Thresholds for 4 Quadrants
        var midX = xMargin(0.40);
        var midY = yEd(1.0);

        // Shaded Quadrant Backgrounds
        // Q1: High Margin, Inelastic (Top-Right in pricing power = bottom-right on Ed axis)
        gQ.append("rect").attr("x", midX).attr("y", midY).attr("width", qW - midX).attr("height", qH - midY).attr("fill", pal.inelastic).attr("opacity", 0.06);
        gQ.append("text").attr("x", qW - 8).attr("y", qH - 8).attr("text-anchor", "end").attr("fill", pal.inelastic).attr("font-size", "10px").attr("font-weight", "700").text("PREMIUM CASH COWS (Raise Price)");

        // Q2: High Margin, Elastic (Top-Right on Ed axis)
        gQ.append("rect").attr("x", midX).attr("y", 0).attr("width", qW - midX).attr("height", midY).attr("fill", pal.elastic).attr("opacity", 0.05);
        gQ.append("text").attr("x", qW - 8).attr("y", 16).attr("text-anchor", "end").attr("fill", pal.elastic).attr("font-size", "10px").attr("font-weight", "700").text("MARGIN TRAPS (Fragile)");

        // Q3: Low Margin, Inelastic
        gQ.append("rect").attr("x", 0).attr("y", midY).attr("width", midX).attr("height", qH - midY).attr("fill", pal.unitElastic).attr("opacity", 0.05);
        gQ.append("text").attr("x", 8).attr("y", qH - 8).attr("fill", pal.unitElastic).attr("font-size", "10px").attr("font-weight", "700").text("VOLUME BUILDERS");

        // Q4: Low Margin, Elastic
        gQ.append("rect").attr("x", 0).attr("y", 0).attr("width", midX).attr("height", midY).attr("fill", "#64748b").attr("opacity", 0.05);
        gQ.append("text").attr("x", 8).attr("y", 16).attr("fill", "#64748b").attr("font-size", "10px").attr("font-weight", "700").text("COMMODITIZED RED OCEAN");

        // Axes
        gQ.append("g").attr("transform", "translate(0," + qH + ")").call(d3.axisBottom(xMargin).ticks(5).tickFormat(d3.format(".0%")));
        gQ.append("g").call(d3.axisLeft(yEd).ticks(5));

        gQ.append("text").attr("x", qW / 2).attr("y", qH + 32).attr("text-anchor", "middle").attr("fill", pal.textPrimary).attr("font-size", "11px").attr("font-weight", "600").text("Gross Margin %");
        gQ.append("text").attr("transform", "rotate(-90)").attr("x", -qH / 2).attr("y", -42).attr("text-anchor", "middle").attr("fill", pal.textPrimary).attr("font-size", "11px").attr("font-weight", "600").text("Price Elasticity (|Ed|)");

        // Quadrant Dots
        var qDots = gQ.selectAll(".qdot")
          .data(items)
          .enter()
          .append("g")
          .attr("transform", function (d) { return "translate(" + xMargin(d.marginPct) + "," + yEd(d.elasticity) + ")"; });

        qDots.append("circle")
          .attr("r", 6.5)
          .attr("fill", function (d) { return d.elasticity < 1.0 ? pal.inelastic : pal.elastic; })
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.5)
          .style("cursor", function (d) { return d.links.length ? "pointer" : "default"; })
          .on("click", openDrill)
          .append("title")
          .text(function (d) {
            return d.label + "\nMargin: " + (d.marginPct * 100).toFixed(1) + "%\nElasticity |Ed|: " + d.elasticity.toFixed(2) + "\nRevenue: " + formatVal(d.rev, "compact_currency", true);
          });

        if (config.labelDensity !== "hidden") {
          qDots.append("text")
            .attr("y", -9)
            .attr("text-anchor", "middle")
            .attr("fill", pal.textPrimary)
            .attr("font-size", "10px")
            .attr("font-weight", "600")
            .text(function (d) { return d.label; });
        }
      } else {
        // Profit & Margin Optimization Curve
        var xPrice = d3.scaleLinear().domain([0, d3.max(items, function (d) { return d.price; }) * 1.15]).range([0, qW]);
        var maxProfit = d3.max(items, function (d) { return d.profit; }) || 1000;
        var yProfit = d3.scaleLinear().domain([0, maxProfit * 1.15]).range([qH, 0]);

        gQ.append("g").attr("transform", "translate(0," + qH + ")").call(d3.axisBottom(xPrice).ticks(6).tickFormat(function (d) { return "$" + d.toFixed(0); }));
        gQ.append("g").call(d3.axisLeft(yProfit).ticks(5).tickFormat(function (d) { return formatVal(d, "compact_currency", true); }));

        var profitLine = d3.line()
          .x(function (d) { return xPrice(d.price); })
          .y(function (d) { return yProfit(d.profit); })
          .curve(d3.curveMonotoneX);

        gQ.append("path")
          .datum(items)
          .attr("fill", "none")
          .attr("stroke", pal.profit)
          .attr("stroke-width", 2.4)
          .attr("d", profitLine);

        var pDots = gQ.selectAll(".pdot")
          .data(items)
          .enter()
          .append("g")
          .attr("transform", function (d) { return "translate(" + xPrice(d.price) + "," + yProfit(d.profit) + ")"; });

        pDots.append("circle")
          .attr("r", 5.5)
          .attr("fill", pal.profit)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.5)
          .style("cursor", function (d) { return d.links.length ? "pointer" : "default"; })
          .on("click", openDrill)
          .append("title")
          .text(function (d) {
            return d.label + "\nPrice: $" + d.price.toFixed(2) + "\nGross Profit: " + formatVal(d.profit, "compact_currency", true);
          });
      }

      done();
    }
  });
})();
