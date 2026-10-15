# 🛒 UpSet Set-Intersection & Market Basket Affinity Grid

An enterprise-grade, high-density matrix-based set-intersection and market basket affinity visualization for Looker built with **D3.js v7**.

Solves long-standing Google-Internal Buganizer Cloud Blockers and enterprise retail/e-commerce requirements:
- **b/396288129**: *Multi-Set Overlap & UpSet Plot Support for Customer Cohorts [Cloud Blocker]*
- **b/482910482**: *Market Basket Co-Occurrence & Affinity Matrix [Cloud Blocker]*
- **b/519284711**: *UpSet Plot Visualization for Cross-Category Affinity & Product Bundling*
- Replaces failed Venn/Euler diagrams that become unreadable beyond 3 sets with a scalable combination matrix and dual marginal/intersection bar charts.

---

## 🚀 Key Highlights & Architectural Features

1. **Multi-Modal Visual Paradigms**:
   - **Classic UpSet Matrix (`upset_matrix`)**: Upper vertical bar chart encoding intersection size/volume, left horizontal bar chart encoding marginal single-set sizes, and bottom-right combination dot matrix connecting active co-occurring sets.
   - **Pairwise Affinity Heatmap (`affinity_heatmap`)**: Symmetric pairwise co-occurrence grid with dual-metric encoding (frequency count + affinity lift ratio).
   - **Radial Set-Affinity Chord (`radial_chord`)**: Circular set-to-set connection ribbons showing relative affinity flow.

2. **Enterprise Flexibility Engine (`options`)**:
   - **Dynamic Field-Role Dropdowns (`Display`)**: Live query reflection via Looker's `registerOptions` trigger. Re-map Primary Set (Category A), Secondary Set (Category B), optional Tertiary Set, Primary Frequency Measure, and Secondary Affinity Lift Measure.
   - **Benchmark Target Modes (`Display`)**: Dataset Mean (Average Intersection Size), Dataset Median (P50), Top Quartile (P75), Elite Performer (P90), or Fixed Goal Value with underperformance alert tracking.
   - **Density & Rollup Controls (`Display`)**: Top-N Combination Limit (Top 10 to Top 50, or All), automatic `+ Other Combinations` rollup, zero/null suppression, and 5 interactive sorting modes (`size_desc`, `size_asc`, `degree_desc`, `degree_asc`, `alpha`).
   - **Executive KPI HUD (`Display`)**: Real-time summary strip tracking Total Volume, Active Sets Count, Top Co-Purchased Bundle, Benchmark Quota Attainment, and Total Combinations.
   - **Brand Color Themes (`Style`)**: Google Enterprise, Modern Slate & Indigo, Cyberpunk Dark, Emerald FinOps, Sunset Media, Wellverse Healthcare, and Custom Hex Overrides.
   - **Typography & Polarity (`Style`)**: Metric polarity toggle (`Higher is Better` vs `Lower is Better`), 3-tier font scale, and value formatting (`Auto`, `Compact Number`, `Compact Currency`, `Percentage`, `Decimal 2dp`, `Raw`).

3. **High-Performance Scalability (5,000+ Rows)**:
   - Client-side O(N) multi-set co-occurrence aggregation with fast bitset hashing.
   - Debounced `ResizeObserver` (<4px guard) ensuring fluid resizing without layout thrashing.
   - Looker native drill menu integration on click (`LookerCharts.Utils.openDrillMenu`).

---

## 📊 LookML / Explore Requirements

| Dimension / Measure | Requirement | Purpose |
| :--- | :--- | :--- |
| **Primary Set Dimension** | Required (1st Dim) | Base set / Category A (e.g. `product_a.category`) |
| **Secondary Set Dimension** | Required (2nd Dim) | Co-occurring set / Category B (e.g. `product_b.category`) |
| **Tertiary Set Dimension** | Optional (3rd Dim) | Additional attribute or tag dimension |
| **Primary Measure** | Required (1st Meas) | Intersection volume / joint frequency (e.g. `affinity.joint_order_freq`) |
| **Secondary Measure** | Optional (2nd Meas) | Affinity lift or support ratio (e.g. `affinity.combined_affinity`) |

---

## 🛠️ Configuration Options

### Display Tab
- `layoutMode`: Visual paradigm mode (`Classic UpSet Plot`, `Pairwise Affinity & Co-Occurrence Heatmap`, `Radial Set-Affinity Chord Ribbon`).
- `primaryDimOverride`: Dynamic dropdown selecting Primary Set Dimension.
- `secondaryDimOverride`: Dynamic dropdown selecting Secondary Set Dimension.
- `tertiaryDimOverride`: Dynamic dropdown selecting Tertiary Set Dimension.
- `primaryMeasureOverride`: Dynamic dropdown selecting Intersection Frequency Measure.
- `secondaryMeasureOverride`: Dynamic dropdown selecting Affinity Score / Lift Measure.
- `targetCalculationMode`: Benchmark Target Mode (`None`, `Dataset Mean`, `Dataset Median`, `Percentile P75`, `Percentile P90`, `Fixed Goal Value`).
- `fixedTargetValue`: Numerical benchmark target value (default: `50`).
- `referenceLineLabel`: Reference line text label (default: `Affinity Benchmark`).
- `underperformanceThresholdPct`: Underperformance alert threshold percentage (default: `20%`).
- `sortOrder`: Intersection sort order (`size_desc`, `size_asc`, `degree_desc`, `degree_asc`, `alpha`).
- `topNCount`: Limit intersections to Top 10, 15, 20, 30, 50, or All.
- `showOthersRollup`: Toggle rolling remaining intersections into `+ Other Combinations`.
- `suppressZeros`: Filter out null or zero-value combinations.
- `hudMode`: Executive KPI HUD Mode (`Full Scorecard HUD`, `Compact KPI Strip`, `Hidden`).
- `labelDensity`: Data Label Density (`All Visible Bars`, `High-Volume Peaks Only`, `Hidden`).
- `customTitle`: Custom chart title text override.
- `customSubtitle`: Custom chart subtitle text override.
- `showSearch`: Toggle search-as-you-type filter input.

### Style Tab
- `colorPalette`: `Google Enterprise`, `Executive Slate & Indigo`, `Emerald FinOps`, `Sunset Media`, `Cyberpunk Dark`, `Wellverse Healthcare`, or `Custom Hex Overrides`.
- `customPrimaryColor`: Custom primary bar and active dot color.
- `customPositiveColor`: Custom positive / outperforming color.
- `customNegativeColor`: Custom negative / underperforming color.
- `metricPolarity`: `Higher is Better` vs `Lower is Better`.
- `fontScale`: Font Scale (`Compact 85%`, `Standard 100%`, `Large Presentation 115%`).
- `valueFormat`: `Auto`, `Compact Number (1.2M)`, `Compact Currency ($1.2M)`, `Percentage (45.2%)`, `Decimal 2dp (1,234.56)`, `Raw Number`.
- `dotRadius`: Matrix Dot Radius (`Small 4px`, `Medium 6px`, `Large 8px`).
- `hoverEffect`: Elevate & Glow Focus, Brighten Fill, or Subtle Border Highlight.
