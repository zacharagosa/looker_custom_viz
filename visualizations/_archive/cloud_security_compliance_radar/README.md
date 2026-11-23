# Cloud Security Posture & Framework Compliance Radar (`cloud_security_compliance_radar`)

Enterprise-grade **Cloud Security Posture & Framework Compliance Radar, Multi-Spoke Target Ring, and Polar Rose Coxcomb** custom visualization built with **D3.js v7** for CISO executives, cloud SecOps teams, GRC compliance managers, and enterprise security architects.

Directly resolves **Buganizer Cloud Blockers & Enterprise SecOps Requirements** (**b/489102941**, **b/394109283**, and **b/520194821**), answering internal Google Cloud Security & Prisma Cloud posture compliance monitoring requests.

---

## 🎯 High-Impact SecOps Problems Solved

In standard Looker visualizations (radar, bar, column), cloud security and compliance engineering teams encounter severe limitations:
1. **Multi-Framework Governance Gap**: Enterprise organizations must simultaneously audit security posture across multiple compliance frameworks (e.g. NIST 800-53, CIS GCP Benchmark, ISO 27001, SOC 2 Type II, PCI-DSS v4.0). Native charts cannot simultaneously plot audit pass scores against benchmark governance target rings while maintaining severity-weighted alerts.
2. **Radial Area Distortions (Florence Nightingale Coxcomb)**: Traditional bar charts fail to communicate the multidimensional relationship between overall framework finding volume and high-severity risk concentration. The Polar Area Coxcomb mode scales petal radius by finding severity, instantly isolating out-of-compliance frameworks.
3. **Drill-Through on Risk Vertices**: Native Looker radar/spider charts lack interactive vertex drill menus. `cloud_security_compliance_radar` integrates seamlessly with Looker's `LookerCharts.Utils.openDrillMenu` to allow one-click exploration into individual finding details, resource names, and remediation guidance.

---

## 🚀 4 Multi-Modal Layout Modes

The visualization provides 4 distinct analytical layouts via the `Layout Analysis Mode` option:

1. **Multi-Framework Compliance Radar & Target Ring (`multiaxis_radar`)**:
   - Angular spokes for each compliance framework (NIST, CIS, ISO, SOC 2, PCI-DSS).
   - Radar polygon plotting posture compliance score (0–100%) against a shaded concentric grid.
   - Configurable **Target Compliance Goal Ring** (dashed benchmark circle) and dynamic severity alerts.
   - Interactive vertex dots with drill-down menus and peak data labels.

2. **Florence Nightingale / Polar Area Coxcomb (`polar_rose_coxcomb`)**:
   - Equal-angle radial sectors where petal radius reflects open finding volume and risk severity.
   - Color-coded severity bands (Critical, High, Medium, Low) for rapid visual triage.

3. **Radial Stacked Severity Rings (`severity_stacked_radial`)**:
   - Concentric circular tracks for each framework showing proportional severity distribution arcs.

4. **Executive Compliance Audit Scorecard (`framework_audit_grid`)**:
   - High-density security scorecard cards per framework displaying compliance status badges (`PASS`, `AT-RISK`, `FAIL`), posture score progress bar, and critical finding counts.

---

## 📊 Executive KPI HUD Scorecard

Provides 5 instant executive metrics calculated directly client-side across the entire dataset:
- **Average Posture Score**: Global fleet-wide compliance posture average.
- **Critical / High Findings**: Total urgent security findings flagged against alert threshold.
- **Total Open Vulnerabilities**: Cumulative active findings across all frameworks.
- **Passing Frameworks**: Ratio and percentage of audited frameworks meeting the benchmark target.
- **Posture Compliance Health**: Fleet health classification badge (`STRONG`, `MODERATE`, `AT RISK`).

---

## 🛠️ Configuration Options Schema

Strict **2-Tab Options Architecture** (`Display` and `Style`):

### Tab 1: `Display`
- `Layout Analysis Mode`: `multiaxis_radar`, `polar_rose_coxcomb`, `severity_stacked_radial`, `framework_audit_grid`.
- `Compliance Framework Dimension`: Dynamic dropdown populated from query fields.
- `Finding Severity Dimension`: Dynamic dropdown for severity tiers (CRITICAL, HIGH, MEDIUM, LOW).
- `Open Findings Count Measure`: Query measure for active finding volume.
- `Critical / High Open Findings Measure`: Query measure for urgent security issues.
- `Posture Compliance Score Measure`: Query measure for percentage compliance score (0–100%).
- `Compliance Benchmark Goal Mode`: `Fixed Target Goal Ring`, `Dataset Mean Posture Score`, `Dataset Median Posture Score`, `Top Quintile (P80 Benchmark)`, `None / Hide Benchmark Ring`.
- `Target Compliance Score Goal (%)`: Numeric goal (default: `85%`).
- `Reference Line Label`: Benchmark ring label (default: `Target Compliance Goal`).
- `Critical Findings Alert Threshold`: Urgency threshold (default: `5`).
- `Framework Sorting & Ordering`: `Score Descending`, `Score Ascending`, `Findings Volume Descending`, `Alphabetical`, `Natural`.
- `Top-N Framework Focus Limit`: `All`, `Top 5`, `Top 8`, `Top 10`.
- `Rollup Excluded Frameworks into 'Other'`: Toggle for long-tail consolidation.
- `Suppress Zero / Null Finding Frameworks`: Clean data suppression toggle.
- `Executive KPI HUD Mode`: `Full Scorecard (5 KPI Chips)`, `Compact Metric Strip (3 Core Metrics)`, `Hidden`.
- `Data Value Label Density`: `Peaks & Critical Gaps Only`, `All Spoke Labels`, `Hidden`.
- `Custom Chart Title & Subtitle Override`: In-tile headers.
- `Enable Framework Search Bar`: Interactive search and real-time filtering bar.

### Tab 2: `Style`
- `Color Theme & Brand Palette`:
  - `Google Enterprise Blue (Light)`
  - `Modern Executive Slate (Indigo & Charcoal)`
  - `Cyber SecOps (Dark Mode)`
  - `Emerald Security & Governance (Light Mode)`
  - `Sunset Threat Monitor (Warm Slate)`
  - `Wellverse Healthcare Compliance (Teal & Coral)`
  - `Custom Primary Hex Accent`
- `Custom Primary / Positive / Negative Hex Overrides`: Individual color pickers (`display: 'color'`).
- `Metric Optimization Polarity`: `Higher is Better` vs `Lower is Better`.
- `Typography & Font Scale`: `Compact`, `Standard`, `Large Presentation`.
- `Value Metric Formatting`: `Percentage (85.2%)`, `Compact Number (1.2K)`, `Standard Integer (1,234)`, `Decimal 2dp`, `Raw`.
- `Show Concentric Grid Rings & Spokes`: Toggle for background radar geometry.
- `Polygon / Petal Fill Opacity`: `65%`, `45%`, `25%`, `85%`.
