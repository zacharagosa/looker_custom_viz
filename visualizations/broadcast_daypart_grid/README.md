# Broadcast Programming Schedule & Daypart Performance Grid

![Broadcast Programming Schedule & Daypart Performance Grid](screenshot.png)


An executive **Broadcast Programming Schedule & Daypart Performance Grid** custom visualization for Google Cloud Looker, engineered with **D3.js v7**.

In media & television broadcasting (Nielsen GRP/CPP ratings, linear TV programming grids, streaming concurrency), digital advertising exchanges (ad pacing, CPMs, impression delivery), e-commerce (hourly peak conversion windows, flash sales), and gaming telemetry (hourly player concurrency & live-ops events), performance revolves around the **7-day x 24-hour diurnal cycle** and standardized **Industry Dayparts** (Overnight, Early Morning, Daytime, Early Fringe, Prime Time, Late Night).

Native Looker tables and heatmaps are unable to render a synchronized 24x7 diurnal matrix with chronological hour ordering (00:00 to 23:00), industry daypart classification, marginal hourly/daily rollups, peak anomaly detection badges, and synchronized diurnal curves.

This custom visualization delivers a multi-mode, high-density analytics suite capable of processing 5,000+ rows with client-side slicing and instant aggregation.

---

## 📸 Key Features

- **Multi-Modal Display Modes**:
  - `Dual Synchronized Split View` (Default): Top 7-Day x 24-Hour Heatmap Matrix paired with Bottom Daypart Scorecard KPIs and 24-Hour Diurnal Progression Curves. Hovering over any cell cross-highlights the hour and daypart in real time.
  - `Hourly 7x24 Heatmap Matrix`: Full 168-slot weekly matrix with daypart boundary dividers, in-cell values, dynamic contrast formatting, top hourly marginal bars, and right daily volume rollup pills.
  - `Broadcast Dayparts (Nielsen Scorecards)`: Automatically aggregates the 168 hours into standardized industry daypart blocks (Overnight, Early Morning, Daytime, Early Fringe, Prime Time, Late Night), reporting Total Volume, % Share of Total, Hourly Run-Rate Velocity, Peak Day & Hour, and Weekend vs Weekday Indexing.
  - `24-Hour Diurnal Spline Curves`: Multi-line D3 chart plotting each day of the week as an interactive curve over the 24-hour cycle against shaded Daypart zones and an overall weekly baseline curve.
- **Multiple Industry Daypart Presets**:
  - `Broadcast / Nielsen Standard (6 Tiers)`: Overnight (02:00-06:00), Early Morning (06:00-09:00), Daytime (09:00-16:00), Early Fringe (16:00-19:00), Prime Time (19:00-23:00), Late Night (23:00-02:00).
  - `Retail & E-Commerce (4 Tiers)`: Late Night (00:00-06:00), Morning Commute (06:00-12:00), Midday & Lunch (12:00-18:00), Evening Prime Shopping (18:00-24:00).
  - `Workplace Operational Shifts (3 Tiers)`: Day Shift (07:00-15:00), Swing Shift (15:00-23:00), Graveyard (23:00-07:00).
- **Peak Anomaly Detection (★ Badges)**:
  - Automatically identifies top volume hours using quantile or standard deviation thresholds (Top 5%, Top 10%, or +1σ Outliers) and overlays subtle gold star markers on peak slots.
- **Marginal Rollups**:
  - Top marginal mini-bars highlighting hourly volume distribution across the full week.
  - Right marginal pills showing daily volume totals and % share of weekly volume.
- **Expanded Row Limit Scalability (5,000+ Rows)**:
  - Supports queries with an additional grouping dimension (e.g. `products.category`, `channels.network`, or `geo.market`). The visual renders an inline client-side dropdown selector allowing instant filtering by category or viewing all rows consolidated in <10ms.
- **Interactive Tooltips & Drill-Downs**:
  - Detailed hover card displaying Day of Week, Time Window, Daypart badge, Metric value, % of Day Total, % of Week Total, and Peak Anomaly indicator.
  - Clicking any cell opens Looker's native drill-down menu (`LookerCharts.Utils.openDrillMenu`).
- **6 Curated Color Palettes**:
  - `Nielsen Broadcast (Midnight / Cyan / Gold)` (Default executive media palette)
  - `Streaming Crimson (Charcoal / Red)` (Modern streaming platform styling)
  - `Google Enterprise Blue` (Clean Google Cloud design)
  - `Emerald Ratings Green` (Vibrant ratings and financial performance)
  - `Warm Amber Sunset` (Thermal sunset tones)
  - `Cyber Neon (Dark Mode)` (Deep space theme with neon cyan and purple accents)

---

## 📊 Data Shape Requirements

| Field Type | Required Count | Purpose | Example (`order_items`) |
| :--- | :--- | :--- | :--- |
| **Dimension 1** | `1` *(Required)* | Day of Week (e.g. Monday, Tuesday...) | `order_items.created_day_of_week` |
| **Dimension 2** | `1` *(Required)* | Hour of Day (integers `0-23` or timestamps) | `order_items.created_hour_of_day` |
| **Dimension 3** | `0 to 1` *(Optional)* | Slicing Dimension (Category, Market, Channel) | `products.category` |
| **Measure 1** | `1` *(Required)* | Primary Volume / Revenue / Ratings Metric | `order_items.total_sale_price` |
| **Measure 2** | `0 to 1` *(Optional)* | Secondary Metric (Orders, Impressions) | `order_items.order_count` |

---

## ⚙️ Configuration Options

Configuration options are strictly organized into **2 clean tabs** (`Display` and `Style`) to keep Looker's Edit Viz modal neat and uncluttered:

### Display Tab
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `viewMode` | Select | `Dual Split View` | `split_view`, `hourly_grid`, `daypart_blocks`, `diurnal_curves` |
| `startOfWeek` | Select | `Monday (Broadcast & ISO)` | `monday`, `sunday` |
| `daypartPreset` | Select | `Broadcast / Nielsen Standard` | `nielsen`, `retail`, `shifts` |
| `highlightPeaks` | Select | `Top 5% Peak Slots (★ Gold)` | `top_5`, `top_10`, `above_avg`, `none` |
| `valueFormat` | Select | `Compact Currency ($1.2M)` | `compact_currency`, `currency`, `compact_num`, `integer`, `percent` |
| `showMarginals` | Boolean | `true` | Display top hourly bars and right daily totals |
| `showCellValues` | Boolean | `true` | Show formatted metric values inside cells |
| `showSearch` | Boolean | `true` | Enable top toolbar with dimension slicer & metric switch |

### Style Tab
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `colorPalette` | Select | `Nielsen Broadcast` | `nielsen_broadcast`, `netflix_crimson`, `google_blue`, `emerald_ratings`, `amber_sunset`, `cyber_neon` |
| `colorScaleMode` | Select | `Quantile` | `quantile`, `linear`, `log` |
| `cellRadius` | Number | `4` | Cell corner radius in pixels (0-8) |
| `cellSpacing` | Number | `2` | Cell gap spacing in pixels (1-6) |

---

## 🚀 LookML Manifest Snippet

```lookml
visualization: {
  id: "broadcast_daypart_grid"
  label: "Broadcast Programming Schedule & Daypart Performance Grid"
  file: "visualizations/broadcast_daypart_grid.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
