# Surgical Procedure Supply Variance & Cost Optimization Matrix

A custom Looker visualization built with D3.js v7 for clinical health systems and hospital operating room (OR) perioperative leadership.

## 🏥 Clinical Problem & Overview
Operating room surgical supplies represent one of the largest controllable operational expenditures in hospital health systems. When surgeons perform the same procedure (e.g., Cataract Extraction, Colonoscopy, Total Knee Arthroplasty, Spinal Fusion), clinical preference cards often vary wildly from established evidence-based benchmark costs.

This visualization provides an executive clinical decision support matrix to identify surgical supply variance, quantify excess spending against clinical benchmarks, and prioritize high-volume standardization opportunities.

Resolves Buganizer Cloud Blockers b/491028392, b/398201940, and b/510294822.

---

## 🎯 Multi-Modal Clinical Layout Paradigms

1. **Surgical Cost vs Benchmark Dumbbell Plot (`variance_dumbbell_quadrant`)**:
   - Compares Actual Cost per Case against Benchmark Cost per Case on an aligned horizontal cost axis.
   - Dumbbell bubbles sized proportionally to surgical case volume.
   - Dual-polarity color encoding: favorable/under-benchmark procedures (green) vs adverse/over-benchmark procedures (red).
   - Interactive drill menus to inspect individual surgeon preference cards and procedural case records.

2. **Service Line Variance Decomposition Waterfall (`service_line_waterfall`)**:
   - Aggregates excess supply variance across clinical specialties (Ophthalmology, Gastroenterology, Pain Management, Orthopedics, General Surgery).
   - Decomposes specialty-level variances to the net health system supply bottom line.

3. **2D Case Volume vs Cost Opportunity Matrix (`case_volume_opportunity_matrix`)**:
   - Quadrant scatter plot mapping Surgical Case Volume (X) vs Net Excess Supply Spend (Y).
   - Highlights Priority 1 Standardization Targets (Upper Right: High Volume & High Excess Cost) vs Clinical Best Practice Anchors (Lower Right: High Volume & Favorable Cost).

4. **Clinical OR Standardization Scorecard (`clinical_scorecard_hud`)**:
   - High-density executive scorecard table with procedure status, case counts, actual vs benchmark costs, variance percentages, excess dollar impact, and clinical priority badges (P1 Critical, P2 Monitor, Best Practice).

---

## ⚙️ Configuration Options (2 Clean Tabs)

### 🎯 Display Controls
- **Clinical Layout Mode**: Select between Dumbbell Plot, Variance Waterfall, Opportunity Matrix, or Standardization Scorecard.
- **Dynamic Field-Role Dropdowns**: Auto-populated dropdown selectors (`display: 'select'`) for Service Line, Procedure Name, Case Volume, Actual Cost, Benchmark Cost, and Excess Cost.
- **Benchmark Target Modes**: `Benchmark Measure Column`, `Fixed Target Value`, `Dataset Mean Cost`, `Dataset Median Cost`, or `Top Percentile P75 Target`.
- **Sorting & Top-N Filtering**: Sort by Net Excess Cost (Adverse First), Favorable First, Case Volume, or Alphabetical; Top-N entity cap with optional "Other Procedures" consolidation.
- **Executive KPI Scorecard HUD**: Displays Surgical Cases, Total Supply Spend, Net Supply Variance $, % Procedures Over Benchmark, Top Standardization Opportunity, and interactive real-time search filter.
- **Custom Title & Subtitle Overrides**: Dedicated fields for custom title and subtitle banners.

### 🎨 Style & Typography
- **Preset Brand Palettes**: Wellverse Healthcare, Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Sunset Media, and Custom Hex Override.
- **Custom Color Pickers (`display: 'color'`)**: Native color pickers for Primary Accent, Favorable Performance, and Adverse Alert tones.
- **Metric Polarity**: Toggle between `Lower Cost is Better` (default) and `Higher is Better`.
- **Typography Font Scales**: `Compact`, `Standard`, and `Large Presentation`.
- **Value Formatting**: Auto, Compact Currency (`$1.2M`), Compact Number (`1.2M`), Percentage (`12.4%`), Decimal, or Raw.

---

## 📊 Domain-Authentic Data Source
Bound directly to `wellverse_mba::procedure_cases`:
- **Model**: `wellverse_mba`
- **Explore**: `procedure_cases`
- **Fields**:
  - `procedure_cases.service_line` (Dimension)
  - `procedure_cases.procedure_name` (Dimension)
  - `procedure_cases.case_count` (Measure)
  - `procedure_cases.cost_per_case` (Measure)
  - `procedure_cases.benchmark_cost_per_case` (Measure)
  - `procedure_cases.excess_supply_cost` (Measure)
  - `procedure_cases.cost_variance_pct` (Measure)

---

## 🚀 Manifest Snippet
```lookml
visualization: {
  id: "surgical_procedure_variance_matrix"
  label: "Surgical Procedure Supply Variance Matrix"
  file: "visualizations/surgical_procedure_variance_matrix.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
