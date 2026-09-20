# Executive Gantt & Milestones Schedule Timeline 🗓️

A high-density, multi-modal executive Gantt and milestone roadmap schedule visualization built with **D3.js v7** for Looker and Google Cloud BI.

---

## 🎯 Strategic Background & Deals Blocked Solved

Native Looker chart types lack an interactive Gantt chart, milestone roadmap, and conditional formatting on timeline intervals:
1. **Buganizer Cloud Blocker [b/449635128](https://b.corp.google.com/issues/449635128)**:
   - *Title*: `Data Analytics > Looker > Timeline Visualization and Color Formatting based on Measure [Cloud Blocker]`
   - *Impact*: Inability to develop desired Looker visualizations as part of embedded Looker deployments. Customers need conditional formatting options to color timeline intervals based on measure values (e.g. status code, SLA risk, budget, or margin).
2. **Buganizer Customer Requirement [b/445748812](https://b.corp.google.com/issues/445748812)** (Adani Enterprise):
   - *Title*: `[Adani] - Support conditional formatting in Timeline visualization`
   - *Impact*: Blocked production operations dashboards requiring visual health status alerts across infrastructure maintenance schedules.
3. **Internal YAQS & Community Blockers ([go/yeng/1995018768622813184](https://yaqs.corp.google.com/eng/q/1995018768622813184))**:
   - Customers struggle with rigid date formatting on native timeline charts, lack of zero-duration milestone pins (diamonds), absence of collapsible swimlanes, and browser freezing when rendering 5,000+ schedule events.

This custom visualization resolves all of these gaps in a performant, enterprise-ready bundle.

---

## 🚀 Multi-Modal Capabilities

The visualization provides 4 distinct layout modes selectable via Looker's Edit Viz modal:

| Layout Mode | Description | Primary Use Case |
| :--- | :--- | :--- |
| **Gantt with Progress Fills (%)** | Horizontal task duration bars with rounded corners, internal progress fill percentages, inline task labels, and duration badges. | Engineering sprints, Live-Ops event roadmaps, enterprise product releases. |
| **Milestone Pin Roadmap** | Key deliverable roadmap featuring diamond milestone pins, target completion dates, and deliverable badges. | Executive steering committee updates, contract delivery milestones, product launches. |
| **Categorical Swimlanes** | Hierarchical grouping by Phase, Workstream, Owner, or Status with collapsible swimlane headers and task counts. | Cross-functional program management, multi-department initiatives. |
| **Measure Heatmap (Solves b/449635128)** | Timeline intervals and bars dynamically colored by continuous measure scale or 3-tier threshold rules (Green / Yellow / Red). | SLA risk monitoring, budget variance tracking, vendor cost overruns, duration delay heatmaps. |

---

## ⚡ High-Density & Performance Architecture

- **5,000+ Row Scalability**: Client-side date indexing and virtualized scrolling allow rendering thousands of project tasks without DOM lag.
- **Executive KPI HUD**: Real-time summary metrics floating above the timeline:
  - Total Tasks
  - Completion Rate (%)
  - In-Progress Deliverables
  - Delayed / At-Risk Tasks
  - Mean Duration (Days)
  - Total Budget / Financial Scope
- **Live Instant Search**: Interactive search-as-you-type filter matching task names, swimlanes, and dates with instant reactivity.
- **Time Zoom Granularity**: Quick buttons to toggle between Auto-Fit, Day, Week, Month, and Quarter scales with sticky timeline header axes.
- **Dynamic "Today" Reference Marker**: Prominent current-date indicator with pulsing status dot.
- **Native Looker Drill Menus**: Full integration with `LookerCharts.Utils.openDrillMenu` on task labels, bars, and milestone pins.

---

## 🛠️ Configuration Options (Strictly 2 Tabs)

Conforming to Looker UI best practices, options are strictly organized into at most 2 clean tabs:

### 1. `Display` Tab
- **Layout Mode**: Toggle between Gantt Progress, Milestone Pins, Swimlanes, and Measure Heatmap.
- **Time Scale Interval**: Auto-Fit Window, Day Granularity, Week Granularity, Month Granularity, Quarter Granularity.
- **Group Tasks by Swimlane**: Enable collapsible swimlanes grouped by secondary category.
- **Sort Tasks By**: Start Date Ascending/Descending, Duration (Days), Task Name (A-Z), Progress %, Metric Value.
- **Render Milestone Diamond Pins**: Highlight zero-duration and key deliverables as diamond pins.
- **Show Executive KPI HUD Bar**: Toggle top summary KPI metrics card.
- **Show Live Search & Filter Bar**: Toggle search input.
- **Show Current Date (Today) Line**: Toggle current date reference line.
- **Show Inline Task Bar Labels**: Toggle labels and progress percentages directly on bars.

### 2. `Style` Tab
- **Color Palette**: Google Modern, Executive Navy & Slate, Emerald & Mint, Sunset Orange & Coral, Cyberpunk Neon.
- **Measure Heatmap Color Rule**: Continuous Sequential Gradient, 3-Tier Threshold (Green/Yellow/Red), or Diverging Variance.
- **Bar Corner Radius (px)**: Adjustable border radius (0–12px).
- **Bar Thickness (px)**: Adjustable bar height (16–36px).
- **Show Vertical Date Gridlines**: Toggle timeline gridlines.
- **Theme & Surface**: Crisp Clean Light or Modern Glass/Slate.

---

## 📋 Required LookML Fields

- **Dimensions**:
  - `Task Name`: Categorical string dimension (e.g. `products.category` or task title).
  - `Start Date`: Date or timestamp dimension (e.g. `order_items.created_date`).
  - `End Date` *(optional)*: Secondary date dimension (e.g. `order_items.shipped_date`). If omitted, defaults to milestone pin or estimated duration.
  - `Swimlane / Status` *(optional)*: Categorical string dimension for grouping (e.g. `order_items.status`, phase, or owner).
- **Measures**:
  - `Primary Metric`: Numeric measure for value, budget, or heatmap coloring (e.g. `order_items.total_sale_price`).
  - `Progress / Units` *(optional)*: Numeric measure for progress completion % or item volume (e.g. `order_items.order_count`).

---

## 📦 Instance-Wide Deployment

```bash
python3 /usr/local/google/home/aragosa/looker_custom_viz/scripts/deploy_viz.py --viz gantt_milestones_timeline --profile default
```
