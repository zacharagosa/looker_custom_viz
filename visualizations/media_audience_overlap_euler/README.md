# Media Audience Overlap & Co-Viewing Euler Matrix

![Media Audience Overlap & Co-Viewing Euler Matrix](screenshot.png)

An executive-grade audience deduplication, cross-platform co-viewing, and incremental reach visualization for television networks, streaming platforms (SVOD/AVOD), broadcast conglomerates, and ad-ops planning teams, engineered with D3.js v7.

Designed for **broadcast television networks & digital streaming services**, **cross-media reach & frequency planning**, **advertiser campaign audience deduplication**, and **content genre / demographic affinity analysis**.

---

## 🌟 Key Capabilities

1. **Multi-Modal Analytical Layouts (`layoutMode`)**:
   - **`euler_circles` (Proportional Euler / Venn Circles)**: Smooth, proportional circles representing each media network / platform with interactive physics-based placement optimizing pairwise overlap distances and co-viewing areas.
   - **`overlap_matrix` (Co-Viewing & Affinity Grid)**: Symmetrical pairwise matrix displaying cross-platform audience duplication percentages, shared GRPs/ratings, and Jaccard co-viewing affinity indices.
   - **`reach_composition` (Exclusive vs. Shared Reach Stack)**: Horizontal waterfall/stacked bar chart isolating 100% incremental exclusive audience vs. shared / duplicate audience across channels.
   - **`demographic_affinity` (Demographic Split Bubbles)**: Multi-group bubble plot mapping audience reach and affinity concentration across age/gender demographic brackets.

2. **Clean 2-Section Configuration (`Display` & `Style`)**:
   - Adheres strictly to the 2-tab configuration standard (`Display` and `Style`), preventing Looker's Edit Viz modal tabs from crowding or wrapping.

3. **Dynamic Field-Role Dropdowns (`Display`)**:
   - Populated dynamically from live query dimensions and measures via Looker's `registerOptions` trigger.
   - Allows users to re-map Primary Network Dimension, Segment/Genre Dimension, Demographic Dimension, Reach Measure, and Secondary Measure without reordering columns.

4. **Scalable Client-Side Aggregation (5,000+ Rows)**:
   - High-performance O(N) client-side data summarization calculates network totals, demographic segments, and pairwise co-viewing intersections.
   - Dynamic **Top-N Limiter** with automatic **'(Other)'** rollup maintains optimal visual clarity and 60 FPS animation.

5. **Executive Media KPI HUD & Native Looker Drill-Down**:
   - Top banner scorecard summarizing Total Unduplicated Audience/GRPs, Average Overlap Rate %, Dominant Platform, Incremental Reach %, and Most Affine Pair.
   - Full support for Looker drill-down menus (`LookerCharts.Utils.openDrillMenu`).

---

## 📊 Data Requirements

| Field Role | Required | Description | Example (`tvun_media_analytics`) |
| :--- | :--- | :--- | :--- |
| **Network / Platform Dimension** | **Yes** | Broadcast Network or Streaming Service | `broadcast_programming.network` |
| **Segment / Genre Dimension** | Optional | Content Genre, Daypart, or Show | `broadcast_programming.genre` |
| **Demographic Dimension** | Optional | Target Age/Gender Demographic | `nielsen_ratings_markets.target_demographic` |
| **Reach / Ratings Measure** | **Yes** | Primary quantitative metric (GRPs, Impressions, Viewers) | `nielsen_ratings_markets.total_grps` |
| **Secondary Measure** | Optional | Secondary metric (Ad Spend, Spot Count, CPP) | `ad_spot_airings.total_spend_mxn` |

---

## ⚙️ Configuration Options

### 📋 Display Section
- **Visualization Layout Mode (`layoutMode`)**: `euler_circles` (Proportional Euler Circles), `overlap_matrix` (Co-Viewing & Affinity Grid), `reach_composition` (Exclusive vs. Shared Reach Stack), `demographic_affinity` (Demographic Split Bubbles).
- **Dynamic Field-Role Dropdowns**:
  - `networkFieldOverride`: Media Network / Platform Dimension.
  - `segmentFieldOverride`: Content Segment / Genre Dimension.
  - `demoFieldOverride`: Target Demographic Dimension.
  - `reachMeasureOverride`: Reach / Ratings Measure.
  - `secondaryMeasureOverride`: Secondary Measure (e.g. Spend / Spots).
- **Target Benchmark Mode (`targetCalculationMode`)**: `none`, `dataset_mean`, `dataset_median`, `percentile_p90`, `fixed`.
- **Fixed Benchmark Target Value (`fixedTargetValue`)**: Numeric target benchmark for variance indicators.
- **Benchmark Reference Line Label (`referenceLineLabel`)**: Custom label for target badge (e.g. `Target GRPs`).
- **Network / Platform Sort Order (`sortBy`)**: `reach_desc`, `reach_asc`, `overlap_desc`, `alpha`.
- **Top-N Platforms Limit (`topNLimit`)**: Truncate graph to top 3, 4, 5, 6, 8, or All platforms.
- **Bundle Remainder into 'Other' (`bundleOther`)**: Aggregate low-reach tail into an `(Other)` entity.
- **Suppress Zero / Null Data (`suppressZeroNull`)**: Exclude zero or null records.
- **Executive Media KPI HUD Mode (`hudMode`)**: `scorecard` (Full Media Scorecard), `compact_strip`, `none`.
- **Data Value Labels Density (`showDataLabels`)**: `all`, `peaks_only`, `off`.
- **Show Cross-Platform Tooltips (`showTooltips`)**: Toggle interactive hover inspection cards.
- **Custom Chart Title Override (`customTitle`)**: Headline title override.
- **Custom Subtitle / Description Override (`customSubtitle`)**: Subtitle or methodology note override.
- **Show Search & Filter Bar (`showSearch`)**: Real-time interactive entity filter.

### 🎨 Style Section
- **Brand Palette Preset (`colorTheme`)**: `sunset_media` (Default), `google_enterprise`, `wellverse_healthcare`, `modern_slate`, `cyberpunk_dark`, `emerald_finops`, `executive_slate`, `custom`.
- **Custom Primary / Main Brand Hex (`customPrimaryColor`)**: Fine-grained color override.
- **Custom Positive / High Affinity Hex (`customPositiveColor`)**: Highlight color for peak overlap.
- **Custom Negative / Low Affinity Hex (`customNegativeColor`)**: Dimming color for isolated platforms.
- **Metric Polarity (`metricPolarity`)**: `higher_better` (GRPs/Reach/Impressions) vs `lower_better` (Churn/CPM).
- **Typography & Font Scaling (`fontScale`)**: `compact`, `standard`, `large`.
- **Value & Metric Format (`valueFormat`)**: `auto`, `compact_number`, `compact_currency`, `full_number`, `percentage`, `decimal_2`, `raw`.
- **Circle / Ribbon Opacity (`shapeOpacity`)**: Opacity slider (`0.2` to `0.85`, default `0.55`).
