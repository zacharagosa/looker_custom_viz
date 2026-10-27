# Cloud FinOps Commit/CUD Utilization & Waste Horizon Chart Looker Custom Visualization

![Cloud FinOps Commit/CUD Utilization & Waste Horizon Chart](screenshot.png)

An executive multi-band **Cloud FinOps Commit/CUD Utilization & Waste Horizon Chart** built with **D3.js v7** for Looker. Designed for Cloud FinOps leaders, engineering directors, and platform architects to monitor 20+ concurrent Google Cloud Committed Use Discounts (1-Year & 3-Year Resource-Based and Flexible Spend-Based CUDs, BigQuery Reservations, and Cloud SQL commitments) in a dense, compact visual space.

---

## Key Features

- **Horizon Graph Visual Paradigm**:
  - Compresses wide dynamic ranges by folding metric values into layered 2-band or 3-band color densities (`horizon_2band`, `horizon_3band`).
  - Highlights negative capacity deviations and unutilized commitment breakage fees ($) in high-contrast alert tones.
  - Supports `split_mirror` (utilization vs breakage waste) and `small_multiples` modes.
- **Dynamic Baseline Tracking**:
  - Baseline options: 100% Commitment Capacity Target (`target_100`), Dataset Mean Run-Rate (`dataset_mean`), Dataset Median, Fixed Target Value, Percentile P90, or Zero Centered.
- **Executive FinOps Scorecard HUD (`Display`)**:
  - `scorecard`: Top band detailing Total Active Contracts, Portfolio Weighted Utilization %, Total Unutilized Breakage Waste ($), and Top Breakage Contract.
  - `compact_strip`: Streamlined single-row metric bar for high-density dashboard layouts.
  - `hidden`: Canvas-only view.
- **Dynamic Field-Role Dropdowns (`Display`)**:
  - Dropdowns populated dynamically from query dimensions and measures via Looker's `registerOptions` trigger. Users select Commitment Dimension, Date Timeline Dimension, Primary Utilization Measure, and Waste Measure by name without typing 1-based column indexes.
- **Commitment Sorting & Anomaly Detection (`Display`)**:
  - Sort by Breakage Waste Descending (`waste_desc`), Lowest Utilization %, Highest Utilization %, or Alphabetical.
  - Configurable Under-Utilization Alert Threshold (default `<85%`).
- **Looker Native Drill-Down Integration**:
  - Clicking any date on a commitment lane opens Looker's context drill menu for granular billing and SKU inspection.
- **Brand Palettes, Custom Hexes & Polarity (`Style`)**:
  - Presets: Emerald FinOps, Google Enterprise, Modern Slate, Cyberpunk Dark, Sunset Media, Wellverse Healthcare, Custom Hex Override.
  - Custom Optimal Tier, Healthy Tier, and Deficit / Waste Hex overrides.
  - Metric Polarity toggle (`Higher is Better` vs `Lower is Better`).
  - Typography Font Scale (`compact`, `standard`, `large`) and Value Format (`percentage`, `compact_currency`, `compact_number`, `decimal_2`, `auto`, `raw`).
- **Strict 2-Tab Options Architecture**:
  - Organized strictly into `Display` and `Style` sections to ensure Looker's Edit Viz modal stays clean and uncrowded.

---

## Data Shape & Query Requirements

1. **Dimensions**:
   - `Dimension 1 (Commitment)`: Categorical dimension identifying the contract (e.g. `gcp_focus_export.commitment_discount_name`, `commitment_id`).
   - `Dimension 2 (Date)`: Chronological date dimension (e.g. `gcp_focus_export.charge_period_start_week`).
2. **Measures**:
   - `Measure 1 (Utilization)`: Utilization rate % or covered capacity units (e.g. `average_cud_utilization_pct`).
   - `Measure 2 (Optional Waste)`: Dollar value of unutilized capacity breakage (e.g. `total_unutilized_commitment_waste_usd`).

---

## Configuration Options

### Display Tab
- **Horizon Visualization Mode**: `horizon_2band`, `horizon_3band`, `split_mirror`, `small_multiples`.
- **Commitment / Series Dimension**: Dynamic field selector.
- **Date / Timeline Dimension**: Dynamic field selector.
- **Utilization Measure**: Dynamic field selector.
- **Waste / Breakage Measure**: Optional secondary measure.
- **Commitment Capacity Baseline Mode**: `target_100`, `dataset_mean`, `dataset_median`, `fixed_value`, `percentile_p90`, `zero_centered`.
- **Under-Utilization Alert Threshold (%)**: Anomaly alert gate (default 85%).
- **Commitment Sort Order**: `waste_desc`, `util_asc`, `util_desc`, `alphabetical`, `natural`.
- **Display Commitment Series Limit**: Top 6, 10, 15, 20, or All.
- **Executive FinOps HUD Mode**: `scorecard`, `compact_strip`, `hidden`.
- **Commitment Lane Height (px)**: Adjustable lane height.
- **Interactive Search Filter**: Dynamic text search bar.

### Style Tab
- **Brand Palette Preset**: Emerald FinOps, Google Enterprise, Modern Slate, Cyberpunk Dark, Sunset Media, Wellverse Healthcare, Custom Hex Override.
- **Custom Optimal / Healthy / Waste Hexes**: Color picker overrides.
- **Metric Polarity**: Higher is Better vs Lower is Better.
- **Typography Font Scale**: Compact, Standard, Large.
- **Value Formatting Style**: Percentage, Compact Currency, Compact Number, Decimal, Auto, Raw.
- **Show Timeline Vertical Date Dividers**: Vertical date gridlines.
- **Show Alternating Lane Background Shading**: Zebra stripe lane contrast.

---

## Demo Query Configuration

Run with the preconfigured Explore query:
- **Model**: `multicloud_focus_finops`
- **Explore**: `gcp_focus_export`
- **Fields**: `gcp_focus_export.commitment_discount_name`, `gcp_focus_export.charge_period_start_week`, `gcp_focus_export.commitment_utilization_rate`, `gcp_focus_export.unused_commitment_breakage_cost`
- **Sorts**: `gcp_focus_export.commitment_discount_name`, `gcp_focus_export.charge_period_start_week`
- **Limit**: `500`
