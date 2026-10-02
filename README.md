# Looker Custom Visualizations

A curated collection of modern, production-grade custom visualizations for Google Cloud Looker, built using leading visualization libraries including **D3.js v7**, **TopoJSON**, and **Canvas**.

This repository is maintained with continuous daily automation that discovers unmet customer visualization needs from Buganizer Cloud Blockers and community forums, designs and codes novel visual paradigms, deploys them instance-wide to Looker, and synchronizes them across two live executive showcase dashboards.

---

## 📚 Documentation & Guides

- 🖼️ [**Visual Gallery & Previews**](docs/gallery.md): Full visual showcase with high-resolution production screenshots for all 32+ custom visualizations.
- 🚀 [**Installation & Integration Guide**](docs/installation.md): Quick-start instructions for instance-wide API deployment, LookML `manifest.lkml` setup, and Looker drill-down menus.
- 🛠️ [**Automation, Tooling & Showcase Dashboards**](docs/automation.md): Details on CLI deployment scripts, dual-volume showcase dashboards, and autonomous daily generation.

---

## 🎨 Visualization Catalog

All visualizations are built with a strict **2-tab option architecture (`Display` and `Style`)** to guarantee clean, uncrowded Looker Edit Viz modals, debounced `ResizeObserver` layout stability, and full Looker drill menu integration.

### Volume 1: Core BI, Geospatial & Executive Grids

