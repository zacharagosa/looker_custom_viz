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
| **Measure Heatmap / Budget Variance** | Timeline intervals and bars dynamically colored by continuous measure scale or 3-tier threshold rules (Green / Yellow / Red). | SLA risk monitoring, budget variance tracking, vendor cost overruns, duration delay heatmaps. |

---

## ⚙️ Enterprise Flexibility Options Upgrade (October 2026)

The visualization options have been updated into strictly **two clean tabs** (`Display` and `Style`) in Looker's Edit Viz modal:

### 1. Display Tab
- **Dynamic Field-Role Mapping**: Dropdowns (`registerOptions`) dynamically populated from query dimensions and measures:
  - Task / Deliverable Dimension (`dimTaskOverride`)
  - Start Date Dimension (`dimStartOverride`)
  - End Date Dimension (`dimEndOverride`)
  - Swimlane / Workstream Dimension (`dimSwimlaneOverride`)
  - Status Dimension (`dimStatusOverride`)
  - Owner / Lead Dimension (`dimOwnerOverride`)
  - Priority Tier Dimension (`dimPriorityOverride`)
  - Progress % Measure / Dimension (`measureProgressOverride`)
  - Primary Budget / Cost Measure (`measureValueOverride`)
  - Target / Benchmark Measure (`targetMeasureOverride`)
- **Reference Benchmarks & Anomaly Detection**:
  - Target modes: None, Measure Column, Fixed Value, Dataset Mean, Dataset Median, Percentile P75, Percentile P90.
  - Custom target reference lines and labels (`target_reference_label`, `custom_target_value`).
  - Statistical anomaly detection with configurable sensitivity (1.0, 1.5, 2.0, 2.5 Sigma).
- **Sorting & Top-N Filtering**:
  - Sort by Start Date (Earliest / Latest), Duration, Task Name, Progress %, or Metric Value.
  - Top-N limit (10, 25, 50, 100) with automatic `'Other'` rollup aggregation.
  - Missing / null date suppression toggle.
- **HUD & Density Controls**:
  - Executive KPI HUD display: `Full Scorecard HUD`, `Compact Strip HUD`, or `Hidden`.
  - Task label density: `All Task Labels`, `Min/Max & Key Milestones Only`, or `Hidden`.
  - Custom Chart Title & Subtitle overrides.
  - Interactive live search bar, today line, and milestone pin toggles.

### 2. Style Tab
- **Color Palettes**:
  - Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Sunset Media, Wellverse Healthcare, Custom Hex Override.
- **Custom Hex Overrides**: Primary, Positive/Done, and Negative/Blocked hex pickers (`display: "color"`).
- **Metric Polarity**: Higher is Better vs. Lower is Better (for cost/delay metrics).
- **Typography & Formatting**:
  - Font scale (Compact 11px, Standard 13px, Large 15px).
  - Value formatting (Auto, Compact Number, Compact Currency, Percentage, Decimal 2dp, Raw Integer).
- **Chart Geometry**:
  - Bar corner radius (0–12px) and bar thickness (16–36px).
  - Vertical date gridlines toggle.
  - Surface theme: Crisp Clean Light vs. Subtle Glass / Slate.

---

## 📊 Domain-Authentic Demo Dataset

Bound authentically to **Studio Release Roadmap & Live-Ops Schedules** (`void_weaver_analytics::studio_release_roadmap`):
- `task_name`: Initiative deliverable name
- `workstream`: Categorical swimlane (Core Engine, Live-Ops, Trust & Safety, Esports)
- `task_status`: Complete, In Progress, Delayed, Milestone
- `owner_lead`: Program lead
- `priority_tier`: P0 - Critical, P1 - High, P2 - Normal
- `start_date` & `end_date`: Schedule boundaries
- `completion_pct`: Percentage completion (0–100%)
- `total_budget_allocated_usd`: Capital budget allocated
- `projected_revenue_lift_usd`: Projected return / revenue impact
