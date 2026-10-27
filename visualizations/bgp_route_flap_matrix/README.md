# 🌐 BGP Route Flap & Peering Latency Matrix

A mission-critical Looker Custom Visualization built for **Network Operations Centers (NOCs), Cloud Interconnect Engineers, SREs, and Multi-Cloud Infrastructure Teams**. It provides end-to-end visibility into autonomous system (AS) peering stability, route withdrawal churn, RFC 2439 route dampening penalties, and round-trip time (RTT) peering latency across global metropolitan Points of Presence (PoPs).

Built with **D3.js v7** to directly overcome enterprise BI gaps tracked in Buganizer Cloud Blockers (**b/491920831**, **b/531089244**, **b/342189012**) and PRD **go/cloudbi-cbs-bgp-telemetry**.

---

## 🎯 Enterprise Problem Solved

Modern enterprise networks, CDNs, and multi-cloud backbones peer across dozens of internet exchange points (IXPs) and private network interconnects (PNIs). Standard BI charts fail to diagnose complex border gateway protocol (BGP) dynamics:
1. **BGP Route Flap Oscillation**: Border routers receive rapid prefix announcements and withdrawals from flapping peers. If flaps exceed dampening limits, BGP route dampening (RFC 2439) suppresses the route, forcing suboptimal transit paths.
2. **Dual-Metric Matrix Diagnosis**: Traditional heatmaps only show a single scalar. This visualization simultaneously maps **Route Flap / Penalty Intensity** (via cell background heat) and **Round-Trip Latency** (via inner metric badges and SLA breach alert pins).
3. **Multi-Region Cross-Corridor Analysis**: Compares ingress PoPs (Ashburn, Chicago, San Jose, Frankfurt, London, Tokyo, Singapore) against Tier-1 transit providers and hyperscalers (Google Cloud AS15169, Azure AS8075, AWS AS16509, Zayo AS6461, Lumen AS3356, NTT AS2914, Arelion AS1299, AT&T AS7018).

---

## 🚀 4 Multi-Modal Layout Modes

Switchable in real time via the **Display** options tab:

| Mode | Key | Description |
| :--- | :--- | :--- |
| **Peering Flap & Latency Matrix Grid** | `flap_matrix` | 2D matrix grid with Origin PoP on the Y-axis and Peer ASN on the X-axis. Cell color encodes 24h flap frequency and dampening penalty score, while badges display RTT latency and SLA breach pins. |
| **AS Path Churn & Route Withdrawal Stream** | `as_churn_stream` | Sequence stream of route withdrawals and flap state transitions across peering partners with threshold breach warning callouts. |
| **PoP Latency & SLA Breach Leaderboard** | `pop_leaderboard` | Diagnostic ranking table displaying PoP corridor, Flap Rate, Route Withdrawals, Dampening Penalty, RTT Latency, and status pills. |
| **Circular Peering Chord Interconnect** | `polar_peering` | Circular chord interconnect topology visualizing cross-region traffic flows, transit links, and flapping peer connections. |

---

## 📊 Executive Telemetry HUD

Equipped with a real-time executive KPI scorecard (configurable as **Full Telemetry Scorecard**, **Compact Metric Strip**, or **Hidden**):
- **Peering Sessions**: Total monitored BGP peering sessions.
- **24h Route Flaps**: Cumulative route flap state transitions over 24 hours.
- **Max Dampening Penalty**: Highest observed RFC 2439 penalty score (`🚨 Route Damped` if $\ge 2,000$).
- **Mean RTT Latency**: Average round-trip peering latency across all sessions with automatic SLA status (`⚠️ SLA Breach` vs `✅ Within SLA`).
- **Route Stability Index**: Percentage of peering sessions running cleanly without route flapping.

---

## 🛠️ Data Requirements & Domain Dataset

Domain-authentic data is sourced from LookML model `void_weaver_analytics` and explore `bgp_peering_telemetry`:

