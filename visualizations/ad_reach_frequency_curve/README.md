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
