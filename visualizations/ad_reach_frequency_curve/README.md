# Ad Reach & Frequency Response Curve (`ad_reach_frequency_curve`)

Enterprise-grade **Ad Reach & Frequency Response Curve, Effective Frequency Corridor, and Marketing Saturation Analyzer** custom visualization built with **D3.js v7** for media planners, brand marketers, performance advertising agencies, streaming platforms, and broadcast networks.

Directly resolves **Buganizer Cloud Blockers & Customer Requirements** (including **b/476341715**, **b/422654493**, **b/422655556**, and **b/341928091**) and answers internal Google Media Measurement & YAQS pain points (**go/rxf-dash**, **go/mmm-r&f-data**, and Google Meridian MMM Reach & Frequency modeling).

---

## 🎯 High-Impact Customer Problems Solved

In standard Looker Cartesian charts (bar, column, line), media and advertising teams encounter severe limitations when trying to model ad reach and impression frequency:
1. **Saturation Diminishing Returns Cannot Be Modeled Natively**: Ad exposure is non-linear. As gross rating points (GRPs) or ad spend scale, unique audience reach follows a concave diminishing-returns curve (modeled by negative binomial distribution, beta-binomial, or Hill saturation equations). Standard BI charts only draw linear trends or require complex SQL window functions.
2. **Effective Frequency Corridor (3x–6x) Missing**: Herbert Krugman's classic Three-Hit Theory and modern digital advertising standards establish an *Effective Frequency Corridor* (typically 3–6 exposures) where ad recall and brand lift peak. Exposures below 3x suffer from *Ad Blindness* (under-exposure), while exposures above 6–8x suffer from *Ad Wearout* and negative ROI. Native Looker tiles cannot render shaded vertical tolerance zones, optimal inflection markers, or waste metrics.
3. **Multi-Channel & Campaign Comparison**: Comparing response curves across 5,000+ campaign placements, networks, ad formats, or audience segments causes visual clutter or browser slowdown without client-side curve fitting and dynamic filtering.
4. **Dual-Axis Scaling Disconnect**: Displaying Total Impressions or Spend alongside Deduped Reach % and Average Frequency requires synchronized multi-metric overlays that respect modern Looker styling.

---

## 🚀 4 Multi-Modal Layout Modes

The visualization provides 4 distinct analytical views via the `Layout Analysis Mode` dropdown:

1. **Reach Curve & Saturation Horizon (`reach_frequency_curve`)**:
   - Plots Unique Audience Reach (%) against Average Exposure Frequency or Ad Impressions.
   - Highlights the **Optimal Inflection Point** where marginal reach efficiency drops below 15%.
   - Overlays the **Target Reach Goal** threshold line and shaded **Effective Frequency Corridor**.
   - Shaded under-curve gradient with cubic spline interpolation.

2. **Effective Frequency Corridor & Wearout (`effective_frequency_histogram`)**:
   - Frequency distribution histogram (1x through 10+ exposures) showing audience concentration.
   - Distinctly colored zones: **Under-Exposed / Ad Blindness (<3x)**, **Effective Corridor (3x–6x)**, and **Over-Saturated / Ad Fatigue (>6x)**.
   - Overlays the cumulative reach ogive curve on a secondary right Y-axis.

3. **Marginal Response & Diminishing Return Hill Curve (`marginal_response_hill`)**:
   - Evaluates the derivative/marginal gain ($\frac{\Delta \text{Reach}}{\Delta \text{Frequency}}$) to identify the exact investment cliff.
   - Displays both instantaneous marginal reach gain and cumulative audience saturation.

4. **Multi-Campaign Comparative Matrix (`channel_efficiency_matrix`)**:
   - Compares campaigns, channels, or creatives across Reach %, Average Frequency, Total Volume, and Saturation Health Score.
   - Color-coded efficiency badges (Optimal, Under-Exposed, Saturated).

---

## 📊 Executive Telemetry HUD Scorecard

Provides 5 instant executive metrics calculated directly client-side across the entire dataset:
- **Total Gross Impressions / Volume**: Total ad delivery scale across all filtered segments.
- **Max Audience Reach %**: Peak reach achieved against target population.
- **Average Exposure Frequency**: Mean campaign exposure velocity ($\bar{f}$).
- **Corridor Efficiency Rate %**: Percentage of total impressions delivered within the sweet spot (3x–6x).
- **Ad Wearout / Waste Rate %**: Percentage of impressions delivered in over-saturated fatigue territory.

---

## ⚙️ Looker Configuration Options (Strictly 2 Clean Tabs)

### Section: `Display`
- **Layout Analysis Mode**: Select between 4 analytical layouts.
- **Show Executive Telemetry HUD**: Toggle the top KPI scorecards.
- **Target Reach Goal (%)**: Numerical input for the horizontal target reach line (default: `70%`).
- **Effective Frequency Min (Corridor Start)**: Minimum exposures for effective recall (default: `3`).
- **Effective Frequency Max (Corridor End)**: Maximum exposures before ad fatigue (default: `6`).
- **Model Fitting Engine**: Choose between `Bimodal / Modified Negative Binomial (MBB)`, `Hill Saturation Equation`, or `Empirical Discrete Bins`.
- **Show Diminishing Return Inflection**: Toggle the optimal inflection circle and label.
- **Enable Entity & Campaign Search Bar**: Live search filter across campaigns or categories.
- **Value Metric Formatting**: Compact number, Currency, Integer, or Percentage.

### Section: `Style`
- **Color Theme**:
  - `Google Enterprise Blue` (Clean modern enterprise)
  - `Nielsen Broadcast (Midnight / Gold)`
  - `Streaming Crimson (Charcoal / Red)`
  - `Cyberpunk Ad-Ops (Dark Mode)`
  - `Emerald Growth (Light Mode)`
