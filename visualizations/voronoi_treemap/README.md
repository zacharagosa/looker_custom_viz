# Voronoï Hierarchical Tessellation Map (`voronoi_treemap`)

An enterprise-grade **Voronoï Hierarchical Tessellation Map** custom visualization for Google Cloud Looker, engineered with **D3.js v7** and **d3-delaunay**.

Built to resolve Google-Internal Buganizer Cloud Blockers (**b/342918021**, **b/419201948**, and YAQS thread **894102948192384712**), this visualization delivers organic non-overlapping polygonal cell partitioning for high-cardinality hierarchies, eliminating rectangular aspect-ratio distortion and elongated slivers commonly seen in traditional treemaps.

---

## 🌟 Key Capabilities & Enterprise Features

1. **Multi-Modal Tessellation Geometries**:
   - **Convex Voronoï Cells (Organic)**: Natural organic polygonal cell boundaries generated via Delaunay triangulation and weighted Voronoi seeds.
   - **Relaxed Lloyd Cells (Equi-Aspect)**: Iterative Lloyd relaxation smoothing cell centroids toward equal aspect ratios and balanced visual prominence.
   - **Concentric Radial Slices**: Concentric radial sunburst/arc partitioning grouping category parents and leaf children around a circular focal point.
   - **Squarified Treemap (Rectangular Fallback)**: Classical squarified treemap layout maintaining area proportionality.

2. **Expanded Row Limit Scalability (5,000+ Rows)**:
   - Client-side O(N) hierarchical tree rollup grouping parent categories, child entities, and transaction volumes.
   - Configurable **Top-N Capacity Limiter** (`Top 12`, `16`, `25`, `40`, `60`, or `All`) with automatic long-tail aggregation into a unified `"+N Other Categories"` cell.
   - Zero and null suppression toggle.

3. **Dynamic Field-Role Mapping**:
   - Directly configure **Parent Hierarchy Dimension**, **Child / Leaf Dimension**, **Primary Volume Measure**, and optional **Comparison / Target Measure** via UI dropdowns without editing LookML explore ordering.

4. **Benchmark References & Anomaly Detection**:
   - Benchmark cell volumes against **Dataset Mean**, **Dataset Median**, **Percentiles P75/P90**, **Fixed Target Value**, or a dedicated **Target Measure Column**.
   - Configurable Anomaly Threshold (%) flagging high-surge cells with visual status badges in the interactive HUD.

5. **Executive Flow KPI HUD & Interactive Exploration**:
   - Multi-density HUD modes (`Full Scorecard Strip`, `Compact Strip`, or `Hidden`).
   - Displays **Total Volume**, **Active Cell Count**, **Top Dominant Cell** with market share %, and **Benchmark Reference Target**.
   - Real-time instant search input with dynamic non-matching cell dimming.
   - Interactive click-to-pin cell isolation.
   - Native Looker drill-down menu integration via `LookerCharts.Utils.openDrillMenu`.

6. **Strict 2-Tab Options Hierarchy**:
   - **Display**: Layout Mode, Parent/Child/Volume/Target Overrides, Target Mode/Value/Label/Threshold, Sort Order, Top-N Limiter, Other Rollup, Null Suppression, HUD Mode, Data Label Density, Custom Title/Subtitle, Quick Search.
   - **Style**: Color Palette (Google Enterprise, Modern Slate, Cyberpunk Glow, Emerald FinOps, Sunset Media, Wellverse Healthcare, Custom Hex Override), Custom Hex Overrides, Metric Polarity, Font Scale, Value Number Formatting, Cell Padding, Border Stroke, Cell Opacity.

---

## 📊 Data Shape Requirements

| Field Type | Required Count | Purpose | Example (`thelook::events`) |
| :--- | :--- | :--- | :--- |
| **Dimension 1** | `1` *(Required)* | Parent Category / Grouping | `events.browser` |
| **Dimension 2** | `1` *(Required)* | Child Entity / Leaf Category | `events.event_type` |
| **Measure 1** | `1` *(Required)* | Primary Volume / Frequency Metric | `events.count` |
| **Measure 2** | `0 to 1` *(Optional)* | Target / Comparison Metric | *Optional* |

---

## 🚀 LookML Manifest Setup

```lookml
visualization: {
  id: "voronoi_treemap"
  label: "Voronoï Hierarchical Tessellation Map"
  file: "visualizations/voronoi_treemap.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
