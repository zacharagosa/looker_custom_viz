# Looker Custom Visualizations

A curated collection of modern, super-awesome custom visualizations for Google Cloud Looker, built using leading data visualization libraries like **D3.js v7**, **Chart.js**, **Vega**, and **ApexCharts**.

This repository is continuously maintained by an autonomous daily AI automation that discovers unmet visualization needs from the Looker community, designs and codes novel visual components, and deploys them to Looker with automated demo queries.

---

## 🎨 Visualization Catalog

| ID | Name | Category | Engine | Required Fields | Status | Live Demo |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| [`radial_progress_gauge`](visualizations/radial_progress_gauge/) | **Radial KPI Progress Gauge** | Performance & Variance | D3.js v7 | 1–6 measures (or 1 dim + 1 meas) | 🟢 Ready | [Open in Looker](https://3417a175-fe20-4370-974f-2f2b535340ab.looker.app/explore/thelook/order_items?fields=products.category,order_items.total_sale_price&limit=6&vis=%7B%22type%22%3A%22radial_progress_gauge%22%2C%22showCenterText%22%3Atrue%2C%22colorPalette%22%3A%22google%22%7D&origin=share-expanded&toggle=vis) |
| [`calendar_activity_heatmap`](visualizations/calendar_activity_heatmap/) | **Calendar Activity Heatmap** | Time Series & Schedules | D3.js v7 | 1 Date dim + 1 measure | 🟢 Ready | [Open in Looker](https://3417a175-fe20-4370-974f-2f2b535340ab.looker.app/explore/thelook/order_items?fields=order_items.created_date,order_items.count&f[order_items.created_date]=365+days&sorts=order_items.created_date+asc&limit=400&vis=%7B%22type%22%3A%22calendar_activity_heatmap%22%2C%22colorPalette%22%3A%22github_green%22%2C%22cellSize%22%3A13%2C%22cellRadius%22%3A3%2C%22cellSpacing%22%3A3%2C%22showSummary%22%3Atrue%2C%22showMonthLabels%22%3Atrue%2C%22showDayLabels%22%3Atrue%2C%22showLegend%22%3Atrue%7D&origin=share-expanded&toggle=vis) |
| [`bullet_graph`](visualizations/bullet_graph/) | **Stephen Few Bullet Graph** | Performance & Variance | D3.js v7 | 1 dim + 1–3 measures | 🟢 Ready | [Open in Looker](https://3417a175-fe20-4370-974f-2f2b535340ab.looker.app/explore/thelook/order_items?fields=products.category,order_items.total_sale_price,order_items.total_gross_margin&sorts=order_items.total_sale_price+desc&limit=8&vis=%7B%22type%22%3A%22bullet_graph%22%2C%22colorTheme%22%3A%22executive_slate%22%2C%22orientation%22%3A%22horizontal%22%2C%22qualitativeRanges%22%3A%223_tier%22%2C%22showTargetMarker%22%3Atrue%2C%22showVarianceBadge%22%3Atrue%2C%22varianceBadgeFormat%22%3A%22attainment_pct%22%2C%22valueFormat%22%3A%22compact_currency%22%2C%22barThickness%22%3A18%2C%22rowHeight%22%3A64%7D&origin=share-expanded&toggle=vis) |
| [`dumbbell_plot`](visualizations/dumbbell_plot/) | **Dumbbell Divergence Plot** | Performance & Variance | D3.js v7 | 1 dim + 1–2 measures (or 2 pivots) | 🟢 Ready | [Open in Looker](https://3417a175-fe20-4370-974f-2f2b535340ab.looker.app/explore/thelook/order_items?fields=products.category,order_items.total_gross_margin,order_items.total_sale_price&sorts=order_items.total_sale_price+desc&limit=10&vis=%7B%22type%22%3A%22dumbbell_plot%22%2C%22colorTheme%22%3A%22executive_slate%22%2C%22bridgeColorMode%22%3A%22directional%22%2C%22showDirectionArrows%22%3Atrue%2C%22showVarianceBadge%22%3Atrue%2C%22badgeMetric%22%3A%22both%22%2C%22showPointLabels%22%3Atrue%2C%22valueFormat%22%3A%22compact_currency%22%2C%22pointRadius%22%3A8%2C%22bridgeThickness%22%3A3%2C%22rowHeight%22%3A54%2C%22sortBy%22%3A%22none%22%2C%22showLegend%22%3Atrue%2C%22showGridLines%22%3Atrue%7D&origin=share-expanded&toggle=vis) |
| [`choropleth_map`](visualizations/choropleth_map/) | **Interactive US Choropleth Map** | Geospatial Intelligence | D3.js v7 | 1 State dim + 1 measure | 🟢 Ready | [Open in Looker](https://3417a175-fe20-4370-974f-2f2b535340ab.looker.app/explore/thelook/order_items?fields=users.state,order_items.total_sale_price&f[users.country]=USA&sorts=order_items.total_sale_price+desc&limit=500&vis=%7B%22type%22%3A%22choropleth_map%22%2C%22colorTheme%22%3A%22google_blue%22%2C%22colorScaleMode%22%3A%22quantile%22%2C%22showLabels%22%3Atrue%2C%22showLegend%22%3Atrue%2C%22nullColor%22%3A%22%23e2e8f0%22%2C%22highlightColor%22%3A%22%23f59e0b%22%7D&origin=share-expanded&toggle=vis) |
| [`sparkline_matrix_table`](visualizations/sparkline_matrix_table/) | **Sparkline Metric Matrix Table** | Leaderboards & Grids | D3.js v7 | 1 dim + 1 pivot (or 2–6 measures) | 🟢 Ready | [Open in Looker](https://3417a175-fe20-4370-974f-2f2b535340ab.looker.app/explore/thelook/order_items?fields=products.category,order_items.created_month,order_items.total_sale_price&pivots=order_items.created_month&f[order_items.created_date]=6+months&sorts=order_items.created_month+asc+0,products.category&limit=12&vis=%7B%22type%22%3A%22sparkline_matrix_table%22%2C%22colorTheme%22%3A%22executive_slate%22%2C%22showSparklines%22%3Atrue%2C%22showMicroBars%22%3Atrue%2C%22showVarianceBadge%22%3Atrue%2C%22showSearch%22%3Atrue%2C%22valueFormat%22%3A%22compact_currency%22%7D&origin=share-expanded&toggle=vis) |
| [`retention_cohort_decay`](visualizations/retention_cohort_decay/) | **Player & Customer Retention Cohort Decay** | Telemetry & Cohort Decay | D3.js v7 | 1 Cohort dim + 1 Activity dim (or pivot) + 1 measure | 🟢 Ready | [Open in Looker](https://3417a175-fe20-4370-974f-2f2b535340ab.looker.app/explore/thelook/order_items?fields=users.created_month,order_items.created_month,order_items.order_count&f[users.created_date]=6+months&f[order_items.created_date]=6+months&sorts=users.created_month+asc,order_items.created_month+asc&limit=500&vis=%7B%22type%22%3A%22retention_cohort_decay%22%2C%22viewMode%22%3A%22split_view%22%2C%22valueDisplay%22%3A%22retention_pct%22%2C%22periodZeroHandling%22%3A%22index_100%22%2C%22showBenchmark%22%3Atrue%2C%22showLabels%22%3Atrue%2C%22colorTheme%22%3A%22indigo_violet%22%7D&origin=share-expanded&toggle=vis) |
| [`broadcast_daypart_grid`](visualizations/broadcast_daypart_grid/) | **Broadcast Programming Schedule & Daypart Performance Grid** | Time Series & Schedules | D3.js v7 | 2 dims (Day of Week + Hour of Day) + 1–2 measures | 🟢 Ready | [Open in Looker](https://3417a175-fe20-4370-974f-2f2b535340ab.looker.app/explore/thelook/order_items?fields=order_items.created_day_of_week,order_items.created_hour_of_day,order_items.total_sale_price,order_items.order_count&f[order_items.created_date]=365+days&sorts=order_items.created_day_of_week+asc,order_items.created_hour_of_day+asc&limit=500&vis=%7B%22type%22%3A%22broadcast_daypart_grid%22%2C%22viewMode%22%3A%22split_view%22%2C%22daypartPreset%22%3A%22nielsen%22%2C%22startOfWeek%22%3A%22monday%22%2C%22highlightPeaks%22%3A%22top_5%22%2C%22colorPalette%22%3A%22nielsen_broadcast%22%2C%22colorScaleMode%22%3A%22quantile%22%2C%22valueFormat%22%3A%22compact_currency%22%2C%22showMarginals%22%3Atrue%2C%22showCellValues%22%3Atrue%7D&origin=share-expanded&toggle=vis) |
| [`network_topology_graph`](visualizations/network_topology_graph/) | **Network Topology & Latency Flow Graph** | Flow, Networks & Hierarchy | D3.js v7 | 1–2 dims (Source + Target) + 1–3 measures | 🟢 Ready | [Open in Looker](https://3417a175-fe20-4370-974f-2f2b535340ab.looker.app/explore/thelook/order_items?fields=distribution_centers.name,users.state,order_items.total_sale_price,order_items.average_shipping_time,order_items.order_count&sorts=order_items.total_sale_price+desc&limit=500&vis=%7B%22type%22%3A%22network_topology_graph%22%2C%22viewMode%22%3A%22force_directed%22%2C%22flowAnimation%22%3A%22pulse%22%2C%22nodeSizing%22%3A%22volume%22%2C%22edgeMetric%22%3A%22latency%22%2C%22colorTheme%22%3A%22cyber_dark%22%2C%22showExecutiveHUD%22%3Atrue%2C%22showSearch%22%3Atrue%2C%22showLabels%22%3A%22always%22%2C%22valueFormat%22%3A%22bandwidth%22%2C%22baseNodeRadius%22%3A13%2C%22linkDistance%22%3A110%2C%22latencyThreshold%22%3A3.8%7D&origin=share-expanded&toggle=vis) |
| [`sankey_flow_diagram`](visualizations/sankey_flow_diagram/) | **Sankey Flow & Allocation Diagram** | Flow, Networks & Hierarchy | D3.js v7 | 2–8 sequential dims + 1–2 measures | 🟢 Ready | [Open in Looker](https://3417a175-fe20-4370-974f-2f2b535340ab.looker.app/explore/thelook/order_items?fields=users.traffic_source,products.category,order_items.status,order_items.total_sale_price,order_items.order_count&f[order_items.created_date]=365+days&sorts=order_items.total_sale_price+desc&limit=500&vis=%7B%22type%22%3A%22sankey_flow_diagram%22%2C%22viewMode%22%3A%22sankey%22%2C%22nodeAlignment%22%3A%22justify%22%2C%22linkColorMode%22%3A%22gradient%22%2C%22colorPalette%22%3A%22corporate_blue%22%2C%22valueFormat%22%3A%22compact_currency%22%2C%22curvature%22%3A0.5%2C%22nodeWidth%22%3A18%2C%22nodePadding%22%3A16%2C%22showNodeValues%22%3Atrue%2C%22showNodePercentages%22%3Atrue%2C%22showSearch%22%3Atrue%2C%22enableAnimation%22%3Atrue%2C%22highlightFlowsOnHover%22%3Atrue%7D&origin=share-expanded&toggle=vis) |
| [`rank_bump_chart`](visualizations/rank_bump_chart/) | **Rank Bump & Trajectory Chart** | Leaderboards & Grids | D3.js v7 | 1 entity dim + 1 pivot (or 2–12 measures) | 🟢 Ready | [Open in Looker](https://3417a175-fe20-4370-974f-2f2b535340ab.looker.app/explore/thelook/order_items?fields=products.category,order_items.created_month,order_items.total_sale_price&pivots=order_items.created_month&f[order_items.created_date]=6+months&sorts=order_items.created_month+asc+0,order_items.total_sale_price+desc+0&limit=12&vis=%7B%22type%22%3A%22rank_bump_chart%22%2C%22viewMode%22%3A%22bump%22%2C%22colorPalette%22%3A%22corporate_modern%22%2C%22valueFormat%22%3A%22compact_currency%22%2C%22curveInterpolation%22%3A%22bumpX%22%2C%22lineWidth%22%3A4%2C%22nodeRadius%22%3A14%2C%22showNodeRanks%22%3Atrue%2C%22showEndLabels%22%3Atrue%2C%22showRankBadges%22%3Atrue%2C%22showSearch%22%3Atrue%2C%22showExecutiveHUD%22%3Atrue%2C%22tieBreaker%22%3A%22value%22%7D&origin=share-expanded&toggle=vis) |

---

## 🚀 How to Use in Your Looker Instance

You can include any visualization from this repository in your Looker project in one of two ways:

### Option 1: Direct jsDelivr CDN Reference (Recommended)
Add the visualization block to your project's `manifest.lkml`:

```lookml
project_name: "your_lookml_project"

visualization: {
  id: "radial_progress_gauge"
  label: "Radial KPI Progress Gauge"
  url: "https://cdn.jsdelivr.net/gh/zacharagosa/looker_custom_viz@main/visualizations/radial_progress_gauge/radial_progress_gauge.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```

### Option 2: Upload Directly to Looker Project Files
Copy the `.js` file from `visualizations/<viz_id>/<viz_id>.js` into your LookML project's `visualizations/` folder and reference it:

```lookml
visualization: {
  id: "radial_progress_gauge"
  label: "Radial KPI Progress Gauge"
  file: "visualizations/radial_progress_gauge.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```

---

## 🛠️ CLI Automation & Deployment Tooling

This repository includes a Python deployment CLI that uses `looker-cli` to register, update, and validate custom visualizations automatically in Looker Argolis instances:

```bash
# Deploy a visualization to the target Looker project:
python3 scripts/deploy_viz.py --viz radial_progress_gauge --project thelookevent --profile default
```

### Script Workflow:
1. Switches Looker API session to `dev` workspace mode.
2. Checks and uploads `visualizations/<viz_id>.js` to the target LookML project.
3. Automatically updates `manifest.lkml` with the custom visualization declaration and dependencies.
4. Registers the visualization instance-wide via `POST /api/4.0/vis_manifest`.
5. Generates an instant Explore demo query and returns a shareable Looker link.
6. Updates `catalog.json` with metadata, required fields, and live demo link.
7. Automatically syncs the visualization to the consolidated **Showcase Dashboard** ([View Dashboard](https://3417a175-fe20-4370-974f-2f2b535340ab.looker.app/dashboards/7CQgKOwKT6t6wJrPuaypnh)), organized by category into tabs (up to 5 viz per tab) with descriptive markdown cards!

---

## 📊 Consolidated Showcase Dashboard

All custom visualizations built by this repository are consolidated on a single interactive Looker User-Defined Dashboard:
👉 **[Open Custom Visualizations Showcase Dashboard](https://3417a175-fe20-4370-974f-2f2b535340ab.looker.app/dashboards/7CQgKOwKT6t6wJrPuaypnh)**

### Dashboard Organization:
- **6 Consolidated Executive Tabs**: Visualizations are grouped into 6 clean tabs (`🎯 Performance & Variance`, `🏆 Leaderboards & Grids`, `📅 Time Series & Schedules`, `🌊 Flow, Networks & Hierarchy`, `🗺️ Geospatial Intelligence`, `🎮 Telemetry & Cohort Decay`).
- **Up to 5 Visualizations per Tab**: Each tab accommodates up to 5 custom visualizations with overflow protection (currently 1–3 viz per tab).
- **Descriptive Header Cards**: Every visualization tile features a top banner detailing the chart's purpose, category, required dimension/measure shapes, and a one-click link to open the standalone Explore.

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
3. **Engineering & Coding**: Generates a self-contained JavaScript bundle adhering to the Looker Custom Visualization API (`looker.plugins.visualizations.add`).
4. **Argolis Deployment**: Pushes the bundle to the user's Argolis Looker instance, creates a live demo query, and updates instance-wide registration.
5. **Dashboard Sync**: Adds the new visualization to the consolidated showcase dashboard under its corresponding category tab.
6. **Git Version Control**: Commits and pushes the new code, documentation, and manifest snippets to GitHub.