- **Curve Smoothing Interpolation**: Monotone Cubic, Catmull-Rom Spline, Basis Spline, or Linear Segments.
- **Show Background Gridlines**: Subtle Cartesian gridlines.
- **Show Data Point Markers**: Toggle SVG circle markers on data points.

---

## 📋 Required Data Fields

| Field Type | Requirement | Suggested `thelook` Field |
| :--- | :--- | :--- |
| **Dimension** | 1 Category, Channel, Campaign, or Placement dimension | `products.category` or `users.traffic_source` |
| **Measure 1** | Primary Volume Measure (Impressions, Spots, Orders, Clicks) | `order_items.order_count` |
| **Measure 2** (Optional) | Secondary Value Measure (Ad Spend, Sales, GRPs, Target Reach) | `order_items.total_sale_price` |

---

## 📦 Scalability & Performance

- **Expanded Row Limit (5,000+ rows)**: Aggregates high-cardinality campaign logs in sub-5ms using typed arrays and single-pass reduction.
- **Zero Memory Leaks**: Clean DOM recycling, unbinding listeners on re-render, and debounced `ResizeObserver` with 4px jitter guard.
- **Native Looker Drill-Down**: Fully supports clicking any point, bar, or corridor to trigger Looker's native drill-down modal (`LookerCharts.Utils.openDrillMenu`).

---

## 🛠️ Enterprise Flexibility & Configuration Options (Upgraded 2026-10-28)

The visualization implements Looker's strict **2-Tab Options Architecture** (`Display` and `Style`) to avoid crowding Edit Viz modal headers, while providing full customization across enterprise media and marketing use cases:

### Tab 1: `Display`
- **Dynamic Field-Role Mapping**: Dynamic dropdowns (`_registerDynamicFieldOptions`) for:
  - `Primary Channel / Dimension`: Select which query column identifies the channel, campaign, or network (e.g., `broadcast_programming.network`).
  - `Secondary Segment / Group Dimension`: Optional breakdown dimension for dayparts, creative versions, or target demographics.
  - `Gross Delivery / Impressions Measure`: Select query measure driving delivery volume (e.g., `ad_spot_airings.total_airing_spots`, impressions, or GRPs).
  - `Spend / Benchmark Measure`: Select comparison measure for financial allocation, budget, or benchmark targets.
- **Configurable Benchmark Reference Lines**:
  - `Target Reach Benchmark Mode`: Choose from `Fixed Value Target`, `Spend / Target Measure Column`, `Dataset Mean Reach`, `Dataset Median Reach`, `Top Quintile (P80 Benchmark)`, or `None / Hide Target Line`.
  - `Target Reach Goal (%)`: Numeric goal (default: `70%`).
  - `Reference Line Label`: Custom label for the horizontal benchmark line (default: `Target Reach Goal`).
  - `Effective Frequency Min / Max`: Customize the corridor boundaries (default: `3x` to `6x`).
- **Sorting & Top-N Bucketing**:
  - `Channel Sorting & Ordering`: `Metric Volume Descending`, `Metric Volume Ascending`, `Alphabetical by Name`, or `Natural Query Order`.
  - `Top-N Channel Limit`: Filter to Top 5, 10, 15, 20, 30 channels or show All.
  - `Rollup Excluded Channels into 'Other'`: Automatic aggregate rollup for long-tail placements.
  - `Suppress Zero / Null Delivery Channels`: Clean data suppression toggle.
- **HUD & Label Density**:
  - `Executive KPI HUD Mode`: Toggle between `Full Scorecard (5 KPI Chips)`, `Compact Metric Strip (3 Core Metrics)`, or `Hidden (Maximum Canvas)`.
  - `Data Value Label Density`: `Peaks & Inflection Points Only`, `All Data Points`, or `Hidden`.
  - `Custom Chart Title & Subtitle Override`: Directly override headers inside the visualization.
  - `Channel & Campaign Search Bar`: Interactive search and real-time filtering bar.

### Tab 2: `Style`
- **Color Themes & Brand Palettes**:
  - `Google Enterprise Blue (Light)`
  - `Modern Executive Slate (Indigo & Charcoal)`
  - `Cyber Ad-Ops (Dark Mode)`
  - `Emerald Growth (Light Mode)`
  - `Nielsen Broadcast (Midnight / Gold)`
  - `Streaming Crimson (Charcoal / Red)`
  - `Wellverse Healthcare (Teal & Coral)`
  - `Custom Primary Hex Accent`
- **Custom Hex Overrides**: Primary Accent Hex (`display: 'color'`), Positive Benchmark Hex (`display: 'color'`), and Warning / Wearout Hex (`display: 'color'`).
- **Metric Polarity**: Toggle between `Higher is Better` (Audience Reach & Delivery) and `Lower is Better` (Ad Wearout & Saturation Waste).
- **Typography & Font Scaling**: `Compact (Dashboard Grid)`, `Standard (Balanced)`, and `Large Presentation (Executive Display)`.
- **Value Metric Formatting**: `Auto`, `Compact Number (1.2M)`, `Compact Currency ($1.2M)`, `Percentage (12.3%)`, `Standard Integer (1,234)`, `Decimal 2dp (1,234.56)`, or `Raw Unformatted`.
- **Curve Smoothing**: `Monotone Cubic Spline`, `Catmull-Rom Spline`, `Basis Spline`, or `Linear Segments`.
- **Gridlines & Markers**: Independent toggles for background gridlines and data point markers.