| Visualization | Category | Required Data Shape | Preview |
| :--- | :--- | :--- | :---: |
| [**Radial KPI Progress Gauge**](visualizations/radial_progress_gauge/)<br>`radial_progress_gauge` | Performance & Variance | 1–6 measures (or 1 dim + 1 meas) | [📸 View](assets/screenshots/radial_progress_gauge.png) |
| [**Calendar Activity Heatmap**](visualizations/calendar_activity_heatmap/)<br>`calendar_activity_heatmap` | Time Series & Schedules | 1 Date dim + 1 measure | [📸 View](assets/screenshots/calendar_activity_heatmap.png) |
| [**Stephen Few Bullet Graph**](visualizations/bullet_graph/)<br>`bullet_graph` | Performance & Variance | 1 dim + 1–3 measures | [📸 View](assets/screenshots/bullet_graph.png) |
| [**Dumbbell Divergence Plot**](visualizations/dumbbell_plot/)<br>`dumbbell_plot` | Performance & Variance | 1 dim + 1–2 measures (or 2 pivots) | [📸 View](assets/screenshots/dumbbell_plot.png) |
| [**Interactive US Choropleth Map**](visualizations/choropleth_map/)<br>`choropleth_map` | Geospatial Intelligence | 1 State dim + 1 measure | [📸 View](assets/screenshots/choropleth_map.png) |
| [**Sparkline Metric Matrix Table**](visualizations/sparkline_matrix_table/)<br>`sparkline_matrix_table` | Leaderboards & Grids | 1 dim + 1 pivot (or 2–6 measures) | [📸 View](assets/screenshots/sparkline_matrix_table.png) |
| [**Rank Bump & Trajectory Chart**](visualizations/rank_bump_chart/)<br>`rank_bump_chart` | Leaderboards & Grids | 1 entity dim + 1 pivot (or 2–12 meas) | [📸 View](assets/screenshots/rank_bump_chart.png) |
| [**Collapsible Hierarchical Tree Grid**](visualizations/hierarchical_tree_table/)<br>`hierarchical_tree_table` | Leaderboards & Grids | 2–6 dims (Hierarchy) + 1–4 meas | [📸 View](assets/screenshots/hierarchical_tree_table.png) |
| [**Dynamic Pivot Matrix & Heatmap Grid**](visualizations/dynamic_pivot_matrix/)<br>`dynamic_pivot_matrix` | Leaderboards & Grids | 1–2 dims + 1 pivot + 1–4 meas | [📸 View](assets/screenshots/dynamic_pivot_matrix.png) |
| [**Sankey Flow Diagram**](visualizations/sankey_flow_diagram/)<br>`sankey_flow_diagram` | Flow, Networks & Hierarchy | 2–8 sequential dims + 1–2 measures | [📸 View](assets/screenshots/sankey_flow_diagram.png) |
| [**Interactive Hierarchical Drilldown Treemap**](visualizations/interactive_drilldown_treemap/)<br>`interactive_drilldown_treemap` | Flow, Networks & Hierarchy | 1–6 dims (Hierarchy) + 1–2 measures | [📸 View](assets/screenshots/interactive_drilldown_treemap.png) |
| [**Sunburst Multi-Level Partition Wheel**](visualizations/sunburst_partition_wheel/)<br>`sunburst_partition_wheel` | Flow, Networks & Hierarchy | 1–5 Hierarchical dims + 1–2 measures | [📸 View](assets/screenshots/sunburst_partition_wheel.png) |
| [**Geospatial Flow Arc Map**](visualizations/flow_arc_map/)<br>`flow_arc_map` | Geospatial Intelligence | 1–2 dims (Origin + Dest) + 1–3 meas | [📸 View](assets/screenshots/flow_arc_map.png) |
| [**Dual-Axis Multi-Layer Geo Map**](visualizations/multi_layer_geo_map/)<br>`multi_layer_geo_map` | Geospatial Intelligence | 1 State dim + 1–3 measures | [📸 View](assets/screenshots/multi_layer_geo_map.png) |
| [**Geospatial Hexbin & Density Heatmap**](visualizations/hexbin_density_map/)<br>`hexbin_density_map` | Geospatial Intelligence | 1–2 dims (Coords or State) + 1–2 measures | [📸 View](assets/screenshots/hexbin_density_map.png) |
| [**Interactive World & Regional Choropleth Map**](visualizations/world_choropleth_map/)<br>`world_choropleth_map` | Geospatial Intelligence | 1 Country/Region dim + 1–2 measures | [📸 View](assets/screenshots/world_choropleth_map.png) |
| [**Multivariate Radar & Polar Chart**](visualizations/radar_polar_chart/)<br>`radar_polar_chart` | Performance & Variance | 1 dim + 3–12 measures (or 2 dims / pivots) | [📸 View](assets/screenshots/radar_polar_chart.png) |
| [**Interactive Streamgraph & ThemeRiver**](visualizations/streamgraph_themeriver/)<br>`streamgraph_themeriver` | Time Series & Schedules | 1 Date dim + 1 Cat dim + 1 meas (or 2+ meas) | [📸 View](assets/screenshots/streamgraph_themeriver.png) |
| [**Executive Gantt & Milestones Schedule Timeline**](visualizations/gantt_milestones_timeline/)<br>`gantt_milestones_timeline` | Time Series & Schedules | 1 Task dim + 2 Date dims + 0–2 meas | [📸 View](assets/screenshots/gantt_milestones_timeline.png) |

---

### Volume 2: Industry Verticals, Telemetry & Advanced Data Apps

