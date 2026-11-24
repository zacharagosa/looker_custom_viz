# Looker Custom Visualizations

A curated, de-duplicated library of **68 production custom visualizations** for Google Cloud Looker, organized into 10 focused dashboards on a Looker Board and indexed in an interactive searchable catalog.

---

## 📚 Documentation, Search & Tooling

- 🔍 [**Interactive Searchable Visual Catalog**](https://storage.googleapis.com/looker-custom-viz-public-assets/catalog/index.html) ([local HTML](docs/index.html)): Instant search & multi-facet filtering by visual geometry, industry vertical, charting library, and required data shape.
- 🚀 [**Installation & Integration Guide**](docs/installation.md): Instance-wide API registration (`POST /api/4.0/vis_manifest`), LookML `manifest.lkml` snippets, and Looker drill-down menus.
- 🛠️ [**Automation & Board Architecture**](docs/automation.md): Twice-weekly diverse-craft generator (`backlog.json`), single-dashboard Looker Board syncing (`scripts/sync_board.py`), and catalog generation (`scripts/build_catalog.py`).
- 🗂️ **Archived Lookalikes**: 17 retired single-vertical wrapper clones are preserved in `visualizations/_archive/` and `catalog_archive.json`.

---

## 🎨 Active Visualization Library (68 Visualizations across 10 Focused Dashboards)

Every visualization uses a clean **2-tab option schema (`Display` and `Style`)**, dynamic query-driven field-role dropdowns (`registerOptions`), debounced `ResizeObserver` layout stability, and native Looker drill-down menu integration.

### KPIs, Variance & Benchmarks (6 Visualizations)

| Visualization | Geometry | Industry | Library | Preview |
| :--- | :--- | :--- | :--- | :---: |
| [**Radial KPI Progress Gauge**](visualizations/radial_progress_gauge/)<br>`radial_progress_gauge` | Radial / Polar | Cross-Industry | D3.js v7 | [📸 View](visualizations/radial_progress_gauge/screenshot.png) |
| [**Stephen Few Bullet Graph**](visualizations/bullet_graph/)<br>`bullet_graph` | Bar / Variance | Cross-Industry | D3.js v7 | [📸 View](visualizations/bullet_graph/screenshot.png) |
| [**Dumbbell Divergence Plot**](visualizations/dumbbell_plot/)<br>`dumbbell_plot` | Bar / Variance | Cross-Industry | D3.js v7 | [📸 View](visualizations/dumbbell_plot/screenshot.png) |
| [**Multivariate Radar & Polar Balance Chart**](visualizations/radar_polar_chart/)<br>`radar_polar_chart` | Radial / Polar | Cross-Industry | D3.js v7 | [📸 View](visualizations/radar_polar_chart/screenshot.png) |
| [**Pareto 80/20 & ABC Stratification Analyzer**](visualizations/pareto_cumulative_analyzer/)<br>`pareto_cumulative_analyzer` | Bar / Variance | Cross-Industry | D3.js v7 | [📸 View](visualizations/pareto_cumulative_analyzer/screenshot.png) |
| [**Tornado Sensitivity Analysis & Risk Variance Chart**](visualizations/tornado_sensitivity_chart/)<br>`tornado_sensitivity_chart` | Bar / Variance | B2B SaaS & Finance | D3.js v7 | [📸 View](visualizations/tornado_sensitivity_chart/screenshot.png) |

### Tables, Grids & Rankings (6 Visualizations)

| Visualization | Geometry | Industry | Library | Preview |
| :--- | :--- | :--- | :--- | :---: |
| [**Sparkline Metric Matrix Table**](visualizations/sparkline_matrix_table/)<br>`sparkline_matrix_table` | Table / Grid | Cross-Industry | D3.js v7 | [📸 View](visualizations/sparkline_matrix_table/screenshot.png) |
| [**Rank Bump & Trajectory Chart**](visualizations/rank_bump_chart/)<br>`rank_bump_chart` | Ranking / Trajectory | Cross-Industry | D3.js v7 | [📸 View](visualizations/rank_bump_chart/screenshot.png) |
| [**Collapsible Hierarchical Tree Grid**](visualizations/hierarchical_tree_table/)<br>`hierarchical_tree_table` | Table / Grid | Cross-Industry | Custom DOM & SVG | [📸 View](visualizations/hierarchical_tree_table/screenshot.png) |
| [**Dynamic Pivot Matrix & Heatmap Grid**](visualizations/dynamic_pivot_matrix/)<br>`dynamic_pivot_matrix` | Table / Grid | Cross-Industry | D3.js v7 | [📸 View](visualizations/dynamic_pivot_matrix/screenshot.png) |
| [**Marimekko / Mosaic Market Matrix**](visualizations/marimekko_market_matrix/)<br>`marimekko_market_matrix` | Mosaic / Matrix | Media & Ad-Ops | D3.js v7 | [📸 View](visualizations/marimekko_market_matrix/screenshot.png) |
| [**Slopegraph & Multi-Period Rank Comparison**](visualizations/slopegraph/)<br>`slopegraph` | Ranking / Trajectory | Gaming & Entertainment | D3.js v7 | [📸 View](visualizations/slopegraph/screenshot.png) |

### Geospatial & Location Intelligence (5 Visualizations)

| Visualization | Geometry | Industry | Library | Preview |
| :--- | :--- | :--- | :--- | :---: |
| [**Interactive US Choropleth Map**](visualizations/choropleth_map/)<br>`choropleth_map` | Geospatial Map | Cross-Industry | D3.js v7 | [📸 View](visualizations/choropleth_map/screenshot.png) |
| [**Geospatial Flow & Route Arc Map**](visualizations/flow_arc_map/)<br>`flow_arc_map` | Geospatial Map | Supply Chain & Logistics | D3.js v7 | [📸 View](visualizations/flow_arc_map/screenshot.png) |
| [**Dual-Axis Multi-Layer Geospatial Map**](visualizations/multi_layer_geo_map/)<br>`multi_layer_geo_map` | Geospatial Map | Cross-Industry | D3.js v7 | [📸 View](visualizations/multi_layer_geo_map/screenshot.png) |
| [**Geospatial Hexbin & Density Heatmap**](visualizations/hexbin_density_map/)<br>`hexbin_density_map` | Geospatial Map | Cross-Industry | D3.js v7 & TopoJSON | [📸 View](visualizations/hexbin_density_map/screenshot.png) |
| [**Interactive World & Regional Choropleth Map**](visualizations/world_choropleth_map/)<br>`world_choropleth_map` | Geospatial Map | Cross-Industry | D3.js v7 & TopoJSON | [📸 View](visualizations/world_choropleth_map/screenshot.png) |

### Flows, Networks & Hierarchies (8 Visualizations)

| Visualization | Geometry | Industry | Library | Preview |
| :--- | :--- | :--- | :--- | :---: |
| [**Network Topology & Latency Flow Graph**](visualizations/network_topology_graph/)<br>`network_topology_graph` | Network / Flow | Telecom & Networks | D3.js v7 | [📸 View](visualizations/network_topology_graph/screenshot.png) |
| [**Sankey Flow & Multi-Stage Allocation Diagram**](visualizations/sankey_flow_diagram/)<br>`sankey_flow_diagram` | Network / Flow | Cross-Industry | D3.js v7 | [📸 View](visualizations/sankey_flow_diagram/screenshot.png) |
| [**Interactive Hierarchical Drilldown Treemap**](visualizations/interactive_drilldown_treemap/)<br>`interactive_drilldown_treemap` | Hierarchy / Partition | Cross-Industry | D3.js v7 | [📸 View](visualizations/interactive_drilldown_treemap/screenshot.png) |
| [**Bilateral Chord Diagram & Directed Flow Matrix**](visualizations/bilateral_chord_diagram/)<br>`bilateral_chord_diagram` | Network / Flow | Cross-Industry | D3.js v7 | [📸 View](visualizations/bilateral_chord_diagram/screenshot.png) |
| [**Sunburst Multi-Level Partition Wheel**](visualizations/sunburst_partition_wheel/)<br>`sunburst_partition_wheel` | Hierarchy / Partition | Cross-Industry | D3.js v7 | [📸 View](visualizations/sunburst_partition_wheel/screenshot.png) |
| [**Content Genre & Advertiser Affinity Force Network**](visualizations/content_genre_affinity_network/)<br>`content_genre_affinity_network` | Network / Flow | Media & Ad-Ops | D3.js v7 | [📸 View](visualizations/content_genre_affinity_network/screenshot.png) |
| [**Parallel Coordinates Multivariate Profiler**](visualizations/parallel_coordinates_profiler/)<br>`parallel_coordinates_profiler` | Multivariate | Telecom & Networks | D3.js v7 | [📸 View](visualizations/parallel_coordinates_profiler/screenshot.png) |
| [**Voronoï Hierarchical Tessellation Map**](visualizations/voronoi_treemap/)<br>`voronoi_treemap` | Hierarchy / Partition | Cross-Industry | D3.js v7 | [📸 View](visualizations/voronoi_treemap/screenshot.png) |

### Time Series, Schedules & Horizons (6 Visualizations)

| Visualization | Geometry | Industry | Library | Preview |
| :--- | :--- | :--- | :--- | :---: |
| [**Calendar Activity Heatmap**](visualizations/calendar_activity_heatmap/)<br>`calendar_activity_heatmap` | Time Series / Calendar | Cross-Industry | D3.js v7 | [📸 View](visualizations/calendar_activity_heatmap/screenshot.png) |
| [**Broadcast Programming Schedule & Daypart Performance Grid**](visualizations/broadcast_daypart_grid/)<br>`broadcast_daypart_grid` | Time Series / Calendar | Media & Ad-Ops | D3.js v7 | [📸 View](visualizations/broadcast_daypart_grid/screenshot.png) |
| [**Interactive Streamgraph & ThemeRiver Volume Flow**](visualizations/streamgraph_themeriver/)<br>`streamgraph_themeriver` | Time Series / Stream | Cross-Industry | D3.js v7 | [📸 View](visualizations/streamgraph_themeriver/screenshot.png) |
| [**Executive Gantt & Milestones Schedule Timeline**](visualizations/gantt_milestones_timeline/)<br>`gantt_milestones_timeline` | Timeline / Schedule | Gaming & Program Ops | D3.js v7 | [📸 View](visualizations/gantt_milestones_timeline/screenshot.png) |
| [**Candlestick / OHLC & Bollinger Volatility Envelope**](visualizations/candlestick_bollinger_bands/)<br>`candlestick_bollinger_bands` | Financial / OHLC | Gaming & Finance | D3.js v7 | [📸 View](visualizations/candlestick_bollinger_bands/screenshot.png) |
| [**Horizon Time-Series Small Multiples**](visualizations/horizon_small_multiples/)<br>`horizon_small_multiples` | Time Series / Horizon | Cross-Industry | D3.js v7 | [📸 View](visualizations/horizon_small_multiples/screenshot.png) |

### Statistical, ML & Multivariate (9 Visualizations)

| Visualization | Geometry | Industry | Library | Preview |
| :--- | :--- | :--- | :--- | :---: |
| [**Violin & Box Plot Distribution Analyzer**](visualizations/violin_distribution_plot/)<br>`violin_distribution_plot` | Distribution / KDE | Retail & E-Commerce | D3.js v7 | [📸 View](visualizations/violin_distribution_plot/screenshot.png) |
| [**Forecast & Confidence Cone (Fan Chart)**](visualizations/forecast_confidence_cone/)<br>`forecast_confidence_cone` | Time Series / Forecast | Gaming & Telemetry | D3.js v7 | [📸 View](visualizations/forecast_confidence_cone/screenshot.png) |
| [**ROC / PR & Confusion Matrix Classifier Evaluator**](visualizations/roc_curve_evaluator/)<br>`roc_curve_evaluator` | ML Evaluation | Financial Services | D3.js v7 | [📸 View](visualizations/roc_curve_evaluator/screenshot.png) |
| [**Raincloud Plot (Half-Violin KDE + Boxplot + Jittered Beeswarm)**](visualizations/raincloud_plot/)<br>`raincloud_plot` | Distribution / KDE | Cloud & SecOps | D3.js v7 | [📸 View](visualizations/raincloud_plot/screenshot.png) |
| [**Kaplan-Meier Survival & Hazard Curve**](visualizations/kaplan_meier_survival_curve/)<br>`kaplan_meier_survival_curve` | Survival / Hazard | Cloud & SecOps | D3.js v7 | [📸 View](visualizations/kaplan_meier_survival_curve/screenshot.png) |
| [**Correlation & Covariance Splom Matrix**](visualizations/correlation_splom_matrix/)<br>`correlation_splom_matrix` | Multivariate | Gaming & Telemetry | D3.js v7 | [📸 View](visualizations/correlation_splom_matrix/screenshot.png) |
| [**PCA Biplot & Multivariate Diagnostic Projection**](visualizations/pca_biplot_projection/)<br>`pca_biplot_projection` | Multivariate | Telecom & Networks | D3.js v7 | [📸 View](visualizations/pca_biplot_projection/screenshot.png) |
| [**Hierarchical Cluster Dendrogram & Heatmap**](visualizations/hierarchical_cluster_dendrogram/)<br>`hierarchical_cluster_dendrogram` | Hierarchy / Partition | Telecom & Networks | D3.js v7 | [📸 View](visualizations/hierarchical_cluster_dendrogram/screenshot.png) |
| [**Ternary 3-Component Composition Simplex Plot**](visualizations/ternary_composition_simplex/)<br>`ternary_composition_simplex` | Ternary / Simplex | Cloud FinOps | D3.js v7 | [📸 View](visualizations/ternary_composition_simplex/screenshot.png) |

### Experimentation, Causal Lift & SPC (6 Visualizations)

| Visualization | Geometry | Industry | Library | Preview |
| :--- | :--- | :--- | :--- | :---: |
| [**Policy Drift & Security SLA Shewhart SPC Control Chart**](visualizations/policy_drift_spc_control_chart/)<br>`policy_drift_spc_control_chart` | SPC Control Chart | Cloud & SecOps | D3.js v7 | [📸 View](visualizations/policy_drift_spc_control_chart/screenshot.png) |
| [**Compliance & SLA Aging Ridgeline Joyplot**](visualizations/compliance_sla_ridgeline_analyzer/)<br>`compliance_sla_ridgeline_analyzer` | Distribution / KDE | Cloud & SecOps | D3.js v7 | [📸 View](visualizations/compliance_sla_ridgeline_analyzer/screenshot.png) |
| [**Causal Impact & Synthetic Control Analyzer**](visualizations/causal_impact_synthetic_control/)<br>`causal_impact_synthetic_control` | Causal / Time Series | Gaming & Experimentation | D3.js v7 | [📸 View](visualizations/causal_impact_synthetic_control/screenshot.png) |
| [**Sequential A/B Peeking & Anytime-Valid Boundary Monitor**](visualizations/sequential_ab_peeking_monitor/)<br>`sequential_ab_peeking_monitor` | Experimentation / Boundaries | Gaming & Experimentation | D3.js v7 | [📸 View](visualizations/sequential_ab_peeking_monitor/screenshot.png) |
| [**Uplift Modeling, Qini Gain & CATE Persuasion Analyzer**](visualizations/uplift_cate_qini_curve/)<br>`uplift_cate_qini_curve` | Causal / Uplift | Gaming & Experimentation | D3.js v7 | [📸 View](visualizations/uplift_cate_qini_curve/screenshot.png) |
| [**Multi-Armed Bandit & Thompson Sampling Allocation Analyzer**](visualizations/multi_armed_bandit_allocation/)<br>`multi_armed_bandit_allocation` | Experimentation / Stream | Gaming & Experimentation | D3.js v7 | [📸 View](visualizations/multi_armed_bandit_allocation/screenshot.png) |

### Gaming & Media Analytics (9 Visualizations)

| Visualization | Geometry | Industry | Library | Preview |
| :--- | :--- | :--- | :--- | :---: |
| [**Player & Customer Retention Cohort Decay**](visualizations/retention_cohort_decay/)<br>`retention_cohort_decay` | Cohort / Retention | Gaming & Telemetry | D3.js v7 | [📸 View](visualizations/retention_cohort_decay/screenshot.png) |
| [**Telemetry & Conversion Funnel**](visualizations/telemetry_conversion_funnel/)<br>`telemetry_conversion_funnel` | Funnel / Pipeline | Gaming & Telemetry | D3.js v7 | [📸 View](visualizations/telemetry_conversion_funnel/screenshot.png) |
| [**Level Progression & Balancing Curve**](visualizations/level_progression_balance_curve/)<br>`level_progression_balance_curve` | Hazard / Progression | Gaming & Telemetry | D3.js v7 | [📸 View](visualizations/level_progression_balance_curve/screenshot.png) |
| [**Matchmaking Latency & MMR Distribution Analyzer**](visualizations/matchmaking_mmr_distribution/)<br>`matchmaking_mmr_distribution` | Distribution / KDE | Gaming & Telemetry | D3.js v7 | [📸 View](visualizations/matchmaking_mmr_distribution/screenshot.png) |
| [**Ad Reach & Frequency Response Curve**](visualizations/ad_reach_frequency_curve/)<br>`ad_reach_frequency_curve` | Response Curve | Media & Ad-Ops | D3.js v7 | [📸 View](visualizations/ad_reach_frequency_curve/screenshot.png) |
| [**Game Economy Faucet & Sink Analyzer**](visualizations/game_economy_faucet_sink/)<br>`game_economy_faucet_sink` | Network / Flow | Gaming & Telemetry | D3.js v7 | [📸 View](visualizations/game_economy_faucet_sink/screenshot.png) |
| [**Multi-Touch Attribution & Path Analyzer**](visualizations/multi_touch_attribution_pathway/)<br>`multi_touch_attribution_pathway` | Attribution / Path | Media & Ad-Ops | D3.js v7 | [📸 View](visualizations/multi_touch_attribution_pathway/screenshot.png) |
| [**Media Audience Overlap & Co-Viewing Euler Matrix**](visualizations/media_audience_overlap_euler/)<br>`media_audience_overlap_euler` | Set / Venn / Euler | Media & Ad-Ops | D3.js v7 | [📸 View](visualizations/media_audience_overlap_euler/screenshot.png) |
| [**Episode Binge & Stream Drop-Off Matrix**](visualizations/episode_binge_dropoff_matrix/)<br>`episode_binge_dropoff_matrix` | Cohort / Retention | Media & Ad-Ops | D3.js v7 | [📸 View](visualizations/episode_binge_dropoff_matrix/screenshot.png) |

### Telecom, Cloud SecOps & FinOps (8 Visualizations)

| Visualization | Geometry | Industry | Library | Preview |
| :--- | :--- | :--- | :--- | :---: |
| [**MITRE ATT&CK Threat Matrix & SecOps Kill-Chain Heatmap**](visualizations/mitre_attack_matrix/)<br>`mitre_attack_matrix` | Threat / Kill-Chain | Cloud & SecOps | D3.js v7 | [📸 View](visualizations/mitre_attack_matrix/screenshot.png) |
| [**Cell Tower Sector Azimuth & RF Polar Map**](visualizations/cell_tower_polar_coverage/)<br>`cell_tower_polar_coverage` | Radial / Polar | Telecom & Networks | D3.js v7 | [📸 View](visualizations/cell_tower_polar_coverage/screenshot.png) |
| [**Cloud FinOps Commit/CUD Utilization & Waste Horizon Chart**](visualizations/cloud_finops_commit_horizon/)<br>`cloud_finops_commit_horizon` | Time Series / Horizon | Cloud FinOps | D3.js v7 | [📸 View](visualizations/cloud_finops_commit_horizon/screenshot.png) |
| [**Distributed Trace & Span Waterfall Flamegraph**](visualizations/distributed_trace_flamegraph/)<br>`distributed_trace_flamegraph` | Flamegraph / Trace | Cloud & SecOps | D3.js v7 | [📸 View](visualizations/distributed_trace_flamegraph/screenshot.png) |
| [**BGP Route Flap & Peering Latency Matrix**](visualizations/bgp_route_flap_matrix/)<br>`bgp_route_flap_matrix` | Mosaic / Matrix | Telecom & Networks | D3.js v7 | [📸 View](visualizations/bgp_route_flap_matrix/screenshot.png) |
| [**Zero-Trust Blast Radius & Attack Surface Exposure Graph**](visualizations/zero_trust_blast_radius/)<br>`zero_trust_blast_radius` | Radial / Polar | Cloud & SecOps | D3.js v7 | [📸 View](visualizations/zero_trust_blast_radius/screenshot.png) |
| [**OTDR Fiber Event & Distance-to-Break Analyzer**](visualizations/otdr_fiber_event_analyzer/)<br>`otdr_fiber_event_analyzer` | Waveform / Telemetry | Telecom & Networks | D3.js v7 | [📸 View](visualizations/otdr_fiber_event_analyzer/screenshot.png) |
| [**Cloud Governance & Multi-Cloud Posture Pack**](visualizations/cloud_governance_posture_pack/)<br>`cloud_governance_posture_pack` | Hierarchy / Partition | Cloud & SecOps | D3.js v7 | [📸 View](visualizations/cloud_governance_posture_pack/screenshot.png) |

### Retail, Pricing & Supply Chain (5 Visualizations)

| Visualization | Geometry | Industry | Library | Preview |
| :--- | :--- | :--- | :--- | :---: |
| [**Inventory Stockout Velocity & Reorder Sawtooth Chart**](visualizations/inventory_stockout_sawtooth/)<br>`inventory_stockout_sawtooth` | Time Series / Sawtooth | Retail & Supply Chain | D3.js v7 | [📸 View](visualizations/inventory_stockout_sawtooth/screenshot.png) |
| [**Price-Volume-Mix (PVM) Revenue Bridge Waterfall**](visualizations/pvm_revenue_bridge/)<br>`pvm_revenue_bridge` | Financial / Waterfall | Healthcare & Supply Chain | D3.js v7 | [📸 View](visualizations/pvm_revenue_bridge/screenshot.png) |
| [**UpSet Set-Intersection & Market Basket Affinity Grid**](visualizations/upset_affinity_grid/)<br>`upset_affinity_grid` | Set / Venn / Euler | Retail & Supply Chain | D3.js v7 | [📸 View](visualizations/upset_affinity_grid/screenshot.png) |
| [**Unit Economics & LTV:CAC Payback Curve**](visualizations/unit_economics_payback_curve/)<br>`unit_economics_payback_curve` | Financial / Payback | Retail & E-Commerce | D3.js v7 | [📸 View](visualizations/unit_economics_payback_curve/screenshot.png) |
| [**Price Elasticity & Demand Revenue Optimizer**](visualizations/price_elasticity_revenue_optimizer/)<br>`price_elasticity_revenue_optimizer` | Response Curve | Retail & E-Commerce | D3.js v7 | [📸 View](visualizations/price_elasticity_revenue_optimizer/screenshot.png) |

---

## 🛠️ Local Development & Deployment

```bash
# Deploy a single visualization instance-wide, sync its single owning Board dashboard, and rebuild the Searchable Catalog
python3 scripts/deploy_viz.py --viz multi_armed_bandit_allocation --profile default

# Rebuild all 10 dashboards and the Looker Board
python3 scripts/sync_board.py --sync-all --profile default

# Rebuild and upload the Searchable Visual Catalog
python3 scripts/build_catalog.py --upload
```
