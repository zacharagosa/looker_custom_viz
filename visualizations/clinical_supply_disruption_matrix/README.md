# Clinical Supply Disruption & Critical Shortage Matrix

A custom Looker visualization built with D3.js v7 for hospital supply chain executives, perioperative directors, and health system pharmacy and therapeutics (P&T) committees.

## 🏥 Clinical Problem & Overview
Medical-surgical supply disruptions and critical drug/device shortages present severe risks to patient safety, clinical workflow continuity, and hospital operating margins. When plant shutdowns, sterilization bottlenecks (e.g. EtO capacity constraints), or manufacturer allocations strike essential items (such as IV solutions, custom procedure trays, surgical packs, or diagnostic kits), hospital supply chain teams must immediately evaluate:
- Which shortages are **clinically critical** vs operational inconveniences.
- The **active duration / days active** against health system SLA resolution benchmarks.
- Whether verified **equivalent clinical substitutes** exist within the hospital's contracted catalog.

Resolves Buganizer Cloud Blockers b/492810394, b/398102941, and b/510294823.

---

## 🎯 Multi-Modal Clinical Layout Paradigms

1. **Shortage Severity Heatmap Matrix (`shortage_severity_matrix`)**:
   - 2D grid cards organized by clinical category and product name, color-coded by disruption severity (Critical, High, Medium, Low).
   - Highlights clinically critical items with emergency badges (`⚡ CLINICALLY CRITICAL`) and displays substitute availability badges (`✓ Equivalent Alt Available` vs `⚠ No Equivalent Alt`).
   - Integrated progress bar tracking active shortage days against target SLA resolution thresholds.
   - Interactive drill menus to inspect purchase order history, inventory on-hand, and alternative substitute SKU cross-references.

2. **Risk Horizon Timeline (`risk_horizon_timeline`)**:
   - Horizontal risk horizon bars plotting Active Shortage Days across monitored clinical products.
   - Dynamic SLA Target reference lines (e.g. 45-day target) and Breach Alert thresholds (e.g. 75 days).
   - Dual-color bar fills highlighting breached durations in high-contrast crimson.

3. **Clinical Impact & Criticality Quadrant (`clinical_impact_quadrant`)**:
   - 2D strategic decision matrix mapping Active Duration (X) vs Clinical Severity Level (Y).
   - Segments shortages into 4 actionable zones: **Tier 1 Code Red Shortages** (High Severity & Long Duration), **Early Alert & Mitigation**, **Operational Backlog**, and **Routine Disruptions**.

4. **Executive War Room Command HUD (`executive_war_room_hud`)**:
   - High-density hospital incident command center table with status pills (Active Shortage, Monitoring, Resolved), root cause classifications, days active, and clinical alternative substitute status.

---

## ⚙️ Configuration Options (2 Clean Tabs)

### 🎯 Display Controls
- **Clinical Visual Paradigm**: Select between Shortage Severity Matrix, Risk Horizon Timeline, Clinical Impact Quadrant, or Executive War Room Table.
- **Dynamic Field-Role Dropdowns**: Auto-populated dropdown selectors (`display: 'select'`) for Category, Product Name, Severity, Status, Root Cause Type, Equivalent Alternative Available, Clinically Critical Flag, and Days Active Duration.
- **SLA Benchmark Target Modes**: `Fixed Static SLA Target (Days)`, `Measure Column`, `Dataset Mean Duration`, `Dataset Median Duration`, `Percentile P75 Target`, or `None`.
- **Target Value & Breach Threshold**: Configurable target days (default 45d) and anomaly breach threshold (default 75d).
- **Sorting & Top-N Filtering**: Sort by Days Active (Desc/Asc), Severity Rank, or Alphabetical; Top-N entity cap with optional "Other" consolidation.
- **Clinical Filter Toggles**: Filter to only clinically critical items or suppress zero/null rows.
- **Executive KPI Scorecard HUD**: Displays Active Disruptions, Clinically Critical counts, Mean Days Active, and Mitigation Rate % with real-time search filter bar.
- **Custom Title & Subtitle Overrides**: Dedicated fields for custom title and subtitle banners.

### 🎨 Style & Typography
- **Preset Healthcare Palettes**: Wellverse Healthcare (default Navy/Teal/Rose), Clinical Alert (Emergency Red/Amber/Green), Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Sunset Media, and Custom Hex Override.
- **Custom Color Pickers (`display: 'color'`)**: Native color pickers for Primary Brand, Resolved / Low Severity, and Critical Breach tones.
- **Metric Polarity**: Defaults to `Lower is Better` (shorter disruption duration is favorable).
- **Typography Font Scales**: `Compact`, `Standard`, and `Large (Wallboard Command Center)`.
- **Value Formatting**: Days Duration (`106d`), Compact Number, or Raw.

---

## 📊 Domain-Authentic Data Source
Bound directly to authentic health system med-surg data in `wellverse_mba::supply_disruptions`:
- **Model**: `wellverse_mba`
- **Explore**: `supply_disruptions`
- **Fields**:
  - `medical_products.category` (Dimension)
  - `medical_products.product_name` (Dimension)
  - `supply_disruptions.severity` (Dimension)
  - `supply_disruptions.status` (Dimension)
  - `supply_disruptions.disruption_type` (Dimension)
  - `supply_disruptions.wellverse_alternative_available` (Dimension)
  - `medical_products.clinically_critical` (Dimension)
  - `supply_disruptions.avg_days_active` (Measure)
  - `supply_disruptions.disruption_count` (Measure)
- **Sort**: `supply_disruptions.avg_days_active desc`
- **Limit**: `25`
