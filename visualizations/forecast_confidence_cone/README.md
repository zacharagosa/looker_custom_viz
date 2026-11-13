# Forecast & Confidence Cone (Fan Chart)

A custom Looker visualization built with D3.js v7 for predictive forecasting, forward projections, and uncertainty modeling.

Inspired by probabilistic machine learning models, ARIMA confidence intervals, and BigQuery `AI.FORECAST` (TimesFM 2.0), this visualization renders continuous actual trajectories bridging into forward forecast horizons with shaded prediction uncertainty cones (fan charts).

## Features
- **Continuous Historical & Forward Trajectory**: Plots trailing historical actual observations as a solid line and forward AI projections as an aligned dashed path.
- **Uncertainty Confidence Cone (Fan Chart)**: Shaded prediction interval bands (e.g. 90% or 95% confidence intervals) expanding outward over the forecast horizon.
- **Dynamic Field-Role Mapping (`Display`)**: Re-map Date Dimension, Series / Partition Dimension, Primary Forecast Measure, Lower/Upper Bounds, and Target Measure Column dynamically via select dropdowns without editing LookML.
- **Configurable Benchmark Reference Lines & Targets (`Display`)**: Support for `Target Measure Column`, `Fixed Static Target Value`, `Dataset Mean`, `Dataset Median`, `Percentile P75 Target`, and `Percentile P90 Ceiling`.
- **Anomaly Detection & Threshold Alerting (`Display`)**: Configurable deviation threshold (`alertThresholdPct`, e.g. 15%) that flags outliers with alert badges in the HUD and custom alert color styling.
- **Sorting, Top-N & Null Handling (`Display`)**: Interactive sort orders (`Chronological/Natural`, `Metric Descending`, `Metric Ascending`, `Alphabetical`), Top-N horizon limit with automatic `'(Other)'` tail rollup, and zero/null suppression.
- **What-If Simulation Slider (`Display`)**: Live slider in Looker's Edit Viz modal allowing executives to simulate % revenue lift or economic stress testing (-50% to +50%) with real-time recalculation of pipeline projections.
- **Executive Scorecard HUD & Title Density (`Display`)**: Full Scorecard HUD, Compact Metric Strip, or Hidden mode, plus custom chart title and subtitle overrides.
- **Data Label Density Controls (`Display`)**: Toggle labels for `All Data Points`, `Min / Max Peaks Only`, or `Hidden / Hover Only`.
- **Interactive Search & Filter Bar (`Display`)**: Filter dates dynamically to inspect specific windows.
- **Brand Palettes, Polarity & Typography (`Style`)**: Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Sunset Media, Wellverse Healthcare, or custom hex color overrides with color picker (`display: 'color'`), Metric Polarity toggle (`Higher is Better` vs `Lower is Better`), Typography Font Scale (`Compact`, `Standard`, `Large`), and Value Formatting.
- **Looker Drill Menu Integration**: Full integration with `LookerCharts.Utils.openDrillMenu` on data points.
- **Responsive Geometry**: Debounced `ResizeObserver` with `<4px` height-delta guard for zero layout shift in dense dashboards.

## Recommended Data Shapes
- **Dimension 1**: Time/Date dimension (e.g. `mart_daily_kpis_forecast.forecast_date`).
- **Dimension 2 (Optional)**: Series identifier (e.g. `mart_daily_kpis_forecast.series_type` distinguishing `'Actual'` from `'AI.FORECAST'`).
- **Measure 1**: Primary metric measure (e.g. `mart_daily_kpis_forecast.revenue_projected_usd`).
- **Measure 2 (Optional)**: Prediction interval lower bound (e.g. `mart_daily_kpis_forecast.revenue_lower_bound_usd`).
- **Measure 3 (Optional)**: Prediction interval upper bound (e.g. `mart_daily_kpis_forecast.revenue_upper_bound_usd`).

## Domain-Authentic Demo Dataset
- **Explore**: `void_weaver_analytics :: daily_kpis_ai_forecast`
- **Fields**:
  - `mart_daily_kpis_forecast.forecast_date`
  - `mart_daily_kpis_forecast.series_type`
  - `mart_daily_kpis_forecast.revenue_projected_usd`
  - `mart_daily_kpis_forecast.revenue_lower_bound_usd`
  - `mart_daily_kpis_forecast.revenue_upper_bound_usd`
- **Filters**: `mart_daily_kpis_forecast.game_id = 'VWE'`

## Setup in Looker (`manifest.lkml`)
```lookml
visualization: {
  id: "forecast_confidence_cone"
  label: "Forecast & Confidence Cone"
  file: "visualizations/forecast_confidence_cone.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
