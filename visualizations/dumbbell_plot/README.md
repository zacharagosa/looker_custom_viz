# Dumbbell Divergence Plot (Connected Dot Plot)

An executive **Dumbbell Divergence Plot** (also known as a **Connected Dot Plot** or **DNA Plot**) custom visualization for Google Cloud Looker, engineered with **D3.js v7**.

Dumbbell plots are championed by data visualization leaders (Stephen Few, Edward Tufte, Financial Times, and Storytelling with Data) as the cleanest, most space-efficient alternative to clustered bar charts when comparing two continuous values across categories. Instead of cluttering dashboards with grouped bars, each category is presented as a sleek horizontal barbell showing baseline (Start/Point A) and outcome (End/Point B) dots connected by a directional variance bridge.

---

## 📸 Key Features

- **Directional Variance Bridges**: Bridge lines dynamically color-code by variance direction (emerald green for positive growth/surplus, crimson red for decline/deficit) or uniform executive palettes.
- **Directional Chevrons & Arrows**: Sleek arrow markers point from Point A to Point B, clarifying the movement vector and growth trajectory.
- **Smart Staggered Value Labels**: Formatted metric readouts sit cleanly beside dots, automatically staggering vertically when values are close to prevent overlap.
- **Executive Variance Badges**: Right-aligned variance pills display formatted deltas (`+$45.2K`), percentage growth (`+28.4%`), or both.
- **Flexible Data Mapping**:
  - **1 Dimension + 2 Measures**: Unpivoted two-measure comparisons (e.g., Gross Margin vs Total Sale Price, Cost vs Price, Target vs Actual).
  - **1 Dimension + Pivoted Measure (2 Pivots)**: Pivoted period-over-period or segment comparisons (e.g. 2024 vs 2025, Male vs Female).
  - **1 Dimension + 1 Measure**: Single-metric baseline with automated target multiplier fallback.
- **Interactive Glassmorphism Tooltip**: Rich hover card with category status, baseline value, outcome value, net variance delta, growth percentage, and ratio multiplier, plus Looker drill-down link support.
- **Executive Summary Header**: Top summary bar displaying active legend indicators, total category count, and net percentage of categories showing positive growth.
- **6 Executive Color Palettes**:
  - `Executive Slate` (Neutral slate baseline with navy outcome and emerald/crimson variance)
  - `Google Vibrant` (Google Slate, Blue, Green, Red)
  - `Emerald Growth` (Deep forest greens, teal, and mint)
  - `Midnight Cyber` (High-contrast dark mode with neon sky blue, fuchsia, and cyber green)
  - `Sunset Warmth` (Amber, terracotta, and warm coral)
  - `Ocean Breeze` (Sky blue, deep cobalt, and teal)

---

## 📊 Data Shape Requirements

| Field Type | Count | Purpose | Examples |
| :--- | :--- | :--- | :--- |
| **Dimension** | `1` *(Required)* | Categorical row grouping | `products.category`, `users.state`, `sales_reps.name` |
| **Measure 1** | `1` *(Required)* | **Point A (Baseline / Start / Actual)** | `order_items.total_gross_margin`, `sales.prior_year` |
| **Measure 2** | `0` or `1` *(Recommended)*| **Point B (Comparison / Outcome / Target)**| `order_items.total_sale_price`, `sales.current_year` |
| **Pivots** | `0` or `2` *(Optional)* | Pivoted comparison values | `order_items.created_year` (2024 vs 2025) |

> 💡 **Single Measure Mode**: If only 1 measure is provided without pivots, Point B automatically generates a target projection using a 1.20x multiplier.

---

## ⚙️ Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `colorTheme` | Select | `Executive Slate` | Theme palette (`executive_slate`, `google_vibrant`, `emerald_growth`, `midnight_cyber`, `sunset_warmth`, `ocean_breeze`) |
| `bridgeColorMode` | Select | `Directional` | Color bridge by variance direction (`directional`), uniform neutral (`neutral`), or gradient (`gradient`) |
| `showDirectionArrows` | Boolean | `true` | Show directional arrowheads indicating vector from Point A to Point B |
| `pointRadius` | Range | `8` | Radius of marker dots in pixels |
| `bridgeThickness` | Range | `3` | Stroke thickness of the connector bridge in pixels |
| `rowHeight` | Range | `52` | Vertical height allocated per item row in pixels |
| `showVarianceBadge` | Boolean | `true` | Toggle the variance / attainment pill badge on each row |
| `badgeMetric` | Select | `Value & %` | Badge content (`both`, `delta_pct`, `delta_val`, `ratio`) |
| `showPointLabels` | Boolean | `true` | Show formatted values adjacent to marker dots |
| `valueFormat` | Select | `Compact Currency` | Value formatting (`compact_currency`, `full_currency`, `compact_number`, `full_number`, `percent`) |
| `sortBy` | Select | `Default Query Sort` | Row sorting (`none`, `delta_desc`, `delta_asc`, `val_b_desc`, `val_a_desc`, `category_asc`) |
| `showLegend` | Boolean | `true` | Toggle top executive summary header and legend |
| `labelPointA` | String | `""` | Custom label override for Point A |
| `labelPointB` | String | `""` | Custom label override for Point B |
| `showGridLines` | Boolean | `true` | Toggle vertical axis grid lines and tick labels |
| `zeroBaseline` | Boolean | `false` | Force axis scale to begin at zero rather than data minimum |
| `enableAnimation` | Boolean | `true` | Enable smooth entry transitions |

---

## 🚀 Manifest Snippet (`manifest.lkml`)

```lookml
visualization: {
  id: "dumbbell_plot"
  label: "Dumbbell Divergence Plot"
  file: "visualizations/dumbbell_plot.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
