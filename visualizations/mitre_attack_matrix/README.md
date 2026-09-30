# MITRE ATT&CK Threat Matrix & SecOps Kill-Chain Heatmap

![MITRE ATT&CK Threat Matrix](screenshot.png)

An enterprise-grade SecOps visualization built with D3.js v7 for cybersecurity intelligence, SIEM incident analysis, and threat hunting in Looker.

## 🎯 What Problem Does This Solve?
Directly resolves customer blockers (b/341928091, b/512744732, and Palo Alto Networks / Chronicle SecOps requirements):
1. **MITRE ATT&CK Enterprise Matrix Alignment**: Standard BI tools (bar, pie, or basic grids) fail to present the tactical progression of adversarial intrusion across the 14 standard MITRE ATT&CK tactic stages (Initial Access ➔ Execution ➔ Persistence ➔ Privilege Escalation ➔ Defense Evasion ➔ Credential Access ➔ Discovery ➔ Lateral Movement ➔ Collection ➔ Command and Control ➔ Exfiltration ➔ Impact).
2. **Multi-Modal Visual Paradigms**:
   - `tactic_matrix`: Interactive 14-stage MITRE ATT&CK Enterprise Matrix columnar grid with heat-mapped technique cards and severity counters.
   - `kill_chain_sankey`: Cyber Kill Chain progression flow showing attack transition probability and incident volume across sequential security kill-chain phases.
   - `incident_density_grid`: Tactic-by-Technique incident density matrix highlighting concentrated threat vectors.
   - `tactic_treemap`: Hierarchical incident volume treemap partitioned by tactic domain and top techniques.
3. **5,000+ Row Client-Side Aggregation**: Real-time aggregation of thousands of firewall alerts, EDR events, or SIEM incident rows without UI freezing or lag.
4. **Clean 2-Tab Options Architecture**: All configuration options are strictly organized into **Display** and **Style** sections to prevent overlapping or crowded headers in Looker's Edit Viz modal.
5. **Native Looker Drill Menus**: Full support for `LookerCharts.Utils.openDrillMenu` to inspect raw alert telemetry, host IP logs, and user identity contexts.

---

## 📊 Recommended Data Shapes
- **Dimensions**:
  - `Tactic Stage / Category` (e.g. `order_items.status`, `threat_firewall_events.threat_category`, or MITRE tactic names)
  - `Technique / Entity / Vector` (e.g. `products.category`, `threat_firewall_events.app_id`, or Technique IDs like T1059, T1078)
- **Measures**:
  - `Incident Count / Volume` (e.g. `order_items.order_count`, `threat_firewall_events.event_count`)
  - `Severity Score / Financial Impact` (optional, e.g. `order_items.total_sale_price`, `security_incidents.severity_score`)

---

## 🚀 Setup & Manifest Snippet
```lookml
visualization: {
  id: "mitre_attack_matrix"
  label: "MITRE ATT&CK Threat Matrix & SecOps Kill-Chain Heatmap"
  file: "visualizations/mitre_attack_matrix.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
