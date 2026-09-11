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

## ✨ Core Capabilities

### 1. Multi-Mode Adaptability
Switch between 4 functional visual representations with a single dropdown:
- **Polygon Radar (Spider Web)**: Classic equi-angular polygon grid with semi-transparent shaded area polygons, radial spokes, and vertex markers.
- **Coxcomb / Nightingale Rose**: Circular angular wedge sectors whose radial length represents metric magnitude.
- **Radial Spoke Bar / Lollipop**: Clean circular baseline with directional radial lollipop bars projecting outward.
- **Small Multiples Facet Grid**: Matrix of mini radar charts comparing all entities side-by-side in a responsive grid.

### 2. Multi-Unit Scale Normalization
Solves the fundamental radar chart challenge of comparing metrics with completely different units (e.g. `$ Revenue`, `Order Count`, `Days Latency`, `Margin %`):
- **Independent 100% Max per Spoke**: Normalizes each spoke independently to its own maximum, enabling balanced multivariable comparison across mixed units.
- **Global Absolute Scale**: Shared absolute scale across all spokes (ideal for percentage or index metrics).
- **Benchmark Median Ratio Ring**: Indexes each metric to its cohort median / baseline ring (100% = Baseline), where overperforming metrics project outward and underperforming metrics sit inward.

### 3. High-Density Scalability (5,000+ Rows)
- **Client-Side Rollup & Aggregation**: Automatically averages or rolls up multi-row entities when queries exceed thousands of rows.
- **Top-N Slicing**: Instantly slice to Top 3, 5, 10, 25, or All entities to eliminate visual clutter.
- **Search-as-you-type Filter**: Instantaneous client-side search across all entities.
- **Paginated Small Multiples**: Renders hundreds of faceted entities smoothly without frame drops.

### 4. Minimal Option Sections (No Crowded Modals)
Conforming strictly to Looker UI UX best practices, options are consolidated into **exactly 2 clean tabs**:
- `Display`: Display Mode, Normalization Mode, Entity Slice Limit, Metric Format, Concentric Grid Rings, Spoke Labels, Legend Pills, Search Box, Executive HUD.
- `Style`: Color Palette Theme (Google Modern, Cyber Neon, Emerald Mint, Sunset Ember, Executive Slate), Web Background Shape (Polygon vs Circle), Line Interpolation (Linear vs Cardinal Spline), Area Fill Opacity, Stroke Thickness.

### 5. Dynamic Interactivity & Drilldown
- **Interactive Entity Focus**: Clicking any entity pill in the legend isolates that entity and dims the rest.
- **Rich Hover Tooltips**: Displays formatted values, raw values, normalized spoke percentage scores, and entity details.
- **Looker Drill Menus**: Native Looker drill-down links integrated directly onto vertex markers and data points.

---

## 📊 Data Shape Requirements

The visualization flexibly supports **three distinct data shapes**, making it universally compatible with any Looker Explore:

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
