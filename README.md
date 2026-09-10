# Looker Custom Visualizations

A curated collection of modern, production-grade custom visualizations for Google Cloud Looker, built using leading data visualization libraries like **D3.js v7**, **Chart.js**, **Vega**, and **ApexCharts**.

This repository is continuously maintained by an autonomous daily AI automation that discovers unmet visualization needs from the Looker community, designs and codes novel visual components, and deploys them to Looker with automated demo queries and responsive container resizing (`ResizeObserver`).

---

## 🎨 Visualization Catalog

| Visualization | Category | Required Data Shape | Preview |
| :--- | :--- | :--- | :---: |
| [**Radial KPI Progress Gauge**](visualizations/radial_progress_gauge/)<br>`radial_progress_gauge` | Performance & Variance | 1–6 measures (or 1 dim + 1 meas) | [📸 View](assets/screenshots/radial_progress_gauge.png) |
| [**Calendar Activity Heatmap**](visualizations/calendar_activity_heatmap/)<br>`calendar_activity_heatmap` | Time Series & Schedules | 1 Date dim + 1 measure | [📸 View](assets/screenshots/calendar_activity_heatmap.png) |
| [**Stephen Few Bullet Graph**](visualizations/bullet_graph/)<br>`bullet_graph` | Performance & Variance | 1 dim + 1–3 measures | [📸 View](assets/screenshots/bullet_graph.png) |
| [**Dumbbell Divergence Plot**](visualizations/dumbbell_plot/)<br>`dumbbell_plot` | Performance & Variance | 1 dim + 1–2 measures (or 2 pivots) | [📸 View](assets/screenshots/dumbbell_plot.png) |
| [**Interactive US Choropleth Map**](visualizations/choropleth_map/)<br>`choropleth_map` | Geospatial Intelligence | 1 State dim + 1 measure | [📸 View](assets/screenshots/choropleth_map.png) |
| [**Sparkline Metric Matrix Table**](visualizations/sparkline_matrix_table/)<br>`sparkline_matrix_table` | Leaderboards & Grids | 1 dim + 1 pivot (or 2–6 measures) | [📸 View](assets/screenshots/sparkline_matrix_table.png) |
| [**Player & Customer Retention Decay**](visualizations/retention_cohort_decay/)<br>`retention_cohort_decay` | Telemetry & Cohort Decay | 1 Cohort + 1 Activity dim + 1 meas | [📸 View](assets/screenshots/retention_cohort_decay.png) |
| [**Broadcast Daypart Grid**](visualizations/broadcast_daypart_grid/)<br>`broadcast_daypart_grid` | Time Series & Schedules | 2 dims (Day + Hour) + 1–2 measures | [📸 View](assets/screenshots/broadcast_daypart_grid.png) |
| [**Network Topology Flow Graph**](visualizations/network_topology_graph/)<br>`network_topology_graph` | Flow, Networks & Hierarchy | 1–2 dims (Source + Target) + 1–3 meas | [📸 View](assets/screenshots/network_topology_graph.png) |
| [**Sankey Flow Diagram**](visualizations/sankey_flow_diagram/)<br>`sankey_flow_diagram` | Flow, Networks & Hierarchy | 2–8 sequential dims + 1–2 measures | [📸 View](assets/screenshots/sankey_flow_diagram.png) |
| [**Rank Bump & Trajectory Chart**](visualizations/rank_bump_chart/)<br>`rank_bump_chart` | Leaderboards & Grids | 1 entity dim + 1 pivot (or 2–12 meas) | [📸 View](assets/screenshots/rank_bump_chart.png) |
| [**Geospatial Flow Arc Map**](visualizations/flow_arc_map/)<br>`flow_arc_map` | Geospatial Intelligence | 1–2 dims (Origin + Dest) + 1–3 meas | [📸 View](assets/screenshots/flow_arc_map.png) |
| [**Telemetry & Conversion Funnel**](visualizations/telemetry_conversion_funnel/)<br>`telemetry_conversion_funnel` | Telemetry & Cohort Decay | 1–2 dims (Stage + Segment) + 1–2 meas | [📸 View](assets/screenshots/telemetry_conversion_funnel.png) |
| [**Collapsible Hierarchical Tree Grid**](visualizations/hierarchical_tree_table/)<br>`hierarchical_tree_table` | Leaderboards & Grids | 2–6 dims (Hierarchy) + 1–4 meas | [📸 View](assets/screenshots/hierarchical_tree_table.png) |
| [**Dual-Axis Multi-Layer Geo Map**](visualizations/multi_layer_geo_map/)<br>`multi_layer_geo_map` | Geospatial Intelligence | 1 State dim + 1–3 measures | [📸 View](assets/screenshots/multi_layer_geo_map.png) |