| Visualization | Category | Required Data Shape | Preview |
| :--- | :--- | :--- | :---: |
| [**Player & Customer Retention Decay**](visualizations/retention_cohort_decay/)<br>`retention_cohort_decay` | Telemetry & Cohort Decay | 1 Cohort + 1 Activity dim + 1 meas | [📸 View](assets/screenshots/retention_cohort_decay.png) |
| [**Telemetry & Conversion Funnel**](visualizations/telemetry_conversion_funnel/)<br>`telemetry_conversion_funnel` | Telemetry & Cohort Decay | 1–2 dims (Stage + Segment) + 1–2 meas | [📸 View](assets/screenshots/telemetry_conversion_funnel.png) |
| [**Level Progression Balancing Curve**](visualizations/level_progression_balance_curve/)<br>`level_progression_balance_curve` | Gaming & Telemetry | 1 Level dim + 1–2 measures | [📸 View](assets/screenshots/level_progression_balance_curve.png) |
| [**Matchmaking Latency & MMR Distribution**](visualizations/matchmaking_mmr_distribution/)<br>`matchmaking_mmr_distribution` | Gaming & Telemetry | 1 Skill/Bucket dim + 1–3 measures | [📸 View](assets/screenshots/matchmaking_mmr_distribution.png) |
| [**Game Economy Faucet & Sink Analyzer**](visualizations/game_economy_faucet_sink/)<br>`game_economy_faucet_sink` | Gaming & Telemetry | 1 Activity dim + 2 Flow measures | [📸 View](assets/screenshots/game_economy_faucet_sink.png) |
| [**Broadcast Daypart Grid**](visualizations/broadcast_daypart_grid/)<br>`broadcast_daypart_grid` | Media & Entertainment | 2 dims (Day + Hour) + 1–2 measures | [📸 View](assets/screenshots/broadcast_daypart_grid.png) |
| [**Ad Reach & Frequency Response Curve**](visualizations/ad_reach_frequency_curve/)<br>`ad_reach_frequency_curve` | Media & Entertainment | 1 Placement/Channel dim + 1–2 measures | [📸 View](assets/screenshots/ad_reach_frequency_curve.png) |
| [**Network Topology Flow Graph**](visualizations/network_topology_graph/)<br>`network_topology_graph` | Telecom, Cloud & SecOps | 1–2 dims (Source + Target) + 1–3 meas | [📸 View](assets/screenshots/network_topology_graph.png) |
| [**MITRE ATT&CK Threat Matrix & SecOps Heatmap**](visualizations/mitre_attack_matrix/)<br>`mitre_attack_matrix` | Telecom, Cloud & SecOps | 1–2 dims (Tactic + Technique) + 1–2 meas | [📸 View](assets/screenshots/mitre_attack_matrix.png) |
| [**Violin & Box Plot Distribution Analyzer**](visualizations/violin_distribution_plot/)<br>`violin_distribution_plot` | Statistical, ML & Forecasting | 1 dim + 1 numeric value measure/dim | [📸 View](assets/screenshots/violin_distribution_plot.png) |
| [**Forecast & Confidence Cone (Fan Chart)**](visualizations/forecast_confidence_cone/)<br>`forecast_confidence_cone` | Statistical, ML & Forecasting | 1 Date dim + 1–3 measures (Forecast + Bounds) | [📸 View](assets/screenshots/forecast_confidence_cone.png) |
| [**Bilateral Chord & Directed Flow Matrix**](visualizations/bilateral_chord_diagram/)<br>`bilateral_chord_diagram` | Flow, Networks & Hierarchy | 2 dims (Source + Target) + 1–2 measures | [📸 View](assets/screenshots/bilateral_chord_diagram.png) |
| [**Pareto 80/20 & ABC Stratification Analyzer**](visualizations/pareto_cumulative_analyzer/)<br>`pareto_cumulative_analyzer` | Leaderboards & Grids | 1 Category dim + 1–2 measures | [📸 View](assets/screenshots/pareto_cumulative_analyzer.png) |
| [**Marimekko / Mosaic Market Matrix**](visualizations/marimekko_market_matrix/)<br>`marimekko_market_matrix` | Media, Broadcast & Ad-Ops | 2 dims (Network + Genre) + 1–2 measures | [📸 View](assets/screenshots/marimekko_market_matrix.png) |

---

## ⚡ Quick Start: Using in Looker

Add any visualization to your LookML project `manifest.lkml` via CDN or deploy instance-wide:

```lookml
project_name: "your_lookml_project"

visualization: {
  id: "forecast_confidence_cone"
  label: "Forecast & Confidence Cone (Fan Chart)"
  url: "https://cdn.jsdelivr.net/gh/zacharagosa/looker_custom_viz@main/visualizations/forecast_confidence_cone/forecast_confidence_cone.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```

For complete instructions including instance-wide registration via Looker API, see the [**Installation Guide**](docs/installation.md).