| Field Role | Required | Description | Authentic Domain LookML Field |
| :--- | :---: | :--- | :--- |
| **Dimension 1** | **Yes** | Origin Point of Presence (PoP) | `bgp_peering_telemetry.origin_pop` |
| **Dimension 2** | **Yes** | Peer Autonomous System (ASN) | `bgp_peering_telemetry.peer_asn` |
| **Measure 1** | **Yes** | 24h Route Flaps | `bgp_peering_telemetry.total_flaps_24h` |
| **Measure 2** | Optional | Total Route Withdrawals (24h) | `bgp_peering_telemetry.total_withdrawals_24h` |
| **Measure 3** | Optional | Dampening Penalty Score | `bgp_peering_telemetry.avg_dampening_penalty` |
| **Measure 4** | Optional | Round-Trip Peering Latency (ms) | `bgp_peering_telemetry.avg_rtt_latency_ms` |
| **Measure 5** | Optional | SLA Latency Ceiling Benchmark | `bgp_peering_telemetry.sla_latency_threshold_ms` |

*Supports up to 5,000+ rows with performant client-side O(N) aggregation, debounced ResizeObserver (<4px guard), and native Looker drill-down menus.*

---

## 🎨 Clean 2-Tab Options Architecture

In strict accordance with Looker Custom Visualization design guidelines, configuration options are organized into **exactly 2 clean tabs** (`Display` and `Style`):

### 1. `Display` Tab
- **Layout Analysis Mode**: Switch between Matrix Grid, AS Churn Stream, PoP Leaderboard, or Polar Peering Chord.
- **Dynamic Field-Role Mapping**: Re-map Origin PoP, Peer ASN, Route Flaps, Withdrawals, Penalty, and Latency via dropdown selectors populated dynamically via Looker's `registerOptions`.
- **Latency SLA Benchmark Mode**: Fixed Benchmark Value (ms), Dataset Mean, Dataset Median (P50), Percentile P75 Target, Percentile P90 SLA Ceiling, or Target Measure Column.
- **Fixed SLA Latency Threshold (ms)**: Numerical ceiling (default: 45ms).
- **SLA Reference Line Label**: Custom label (e.g. "Peering SLA (45ms)").
- **RFC 2439 Dampening Cutoff Penalty**: Penalty score threshold for route suppression (default: 2,000).
- **Highlight SLA Latency Breaches**: Toggle breach badges and border pins.
- **Highlight Route Dampening / Suppression**: Toggle dashed border highlights on damped routes.
- **Matrix Sort Order**: Flap Frequency Descending, RTT Latency Descending, Dampening Penalty Descending, or Alphabetical.
- **Top-N Peering Corridors**: Limit displayed corridors to Top 10, 20, 50, or All.
- **Show Executive Telemetry HUD**: Toggle top KPI scorecard.
- **Executive HUD Display Mode**: Full Telemetry Scorecard, Compact Metric Strip, or Hidden.
- **Cell Metric Value Labels**: All Cells, Breaches & High Flaps Only, or Hidden.
- **Custom Title & Subtitle Override**: Optional custom chart header text.
- **Enable PoP / Peer Search Bar**: Real-time search-as-you-type filter.

### 2. `Style` Tab
- **Brand Palette Preset**:
  - `Modern Studio Slate` (Default)
  - `Google Enterprise`
  - `Cyberpunk Dark`
  - `Emerald FinOps`
  - `Sunset Media`
  - `Wellverse Healthcare`
  - `Custom Hex Override` (Activates custom color pickers below)
- **Custom Primary / Positive / Negative Accent Hex**: Color picker inputs (`display: 'color'`).
- **Metric Polarity**: `Lower is Better (Route Flaps, Latency, Dampening)` vs `Higher is Better`.
- **Typography & Font Scaling**: `Compact (Dense Tiles)`, `Standard (Balanced)`, or `Large Presentation`.
- **Metric Value Formatting**: Auto / Compact Number (`1.2M`), Milliseconds (`24.5 ms`), Compact Currency (`$1.2M`), Percentage (`45.2%`), or Raw.
- **Show Cell Gridline Borders**: Toggle subtle cell borders.

---

## 📦 LookML Manifest Registration

```lookml
visualization: {
  id: "bgp_route_flap_matrix"
  label: "BGP Route Flap & Peering Latency Matrix"
  file: "visualizations/bgp_route_flap_matrix.js"
  dependencies: [
    "https://d3js.org/d3.v7.min.js"
  ]
}
```
