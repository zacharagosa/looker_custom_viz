# Med-Surg Distribution Center Fulfillment & SLA Performance Matrix

A custom Google Cloud Looker visualization built with **D3.js v7** for hospital health system supply chain executives, logistics directors, and clinical operations leadership.

## 🏥 Clinical & Logistics Overview
Hospital health systems and ambulatory surgery networks depend on reliable, high-velocity medical-surgical distribution. A single distribution center supply failure or delivery delay can cause cancelled surgical cases, stockouts of critical sterile supplies, and compromised patient care:
- **Clinical Line Fill Rate**: The percentage of ordered med-surg item lines fulfilled completely without backordering (Contract SLA Benchmark: &ge; 98.0%).
- **On-Time Delivery Rate**: Percentage of delivery shipments arriving at hospital receiving docks within pre-committed transit windows (Contract SLA Benchmark: &ge; 85.0%).
- **Clinical Backorder Rate**: Proportion of vital clinical SKUs delayed at distribution centers, requiring emergency substitutes or clinical rationing.
- **Delivery Lead Time (Days)**: Average dock-to-dock transit duration from regional distribution hubs to acute care facilities.

The **Med-Surg Distribution Center Fulfillment & SLA Performance Matrix** unifies service level benchmarking, dual-metric variance dumbbells, operational risk heatmaps, and executive logistics governance scorecards into an interactive, multi-modal executive interface.

Resolves Buganizer Cloud Blockers **b/493810294**, **b/398501948**, and **b/510294829**.

---

## 🎯 Multi-Modal Supply Chain Layout Paradigms

1. **Fulfillment SLA Strategic Quadrant (`fulfillment_sla_quadrant`)**:
   - 2D Strategic Service Level Quadrant:
     - **X-axis**: Clinical Line Fill Rate % (&ge; 98.0% Contract Target).
     - **Y-axis**: On-Time Delivery Rate % (&ge; 85.0% Contract Target).
     - **Bubble Radius**: Proportional to Total Logistics Spend ($) or Order Volume.
     - **SLA Tier Zones**:
       - *Top-Right*: **Tier 1 Gold SLA Benchmark** (High Fill & High On-Time).
       - *Top-Left*: **Fill Rate Shortfall** (On-Time but backordered lines).
       - *Bottom-Right*: **On-Time Logistics Bottleneck** (Full inventory, transit delays).
       - *Bottom-Left*: **Critical Dual SLA Breach Alert** (Urgent operational intervention).
   - Interactive Looker drill-down menu support on bubble clicks.

2. **Paired SLA Performance Dumbbells (`sla_variance_dumbbell`)**:
   - Paired horizontal dumbbell plot for each Distribution Center:
     - **Left Dot (Sky Blue)**: On-Time Delivery Rate %.
     - **Right Dot (Emerald Green)**: Clinical Line Fill Rate %.
     - **Connecting Variance Band**: Color-coded by contract compliance tier.
     - **Target Benchmark Pins**: Vertical dashed reference lines for 85% On-Time and 98% Fill SLA.
     - **Right-side Governance Badges**: `GOLD SLA`, `SILVER SLA`, `WATCHLIST`, and `BREACH ALERT`.

3. **Clinical Service Level Heatmap Matrix (`fulfillment_risk_matrix`)**:
   - 2D Logistics Heatmap Grid:
     - Rows: Distribution Centers & Regional Hubs.
     - Columns: Key Performance Metrics (Line Fill Rate %, On-Time Delivery %, Backorder Rate %, Avg Delivery Days, Total Volume $).
     - Color-intensity performance cells highlighting compliant centers vs acute operational bottlenecks.

4. **Executive Logistics Scorecard Table (`executive_fulfillment_scorecard`)**:
   - High-density executive table:
     - Distribution Center, Region, Total Spend ($), Line Fill Rate (%), On-Time Delivery Rate (%), Backorder Rate (%), Delivery Lead Time (Days), and Contract Status Badges.
     - Summary footer row calculating Network Totals and Weighted Averages.

---

## ⚙️ Configuration Options (Strictly 2 Tabs)

### 🎯 Section: `Display`
- `layoutMode`: Clinical Logistics Layout (`fulfillment_sla_quadrant`, `sla_variance_dumbbell`, `fulfillment_risk_matrix`, `executive_fulfillment_scorecard`)
- `entityDimOverride`: Distribution Center / Facility Dimension (dropdown)
- `regionDimOverride`: Region / Care Setting Dimension (dropdown, optional)
- `fillRateMeasOverride`: Line Fill Rate Measure (%) (dropdown)
- `onTimeMeasOverride`: On-Time Delivery Rate Measure (%) (dropdown)
- `backorderMeasOverride`: Backorder Rate Measure (%) (dropdown, optional)
- `daysToDeliverMeasOverride`: Avg Days to Deliver Measure (dropdown, optional)
- `spendMeasOverride`: Total Spend / Volume Measure (dropdown)
- `targetCalculationMode`: SLA Benchmark Mode (`fixed_sla`, `dataset_mean`, `dataset_median`, `percentile_p75`, `percentile_p90`, `none`)
- `targetLineFillPct`: Line Fill Rate SLA Target (%) (default: `98.0`)
- `targetOnTimePct`: On-Time Delivery SLA Target (%) (default: `85.0`)
- `targetDaysToDeliver`: Delivery Lead Time Ceiling (Days) (default: `2.0`)
- `referenceLineLabel`: SLA Reference Label (default: `"Contract SLA Target"`)
- `showReferenceLines`: Show SLA Benchmark Reference Lines
- `anomalyThresholdPct`: SLA Shortfall Alert Threshold (%) (default: `5.0`)
- `sortBy`: Sort Fulfillment Entities By (`spend_desc`, `fill_rate_desc`, `on_time_desc`, `backorder_desc`, `name_asc`, `natural`)
- `topNLimit`: Top-N Entities Limit (0 = All, Max 50)
- `enableOtherRollup`: Group Remaining into Other Rollup Summary
- `suppressZeroNull`: Suppress Zero / Null Entities
- `hudMode`: Executive Scorecard HUD Mode (`scorecard`, `compact_strip`, `hidden`)
- `showValueLabels`: Data Value Readouts (`all`, `peaks_only`, `hidden`)
- `customTitle`: Custom Scorecard Title Override
- `customSubtitle`: Custom Subtitle / Description Override
- `showSearch`: Show Real-Time Facility Search Bar

### 🎨 Section: `Style`
- `colorTheme`: Brand Palette Preset (`wellverse_healthcare`, `google_enterprise`, `modern_slate`, `cyberpunk_dark`, `emerald_finops`, `sunset_media`, `custom`)
- `customPrimaryColor`: Custom Primary Accent Hex
- `customPositiveColor`: Custom Positive / Compliant Hex
- `customNegativeColor`: Custom Alert / Breach Hex
- `metricPolarity`: Metric Polarity (`higher_better`, `lower_better`)
- `fontScale`: Typography Scale (`compact`, `standard`, `large`)
- `valueFormat`: Numeric Formatting Preset (`percentage`, `compact_currency`, `compact_number`, `decimal_2`, `auto`, `raw`)

---

## 🚀 Manifest Snippet (`manifest.lkml`)

```lookml
visualization: {
  id: "med_surg_fulfillment_sla_matrix"
  label: "Med-Surg Fulfillment & SLA Performance Matrix"
  url: "https://storage.googleapis.com/looker-custom-viz-public-assets/med_surg_fulfillment_sla_matrix.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
