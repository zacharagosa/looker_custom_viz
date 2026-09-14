# 🎻 Violin & Box Plot Distribution Analyzer

A high-performance **Violin & Statistical Box Plot Distribution Analyzer** custom visualization for Google Cloud Looker, engineered with **D3.js v7**.

Designed to address Looker Cloud Blockers **`b/249062272`** (visualizations parity gap with Tableau & Plx for distribution curves and box plots) and **`b/4438305129355018240`** (Looker native boxplot restriction blocking raw observation queries and outliers). It leverages Looker's expanded **5,000+ row limit** (`b/512744732`) to compute non-parametric probability density and five-number summaries completely client-side.

---

## 📸 Key Features

- **Client-Side Statistical Engine**:
  - Epanechnikov & Gaussian **Kernel Density Estimation (KDE)** with automatic bandwidth optimization using **Silverman's Rule of Thumb** ($h = 1.06 \times \min(\sigma, \text{IQR}/1.34) \times n^{-1/5}$).
  - Full five-number summary: Min, 25th percentile (Q1), Median (50th percentile), 75th percentile (Q3), Max, and Interquartile Range (IQR).
  - True **Tukey Whiskers** calculated at $1.5 \times \text{IQR}$ beyond quartiles.
  - Automatic identification and scatter plotting of statistical **Outliers**.
- **4 Multi-Modal Rendering Modes**:
  1. **Violin + Box Plot (Default)**: Symmetrical smooth KDE density envelope paired with internal IQR box, median circle marker, whisker bars, and outlier dots.
  2. **Split / Asymmetric Half-Violin**: Single-sided density envelope leaving space for an adjacent detailed box plot or subgroup comparison.
  3. **Box Plot + Jittered Scatter (Strip / Beeswarm)**: Classic Tukey box plot overlaid with jittered individual data points across the category width.
  4. **Pure Density Silhouette (KDE Ridge)**: Minimalist, clean density outlines highlighting multi-modal peaks, skewness, and tail kurtosis.
- **Interactive UX & Navigation**:
  - **Dynamic Horizontal Value Scrubber**: Real-time cursor crosshair tracking exact Y-values and highlighting density across all violins.
  - **Category Search**: Instant client-side text filter for rapid drill-down across dozens of categories.
  - **Dynamic Sorting**: Instant re-sorting by Median (Desc/Asc), Mean, Observation Count ($N$), Spread (IQR), or Alphabetical.
  - **Executive Summary HUD**: Top status bar displaying Total Rows ($N$), Plotted Categories, Global Median, Interquartile Range, and Outlier Rate (%).
  - **Glassmorphic Floating Tooltip**: Detailed metrics card with category badge, sample size, median, mean, IQR, whisker bounds, and outlier frequency.
  - **Looker Drill-Downs**: Full integration with `LookerCharts.Utils.openDrillMenu` on violin, box, or outlier click.
- **Strictly Minimized Options**:
  - Strictly contained in only 2 tabs (`Display` and `Style`) to maintain a clean, uncluttered Looker Edit Viz modal.

---

## 📊 Data Shape Requirements

| Field Type | Count | Purpose | Examples |
| :--- | :--- | :--- | :--- |
| **Dimension** | `1` *(Required)* | Category grouping lane | `products.category`, `users.state`, `servers.region` |
| **Numeric Field** | `1` *(Required)* | Observation values (Measure or Dimension) | `order_items.sale_price`, `order_items.total_sale_price`, `events.latency_ms` |
| **Secondary Dimension**| `0` or `1` *(Optional)* | Point identifier or Subgroup | `order_items.id`, `products.brand`, `users.gender` |

> 💡 **Expanded Row Limit (5,000+ Rows)**: Set query row limit to 500 – 5,000. The visualization will ingest individual observations and calculate smooth density envelopes and quartile boxes instantly in the browser.

---

## ⚙️ Configuration Options

### Section 1: Display
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `displayMode` | Select | `Violin + Box Plot` | Layout mode: `violin_box`, `split_violin`, `box_jitter`, `density_silhouette` |
| `bandwidthFactor` | Select | `Auto (Silverman)` | KDE smoothing bandwidth: `auto`, `smooth` (1.6x), `detailed` (0.7x), `fine` (0.4x) |
| `scalingMode` | Select | `Shared Global` | Violin width scaling: `shared` (equal density) or `independent` (maximize lane width) |
| `showOutliers` | Boolean | `true` | Toggle outlier scatter dots beyond Tukey whiskers |
| `showSummaryStats`| Boolean | `true` | Show top executive KPI summary HUD banner |
| `showSearch` | Boolean | `true` | Enable search-as-you-type filter input |
| `valueFormat` | Select | `Compact Currency` | Value formatting: `compact_currency`, `compact_num`, `decimal_2`, `integer` |

### Section 2: Style
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `colorPalette` | Select | `Google Modern` | Palettes: `google_modern`, `looker_classic`, `sunset_ember`, `emerald_forest`, `cyber_indigo`, `monochrome_slate` |
| `fillOpacity` | Select | `75% Soft Fill` | Opacity of the violin envelope fill (`0.90`, `0.75`, `0.50`, `0.30`) |
| `boxPlotWidth` | Select | `Medium (14px)` | Width of the internal IQR box (`slim` = 8px, `medium` = 14px, `wide` = 22px) |
| `showGridlines` | Boolean | `true` | Show horizontal reference grid lines |
| `showMeanMarker`| Boolean | `true` | Show diamond marker for arithmetic mean |

---

## 🚀 Installation & LookML Setup

### Manifest Registration (`manifest.lkml`)
```lookml
visualization: {
  id: "violin_distribution_plot"
  label: "Violin & Box Plot Distribution Analyzer"
  file: "visualizations/violin_distribution_plot.js"
  dependencies: [
    "https://d3js.org/d3.v7.min.js"
  ]
}
```
