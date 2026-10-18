# Dynamic Pivot Matrix & Heatmap Grid

An enterprise multi-modal matrix table and pivot analytics visualization for Looker, built with **D3.js v7** and vanilla HTML5/SVG.

Designed to directly resolve high-priority customer escalations and Google-internal Cloud Blockers:
- **b/500385324 & b/496749649**: *Dynamic Pivot Table Sorting for Ad-Hoc Analysis* (Lowe's Companies, Inc. and enterprise retail customers blocked by Looker's inability to sort pivot headers dynamically based on measure values).
- **b/314734619**: *Support Collapse / Expand in a Pivot Table*.
- **b/492843989**: *Enhanced Formatting for Totals and Subtotals*.
- **b/552033600**: *Retain Visualization and Series Settings for Dynamic Pivoted Data*.
- **b/509389150**: *Increased flexibility to use repeated dimension values with pivots*.

---

## 🌟 Key Features & Options Upgrades

1. **4 Multi-Modal Rendering Modes (`renderMode`)**:
   - **Micro-Bars & Volume (`matrix_bars`)**: In-cell proportional mini-progress bars showing relative volume magnitude alongside numeric values, with automatic row peak cell star indicators and anomaly breach warning badges.
   - **Color Heatmap Grid (`heatmap_grid`)**: Quantile/linear color gradient intensity across all pivot periods to immediately spot hot and cold performance pockets.
   - **Period Growth Deltas (`growth_delta`)**: Computes period-over-period percentage growth (`+14.2%`, `-8.5%`) rendered as emerald/crimson executive badges.
   - **Executive Compact KPI (`compact_kpi`)**: High-density executive scorecard with bold typography and minimal footprint.

2. **Dynamic Field-Role Mapping (`Display`)**:
   - **Primary Row Dimension (`rowDimOverride`)**: Select which query dimension forms table rows directly from dynamic select dropdown populated via Looker's `registerOptions`.
   - **Pivot Column Dimension (`pivotDimOverride`)**: Remap temporal/categorical column pivots on the fly.
   - **Primary Metric Measure (`metricMeasureOverride`)**: Switch which metric populates matrix values.
   - **Target / Benchmark Measure (`targetMeasureOverride`)**: Map a comparison/target measure column for row-level attainment tracking.

3. **Configurable Reference Lines, Targets & Thresholds (`Display`)**:
   - **Benchmark Mode (`targetMode`)**: Supports `Measure Column`, `Fixed Value`, `Dataset Mean`, `Dataset Median`, `Percentile P75`, and `Percentile P90`.
   - **Custom Fixed Target Value (`targetValue`)**: Numeric target for static SLA or revenue goals.
   - **Anomaly Threshold % (`anomalyThreshold`)**: Flags out-of-spec cells that deviate by more than the threshold.
   - **Flag Out-of-Spec Cells (`highlightTargetBreaches`)**: Visual warning badges and colored indicators for underperforming cells.

4. **Sorting, Top-N Bucketing & Null Suppression (`Display`)**:
   - **Default Sort Order (`sortOrder`)**: Choose between `Total Volume Descending`, `Total Volume Ascending`, `Alphabetical`, or `Natural Query Order`.
   - **Interactive Column Sorting**: Click any pivot header, dimension header, or total column to toggle client-side sort dynamically.
   - **Top-N Row Limit (`topNLimit`)**: Isolate Top 5, 10, 15, 25, or 50 entities.
   - **'Other' Rollup (`showOtherRollup`)**: Automatically bundles excluded lower-ranked entities into an aggregate 'Other (N entities)' row.
   - **Suppress Zero/Empty Rows (`suppressNulls`)**: Cleanly filters out inactive rows.

5. **Executive KPI HUD & Label Density (`Display`)**:
   - **HUD Mode (`hudMode`)**: Choose between `Full Scorecard Strip` (Grand Volume, Entities, Periods, Benchmark Target & Attainment %), `Compact Strip`, or `Hidden`.
   - **Data Value Labels Density (`dataLabelDensity`)**: Choose `All Values`, `Extreme Peaks Only`, or `Hidden (Hover Only)`.
   - **Custom Chart Title & Subtitle (`chartTitleOverride`, `chartSubtitleOverride`)**: Embed clean executive headers directly on the card.
   - **Instant Search Filter (`showSearch`)**: Real-time client-side search-as-you-type filter across entity dimensions.

6. **Custom Brand Palettes, Polarity & Typography (`Style`)**:
   - **Theme Palettes (`colorPalette`)**: `Google Modern Blue`, `Executive Slate`, `Cyberpunk Dark`, `Emerald FinOps`, `Sunset Media`, `Wellverse Healthcare`, or `Custom Hex Overrides`.
   - **Custom Color Overrides**: `customPrimaryColor`, `customPositiveColor`, and `customNegativeColor`.
   - **Metric Polarity (`metricPolarity`)**: Toggle between `Higher is Better` (Revenue, Volume) and `Lower is Better` (Latency, Churn, Cost, Error Rate) to invert color signaling.
   - **Font Scale (`fontSize`)**: `Compact (11px)`, `Standard (12.5px)`, `Spacious (14px)`.
   - **Value Format (`valueFormat`)**: `Auto Detect`, `Compact Currency ($1.2M)`, `Compact Number (1.2M)`, `Percentage (45.2%)`, `Decimal (0.00)`, `Integer (1,234)`, or `Raw`.

---

## 📊 Data Shape & Requirements

| Field Type | Requirement | Description |
| :--- | :--- | :--- |
| **Dimension 1** | **Required** (1 field) | Primary entity row dimension (e.g. `products.category`, `users.state`, `sales_reps.name`) |
| **Dimension 2** | *Optional* (1 field) | Secondary entity grouping or sub-category (e.g. `products.department`) |
| **Pivot** | **Recommended** (1 field) | Temporal or categorical pivot (e.g. `order_items.created_year`, `order_items.created_month`) |
| **Measure** | **Required** (1-4 fields) | Numeric measure (e.g. `order_items.total_sale_price`, `order_items.order_count`) |

---

## 🚀 Deployment & Registration
Deploys instance-wide to Looker via `POST /api/4.0/vis_manifest` and syncs with the Showcase Dashboards.
