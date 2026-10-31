# Zayo NOC Executive KPI Scorecard

Enterprise-grade telecom network operations scorecard replacing standard single-value tiles with an interactive, branded executive metric display featuring Zayo Corporate Orange (`#f5831f`, PMS 715 C), Google Enterprise, Modern Slate, Cyberpunk Dark, and Emerald FinOps color collections.

---

## Key Features & Upgraded Capabilities

- **Strict 2-Tab Option Schema (`Display` & `Style`)**: Clean separation between operational configuration and visual presentation, preventing tab overcrowding in Looker's Edit Visualization dialog.
- **Dynamic Field-Role Dropdowns (`Display`)**:
  - `measurePrimaryOverride`: Select primary KPI measure (or auto-resolve).
  - `categoryDimOverride`: Select route corridor / span / segment dimension.
  - `timeDimOverride`: Select time series trend dimension for the micro-sparkline.
  - `targetMeasOverride`: Select SLA benchmark target measure.
- **Configurable Target Benchmarks & Reference Lines (`Display`)**:
  - Target modes: `none`, `fixed_value`, `measure_column`, `dataset_mean`, `dataset_median`, `percentile_p75`, `percentile_p90`.
  - Configurable SLA alert delta threshold (`%`) with status badge styling (Nominal vs SLA Alert).
- **Sorting, Top-N Bucketing & Null Suppression (`Display`)**:
  - Sort modes: Natural (Query order), Metric Descending, Metric Ascending, Alphabetical.
  - Top-N limit (`all`, `5`, `10`, `20`, `30`) with optional `'Other'` rollup consolidation.
  - Zero/null observation suppression toggle.
- **Multi-Density HUD Scorecard (`Display`)**:
  - `scorecard`: Full executive scorecard with title, delta badge, primary value, micro-sparkline, and telemetry subtext.
  - `compact_strip`: Streamlined headline value and status pill for dense multi-tile dashboards.
  - `hidden`: Clean headline and sparkline with minimal footer.
  - Interactive filter / search input toggle.
- **Enterprise Brand Palettes & Typography (`Style`)**:
  - 7 curated brand palettes: Zayo Telecom (PMS 715 C), Google Enterprise, Modern Studio Slate, Cyberpunk Dark, Emerald FinOps, Sunset Media, Wellverse Healthcare, plus Custom Hex Overrides (`display: 'color'`).
  - Metric Polarity toggle (`higher_is_better` vs `lower_is_better`).
  - Typography Scale (`compact`, `standard`, `large_presentation`).
  - Rich value formatting: Auto, Compact Number (`1.2M`), Compact Currency (`$1.2M`), Percentage (`45.2%`), Decimal (`2dp`), Fiber Route Miles (`1,250 mi`), Optical Capacity (`464.0 Tbps`), Raw.
- **Responsive Architecture**:
  - Debounced `ResizeObserver` with `<4px` delta guard to prevent render loops.
  - Full Looker drill-down menu support (`LookerCharts.Utils.openDrillMenu`).
  - Strict container hygiene (no hardcoded `100%` overrides on Looker element).

---

## Domain-Authentic Query Binding

Bound directly to authentic optical telemetry and route data in LookML model `zayo_network_analytics`:

```json
{
  "model": "zayo_network_analytics",
  "view": "network_operations_and_anomalies",
  "fields": [
    "fiber_routes.corridor",
    "fiber_routes.total_route_miles",
    "fiber_routes.total_provisioned_capacity_tbps"
  ],
  "limit": "10"
}
```