---

## 📸 Visual Gallery

### 1. Telemetry & Conversion Funnel
Curved pipeline stages, drop-off step-to-step variance badges, multi-segment stacking, and executive summary HUD.
![Telemetry & Conversion Funnel](assets/screenshots/telemetry_conversion_funnel.png)

### 2. Geospatial Flow & Route Arc Map
Origin-to-destination curved quadratic Bézier arcs over US TopoJSON geometry with animated particle pulses and hub selection.
![Geospatial Flow & Route Arc Map](assets/screenshots/flow_arc_map.png)

### 3. Network Topology & Latency Flow Graph
Force-directed topological mesh with collision simulation, latency threshold bottleneck detection, and edge packet animation.
![Network Topology & Latency Flow Graph](assets/screenshots/network_topology_graph.png)

### 4. Sankey Flow & Multi-Stage Allocation Diagram
Multi-stage flow ribbons with gradient color transitions, animated traffic particles, and hover flow path isolation.
![Sankey Flow & Multi-Stage Allocation Diagram](assets/screenshots/sankey_flow_diagram.png)

### 5. Rank Bump & Trajectory Chart
Temporal rank trajectory bump chart tracking entity position volatility, top gainers/fallers, and rank badge indicators.
![Rank Bump & Trajectory Chart](assets/screenshots/rank_bump_chart.png)

### 6. Player & Customer Retention Cohort Decay Matrix
Multi-cohort decay curves with benchmark average line synchronized above a triangular retention percentage heatmap.
![Player & Customer Retention Cohort Decay](assets/screenshots/retention_cohort_decay.png)

### 7. Broadcast Programming Schedule & Daypart Performance Grid
Nielsen standard daypart broadcast grid with 24-hour heat mapping, marginal day/hour totals, and peak rating indicators.
![Broadcast Programming Schedule & Daypart Performance Grid](assets/screenshots/broadcast_daypart_grid.png)

### 8. Interactive US Choropleth Map
Albers USA projected state-level choropleth map with quantile color breaks, gradient legend, and zoom controls.
![Interactive US Choropleth Map](assets/screenshots/choropleth_map.png)

### 9. Sparkline Metric Matrix Table
Multi-metric scorecard featuring inline SVG sparklines, volume micro-bars, variance badges, and sticky summary totals.
![Sparkline Metric Matrix Table](assets/screenshots/sparkline_matrix_table.png)

### 10. Stephen Few Executive Bullet Graph
Quantitative performance bars plotted against target markers and shaded qualitative performance tiers.
![Stephen Few Executive Bullet Graph](assets/screenshots/bullet_graph.png)

### 11. Dumbbell Divergence Plot (Connected Dot Plot)
Dual-point comparison dumbbells illustrating period-over-period or actual vs target divergence with directional arrow indicators.
![Dumbbell Divergence Plot](assets/screenshots/dumbbell_plot.png)

### 12. Radial KPI Progress Gauge
Concentric circular progress rings with goal attainment indicators and central metric readouts.
![Radial KPI Progress Gauge](assets/screenshots/radial_progress_gauge.png)

### 13. Calendar Activity Heatmap
53-week rolling GitHub-style calendar contribution grid with month/day labels and quantile intensity binning.
![Calendar Activity Heatmap](assets/screenshots/calendar_activity_heatmap.png)

### 14. Collapsible Hierarchical Tree Grid
Consolidates multi-level parent-child hierarchies into a single indented tree column with interactive branch expansion, dynamic subtotal rollups, in-cell share progress bars, and branch search.
![Collapsible Hierarchical Tree Grid](assets/screenshots/hierarchical_tree_table.png)

### 15. Dual-Axis Multi-Layer Geospatial Map
Synchronized dual-axis geospatial intelligence with Layer 1 choropleth polygon fill (volume/revenue) and Layer 2 proportional centroid bubble pins (margin/orders), dual legends, and hex cartogram mode.
![Dual-Axis Multi-Layer Geospatial Map](assets/screenshots/multi_layer_geo_map.png)

---

## 🚀 How to Use in Your Looker Instance

You can include any visualization from this repository in your Looker project in one of two ways:

### Option 1: Direct jsDelivr CDN Reference (Recommended)
Add the visualization block to your project's `manifest.lkml`:

