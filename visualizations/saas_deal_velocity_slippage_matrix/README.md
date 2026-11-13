# SaaS Deal Velocity & Stage Slippage Matrix

A Google Cloud Looker custom visualization built with D3.js v7 for enterprise B2B SaaS revenue leaders, Chief Revenue Officers (CROs), VPs of Sales, and RevOps analytics teams.

Solves high-friction enterprise Buganizer Cloud Blockers (`b/419284729`, `b/398701962`, `b/520494850`) where native Looker charts cannot visualize multi-stage deal velocity, stage dwell time benchmarks, and close-date slippage patterns across sales cycles.

## 4 Multi-Modal Layout Modes
1. **`velocity_stage_matrix` (Default)**: Stage progression board across sales cycle stages (`Active Lead`, `Qualified`, `Developed`, `In Trial`, `Closing/Commit`), showing deal volume, velocity progress bar (Days in Stage vs Stage Velocity SLA threshold), close-date slip indicators, and risk band distribution.
2. **`stage_aging_quadrant`**: Days in Stage (X-axis) vs Pipeline ARR (Y-axis) interactive scatter plot with dynamic risk quadrants, identifying stalled enterprise commitments ("Danger Zone") and aging deals.
3. **`slippage_waterfall`**: Revenue progression waterfall decomposing pipeline ARR into on-track, slipped, chronic slipped (4+ close-date pushes), and zombie deal categories.
4. **`forecast_category_cross_matrix`**: Cross-tabulation heatmap matrix comparing Sales Stage vs Forecast Category (`Pipeline`, `Upside`, `Forecast/Commit`, `Omitted`) to expose stale commits.

## Features & Options (Strict 2-Tab Schema)
- **Dynamic Field-Role Selectors (`Display`)**: Live dropdowns for Stage Dimension, Forecast Category Dimension, Pipeline ARR Measure, Days in Stage Measure, Close-Date Slips Measure, Risk Score Measure, and Target Measure.
- **Configurable Velocity SLA & Target Modes (`Display`)**: Benchmark target modes (`measure_column`, `fixed_value`, `dataset_mean`, `dataset_median`, `percentile_p75`, `percentile_p90`, `none`), target SLA value (e.g. 60 days), reference line label, and anomaly threshold (% deviation).
- **Sorting, Top-N & Null Suppression (`Display`)**: Sort by metric descending/ascending, alphabetical, or natural sales stage order; Top-N stage limit with automatic `'Other'` rollup; zero/null suppression.
- **Executive Scorecard HUD (`Display`)**: Top-level metric cards for Active Pipeline ARR, Average Stage Velocity (Days), Average Close-Date Slips, High-Risk ARR %, and Stalled Deals Count.
- **Custom Brand Themes & Typography (`Style`)**: Modern Slate, Enterprise Indigo, Google Enterprise, Cyberpunk Dark, Emerald FinOps, Sunset Ember, Wellverse Healthcare, or custom hex overrides with color picker (`display: 'color'`).
- **Metric Polarity & Value Formatting (`Style`)**: Support for `lower_is_better` (for velocity days and slip counts) vs `higher_is_better`, and flexible value formatting (`compact_currency`, `compact_number`, `percentage`, `decimal_2`, `raw`).
- **Looker Drill Menus**: Full integration with `LookerCharts.Utils.openDrillMenu` across all stages, deals, and scatter points.
- **Responsive Architecture**: Debounced `ResizeObserver` with `<4px` height-delta guard and zero `width: 100% / height: 100%` element styling.

## Domain-Authentic Demo Dataset
- **Model**: `saas_qbr`
- **Explore**: `qbr_pipeline_inspection`
- **Fields**:
  - `qbr_deal_quality.stage_name`
  - `qbr_deal_quality.forecast_category`
  - `qbr_deal_quality.open_deal_count`
  - `qbr_deal_quality.open_arr`
  - `qbr_deal_quality.average_days_in_stage`
  - `qbr_deal_quality.average_slip_count`
  - `qbr_deal_quality.average_risk_score`
  - `qbr_deal_quality.high_risk_arr`
- **Filters**: `qbr_deal_quality.is_closed = 'No'`
