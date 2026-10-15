# 🗂️ Interactive Hierarchical Drilldown Treemap

An enterprise-grade, high-density hierarchical treemap visualization for Looker built with **D3.js v7**.

Solves long-standing Google-internal Buganizer Cloud Blockers and enterprise customer requirements:
- **b/328594464**: *Treemap Visualization for Looker [Cloud Blocker]*
- **b/396197680**: *Treemap Color by dimension [Cloud Blocker]*
- **b/530822261**: *Native "Top N and Others" Visualization Bucketing [Cloud Blocker]*
- **b/325124429**: *Woolworths - Availability of new visualization features: Treemap Support*

---

## 🚀 Key Highlights & Architectural Features

1. **Multi-Mode Hierarchical Layouts**:
   - **Hierarchical Drilldown (Zoom & Breadcrumbs)**: Smooth animated zoom transitions when clicking any parent category. Interactive breadcrumb trail (`🏠 All Categories > Men > Jeans`) enables instant single-click drill-up navigation.
   - **Nested Multi-Tier**: Renders all levels of the hierarchy simultaneously with styled category ribbons and child bounding boxes.
   - **Dynamic Top-N & Others Bucketing**: Slices the top N leaf items (Top 10, 20, 50, 100) and automatically aggregates long-tail items into an interactive `+N Others` tile (b/530822261).

2. **Dual-Metric Visual Encoding (b/396197680)**:
   - **Tile Size**: Proportional to Primary Measure (e.g. Total Revenue, Order Volume).
   - **Tile Color**:
     - *Branch Categorical*: Distinct Looker Modern hues per top-level branch with depth-calibrated tinting.
     - *Secondary Metric Diverging*: Continuous gradient (Red -> Amber -> Green) based on Secondary Measure (e.g. Gross Margin % or YoY Growth).
     - *Secondary Metric Sequential*: Smooth gradient (Light Blue -> Deep Indigo).
     - *Depth Shading*: Monochromatic level shading.

3. **High-Density Scalability (5,000+ Rows)**:
   - Capable of processing 5,000+ rows directly from Looker with recursive client-side tree rollups (`d3.hierarchy().sum().sort()`).
   - Dynamic thresholding aggregates leaf nodes under 0.5% into consolidated buckets to ensure fluid 60 FPS transitions.

4. **Dynamic Field-Role Dropdowns (`Display`)**:
   - Dynamic dropdown selectors automatically populated from query dimensions and measures via Looker's `registerOptions` trigger. Re-map L1, L2, L3 hierarchy dimensions, primary sizing measure, and secondary color measure without altering Looker Explore column orders.

5. **Configurable Benchmark Targets & Reference Lines (`Display`)**:
   - Built-in benchmark target calculation modes: Dataset Mean (L1 Average), Dataset Median (P50), Top Quartile (P75), Elite Performer (P90), or Fixed Goal Value.
   - Real-time underperformance alert flags and count tracking in the Executive HUD.

6. **Executive KPI HUD & Real-Time Search (`Display`)**:
   - Multi-density HUD modes (`Full Scorecard`, `Compact KPI Strip`, `Hidden`).
   - Real-time search-as-you-type filter input highlighting matching branches with an amber glow.
   - Custom chart title and subtitle text overrides.

7. **Brand Palettes, Polarity & Typography (`Style`)**:
   - 6 Curated Enterprise Themes: Looker / Google Modern, Executive Slate & Indigo, Emerald FinOps, Sunset Media, Cyberpunk Dark, Wellverse Healthcare, plus Custom Hex Overrides.
   - Metric Polarity Toggle (`Higher is Better` vs `Lower is Better` for latency/cost/churn).
   - Value formatting: Auto, Compact Currency (`$1.2M`), Compact Number (`1.2M`), Percentage (`45.2%`), Decimal 2dp (`1,234.56`), Raw.

---

## 📊 LookML / Explore Requirements