```lookml
project_name: "your_lookml_project"

visualization: {
  id: "telemetry_conversion_funnel"
  label: "Telemetry & Conversion Funnel"
  url: "https://cdn.jsdelivr.net/gh/zacharagosa/looker_custom_viz@main/visualizations/telemetry_conversion_funnel/telemetry_conversion_funnel.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```

### Option 2: Upload Directly to Looker Project Files
Copy the `.js` file from `visualizations/<viz_id>/<viz_id>.js` into your LookML project's `visualizations/` folder and reference it:

```lookml
visualization: {
  id: "telemetry_conversion_funnel"
  label: "Telemetry & Conversion Funnel"
  file: "visualizations/telemetry_conversion_funnel.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```

---

## 🛠️ CLI Automation & Deployment Tooling

This repository includes Python deployment and screenshot generation CLIs that use `looker-cli` to register, update, validate, and preview custom visualizations automatically:

```bash
# Deploy a visualization to the target Looker project:
python3 scripts/deploy_viz.py --viz telemetry_conversion_funnel --project thelookevent --profile default

# Generate / update all high-resolution screenshots:
python3 scripts/generate_screenshots.py
```

### Script Workflow:
1. Switches Looker API session to `dev` workspace mode.
2. Checks and uploads `visualizations/<viz_id>.js` to the target LookML project.
3. Automatically updates `manifest.lkml` with the custom visualization declaration and dependencies.
4. Registers the visualization instance-wide via `POST /api/4.0/vis_manifest`.
5. Updates `catalog.json` with metadata, required fields, and screenshot references.
6. Automatically syncs the visualization to the consolidated **Showcase Dashboard**, organized by category into tabs (up to 5 viz per tab) with descriptive markdown cards!

---

## 📊 Consolidated Showcase Dashboard

All custom visualizations built by this repository can be consolidated on a single interactive Looker User-Defined Dashboard:

### Dashboard Organization:
- **6 Consolidated Executive Tabs**: Visualizations are grouped into 6 clean tabs (`🎯 Performance & Variance`, `🏆 Leaderboards & Grids`, `📅 Time Series & Schedules`, `🌊 Flow, Networks & Hierarchy`, `🗺️ Geospatial Intelligence`, `🎮 Telemetry & Cohort Decay`).
- **Up to 5 Visualizations per Tab**: Each tab accommodates up to 5 custom visualizations with overflow protection.
- **Descriptive Header Cards**: Every visualization tile features a top banner detailing the chart's purpose, category, and required dimension/measure shapes.

---

## 🤖 Daily Automation Workflow

The daily automation runs every morning via Jetski's Sidecar Runner:
1. **Community Gap Research & Industry Ideation**: Checks Looker community forums, Google Cloud Community, GitHub, D3.js gallery, and Vega specs for unmet visual needs. Actively prioritizes:
   - **Gaming & Telemetry**: Retention cohort decay curves, Level progression drop-off balancing, In-game economy/telemetry funnels, Matchmaking latency & MMR distributions.
   - **Telco & Infrastructure**: Cell tower / network topology graphs, Bandwidth & packet flow sankey/chord diagrams, Subscriber churn risk scorecards, Hexbin coverage density grids.
   - **Media & Entertainment**: Broadcast programming schedule / daypart heatmaps (Nielsen GRP/CPP grids), Ad spot reach & frequency curves, Viewer drop-off & stream retention decay curves.
   - **Geospatial & Maps**: D3 TopoJSON/GeoJSON choropleth maps, Hexbin density grids, Origin-Destination connection arc maps.
   - **Advanced Tables & Grids**: Pivot matrices with inline sparklines & micro-bars, Heatmap grid tables with quantile color scales, Collapsible financial P&L tree tables.
2. **Concept Novelty Check**: Cross-references against `catalog.json` to ensure a completely new, unique visualization is built each day.
3. **Engineering & Coding**: Generates a self-contained JavaScript bundle adhering to the Looker Custom Visualization API (`looker.plugins.visualizations.add`) with responsive `ResizeObserver` scaling.
4. **Argolis Deployment**: Pushes the bundle to the user's Argolis Looker instance and updates instance-wide registration.
5. **Dashboard Sync**: Adds the new visualization to the consolidated showcase dashboard under its corresponding category tab.
6. **Screenshot & Asset Generation**: Captures high-resolution production previews using live query responses and headless browser automation.
7. **Git Version Control**: Commits and pushes the new code, documentation, screenshots, and manifest snippets to GitHub.
