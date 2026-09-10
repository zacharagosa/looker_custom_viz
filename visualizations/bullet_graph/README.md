# Stephen Few Bullet Graph

![Stephen Few Bullet Graph](screenshot.png)


An implementation of Stephen Few's classic **Bullet Graph** specification for Google Cloud Looker, engineered with **D3.js v7**.

Bullet graphs were designed by visualization pioneer Stephen Few as an information-dense, high-efficiency replacement for dashboard gauges and meters. This visualization displays actual metric performance against qualitative benchmark ranges (e.g. Poor, Satisfactory, Good, Stretch) and distinct target / quota markers, complete with dynamic variance badges.

---

## 📸 Key Features

- **Multi-Category Executive Layout**: Displays clean, comparative bullet graphs across all categories in your dataset.
- **Horizontal & Vertical Orientation**: Toggle between standard horizontal rows or columnar vertical cards.
- **Qualitative Performance Bands**: Configurable 3-tier (Poor / Satisfactory / Good) or 4-tier (Poor / Fair / Good / Stretch) background ranges.
- **Target / Quota / Baseline Markers**: Crisp contrasting marker lines indicating targets, goals, or prior-period baselines.
- **Dynamic Attainment & Variance Badges**: Color-coded KPI pills indicating `% of Goal` (e.g., `108.4%`), variance delta percentage (`+8.4%`), or currency delta (`+$12.5K`).
- **Interactive Glassmorphism Tooltip**: Rich hover card with actuals, targets, variance delta, attainment %, and qualitative tier achieved.
- **5 Executive Color Themes**:
  - `Executive Slate` (Classic Few neutral slate with Navy actual bar & Crimson target)
  - `Google Vibrant` (Google Blue, Red, Yellow, Green palette)
  - `Emerald Growth` (Deep greens & forest tones for sustainability and revenue)
  - `Midnight Neon` (Dark mode theme with high-contrast glowing indicators)
  - `Sunset Warmth` (Warm amber, coral, and terracotta hues)

---

## 📊 Data Shape Requirements

| Field Type | Count | Purpose | Examples |
| :--- | :--- | :--- | :--- |
| **Dimension** | `0` or `1` | Category / Item grouping | `products.category`, `users.state`, `sales_reps.name` |
| **Measure 1** | `1` *(Required)* | **Actual Performance Value** | `order_items.total_sale_price`, `sales.revenue` |
| **Measure 2** | `0` or `1` *(Optional)* | **Target / Quota / Goal Value** | `sales_goals.quota_amount`, `order_items.total_gross_margin` |
| **Measure 3** | `0` or `1` *(Optional)* | **Comparative Baseline Value** | `sales.prior_year_revenue` |

> 💡 **No 2nd measure?** You can configure target values via the visualization settings (e.g., automated 1.15x multiplier of actual or a fixed static target).

---

## ⚙️ Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `colorTheme` | Select | `Executive Slate` | Theme color palette (Slate, Google Vibrant, Emerald, Midnight Neon, Sunset) |
| `orientation` | Select | `Horizontal` | Horizontal row layout or Vertical columnar layout |
| `qualitativeRanges` | Select | `3_tier` | Choose between 3-Tier (60/85/100%) or 4-Tier (50/75/100/120%) ranges |
| `targetCalculationMode`| Select | `second_measure`| Source for target value (2nd Measure, Multiplier, or Fixed) |
| `showTargetMarker` | Boolean | `true` | Toggle the target indicator line |
| `showVarianceBadge` | Boolean | `true` | Toggle the attainment % / variance delta badge |
| `varianceBadgeFormat`| Select | `attainment_pct` | Display Attainment % (`108%`), Variance % (`+8%`), or Delta Value (`+$12K`) |
| `valueFormat` | Select | `auto` | Formatting style (Auto, Compact Currency, Full Currency, Numbers, %) |
| `barThickness` | Range | `18` | Thickness of the central actual performance bar in pixels |
| `rowHeight` | Range | `64` | Vertical height allocated per item row in pixels |
| `sortBy` | Select | `default` | Sort items by Actuals, Attainment %, or Category Name |
| `enableAnimation` | Boolean | `true` | Enable smooth D3 cubic transitions on render |

---

## 🚀 Manifest Snippet (`manifest.lkml`)

```lookml
visualization: {
  id: "bullet_graph"
  label: "Stephen Few Bullet Graph"
  file: "visualizations/bullet_graph.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
