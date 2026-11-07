# Med-Surg Formulary Compliance & Brand Conversion Matrix

A custom Google Cloud Looker visualization built with **D3.js v7** for hospital health system supply chain executives, perioperative materials managers, and value analysis committees (VAC).

## 🏥 Clinical & Procurement Overview
Health systems and ambulatory surgical networks spend tens of millions annually on medical-surgical supplies. A major source of operational margin erosion is **Contract Leakage** and **Sub-Optimal Formulary Adherence**:
- **Off-Contract Leakage**: Clinicians purchasing off-contract supplies when pre-negotiated tier contracts exist.
- **National Brand Premium**: Over-reliance on high-cost National Brands (3M, Ethicon, Medtronic, Cardinal, BD) when clinically equivalent private-brand / formulary items (such as Wellverse Brand) offer 20–40% cost reductions with identical patient outcomes.
- **Unrealized Conversion Opportunity**: Lack of visibility into which procedural product categories hold the highest dollar savings potential.

The **Med-Surg Formulary Compliance & Brand Conversion Matrix** solves this challenge by unifying spend decomposition, brand mix ratios, off-contract leakage tracking, and conversion opportunity targeting into a multi-modal executive interface.

Resolves Buganizer Cloud Blockers **b/493019482**, **b/398201945**, and **b/510294825**.

---

## 🎯 Multi-Modal Supply Chain Layout Paradigms

1. **Formulary Conversion Opportunity Bridge (`conversion_opportunity_bridge`)**:
   - Interactive Waterfall Bridge decomposing Spend:
     - `Total Spend` &rarr; `Off-Contract Leakage` (leakage reduction) &rarr; `National Brand Spend` &rarr; `Formulary Conversion Opportunity` (realizable savings) &rarr; `Optimized Target Spend`.
   - Connecting dashed step lines, variance badges, and hover tooltips.

2. **Brand Penetration vs Savings Opportunity Quadrant (`penetration_scatter_quadrant`)**:
   - 2D Strategic Opportunity Quadrant:
     - **X-axis**: Wellverse / Formulary Brand Penetration Rate % (0% to 100%).
     - **Y-axis**: Annual Conversion Savings Opportunity ($).
     - **Bubble Radius**: Scaled by Total Spend ($) via `d3.scaleSqrt()`.
     - **Priority Risk Zones**:
       - *Top-Left (High Opp / Low Pen)*: **P1 Urgent Conversion Target (High ROI)**.
       - *Top-Right (High Opp / High Pen)*: **Established Core Volume**.
       - *Bottom-Right (Low Opp / High Pen)*: **Optimal Formulary Compliance**.
       - *Bottom-Left (Low Opp / Low Pen)*: **Niche / Clinically Restricted Items**.
   - Benchmark target penetration line (default: 35%) and median opportunity line.
   - Interactive Looker drill-down menu support on bubble clicks.

3. **100% Normalized Brand Mix & Conversion Spectrum (`brand_mix_stacked_spectrum`)**:
   - Horizontal 100% stacked bar comparison for each category:
     - National Brand Spend % vs Wellverse Formulary Spend %, with target penetration guidelines and side savings opportunity callout badges.

4. **Executive Procurement Scorecard Table (`executive_procurement_scorecard`)**:
   - High-density executive scorecard:
     - Product Category, Total Spend, National Brand Spend, Wellverse Spend, Brand Penetration %, Off-Contract Leakage $, Conversion Opportunity $, and Clinical Action Priority Status Badges (`P1 Urgent Action`, `P2 Standardize`, `Formulary Optimal`).

---

## ⚙️ Configuration Options (Strictly 2 Tabs)

### 🎯 Section: `Display`
- `layoutMode`: Clinical Procurement Paradigm Mode (`conversion_opportunity_bridge`, `penetration_scatter_quadrant`, `brand_mix_stacked_spectrum`, `executive_procurement_scorecard`)
- `categoryDimOverride`: Product Category Dimension (dropdown)
- `secDimOverride`: Care Setting / Facility Dimension (dropdown, optional)
- `totalSpendMeasOverride`: Total Spend Measure (dropdown)
- `nationalSpendMeasOverride`: National Brand Spend Measure (dropdown)
- `formularySpendMeasOverride`: Wellverse / Formulary Brand Spend Measure (dropdown)
- `opportunityMeasOverride`: Conversion Opportunity Measure (dropdown)
- `leakageMeasOverride`: Off-Contract Leakage Measure (dropdown)
- `penetrationMeasOverride`: Brand Penetration % Measure (dropdown, optional)
- `targetCalculationMode`: Benchmark Mode (`dataset_mean`, `dataset_median`, `percentile_p75`, `percentile_p90`, `fixed_value`, `none`)
- `fixedTargetValue`: Fixed Benchmark Target Value
- `referenceLineLabel`: Benchmark Reference Label (default: `"Executive Savings Target"`)
- `targetPenetrationPct`: Target Formulary Penetration % (default: `35`)
- `anomalyThresholdPct`: Leakage Anomaly Alert Threshold % (default: `15`)
- `sortBy`: Sort Categories By (`spend_desc`, `opp_desc`, `leakage_desc`, `pen_asc`, `alphabetical`, `natural`)
- `topNLimit`: Top-N Categories Limit (0 = All, Max 50)
- `enableOtherRollup`: Group Remaining into "Other Categories" Rollup
- `suppressZeroNull`: Suppress Zero / Null Spend Categories
- `hudMode`: Executive Procurement HUD Mode (`scorecard`, `compact_strip`, `hidden`)
- `showValueLabels`: Data Value Readouts (`all`, `peaks_only`, `hidden`)
- `customTitle`: Custom Scorecard Title Override
- `customSubtitle`: Custom Scorecard Subtitle Override
- `showSearch`: Show Category Search Filter Bar

### 🎨 Section: `Style`
- `colorPalette`: Clinical Brand Theme (`wellverse_healthcare`, `executive_slate`, `google_enterprise`, `modern_slate`, `cyberpunk_dark`, `emerald_finops`, `sunset_media`, `custom`)
- `customPrimaryColor`: Custom Primary Accent Hex
- `customPositiveColor`: Custom Opportunity / Savings Hex
- `customNegativeColor`: Custom Leakage / Risk Hex
- `metricPolarity`: Metric Polarity (`higher_is_better`, `lower_is_better`)
- `fontScale`: Typography Font Scale (`compact`, `standard`, `large`)
- `valueFormat`: Value Formatting Style (`compact_currency`, `full_currency`, `percentage`, `compact_number`, `decimal_2`, `raw`)
- `bubbleScale`: Marker / Bubble Scale (0.5 to 2.0)
- `enableAnimation`: Enable Smooth Render Transitions

---

## 🚀 Manifest Snippet (`manifest.lkml`)

```lookml
visualization: {
  id: "med_surg_formulary_conversion_matrix"
  label: "Med-Surg Formulary Compliance & Brand Conversion Matrix"
  url: "https://storage.googleapis.com/looker-custom-viz-public-assets/med_surg_formulary_conversion_matrix.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
