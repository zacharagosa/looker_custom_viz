# Inventory Stockout Velocity & Reorder Sawtooth Chart

![Inventory Stockout Sawtooth](screenshot.png)

An enterprise **Inventory Stockout Velocity & Reorder Sawtooth Chart** custom visualization for Google Cloud Looker, engineered with **D3.js v7**.

Resolves Buganizer Cloud Blockers (`b/449635128`, `b/503077532`) and retail/hospital supply chain inventory gaps. Traditional BI line and bar charts fail to capture the cyclical physics of supply chain inventory replenishment: items deplete down towards safety thresholds until an order arrives, creating a characteristic "sawtooth" curve. This visualization models safety stock floors, Reorder Point (ROP) trigger lines, stockout hazard zones, and receipt jump nodes to empower inventory planners and operations teams to prevent stockouts and reduce excess holding capital.

---

## 📸 Key Features

- **4 Multi-Modal Layout Modes**:
  - `Inventory Sawtooth Depletion Cycles` (Default): Cyclical inventory depletion curves across snapshot dates with upward replenishment jumps, shaded Safety Stock floor zone, and Reorder Point (ROP) dashed benchmark threshold line.
  - `Consumption Velocity & Days-of-Supply Runway`: Daily burn-rate / consumption velocity bars ($v = \Delta \text{units} / \Delta t$) alongside forward supply runway health indicators.
  - `Replenishment Batch & Lead-Time Variance`: Evaluates order receipt batch volumes against Par targets, highlighting receipt shortfalls and supply surpluses.
  - `Par Capacity & Inventory Target Divergence`: Divergence waterfall comparing current on-hand levels against maximum capacity par benchmarks.
- **Dynamic Field-Role Mapping**: Map Date, Facility/Location/SKU, Inventory On-Hand Units, Coverage Ratio / Days of Supply, and Inventory Cost Valuation via 1-based indices or field names directly from Edit Viz.
- **Configurable Safety Stock & Reorder Benchmarks**: Define Safety Stock floors and Reorder Points (ROP) dynamically using `Peak Observed Inventory`, `Dataset Mean`, `Dataset Median`, `Percentile P90`, or `Fixed Static Target Value`.
- **Replenishment Receipt & Stockout Hazard Nodes**: Highlights order receipt events with green jump markers and flags stockout hazard breaches (inventory dipping below safety stock or hitting zero) with red alert rings.
- **Executive Scorecard HUD**: Integrated top executive scorecard featuring 5 KPI cards (`Current On-Hand Units`, `Inventory Valuation`, `Stock Coverage Days`, `Reorder Point (ROP)`, and `Stockout Breaches`) or a `Compact Metric Strip`.
- **Interactive Quick Search Filter**: Real-time client-side search filtering across dates, distribution centers, or item names.
- **Native Looker Drill-Downs**: Click any data point or replenishment node to launch Looker's contextual drill overlay.
- **Enterprise Brand Palettes & Typography Scaling**:
  - `Google Enterprise` (Default Google Blue, Emerald Green, Amber Warning, Crimson Red)
  - `Executive Slate` (Neutral slate, orange accents, emerald/crimson badges)
  - `Modern Slate` (Indigo/cobalt accents with slate neutral grid)
  - `Cyberpunk Dark` (High-contrast dark mode with neon sky blue)
  - `Emerald FinOps` (Mint, forest green, and teal)
  - `Sunset Media` (Warm amber, tangerine, and crimson)
  - `Wellverse Healthcare` (Deep navy and clinical emerald)
  - `Custom Hex Override` (User-defined primary stroke, replenishment green, and stockout red hex codes)

---

## 📊 Data Shape Requirements

Supports standard inventory snapshot and stock telemetry queries:

