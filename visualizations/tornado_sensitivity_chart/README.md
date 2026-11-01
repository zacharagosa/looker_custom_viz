# Tornado Sensitivity Analysis & Risk Variance Chart

An enterprise multi-modal Looker custom visualization built with D3.js v7 for corporate strategy, financial sensitivity modeling, risk triage, and what-if variance decomposition.

## Overview & Key Paradigms
In business planning, corporate finance, and risk management, a Tornado Diagram illustrates the sensitivity of key business metrics (e.g. EBITDA, Net ARR, Customer LTV, Claim Cost) to variations in multiple underlying input variables or risk drivers. 

This visualization features 4 multi-modal layout modes:
1. **🌪️ Tornado Sensitivity Bars**: Classic bidirectional horizontal bars centered on a vertical baseline reference line, sorted descending by total swing magnitude to produce the iconic tornado funnel. Downside variance extends left; upside variance extends right.
2. **🕸️ Multi-Parameter Spider Sensitivity Curves**: Multi-curve sensitivity response graph plotting percentage change in outcome metric across parameter perturbation percentages (-30% to +30%). Steeper slopes signify high-elasticity, volatile drivers.
3. **📊 Cumulative Variance Waterfall**: Sequential waterfall starting at the Base Case expected value, stepping through each driver's variance to illustrate the full uncertainty envelope.
4. **📋 Executive Driver Risk Matrix Scorecard**: Dense scorecard detailing sensitivity ranking, elasticity coefficients, downside risk, base value, upside opportunity, and total swing spread.

## Multi-Modal Configuration & Options
- **Strict 2-Tab Schema**: All options are organized exclusively into `Display` and `Style` sections to ensure Looker's Edit Viz modal headers never crowd or overlap.
- **Dynamic Field-Role Mapping (`Display`)**: Live dropdowns for mapping Driver / Risk Factor Dimension, Downside Risk / Low Case Measure, Upside Opportunity / High Case Measure, and Base Case / Baseline Measure.
- **Configurable Baseline Reference (`Display`)**: Flexible center line modes including `Baseline Measure Column`, `Fixed Baseline Value`, `Dataset Mean`, `Dataset Median`, and `Zero Centered`.
- **Driver Sorting & Top-N Density (`Display`)**: Sorting by `Total Swing Magnitude (Tornado Funnel)`, `Highest Downside Risk`, `Highest Upside Opportunity`, or `Alphabetical`, with configurable Top-N limits (5, 8, 10, 15, or All).
- **Executive KPI Scorecard HUD (`Display`)**: 4-card metric strip displaying Base Case Baseline, Total Downside Exposure, Total Upside Potential, and Key Volatility Lever.
- **Enterprise Brand Palettes (`Style`)**: 7 built-in themes (Modern Studio Slate, Google Enterprise, Cyberpunk Dark, Emerald FinOps, Sunset Media, Wellverse Healthcare, and Custom Hex Overrides).
- **Metric Polarity (`Style`)**: Toggle for `Higher is Better` (ARR, Revenue, Profit) vs `Lower is Better` (Cost, Churn, Risk Exposure, Latency).
- **Interactive Search Filter**: Integrated search bar for rapid parameter filtering.
- **Debounced ResizeObserver**: Dynamically recalculates layout geometry and margins with a `<4px` height delta guard to eliminate resize loops.
- **Native Looker Drill Menus**: Full drill-down support on bar click and driver name click (`LookerCharts.Utils.openDrillMenu`).

## Authentic Domain Dataset Binding
- **Model**: `saas_qbr`
- **Explore**: `qbr_customer_risk`
- **Dimensions**: `qbr_account_risk.account_name`
- **Measures**: `qbr_account_risk.total_arr_at_risk` (downside risk), `qbr_account_risk.renewal_arr_180d` (upside opportunity), `qbr_account_risk.total_active_arr` (baseline)
- **Filters**: `qbr_account_risk.risk_band`: "High Risk,Watch"
- **Sorts**: `qbr_account_risk.total_arr_at_risk desc`
