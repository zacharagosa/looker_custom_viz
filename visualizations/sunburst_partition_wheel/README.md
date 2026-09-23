# ☀️ Sunburst Multi-Level Partition Wheel & Radial Drilldown Analyzer

A high-performance Looker Custom Visualization designed for **Executive Dashboards, Enterprise Resource Allocation, Category Merchandising, and Cost Center Breakdown Analytics**. It solves the foundational BI challenge in multi-tier hierarchical data: **revealing proportional part-to-whole relationships across multiple nested dimensions simultaneously with intuitive radial drill-down capabilities**.

Built with **D3.js v7** to solve critical enterprise Cloud Blockers and Customer Requirements (**b/340585545**, **b/328594464**, **b/396197680**, **b/530822261**).

---

## 🎯 Enterprise Problem Solved

Standard Looker native charts (pies, donuts, stacked bars) and basic Cartesian plots face severe limitations when analyzing deep hierarchical trees:
1. **Multi-Tier Hierarchical Breakdown**: Native pie/donut charts can only render a single dimension. They cannot show 3 to 6 nested levels (e.g., `Region > Country > Department > Category > Brand`) in a single cohesive view.
2. **Radial Angular Proportion**: Radial arc partitioning maps primary metric magnitudes directly to angular slices, allowing users to instantly compare child share against parent categories and total organization volume.
3. **Smooth Radial Zoom Drilldown**: Clicking any arc segment instantly zooms the wheel into that specific sub-tree, updating the center KPI readout and breadcrumb navigation trail in real time.
4. **Secondary Metric Diverging Gradients**: Enables dual-measure visual encoding—segment angular size represents volume/revenue, while segment color encodes margin %, growth rate, or variance.
5. **Tail Consolidation & Top-N Bucketing**: Automatically groups minor tail entities into an organized `"Others"` segment per hierarchy level, keeping the visual clean and performant even across 5,000+ rows.

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

Equipped with real-time executive telemetry:
- **Active Scope Indicator**: Displays the current root or drilled node name.
- **Primary Metric Rollup**: Formatted total value (Currency, Number, Percentage) rolled up for the active sub-tree.
- **Share of Total**: Real-time percentage of organization-wide volume represented by the current view.
- **Sub-Entities Count**: Total number of descendant nodes contained within the active partition.
- **Interactive Breadcrumb Trail**: Multi-stage trail (`Total Organization ❯ North America ❯ Apparel ❯ Jeans`) with 1-click drill reset.

---

## 🛠️ Data Requirements

| Field Role | Required | Description | Example LookML Field |
| :--- | :---: | :--- | :--- |
| **Dimension 1..N** | **Yes** (1–5) | Hierarchical levels ordered from root to leaf | `users.country`, `products.department`, `products.category` |
| **Measure 1** | **Yes** | Primary metric for arc angular width | `order_items.total_sale_price`, `order_items.order_count` |
| **Measure 2** | Optional | Secondary metric for diverging color gradient | `order_items.total_gross_margin`, `order_items.average_shipping_time` |

*Supports up to 5,000+ rows with performant client-side O(N) tree rollup and sub-threshold pruning.*

---

## 🎨 Clean 2-Tab Options Architecture

In strict accordance with Looker Custom Visualization design guidelines, configuration options are minimized to **exactly 2 tabs** to prevent modal header crowding:

### 1. `Display` Tab
- **Layout Mode**: Sunburst Radial Wheel, Linear Horizontal Icicle, or Concentric Donut Rings.
- **Color Mode**: Categorical by Root Branch, Secondary Metric Diverging Gradient, or Depth Gradient.
- **Center Hole Radius (%)**: Configurable inner donut hole radius (10% to 50%).
- **Maximum Visible Depth Levels**: Restrict visible rings from 2 to 5 levels (or Unrestricted).
- **Top-N / Sibling Consolidation**: Top 8, 12, 15, 25 siblings + Others consolidation.
- **Primary Metric Value Format**: Compact Currency (`$1.2M`), Compact Number (`1.2M`), Percentage (`15.2%`), or Raw.
- **Show Executive KPI Summary Bar**: Toggle real-time executive HUD cards.
- **Show Interactive Breadcrumb Trail**: Toggle hierarchical navigation trail.
- **Show Real-Time Node Search Filter**: Search-as-you-type filter with glow focus and dimming.
- **Show Node Labels on Segments**: Toggle radial labels on eligible arc segments.
- **Enable Click-to-Zoom Radial Drilldown**: Toggle interactive zoom transitions on click.

### 2. `Style` Tab
- **Color Palette Theme**: Looker Modern (Light), Executive Indigo & Slate, Emerald Mint & Forest, Cyber Neon (Dark).
- **Segment Arc Corner Radius**: Sharp (0px), Rounded (2px, 4px, 6px).
- **Arc Segment Inner Padding**: Flush (0px), Hairline (1px), Subtle (2px), Distinct (4px).
- **Segment Label Font Size**: Compact (9px), Standard (11px), Prominent (13px).
- **Radial Text Label Orientation**: Tangential Arc Flow, Spoke Radial Rays, Horizontal Standard.

---

## 🔗 Drill-Down Integration

Fully integrated with Looker's native drill paths. Right-clicking or Shift/Ctrl-clicking any arc segment opens the native Looker Drill Menu (`LookerCharts.Utils.openDrillMenu`) with all configured `drill_fields`.
