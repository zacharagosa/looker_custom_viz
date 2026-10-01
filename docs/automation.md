# Automation, Tooling & Showcase Dashboards

This document details the automated deployment pipelines, CLI tooling, and dual showcase dashboards supporting this repository.

---

## 📊 Dual Showcase Dashboards

All custom visualizations in this repository are automatically deployed and organized across two primary Looker showcase dashboards:

### Volume 1: Core BI, Geospatial & Executive Grids
- **Target Dashboard**: Executive Showcase Vol. 1 (Dashboard ID: `164`)
- **Structure (5 Tabs, up to 5 viz per tab)**:
  1. `🎯 Performance & Variance`: `radial_progress_gauge`, `bullet_graph`, `dumbbell_plot`, `radar_polar_chart`
  2. `🏆 Leaderboards & Grids`: `sparkline_matrix_table`, `rank_bump_chart`, `hierarchical_tree_table`, `dynamic_pivot_matrix`
  3. `🌊 Flow, Networks & Hierarchy`: `sankey_flow_diagram`, `interactive_drilldown_treemap`, `sunburst_partition_wheel`
  4. `🗺️ Geospatial Intelligence`: `choropleth_map`, `flow_arc_map`, `multi_layer_geo_map`, `hexbin_density_map`, `world_choropleth_map`
  5. `📅 Time Series & Schedules`: `calendar_activity_heatmap`, `streamgraph_themeriver`, `gantt_milestones_timeline`

### Volume 2: Industry Verticals, Telemetry & Advanced Data Apps
- **Target Dashboard**: Executive Showcase Vol. 2 (Dashboard ID: `179`)
- **Structure (5 Tabs, up to 5 viz per tab)**:
  1. `🎮 Gaming & Telemetry`: `retention_cohort_decay`, `telemetry_conversion_funnel`, `level_progression_balance_curve`, `matchmaking_mmr_distribution`, `game_economy_faucet_sink`
  2. `🎬 Media, Broadcast & Ad-Ops`: `broadcast_daypart_grid`, `ad_reach_frequency_curve`
  3. `📡 Telecom, Cloud & SecOps`: `network_topology_graph`, `mitre_attack_matrix`
  4. `🔬 Statistical, ML & Forecasting`: `violin_distribution_plot`, `forecast_confidence_cone`
  5. `🛍️ Retail, Supply Chain & FinOps`: `bilateral_chord_diagram`, `pareto_cumulative_analyzer`

---

## 🛠️ CLI Automation & Deployment Scripts

### 1. `scripts/deploy_viz.py`
Automates instance-wide registration, GCS asset hosting, demo query creation, and showcase dashboard synchronization:
```bash
# Deploy a single visualization and sync both showcase dashboards:
python3 scripts/deploy_viz.py --viz forecast_confidence_cone --profile default

# Deploy without dashboard sync (fast iteration):
python3 scripts/deploy_viz.py --viz forecast_confidence_cone --skip-dashboard-sync --profile default
```

### 2. `scripts/sync_dashboard.py`
Synchronizes and re-renders both Volume 1 and Volume 2 dashboards with clean category tabs, descriptive HTML cards, and cross-volume navigation switchers:
```bash
python3 scripts/sync_dashboard.py --profile default
```

### 3. `scripts/generate_screenshots.py`
Generates high-resolution production preview PNGs using headless Chromium (`gbrowser`) against real Looker query data:
```bash
# Capture screenshot for a specific visualization:
python3 scripts/generate_screenshots.py --viz forecast_confidence_cone

# Capture screenshots for all catalog visualizations:
python3 scripts/generate_screenshots.py
```

---

## 🤖 Daily Autonomous Workflow

A scheduled automation runs daily via Sidecar Runner (`looker-custom-viz-daily`):
1. **Community Gap Research & Problem Discovery**: Audits Buganizer Cloud Blockers (`go/cloudbi-cbs`), internal YAQS (`go/yaqs`), and customer RFEs for visualization gaps.
2. **Catalog Audit & Flexibility Upgrade**: Upgrades an existing visualization with multi-modal enterprise options (dynamic field roles, target calculations, executive HUDs, brand palettes, and drill menus) while enforcing the strict 2-tab (`Display`/`Style`) constraint.
3. **Diverse Paradigm Engineering**: Designs and builds a net-new visual paradigm prioritizing underrepresented categories on Showcase Vol. 2.
4. **Domain-Authentic Binding**: Binds visualizations strictly to realistic domain datasets (e.g. `void_weaver_analytics`, `palo_alto_networks_security`, `tvun_media_analytics`, `zayo_network_analytics`)—never unrelated generic stand-in data.
5. **Instance Deployment & Dashboard Sync**: Pushes JavaScript bundles to GCS, updates instance-wide registrations, synchronizes both Showcase Dashboards, and commits to GitHub.
