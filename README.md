# Looker Custom Visualizations

A curated collection of modern, super-awesome custom visualizations for Google Cloud Looker, built using leading data visualization libraries like **D3.js v7**, **Chart.js**, **Vega**, and **ApexCharts**.

This repository is continuously maintained by an autonomous daily AI automation that discovers unmet visualization needs from the Looker community, designs and codes novel visual components, and deploys them to Looker with automated demo queries.

---

## 🎨 Visualization Catalog

| ID | Name | Category | Engine | Required Fields | Status | Live Demo |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| [`radial_progress_gauge`](visualizations/radial_progress_gauge/) | **Radial KPI Progress Gauge** | KPI & Progress | D3.js v7 | 1–6 measures (or 1 dim + 1 meas) | 🟢 Ready | [Open in Looker](https://3417a175-fe20-4370-974f-2f2b535340ab.looker.app/x/qWzt7S8XGqdj30LxOMiWCI) |
| [`calendar_activity_heatmap`](visualizations/calendar_activity_heatmap/) | **Calendar Activity Heatmap** | Time Series & Activity | D3.js v7 | 1 Date dim + 1 measure | 🟢 Ready | [Open in Looker](https://3417a175-fe20-4370-974f-2f2b535340ab.looker.app/x/aS3KgfaVBa5FBZTTmahEx5) |

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
4. Validates the LookML project for syntax or schema errors.
5. Generates an instant Explore demo query and returns a shareable Looker link.

---

## 🤖 Daily Automation Workflow

The daily automation runs every morning via Jetski's Sidecar Runner:
1. **Community Gap Research**: Checks Looker community forums, Google Cloud Community, and GitHub for chart types that users need but Looker lacks out of the box.
2. **Concept Novelty Check**: Cross-references against `catalog.json` to ensure a completely new, unique visualization is built each day.
3. **Engineering & Coding**: Generates a self-contained JavaScript bundle adhering to the Looker Custom Visualization API (`looker.plugins.visualizations.add`).
4. **Git Version Control**: Commits and pushes the new code, documentation, and manifest snippets to GitHub.
5. **Argolis Deployment**: Pushes the bundle to the user's Argolis Looker instance, creates a live demo query, and notifies the user with direct links.
