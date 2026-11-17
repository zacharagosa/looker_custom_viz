# Policy Drift & Security SLA Shewhart SPC Control Chart

An enterprise Statistical Process Control (SPC) visualization for Looker built with **D3.js v7**, engineered for Cloud Governance, SecOps Firewall Policy Monitoring, SRE Error Budgets, and Operational SLA Control.

Resolves long-standing Looker Cloud Blockers and community gaps where native line charts lack dynamic Moving-Range standard deviation limits (`\u03C3 = mR\u0304 / 1.128`), Western Electric / Nelson run-rule breach detection, CUSUM drift tracking, and Process Capability (`Cp / Cpk`) analysis.

---

## 🌟 Key Features

1. **4 Multi-Modal SPC Paradigms (`layoutMode`)**:
   - **Shewhart XmR & Moving Range (`xmr_control`)**: Individuals (`X`) control chart with shaded Zone C (`\u00B11\u03C3`), Zone B (`\u00B12\u03C3`), Zone A (`\u00B13\u03C3`) bands, Center Line (`CL`), `UCL`/`LCL`, Western Electric / Nelson violation halos (`R1`–`R4`), and a synchronized Moving Range (`mR`) sub-panel (`UCL_mR = 3.267 \u00D7 mR\u0304`).
   - **CUSUM Cumulative Drift Detector (`cusum_drift`)**: Tabular CUSUM (`C+ / C-`) against Decision Interval `H = \u00B15\u03C3` (`k = 0.5\u03C3`) to catch subtle sustained policy drift days before a `3\u03C3` spike.
   - **Multi-Policy SPC Small Multiples Grid (`rule_small_multiples`)**: Side-by-side XmR cards per firewall policy or service with independent control limits, `Cp`, and breach badges (click any card to drill into its XmR trace).
   - **Process Capability & Sigma Distribution (`capability_histogram`)**: Empirical histogram overlaid with fitted Gaussian Normal PDF curve, `LCL / CL / UCL`, and live `Cp / Cpk` metrics.

2. **Full Flexibility Options (`Display` & `Style` Tabs Only)**:
   - **Dynamic Field-Role Dropdowns**: Re-map Date, Group/Policy, Primary SPC Measure, Secondary Context Measure, and Target SLA Measure via `registerOptions`.
   - **Reference Targets & Thresholds**: `Percentile P90`, `Percentile P75`, `Dataset Mean`, `Dataset Median`, `Target Measure Column`, `Fixed Value`, or `None`, plus configurable Sigma width (`2.0\u03C3`–`3.5\u03C3`) and out-of-control alert threshold.
   - **Sorting, Top-N & Search**: Chronological/Metric sorting, Top-N policy limit with `'Other Policies'` rollup, zero/null suppression, and live policy selector + date/rule search bar.
   - **Brand Palettes, Polarity & Typography**: 7 presets (`Google Enterprise`, `Modern Slate`, `Cyberpunk Dark`, `Emerald FinOps`, `Sunset Media`, `Wellverse Healthcare`, `Custom Hex Override`), native `display: 'color'` pickers, metric polarity, font scaling, and value formatting.

---

## 📊 Data Shape & Domain Dataset
- **Model**: `palo_alto_networks_security`
- **Explore**: `threat_firewall_events` (Next-Gen Firewall & SASE Threat Telemetry)
- **Fields**: `event_date`, `rule_name` (6 firewall policies), `threat_count`, `blocked_threat_count`, `threat_block_rate` (366 domain-authentic observations).