| Dimension / Measure | Requirement | Purpose |
| :--- | :--- | :--- |
| **Dimensions** (1 to 6) | Required (≥1) | Hierarchy branches (e.g. `Department > Category > Brand > SKU`) |
| **Primary Measure** | Required (1st Measure) | Determines tile surface area / volume (e.g. `Total Sale Price`) |
| **Secondary Measure** | Optional (2nd Measure) | Determines color gradient or sub-label (e.g. `Gross Margin %`) |

---

## 🛠️ Configuration Options

### Display Tab
- `displayMode`: Choose between `Hierarchical Zoom & Breadcrumbs`, `Nested Multi-Tier`, or `Dynamic Top-N & Others Bucketing`.
- `tilingMethod`: Choose between `Squarified`, `Binary`, or `Dice`.
- `colorMode`: Choose between `Categorical by Branch`, `Secondary Metric Diverging`, `Secondary Metric Sequential`, or `Depth Shading`.
- `primaryDimOverride`: Dynamic dropdown selecting Primary Hierarchy Dimension (L1).
- `secondaryDimOverride`: Dynamic dropdown selecting Secondary Hierarchy Dimension (L2).
- `tertiaryDimOverride`: Dynamic dropdown selecting Tertiary Hierarchy Dimension (L3).
- `primaryMeasureOverride`: Dynamic dropdown selecting Primary Measure (Tile Sizing).
- `secondaryMeasureOverride`: Dynamic dropdown selecting Secondary Measure (Color / Badge).
- `targetCalculationMode`: Benchmark Target Mode (`None`, `Dataset Mean`, `Dataset Median`, `Percentile P75`, `Percentile P90`, `Fixed Goal Value`).
- `fixedTargetValue`: Numerical target goal value (default: `100,000`).
- `referenceLineLabel`: Label for benchmark reference chip (default: `Benchmark Target`).
- `underperformanceThresholdPct`: Underperformance threshold percentage (default: `20%`).
- `sortOrder`: Node Hierarchy Sort Order (`Metric Descending`, `Metric Ascending`, `Alphabetical Name`, `Natural / Explore Order`).
- `topNCount`: Limit leaves to Top 10, 20, 50, 100, or All Nodes.
- `showOthersRollup`: Toggle grouping long-tail items into `+N Others` node.
- `suppressZeros`: Filter out null or zero-value tiles.
- `hudMode`: Executive KPI HUD Mode (`Full Scorecard HUD`, `Compact KPI Strip`, `Hidden`).
- `labelDensity`: Data Label Density (`All Visible Tiles`, `High-Value Peaks Only`, `Hidden`).
- `customTitle`: Custom chart title text override.
- `customSubtitle`: Custom subtitle text override.
- `showBreadcrumbs`: Toggle interactive breadcrumb navigation bar.
- `showSearch`: Toggle search-as-you-type filter input.
- `tilePadding`: Flush (0px), Compact (2px), Standard (4px), Relaxed (6px).

### Style Tab
- `colorTheme`: `Looker / Google Modern`, `Executive Slate & Indigo`, `Emerald FinOps`, `Sunset Media`, `Cyberpunk Dark`, `Wellverse Healthcare`, or `Custom Hex Overrides`.
- `customPrimaryColor`: Custom primary accent color picker.
- `customPositiveColor`: Custom positive / outperforming color picker.
- `customNegativeColor`: Custom negative / underperforming color picker.
- `metricPolarity`: `Higher is Better (Standard)` vs `Lower is Better (Inverted)`.
- `fontScale`: Font Scale / Text Density (`Compact 85%`, `Standard 100%`, `Large Presentation 115%`).
- `valueFormat`: `Auto`, `Compact Currency ($1.2M)`, `Compact Number (1.2M)`, `Percentage (45.2%)`, `Decimal 2dp (1,234.56)`, `Raw Number`.
- `tileCornerRadius`: Sharp (0px), Subtle (4px), Modern Rounded (8px).
- `showSecondaryMetricInLabel`: Toggle secondary measure display inside tile labels.
- `hoverEffect`: Elevate & Glow Focus, Brighten Fill, or Subtle Border.