| Field Type | Required Count | Purpose | Example (`thelook::inventory_snapshot`) |
| :--- | :--- | :--- | :--- |
| **Dimension** | `1` *(Required)* | Date / Timeline | `inventory_snapshot.snapshot_date` |
| **Dimension** | `0–1` *(Optional)* | Facility / Warehouse / SKU | `distribution_centers.name`, `products.category` |
| **Measure** | `1` *(Required)* | Primary Inventory On-Hand Units | `inventory_snapshot.total_in_stock` |
| **Measure** | `0–1` *(Optional)* | Stock Coverage / Days of Supply | `inventory_snapshot.stock_coverage_ratio` |
| **Measure** | `0–1` *(Optional)* | Inventory Valuation / Cost | `inventory_snapshot.eoh_cost_total` |

---

## ⚙️ Configuration Options (Display & Style)

### Display Options
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `layoutMode` | Select | `Inventory Sawtooth Depletion Cycles` | Visual layout mode (`sawtooth_cycles`, `stockout_velocity`, `replenishment_variance`, `inventory_par_divergence`) |
| `dateFieldOverride` | String | `1` | 1-based index or field name for date dimension |
| `entityFieldOverride` | String | `2` | 1-based index or field name for facility/SKU dimension |
| `inventoryMeasureOverride` | String | `1` | 1-based index or field name for primary inventory units measure |
| `coverageMeasureOverride` | String | `2` | 1-based index or field name for coverage ratio / days of supply measure |
| `costMeasureOverride` | String | `3` | 1-based index or field name for inventory valuation measure |
| `safetyStockPct` | Number | `25` | Safety Stock floor percentage relative to Par target |
| `reorderPointPct` | Number | `50` | Reorder Point (ROP) threshold percentage relative to Par target |
| `targetCalculationMode` | Select | `Dataset Mean On-Hand` | Target calculation mode (`peak_observed`, `dataset_mean`, `dataset_median`, `percentile_p90`, `fixed`) |
| `fixedTargetValue` | Number | `0` | Static Par target value when calculation mode is set to fixed |
| `referenceLineLabel` | String | `Reorder Point (ROP)` | Label displayed on reference line and HUD scorecard |
| `showSafetyZone` | Boolean | `true` | Display shaded red safety stock hazard zone |
| `showReorderLine` | Boolean | `true` | Display dashed Reorder Point benchmark threshold line |
| `showReplenishmentPoints` | Boolean | `true` | Highlight receipt jump nodes with upward chevron markers |
| `anomalyThresholdPct` | Number | `20` | Stockout hazard breach sensitivity percentage |
| `sortBy` | Select | `Chronological Ascending` | Sort timeline or items (`date_asc`, `date_desc`, `inventory_desc`, `hazard_first`) |
| `topNLimit` | Number | `0` | Limit display to Top-N records (0 = All) |
| `hudMode` | Select | `Full Scorecard HUD` | Top executive KPI HUD (`scorecard`, `compact_strip`, `none`) |
| `showGridLines` | Boolean | `true` | Display background cartesian grid lines |
| `customTitle` | String | `""` | Optional chart header title override |
| `customSubtitle` | String | `""` | Optional chart header subtitle override |
| `showSearch` | Boolean | `true` | Enable quick-search filter input |

### Style Options
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `colorTheme` | Select | `Google Enterprise` | Brand palette preset |
| `customPrimaryColor` | Color | `""` | Custom primary inventory stroke hex |
| `customPositiveColor` | Color | `""` | Custom replenishment / safe hex |
| `customNegativeColor` | Color | `""` | Custom stockout / breach hazard hex |
| `metricPolarity` | Select | `Higher is Better` | Goal direction (`higher_better` vs `lower_better`) |
| `fontScale` | Select | `Standard` | Typography size (`compact`, `standard`, `large`) |
| `valueFormat` | Select | `Compact Number` | Numeric formatting (`auto`, `compact_number`, `compact_currency`, `percentage`, `decimal_2`, `full_number`, `raw`) |
| `lineThickness` | Number | `2.5` | Sawtooth stroke thickness in pixels |

---

## 🚀 Manifest Snippet (`manifest.lkml`)

```lookml
visualization: {
  id: "inventory_stockout_sawtooth"
  label: "Inventory Stockout Velocity & Reorder Sawtooth Chart"
  file: "visualizations/inventory_stockout_sawtooth.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
