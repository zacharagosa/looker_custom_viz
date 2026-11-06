# Med-Surg Par Level & Inventory Expiration Risk Matrix

A custom Google Cloud Looker visualization built with D3.js v7 for hospital supply chain executives, perioperative materials managers, and health system pharmacy and supply chain directors.

## 🏥 Clinical & Supply Chain Overview
Hospital health systems and ambulatory surgery centers manage thousands of surgical, procedural, and pharmaceutical supply items. Maintaining balanced inventory par levels is essential:
- **Under-Par Stockout Risk**: Depleted supplies trigger emergency rush freight, procedural cancellations, and direct patient safety hazards.
- **Over-Par Capital Inefficiency**: Excess inventory locks up operating capital that could be deployed elsewhere.
- **Expiration & Waste Hazard**: High-value med-surg items (sutures, implants, biologics, IV solutions) that sit past expiration dates become total write-offs.

The **Med-Surg Par Level & Inventory Expiration Risk Matrix** solves this challenge by unifying Days-on-Hand (DOH) buffer tracking, Par Attainment %, dollar variance, and expiration waste into a multi-modal executive interface.

Resolves Buganizer Cloud Blockers b/482019482, b/398102941, and b/519284711.

---

## 🎯 Multi-Modal Supply Chain Layout Paradigms

1. **Par Attainment vs DOH Risk Quadrant (`par_risk_quadrant`)**:
   - 2D scatter/bubble matrix plotting **Days on Hand (DOH)** on the X-axis against **Par Attainment Ratio (%)** on the Y-axis.
   - Categorizes each hospital facility or product category into 4 distinct risk zones:
     - **Critical Stockout Danger**: Low DOH (<14 days) and Under Par (<80%).
     - **Balanced Par Target**: Optimal buffer (14–30 days) and balanced par attainment (80–120%).
     - **Overstocked Capital**: High par ratio (>120%) with capital locked.
     - **Expiration Hazard**: Extended DOH (>45 days) or high dollar expired waste.
   - Bubble size dynamically scales with **Total On-Hand Inventory Value ($)**.
   - Interactive tooltips with full breakdown and one-click Looker drill-down menu support.

2. **Paired Par Target vs On-Hand Divergence Dumbbells (`par_actual_dumbbell`)**:
   - Sleek horizontal dumbbell divergence bars comparing Par Level Target (marker) against On-Hand Inventory (dot).
   - Dynamic connecting bridge colored by variance severity (green for balanced par, red for shortage risk, amber for excess).
   - Side badges displaying on-hand values, dollar variance, and stockout incident counters.

3. **Care Setting × Category Expiration Hazard Matrix (`expiration_waste_grid`)**:
   - 2D cross-tab matrix mapping Hospital Care Settings (Ambulatory Surgery Centers, Physician Offices, Acute Care, Long-Term Care) against Medical Product Categories.
   - Cells colored by expiration risk severity, displaying on-hand values, par ratios, and days-on-hand readouts.

---

## ⚙️ Configuration Options (Strictly 2 Tabs)

### 🎯 Display Controls
- `layoutMode`: Clinical Supply Paradigm Mode (`par_risk_quadrant`, `par_actual_dumbbell`, `expiration_waste_grid`).
- `primDimOverride`: Primary Dimension selector (Care Setting / Facility).
- `secDimOverride`: Secondary Dimension selector (Product Category).
- `onHandMeasureOverride`: On-Hand Inventory Value Measure ($).
- `parMeasureOverride`: Target Par Level Measure ($).
- `dohMeasureOverride`: Days on Hand (DOH) Measure.
- `expiredMeasureOverride`: Expired Inventory Waste Measure ($).
- `stockoutMeasureOverride`: Stockout Incidents / Events Count.
- `targetMode`: Par Attainment Benchmark Mode (`second_measure`, `fixed`, `dataset_mean`, `dataset_median`, `percentile_p75`, `percentile_p90`).
- `fixedParTarget`: Fixed Par Attainment Target % (default: `100%`).
- `minSafeDoh`: Minimum Safe DOH Horizon Days (default: `14`).
- `maxBufferDoh`: Maximum Par Buffer DOH Days (default: `30`).
- `referenceLineLabel`: Reference Line Label (default: `"Par Target Buffer"`).
- `sortBy`: Sorting modes (`on_hand_desc`, `variance_desc`, `par_ratio_asc`, `stockouts_desc`, `expired_desc`, `doh_asc`, `alphabetical`).
- `topNLimit`: Top-N Items Limit (0 = All).
- `enableOtherRollup`: Group Remaining into "Other" Rollup Item.
- `suppressZeroNull`: Suppress Zero / Null Inventory Items.
- `hudMode`: Executive KPI Scorecard HUD (`scorecard`, `compact_strip`, `hidden`).
- `showValueLabels`: Data Value Readouts (`all`, `peaks_only`, `hidden`).
- `customTitle`: Custom Scorecard Title Override.
- `customSubtitle`: Custom Scorecard Subtitle Override.
- `showSearch`: Real-time Search Filter Bar.
- `showLegend`: Legend & Risk Range Indicators.
- `showGridLines`: Coordinate Grid Lines toggle.

### 🎨 Style & Typography
- `colorPalette`: Clinical Brand Themes (`wellverse_healthcare` [default], `executive_slate`, `google_enterprise`, `modern_slate`, `cyberpunk_dark`, `emerald_finops`, `sunset_media`, `custom`).
- `customPrimaryColor`: Custom Primary Accent Color (Hex).
- `customAlertColor`: Custom Shortage Alert Color (Hex).
- `customExcessColor`: Custom Overstock Color (Hex).
- `metricPolarity`: Par Variance Polarity (`balanced_is_better`, `higher_is_better`, `lower_is_better`).
- `fontScale`: Typography Font Scale (`compact`, `standard`, `large`).
- `valueFormat`: Value Formatting Style (`compact_currency`, `full_currency`, `compact_number`, `percentage`, `decimal_2`, `raw`, `auto`).
- `bubbleMinRadius` / `bubbleMaxRadius`: Bubble Radius boundaries.
- `rowHeight`: Dumbbell Row Height (px).
- `enableAnimation`: Smooth render transitions.

---

## 📊 Domain-Authentic Data Source
Bound directly to authentic health system med-surg inventory telemetry in `wellverse_mba::inventory_snapshots`:
- **Model**: `wellverse_mba`
- **Explore**: `inventory_snapshots`
- **Fields**:
  - `customer_facilities.care_setting` (Dimension)
  - `inventory_snapshots.category` (Dimension)
  - `inventory_snapshots.on_hand_value` (Measure)
  - `inventory_snapshots.par_value` (Measure)
  - `inventory_snapshots.excess_inventory` (Measure)
  - `inventory_snapshots.expired_value` (Measure)
  - `inventory_snapshots.stockout_events` (Measure)
  - `inventory_snapshots.avg_days_on_hand` (Measure)
- **Filter**: `inventory_snapshots.is_latest_week: "Yes"`
- **Sort**: `inventory_snapshots.on_hand_value desc`
- **Limit**: `25`
