# 🕸️ Multivariate Radar & Polar Balance Chart

An enterprise-grade, high-density **Multivariate Radar, Polar, and Spider Balance Chart** built with **D3.js v7** for Looker and Looker Studio.

---

## 🎯 Business Problem & Inspiration

Out-of-the-box Looker visualizations lack native support for radar, polar, and spider charts, leaving customer engineering teams and analysts without an effective way to evaluate multi-dimensional performance balance, benchmark variance, and trade-offs.

This custom visualization directly addresses validated enterprise blockers and internal escalation requests:
1. **Buganizer Cloud Blocker [b/453718648](https://b.corp.google.com/issues/453718648)**: *"Google-Supported Radar Chart in Looker & Looker Studio"* — enterprise customers requiring a trusted, first-party radar chart for executive reviews and multidimensional scoring.
2. **Buganizer Cloud Blocker [b/184359819](https://b.corp.google.com/issues/184359819)**: *"Spider Chart Viz"* — customer requirements to visualize competitive footprint and performance variance across 4–12 quantitative metrics.
3. **Buganizer Issue [b/525330147](https://b.corp.google.com/issues/525330147)**: *"Radar Chart (Spider Chart) visualization in Looker Studio"* — high-performance athletic, telecom, and operational scoring requirements.
4. **Internal YAQS & Agentrics Architecture (`go/agentrics-docs-spider-chart`)**: Google leadership's reliance on normalized 6-axis spider charts comparing multivariate tool adoption, velocity, code quality, autonomy, sentiment, and token consumption against company-wide benchmark rings.

---

## ✨ Core Capabilities & Flexibility Upgrade

### 1. Multi-Mode Adaptability
Switch between 4 functional visual representations with a single dropdown:
- **Polygon Radar (Spider Web)**: Classic equi-angular polygon grid with semi-transparent shaded area polygons, radial spokes, vertex markers, and benchmark targets.
- **Coxcomb / Nightingale Rose**: Circular angular wedge sectors whose radial length represents metric magnitude.
- **Radial Spoke Bar / Lollipop**: Clean circular baseline with directional radial lollipop bars projecting outward.
- **Small Multiples Facet Grid**: Matrix of mini radar charts comparing all entities side-by-side in a responsive grid.

### 2. Dynamic Field-Role Mapping
- **Entity Dimension Override**: Dropdown dynamically populated from live query dimensions to re-map which column acts as the primary entity without reordering Looker Explore columns.
- **Group Dimension Override**: Select cohort/group dimension for segmented small multiples.
- **Primary Measure Override**: Re-map primary metric column.
- **Benchmark / Target Measure Override**: Optional second measure column to act as benchmark ring.

### 3. Configurable Benchmark Lines, Goals & Anomaly Thresholds
- **Target Mode**: None, Fixed Goal Value, Dataset Mean, Dataset Median (P50), Top Quartile (P75), or Elite Frontier (P90).
- **Custom Benchmark Label**: Configurable reference line label.
- **Anomaly Threshold**: Automatically audits spoke deviation against cohort median and flags asymmetrical outliers.

### 4. Sorting, Top-N Slicing & Rollup
- **Interactive Sort Order**: Highest Aggregate Metric First, Lowest First, Alphabetical (A-Z), or Query Default.
- **Top-N Slicing with 'Other' Rollup**: Slices Top 3, 5, 8, 10, 15, 25, or All entities, with an optional toggle to consolidate remaining entities into a synthetic `"Other (Rollup)"` series.
- **Zero & Null Suppression**: Cleanses sparse queries and missing attributes automatically.

### 5. Executive Scorecard HUD & Label Density
- **HUD Density**: Full Scorecard (Multivariate Balance Score %, Leader Footprint, Target Attainment, Anomaly Alerts), Compact Status Strip, or Hidden (maximum canvas space).
- **Vertex Labels**: All Values, Min/Max Peaks Only, or Hidden.
- **Custom Header Overrides**: Configurable custom chart title and subtitle.

### 6. Custom Brand Palettes & Typography
- **Enterprise Palettes**: Google Enterprise, Modern Slate, Cyberpunk Dark (NOC / Telemetry), Emerald FinOps, Sunset Media & Coral, Wellverse Healthcare, or Custom Hex Override.
- **Custom Hex Overrides**: Primary Leader Hex, Positive/Pass Hex, Negative/Lag Hex.
- **Metric Polarity**: Higher is Better vs Lower is Better (for latency/churn/cost).
- **Typography Scale**: Compact (high density dashboard), Standard, or Large Presentation (executive wallboard).
- **Value Formatting**: Auto (from LookML), Compact Number, Compact Currency, Percentage, Decimal 2dp, or Raw.

### 7. Strictly 2 Clean Option Tabs
Conforming strictly to Looker UI UX best practices, options are consolidated into **exactly 2 clean tabs** (`Display` and `Style`) to prevent header crowding in the Edit Viz modal.

---

## 📊 Data Shape Requirements

The visualization flexibly supports **three distinct data shapes**:

### Shape A: Multi-Measure (Wide Format - Recommended)
- **Dimensions**: 1 Dimension (Entity name, e.g. `products.category`, `users.traffic_source`, or `reps.name`).
- **Measures**: 3 to 12 Numeric Measures (e.g. `total_sale_price`, `gross_margin`, `order_count`, `average_shipping_time`, etc.).

### Shape B: Pivoted Query (Long Format)
- **Dimensions**: 1 Dimension (Spoke / Metric name).
- **Pivots**: 1 Pivot Dimension (Entity name).
- **Measures**: 1 Numeric Measure (Value).

### Shape C: Two Dimensions (Normalized Long Format)
- **Dimensions**: Dimension 1 (Entity name) + Dimension 2 (Spoke / Metric name).
- **Measures**: 1 Numeric Measure (Value).

---

## 🚀 LookML Manifest Snippet

```lookml
visualization: {
  id: "radar_polar_chart"
  label: "Multivariate Radar & Polar Balance Chart"
  file: "visualizations/radar_polar_chart.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
