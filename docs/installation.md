# Looker Installation & Integration Guide

This guide details how to integrate custom visualizations from this repository into your Looker instance.

---

## ⚡ Deployment Methods

There are two primary ways to make custom visualizations available to your Looker users:

### Option 1: Instance-Wide Registration via API (Recommended)
Registering visualizations instance-wide via the Looker API (`POST /api/4.0/vis_manifest`) makes them instantly available across **all models and explores** in both Production and Development mode—without touching any LookML repository files or requiring Git deployments.

When deployed via `scripts/deploy_viz.py`:
1. The visualization JavaScript bundle is compiled and uploaded to a public Google Cloud Storage bucket (`gs://looker-custom-viz-public-assets/<viz_id>.js`) with `cache-control: no-cache, max-age=0`.
2. The asset is registered with Looker's instance manifest:
   ```json
   POST /api/4.0/vis_manifest
   {
     "vis_id": "forecast_confidence_cone",
     "label": "Forecast & Confidence Cone (Fan Chart)",
     "main": "https://storage.googleapis.com/looker-custom-viz-public-assets/forecast_confidence_cone.js",
     "dependencies": ["https://d3js.org/d3.v7.min.js"]
   }
   ```
3. To deploy any visualization instance-wide:
   ```bash
   python3 scripts/deploy_viz.py --viz <viz_id> --profile default
   ```

---

### Option 2: Project-Level LookML `manifest.lkml`

If you do not have instance administrator access or prefer to scope visualizations to specific LookML projects, you can declare them in `manifest.lkml`.

#### A. CDN Hosted Reference (jsDelivr)
```lookml
project_name: "your_lookml_project"

visualization: {
  id: "forecast_confidence_cone"
  label: "Forecast & Confidence Cone (Fan Chart)"
  url: "https://cdn.jsdelivr.net/gh/zacharagosa/looker_custom_viz@main/visualizations/forecast_confidence_cone/forecast_confidence_cone.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```

#### B. Direct File Upload in LookML Project
Copy the visualization file into your LookML project repository under `visualizations/`:
```lookml
project_name: "your_lookml_project"

visualization: {
  id: "forecast_confidence_cone"
  label: "Forecast & Confidence Cone (Fan Chart)"
  file: "visualizations/forecast_confidence_cone.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```

> [!WARNING]
> Do not register the same visualization ID in both `manifest.lkml` and instance-wide via `/api/4.0/vis_manifest`. Looker will load both bundles, and the project-scoped bundle may silently shadow updates made to the instance-wide registration.

---

## 🎛️ Standard Configuration Architecture

All custom visualizations in this repository adhere to standard UX principles:

1. **Strict 2-Tab Option Cap (`Display` and `Style`)**:
   - `Display`: Controls field-role remapping, target/benchmark calculation modes, Top-N bucketing, sorting, Executive Scorecard HUDs, and interactive search bars.
   - `Style`: Controls brand palettes, positive/negative polarity toggles, typography font scale, value formatting (Ks, Ms, Bs, currency), and layout geometry.
   - Keeping options strictly limited to 2 sections guarantees that Looker's Edit Viz modal headers never crowd or overlap.

2. **Resize & Layout Stability**:
   - Every visualization implements a debounced `ResizeObserver` guarded by a `<4px` delta check.
   - Never applies `width: 100%` or `height: 100%` directly to Looker's host `element`, preventing bounding-box layout shifts in dashboards-next.

3. **Drill-Down Menus**:
   - Full integration with Looker's drill menu API (`LookerCharts.Utils.openDrillMenu`).
   - For a Looker field to pass drill links to a custom visualization, ensure the LookML field declares `drill_fields` as an explicit field list (`drill_fields: [field_a, field_b]`), not a view-level `set:`.

---

## 🧪 Testing Your Visualization
Each visualization folder contains a domain-authentic `demo_query.json`. You can verify execution and test query response structures directly from the command line:

```bash
looker-cli api query run_inline_query json_detail visualizations/<viz_id>/demo_query.json --profile default
```
