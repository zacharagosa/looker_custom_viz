# Collapsible Hierarchical Tree Grid (`hierarchical_tree_table`)

An executive multi-level collapsible tree grid that solves Looker's #1 requested Table Cloud Blocker (**Buganizer `b/530833873`** and **`go/prd-looker-table-viz-improvements`**).

Rather than spreading nested hierarchies across wide, repetitive columns with excessive whitespace, this visualization consolidates any number of dimensions into a **single indented tree column** with interactive branch expansion, automatic multi-level subtotal rollups, in-cell share bars, and instant branch search.

![Collapsible Hierarchical Tree Grid Screenshot](screenshot.png)

---

## 💡 Inspiration & Cloud Blockers Solved

- **Buganizer Cloud Blocker `b/530833873`**: *Official Collapsible Tree Visualization*
- **PRD - Looker Table Viz Improvements (`go/prd-looker-table-viz-improvements`)**: *Hierarchical roll ups in a single column (CB): Provide a tree-like structure within the table where parent rows can be expanded to show child rows. The other dimensions and measures also show the breakdown at the expanded level.*
- **Internal YAQS (`go/yeng/7982871132560687104`)**: *Multi-level subtotals per parent dimension without whitespace table clutter.*

---

## 🚀 Key Features & Capabilities

- **Single-Column Indented Hierarchy**: Merges 2 to 6 nested parent-child dimensions (e.g. `Department > Category > Brand`, or `Region > Country > State > City`) into a single column with depth guides and level tags.
- **Dynamic Multi-Level Rollups**: Parent rows compute exact aggregate metrics of their descendants, providing effortless drillable subtotals.
- **Interactive Branch Controls**: Expand All / Collapse All buttons, clickable branch chevrons, and keyboard/mouse interaction.
- **In-Cell Performance Indicators**: Subtle background progress bars showing proportion of parent total, plus `(% share)` labels.
- **Branch Quick Search**: Real-time filtering that automatically auto-expands matching branches so matching leaves are immediately visible.
- **Configurable Benchmark Targets**: Compare branches against fixed targets or dynamic statistics (Dataset Mean, Median, P75, P90) with subtle gap warning badges.
- **Top-N Density & 'Other' Rollups**: Limit visible branches to Top 5, 8, 10, or 15 per level and roll up tail rows into an aggregate `Other` branch.
- **Looker Drill-Down Integration**: Clickable values with native Looker drill-down menus (`LookerCharts.Utils.openDrillMenu`).

---

## 📋 Data Requirements

| Field Type | Requirement | Examples |
| :--- | :--- | :--- |
| **Dimensions** | 2 to 6 Dimensions (Hierarchy Levels) | `products.department`, `products.category`, `products.brand` |
| **Measures** | 1 to 4 Numeric Measures | `order_items.total_sale_price`, `order_items.order_count` |

---

## 🎨 Configuration Options

### Section 1: Display
- **Tree Layout Mode**: `collapsible_tree` (interactive toggles), `flat_indented` (all expanded with subtotal banners), `compact_summary` (Level 1 summary only).
- **Default Tree Expansion**: `level1` (L1 expanded, deeper collapsed), `level2` (L1 & L2 expanded), `all` (expand all).
- **Dynamic Field-Role Dropdowns**: Dynamically re-map Primary Hierarchy Dimension (L1), Secondary (L2), Tertiary (L3), Primary Measure, and Comparison Measure directly from live query field dropdowns.
- **Benchmark Target Mode**: `none`, `dataset_mean`, `dataset_median`, `percentile_p75`, `percentile_p90`, `fixed_value`.
- **Fixed Benchmark Target Value**: Custom target value for threshold evaluation.
- **Reference Benchmark Label**: Label for benchmark line in the HUD.
- **Underperformance Alert Threshold (%)**: Threshold percentage under/over target triggering an alert badge.
- **Node Hierarchy Sort Order**: `metric_desc`, `metric_asc`, `alphabetical`, `natural`.
- **Branch Density Filter (Top-N per Level)**: `all`, `5`, `8`, `10`, `15`.
- **Group Remaining into 'Other' Aggregate Branch**: Toggle tail rollup into synthetic branch.
- **Suppress Zero / Null Value Rows**: Toggle exclusion of empty or zero-measure rows.
- **Executive Rollup Summary HUD**: `full` (scorecard), `compact` (strip), `hidden`.
- **Show In-Cell Share Progress Bars**: Toggle progress bars in measure cells.
- **Show % of Parent Group Share**: Toggle `(XX.X%)` share badges.
- **Show Branch Search Filter**: Enable instant search box.
- **Custom Header Title & Subtitle Override**: Clean header cards for executive reporting.

### Section 2: Style
- **Visual Brand Palette**: Executive Slate, Google Cloud Blue, Cyber NOC Dark, Emerald Enterprise, Sunset Media, Wellverse Healthcare, Custom Accent.
- **Custom Primary Accent Hex**: Color picker for branded highlights.
- **Performance Metric Polarity**: `higher_is_better` vs `lower_is_better`.
- **Row Density / Font Scale**: Compact (28px), Normal (36px), Relaxed (44px).
- **Primary Measure Value Format**: Auto, Compact Currency (`$1.2M`), Compact Number (`1.2M`), Percentage (`45.2%`), Decimal (`1,234.56`), Raw Formatted Number (`1,234,567`), Raw.
