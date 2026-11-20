# 📉 Kaplan-Meier Survival & Hazard Curve

An enterprise-grade, high-density **Kaplan-Meier Survival, Nelson-Aalen Cumulative Hazard, Smoothed Hazard Rate, and At-Risk Life Table Visualization** built with **D3.js v7** for Looker.

---

## 🎯 Business Problem & Inspiration

Survival analysis (time-to-event modeling) is essential across SecOps incident response (MTTR), healthcare clinical trials, SaaS customer churn/retention, and hardware reliability (MTBF). Native Looker charts cannot render non-parametric step-function survival curves, Greenwood 95% confidence bands, right-censoring tick markers, Mantel-Cox Log-Rank hypothesis tests, or aligned At-Risk life tables.

---

## ✨ Core Capabilities & Flexibility Options

### 1. Multi-Modal Survival & Hazard Representations (`Display`)
Switch between 4 functional visual representations:
- **Kaplan-Meier Survival Probability $S(t)$ (`survival`)**: Non-parametric step-down curve from 1.0 (100%) toward 0%, with right-censored tick marks and Greenwood 95% confidence ribbons.
- **Cumulative Resolution / Attrition ($1 - S(t)$, `inverted_churn`)**: Cumulative event incidence stepping upward from 0% to 100%.
- **Nelson-Aalen Cumulative Hazard $H(t)$ (`cumulative_hazard`)**: Accumulated risk intensity $H(t) = -\ln(S(t))$.
- **Smoothed Hazard Rate Density $\lambda(t)$ (`hazard_rate`)**: Interval failure velocity smoothed across adaptive time bins.

### 2. Dynamic Field-Role Mapping (`Display`)
Live `registerOptions` dropdowns populated from the active query:
- **Primary Strata / Cohort Dimension** & **Secondary / Sub-Strata Dimension** (for composite cohort grouping)
- **Observation ID Dimension**
- **Duration / Time-to-Event Field** & **Event / Censoring Status Field**
- **Target / SLA Measure Column**

### 3. Configurable Benchmarks, Sorting, Top-N & Density (`Display`)
- **SLA / Target Milestone Reference Mode**: `Fixed Time Value`, `Measure Column`, `Dataset Mean`, `Dataset Median (P50)`, `Percentile P75`, `Percentile P90`, or `None`, with custom target label, favorable zone shading, and **SLA Breach Alert Threshold (%)**.
- **Sorting, Top-N & Null Handling**: Sort by median time, observation count, alphabetical, or natural query order; Top-N cohort limit (`3 / 5 / 8 / 10 / All`) with **true re-computed `'Other'` cohort KM rollup**; and **Zero / Null duration suppression**.
- **Executive HUD, Label Density & Interactivity**: `Full Scorecard` (with live **Mantel-Cox Log-Rank $\chi^2$ & p-value**), `Compact Strip`, or `Hidden`; curve endpoint label density (`All`, `Min/Max Peaks & Median`, `Hidden`); custom title/subtitle overrides; live cohort search bar; interactive legend filter pills; and **Looker drill-down menu** support.

### 4. Brand Palettes, Polarity & Typography (`Style`)
- 6 enterprise presets (`Google Enterprise`, `Modern Slate`, `Cyberpunk Dark`, `Emerald FinOps`, `Sunset Media & Coral`, `Wellverse Healthcare`) + `Custom Hex Override` with native `display: 'color'` pickers.
- Metric polarity (`Lower Duration is Better` vs `Higher Survival is Better`), font scale (`Compact`, `Standard`, `Large Presentation`), value formatting (`Auto`, `Compact Number`, `Compact Currency`, `Percentage`, `Decimal 2dp`, `Raw`), curve interpolation, stroke width, and CI band opacity.

---

## 📊 Domain-Authentic Demo Dataset (`palo_alto_networks_security::cortex_security_incidents`)

Demonstrated on 500 SecOps security incidents across MITRE ATT&CK tactics (`mitre_tactic`, `incident_id`, `avg_mttr_minutes`, `alert_count`) against a 120-minute Incident MTTR SLA target.
