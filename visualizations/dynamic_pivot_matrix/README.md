# Dynamic Pivot Matrix & Heatmap Grid

An enterprise multi-modal matrix table and pivot analytics visualization for Looker, built with **D3.js v7** and vanilla HTML5/SVG.

Designed to directly resolve high-priority customer escalations and Google-internal Cloud Blockers:
- **b/500385324 & b/496749649**: *Dynamic Pivot Table Sorting for Ad-Hoc Analysis* (Lowe's Companies, Inc. and enterprise retail customers blocked by Looker's inability to sort pivot headers dynamically based on measure values).
- **b/314734619**: *Support Collapse / Expand in a Pivot Table*.
- **b/492843989**: *Enhanced Formatting for Totals and Subtotals*.
- **b/552033600**: *Retain Visualization and Series Settings for Dynamic Pivoted Data*.
- **b/509389150**: *Increased flexibility to use repeated dimension values with pivots*.

---

## 🌟 Key Features

1. **4 Multi-Modal Rendering Modes (`renderMode`)**:
   - **Micro-Bars & Volume (`matrix_bars`)**: In-cell proportional mini-progress bars showing relative volume magnitude alongside numeric values, with automatic row peak cell star indicators.
   - **Color Heatmap Grid (`heatmap_grid`)**: Quantile/linear color gradient intensity across all pivot periods to immediately spot hot and cold performance pockets.
   - **Period Growth Deltas (`growth_delta`)**: Computes period-over-period percentage growth (`+14.2%`, `-8.5%`) rendered as emerald/crimson executive badges.
   - **Executive Compact KPI (`compact_kpi`)**: High-density executive scorecard with bold typography and minimal footprint.

2. **Client-Side Dynamic Pivot Column Sorting**:
   - Click **any** pivot header (e.g. `2024`, `2025`, `2026`) to dynamically sort rows by that period's measure value in descending or ascending order.
   - Click the **Total** column to rank entities by aggregate volume.
   - Click the dimension header to sort alphabetically.

3. **Expanded Row Limit Scalability (5,000+ Rows)**:
   - High-performance client-side pagination (`10`, `25`, `50`, `100`, or `All`) ensuring instantaneous DOM rendering and zero UI stuttering on large corporate datasets.
   - Real-time client-side search-as-you-type filter across entity dimensions.

4. **Marginal Rollups & Totals**:
   - Sticky row total column calculating row sums on the fly.
   - Sticky column total footer row calculating period sums and overall grand volume total.
   - Executive HUD displaying grand total, entity counts, and active pivot periods.

5. **Looker Drill-Down Menus**:
   - Full integration with Looker's native drill-down actions (`LookerCharts.Utils.openDrillMenu`) for both dimension entities and pivoted measure cells.

6. **Clean 2-Tab Edit Modal**:
   - Strict adherence to the 2-tab configuration layout (`Display` and `Style`) to prevent header tab wrapping or crowding in Looker's Edit Viz modal.

---

## 📊 Data Shape & Requirements

| Field Type | Requirement | Description |
| :--- | :--- | :--- |
| **Dimension 1** | **Required** (1 field) | Primary entity row dimension (e.g. `products.category`, `users.state`, `sales_reps.name`) |
| **Dimension 2** | *Optional* (1 field) | Secondary entity grouping or sub-category (e.g. `products.department`) |
| **Pivot** | **Recommended** (1 field) | Temporal or categorical pivot (e.g. `order_items.created_year`, `order_items.created_month`) |
| **Measure** | **Required** (1-4 fields) | Numeric measure (e.g. `order_items.total_sale_price`, `order_items.order_count`) |

---

## 🎨 Configuration Options

### Section: `Display`
- **Table Render Mode**: Choose between `Micro-Bars & Volume`, `Color Heatmap Grid`, `Period Growth Deltas (% PoP)`, or `Executive Compact KPI`.
- **Show Row Total Column**: Toggle row-level total rollup column (Default: `true`).
- **Show Column Total Summary Footer**: Toggle sticky footer row with column totals (Default: `true`).
- **Enable Instant Search Filter**: Search-as-you-type text input in toolbar (Default: `true`).
- **Rows Per Page**: Pagination selector (`10`, `25`, `50`, `100`, `All`).
- **Metric Number Format**: Choose compact currency (`$1.2M`), compact number (`1.2M`), precise currency (`$1,234.56`), integer, or percentage.

### Section: `Style`
- **Color Palette & Theme**: `Google Modern Blue`, `Executive Slate`, `Emerald Forest`, `Zayo Telecom Orange`.
- **Highlight Peak Cell in Row**: Highlights the highest period in each row with accent color and star badge.
- **Font Size & Density**: `Compact (11px)`, `Standard (12.5px)`, `Spacious (14px)`.
