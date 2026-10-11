# 📉 Kaplan-Meier Survival & Hazard Curve

An enterprise-grade, high-density **Kaplan-Meier Survival, Nelson-Aalen Cumulative Hazard, and At-Risk Patient/Incident Analysis Visualization** built with **D3.js v7** for Looker and Looker Studio.

---

## 🎯 Business Problem & Inspiration

Survival analysis (time-to-event modeling) is ubiquitous across healthcare clinical trials, customer SaaS subscription churn, hardware reliability/MTBF, and cybersecurity incident response (MTTR). Out-of-the-box Looker visualizations lack native step-function survival curves, Greenwood confidence bands, censoring tick markers, and aligned At-Risk summary tables.

This custom visualization directly addresses long-standing customer requests and internal escalations:
1. **Buganizer Cloud Blocker [b/312984102](https://b.corp.google.com/issues/312984102)**: *"Kaplan-Meier Survival Analysis & Attrition Curve in Looker"* — healthcare and biotech customers requiring statistical survival analysis step plots with Greenwood confidence intervals.
2. **Buganizer Cloud Blocker [b/289410591](https://b.corp.google.com/issues/289410591)**: *"Time-to-Event and Attrition Survival Curves with Risk Tables"* — customer engineering requests for life tables and log-rank comparisons across customer cohorts.
3. **Internal YAQS**: *"How to implement Kaplan-Meier / Churn Survival Curves with Censoring in Looker"* — solving the step-down curve requirement with right-censored event tracking.

---

## ✨ Core Capabilities & Features

### 1. Multi-Modal Survival & Hazard Representations
Switch between 4 functional visual representations with a single dropdown:
- **Kaplan-Meier Survival Probability $S(t)$**: Classic non-parametric step-down curve stepping from 1.0 (100%) down toward 0%, with distinct vertical tick marks indicating right-censored observations.
- **Inverted Attrition / Resolution Rate ($1 - S(t)$)**: Cumulative failure/conversion probability stepping upward from 0% to 100% (ideal for MTTR resolution curves or user onboarding drop-off).
- **Nelson-Aalen Cumulative Hazard $H(t)$**: Cumulative failure intensity $H(t) = -\ln(S(t))$ indicating risk accumulation over time.
- **Hazard Rate Density $\lambda(t)$**: Smoothed interval failure rate / hazard density over time buckets.

### 2. Greenwood 95% Confidence Interval Ribbon Bands
- Evaluates variance using Greenwood's formula:
  $$\widehat{\text{Var}}(\hat{S}(t)) = \hat{S}(t)^2 \sum_{t_i \le t} \frac{d_i}{n_i(n_i - d_i)}$$
- Renders semi-transparent confidence interval bands bounded between $[0, 1]$.

### 3. Aligned At-Risk Summary Table
- Renders an interactive, responsive life table directly beneath the horizontal time axis.
- Aligned to time intervals (e.g. 0m, 60m, 120m, 180m, 240m, 300m), showing the exact number of active subjects/incidents at risk $n(t)$ and cumulative events $d(t)$ for every cohort.

### 4. Median Survival & SLA Reference Goals
- **Median Survival Time Guide**: Horizontal dashed line at $S(t) = 0.5$ intersecting the curve to pinpoint median time to event.
- **Configurable SLA / Target Goal**: Fixed time threshold (e.g., 2h / 120m resolution SLA) or statistical benchmark (Dataset Mean, Median, P75, P90) with pass/fail region shading.

### 5. Log-Rank Statistical Cohort Comparison
- Performs two-sided log-rank test across cohorts/strata, displaying $\chi^2$ statistic and p-value in the Executive HUD to indicate statistically significant variance.

### 6. Executive KPI Scorecard HUD
- **Median Time to Event**: Overall and top-stratum median survival / MTTR.
- **Interval Survival %**: Percentage of population surviving past key milestone.
- **Censoring Rate %**: Percentage of active/censored observations vs resolved events.
- **Log-Rank Significance**: $\chi^2$ and p-value evaluating cohort divergence.

### 7. Dynamic Field-Role Mapping
- **Strata / Cohort Dimension**: Dropdown dynamically populated from query dimensions (e.g. `mitre_tactic`, `subscription_tier`, `clinical_arm`).
- **Observation ID Dimension**: Identifier dimension (e.g. `incident_id`, `patient_id`, `account_id`).
- **Duration / Time Measure**: Numeric measure or dimension indicating elapsed duration $t$ (e.g. `avg_mttr_minutes`, `days_active`).
- **Event / Censoring Status**: Optional binary or status measure (1 = Event occurred, 0 = Censored; defaults to uncensored event).

### 8. Strictly 2 Clean Option Tabs
All options are strictly partitioned into `Display` and `Style` sections, keeping Looker's Edit Viz modal clean and uncrowded.

---

## 📊 Data Shape Requirements

- **Dimensions**:
  - Dimension 1 (Strata / Cohort, e.g. `cortex_security_incidents.mitre_tactic`)
  - Dimension 2 (Observation ID, e.g. `cortex_security_incidents.incident_id`)
- **Measures / Values**:
  - Measure 1 (Duration / Time to Event $t$, e.g. `cortex_security_incidents.avg_mttr_minutes`)
  - Measure 2 (Optional: Event / Censored flag or Alert Count, e.g. `cortex_security_incidents.alert_count`)

---

## 🚀 LookML Manifest Snippet

```lookml
visualization: {
  id: "kaplan_meier_survival_curve"
  label: "Kaplan-Meier Survival & Hazard Curve"
  file: "visualizations/kaplan_meier_survival_curve.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
