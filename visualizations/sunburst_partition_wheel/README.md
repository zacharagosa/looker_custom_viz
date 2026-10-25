# ☀️ Sunburst Multi-Level Partition Wheel & Radial Drilldown Analyzer

A high-performance Looker Custom Visualization designed for **Executive Dashboards, Enterprise Resource Allocation, Category Merchandising, and Cost Center Breakdown Analytics**. It solves the foundational BI challenge in multi-tier hierarchical data: **revealing proportional part-to-whole relationships across multiple nested dimensions simultaneously with intuitive radial drill-down capabilities**.

Built with **D3.js v7** to solve critical enterprise Cloud Blockers and Customer Requirements (**b/340585545**, **b/328594464**, **b/396197680**, **b/530822261**).

---

## 🎯 Enterprise Problem Solved

Standard Looker native charts (pies, donuts, stacked bars) and basic Cartesian plots face severe limitations when analyzing deep hierarchical trees:
1. **Multi-Tier Hierarchical Breakdown**: Native pie/donut charts can only render a single dimension. They cannot show 3 to 6 nested levels (e.g., `Country > Department > Category > Brand`) in a single cohesive view.
2. **Dynamic Field-Role Mapping**: Query columns can be dynamically re-mapped to Levels 1–4, Primary Sizing Measure, and Secondary Color Measure without modifying or reordering LookML Explores.
3. **Radial Angular Proportion**: Radial arc partitioning maps primary metric magnitudes directly to angular slices, allowing users to instantly compare child share against parent categories and total organization volume.
4. **Smooth Radial Zoom Drilldown**: Clicking any arc segment instantly zooms the wheel into that specific sub-tree, updating the center KPI readout and breadcrumb navigation trail in real time.
5. **Secondary Metric Diverging Gradients**: Enables dual-measure visual encoding—segment angular size represents volume/revenue, while segment color encodes margin %, growth rate, or variance.
6. **Configurable Benchmark Targets & Anomaly Alerts**: Integrates dataset statistical benchmarks (Mean, Median, P75, P90, or Fixed Target) with real-time variance calculations and anomaly alert badges.
7. **Tail Consolidation & Top-N Bucketing**: Automatically groups minor tail entities into an organized `"Others"` segment per hierarchy level, keeping the visual clean and performant even across 5,000+ rows.

---

## 🚀 3 Multi-Modal Layout Modes

Switchable in real time via the **Display** options tab:

| Mode | Key | Description |
| :--- | :--- | :--- |
| **Sunburst Radial Wheel** | `sunburst_wheel` | Full 360° radial multi-ring partition wheel. Each concentric ring corresponds to a level of depth in the hierarchy with angular spans proportional to metric volume. |
| **Linear Horizontal Icicle** | `icicle_partition` | Orthogonal cascading flow partition chart (flamegraph/icicle style) moving left-to-right through hierarchy levels. |
| **Concentric Layered Donut Rings** | `concentric_rings` | Concentric circular rings with uniform radial thickness per ring, ideal for comparing relative distribution across fixed depth layers. |

---

## 📊 Executive Telemetry HUD & Breadcrumbs

Equipped with real-time executive telemetry with configurable density (`full`, `compact`, `hidden`):
- **Active Scope Indicator**: Displays the current root or drilled node name.
- **Primary Metric Rollup**: Formatted total value (Currency, Number, Percentage) rolled up for the active sub-tree.
- **Share of Total**: Real-time percentage of organization-wide volume represented by the current view.
- **Sub-Categories Count**: Total number of descendant branch nodes contained within the active partition.
- **Benchmark Target & Variance**: Variance % against calculated mean, median, P75/P90, or custom fixed target.
- **Interactive Breadcrumb Trail**: Multi-stage trail (`Total Organization ❯ USA ❯ Men ❯ Jeans`) with 1-click drill reset.

---

## 🛠️ Data Requirements

| Field Role | Required | Description | Example LookML Field |
| :--- | :---: | :--- | :--- |
| **Dimension 1..N** | **Yes** (1–4) | Hierarchical levels ordered from root to leaf | `users.country`, `products.department`, `products.category` |
| **Measure 1** | **Yes** | Primary metric for arc angular width | `order_items.total_sale_price`, `order_items.order_count` |
| **Measure 2** | Optional | Secondary metric for diverging color gradient | `order_items.total_gross_margin`, `order_items.average_shipping_time` |

*Supports up to 5,000+ rows with performant client-side O(N) tree rollup and sub-threshold pruning.*

---

## 🎨 Clean 2-Tab Options Architecture

In strict accordance with Looker Custom Visualization design guidelines, configuration options are minimized to **exactly 2 tabs** to prevent modal header crowding:

### 1. `Display` Tab
- **Layout & Geometry Mode**: Sunburst Radial Wheel, Linear Horizontal Icicle, or Concentric Donut Rings.
- **Color Encoding Strategy**: Categorical by Root Branch, Secondary Metric Diverging Gradient, or Depth Gradient.
- **Field-Role Overrides**: Dynamic dropdown selectors for Level 1, Level 2, Level 3, Level 4 dimensions, Primary Sizing Measure, and Secondary Color Measure.
- **Benchmark Target Mode**: None, Dataset Mean, Dataset Median, Percentile P75, Percentile P90, or Fixed Custom Value.
- **Fixed Benchmark Value**: Custom target value for variance calculation.
- **Benchmark Reference Label**: Custom label for HUD reference line.
- **Anomaly Alert Threshold (%)**: Threshold percentage triggering alert indicators.
- **Sibling Node Sort Order**: Metric Descending, Metric Ascending, Alphabetical, or Natural order.
- **Top-N / Sibling Consolidation**: Top 5, 8, 12, 15, 25 siblings + Others consolidation (or Show All).
- **Suppress Zero / Null Rows**: Toggle to prune empty or null categories.
- **Center Hole Radius (%)**: Configurable inner donut hole radius (10% to 50%).
- **Executive KPI HUD Scorecard**: Full Scorecard, Compact Strip, or Hidden.
- **Segment Label Density**: All Readable, Prominent Branches Only (>5%), or Hidden.
- **Custom Chart Title / Subtitle**: Header text overrides.
- **Interactive Breadcrumb Trail**: Toggle hierarchical navigation trail.
- **Real-Time Node Search Filter**: Search-as-you-type filter with glow focus and dimming.
- **Click-to-Zoom Radial Drilldown**: Toggle interactive zoom transitions on click.

### 2. `Style` Tab
- **Color Palette Theme**: Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Sunset Media, Wellverse Healthcare, Custom Hex Override.
- **Custom Primary / Secondary Color**: Hex color overrides (`display: 'color'`).
- **Metric Polarity**: Higher is Better vs Lower is Better (inverts color gradient for cost/latency/churn).
- **Typography Font Scale**: Compact, Standard, or Large Presentation.
- **Primary Metric Value Format**: Auto, Compact Currency (`$1.2M`), Compact Number (`1.2M`), Percentage (`15.2%`), Decimal, or Raw.
- **Segment Arc Corner Radius**: Sharp (0px), Rounded (2px, 4px, 6px).
- **Arc Segment Inner Padding**: Flush (0px), Hairline (1px), Subtle (2px), Distinct (4px).
- **Radial Text Label Orientation**: Tangential Arc Flow, Spoke Radial Rays, Horizontal Standard.

---

## 🔗 Drill-Down Integration

Fully integrated with Looker's native drill paths. Right-clicking or Shift/Ctrl-clicking any arc segment opens the native Looker Drill Menu (`LookerCharts.Utils.openDrillMenu`) with all configured `drill_fields`.
