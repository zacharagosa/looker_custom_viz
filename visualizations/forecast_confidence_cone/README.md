# Forecast & Confidence Cone (Fan Chart)

A custom Looker visualization built with D3.js v7 for predictive forecasting, forward projections, and uncertainty modeling.

Inspired by probabilistic machine learning models, ARIMA confidence intervals, and BigQuery `AI.FORECAST` (TimesFM 2.0), this visualization renders continuous actual trajectories bridging into forward forecast horizons with shaded prediction uncertainty cones (fan charts).

## Features
- **Continuous Historical & Forward Trajectory**: Plots trailing historical actual observations as a solid line and forward AI projections as an aligned dashed path.
- **Uncertainty Confidence Cone (Fan Chart)**: Shaded prediction interval bands (e.g. 90% or 95% confidence intervals) expanding outward over the forecast horizon.
- **What-If Simulation Slider (`Display`)**: Live slider in Looker's Edit Viz modal allowing executives to simulate % revenue lift or economic stress testing (-50% to +50%) with real-time recalculation of pipeline projections.
- **Executive KPI Scorecard HUD (`Display`)**: Top-level metric cards displaying Trailing Actual Mean, Projected Forecast Mean, Trajectory Lift %, and 30-Day Forward Pipeline Volume.
- **Configurable Benchmark Reference Line (`Display`)**: Toggle between Trailing Mean, Median, P90 Ceiling, or Fixed Quota Target.
- **Interactive Search & Filter Bar (`Display`)**: Filter dates dynamically to inspect specific windows.
- **Brand Palettes & Formatting (`Style`)**: Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Sunset Media, Wellverse Healthcare, or custom hex color overrides.
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
