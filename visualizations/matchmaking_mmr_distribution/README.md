# ⚔️ Matchmaking Latency & MMR Distribution Analyzer

A high-performance Looker Custom Visualization designed for **Game Studios, LiveOps Engineers, and Competitive Multiplayer Analytics Teams**. It solves the foundational matchmaking dilemma in modern PvP/PvE games: **balancing queue wait times against fair match quality across the player skill curve**.

Built with **D3.js v7** to overcome critical BI limitations tracked in enterprise Cloud Blockers and Customer Requirements (**b/341928091**, **b/490547912**, **b/530822261**).

---

## 🎯 Enterprise Problem Solved

Standard Looker native charts (lines, bars, area) can only plot discrete rows. They cannot:
1. **Model Gaussian Skill Distributions**: Overlap empirical player counts with fitted normal distribution curves ($\mu$, $\sigma$, $\pm 1\sigma, \pm 2\sigma$ confidence bands, skewness).
2. **Expose Latency Bathtub Envelopes**: Visualize median queue wait times ($P_{50}$) and tail wait risks ($P_{95}/P_{99}$) on an independent dual Y-axis alongside an explicit SLA breach threshold line.
3. **Stratify Competitive Rank Tiers**: Dynamically partition continuous MMR ratings into standard esports ranks (Bronze, Silver, Gold, Platinum, Diamond, Master, Grandmaster) with cumulative CDF population shares.
4. **Audit Fair Match Quality**: Compare skill delta vs actual win-rate percentage against the 50% parity balance line and the $\pm 5\%$ fair match corridor to detect blowout risk and unfair matchmaking.

---

## 🚀 4 Multi-Modal Layout Modes

Switchable in real time via the **Display** options tab:

| Mode | Key | Description |
| :--- | :--- | :--- |
| **Skill Bell Curve & Gaussian Fit** | `gaussian_bell` | Empirical player volume histogram overlaid with smooth parametric Gaussian normal distribution curve, mean line ($\mu$), and $\pm 1\sigma$ standard deviation confidence band. |
| **Queue Latency & Wait-Time Envelope** | `latency_envelope` | Dual-axis view with player volume on the left Y-axis, median queue wait time line on the right Y-axis, shaded $P_{90}-P_{99}$ risk envelope, and customizable queue SLA threshold line. |
| **Competitive Rank Tier Stratification** | `tier_stratification` | Tier-by-tier population breakdown bar chart (Bronze through Grandmaster) showing population % share and cumulative CDF curve (0% to 100%). |
| **Fairness & Win-Rate Parity Matrix** | `winrate_parity` | Win-rate parity curve against the ideal 50% fair match line, shaded $\pm 5\%$ fair corridor (45%–55%), and player volume density below. |

---

## 📊 Executive Telemetry HUD

Equipped with a real-time executive KPI scorecard:
- **Total Players / Matches**: Total volume across all skill rating buckets.
- **Mean Skill Rating ($\mu$) & Spread ($\sigma$)**: Distribution center and variance.
- **Median Queue Wait ($P_{50}$)**: Typical wait time experienced by the majority of players.
- **Tail Queue Risk ($P_{95}$)**: Latency tail indicator with automatic SLA breach warning badges (`⚠️ SLA Breach` vs `✅ Within SLA`).
- **Fair Match Parity Rate**: Percentage of matches falling within the fair 45%–55% win-rate corridor.

---

## 🛠️ Data Requirements

| Field Role | Required | Description | Example LookML Field |
| :--- | :---: | :--- | :--- |
| **Dimension 1** | **Yes** | Skill Rating / MMR, Rating Bucket, Rank Tier, or Playlist | `order_items.sale_price`, `products.category` |
| **Measure 1** | **Yes** | Player Volume / Total Matches | `order_items.order_count`, `order_items.count` |
| **Measure 2** | Optional | Queue Wait Time / Latency in seconds (auto-modeled if omitted) | `order_items.average_shipping_time` |
| **Measure 3** | Optional | Win Rate % or Fair Match Index (auto-modeled if omitted) | `order_items.total_gross_margin` |

*Supports up to 5,000+ rows with performant client-side O(N) rollup and debounced rendering.*

---

## 🎨 Clean 2-Tab Options Architecture

In strict accordance with Looker Custom Visualization design guidelines, configuration options are minimized to **exactly 2 tabs** to prevent modal header crowding:

### 1. `Display` Tab
- **Layout Analysis Mode**: Select from 4 modes (`gaussian_bell`, `latency_envelope`, `tier_stratification`, `winrate_parity`).
- **Show Executive Telemetry HUD**: Toggle top KPI scorecard.
- **Queue Latency SLA Threshold (sec)**: Numerical threshold (e.g. 120s) for SLA breach highlighting.
- **Show Fitted Gaussian Curve**: Toggle theoretical normal curve overlay.
- **Show Competitive Rank Tier Cutoffs**: Toggle tier background shading and tier pills.
- **Enable Tier & Rating Search Bar**: Real-time search-as-you-type filter.

### 2. `Style` Tab
- **Color Theme**: Choose from 5 gaming & telemetry palettes:
  - `Modern Studio Slate (Light)` (Default)
  - `Cyberpunk Esports (Dark)`
  - `Neon Tier Apex (Dark)`
  - `Emerald Pulse (Light)`
  - `Crimson Overdrive (Dark)`
- **Curve Smoothing Interpolation**: Monotone Cubic, Catmull-Rom Spline, Basis Spline, or Linear.
- **Show Background Gridlines**: Subtle dashed gridlines.
- **Metric Value Formatting**: Compact Numbers (`1.2K`, `3.4M`), Currency (`$1.2K`), Percentage, or Raw.

---

## 📦 LookML Manifest Registration

```lookml
visualization: {
  id: "matchmaking_mmr_distribution"
  label: "Matchmaking Latency & MMR Distribution Analyzer"
  file: "visualizations/matchmaking_mmr_distribution.js"
  dependencies: [
    "https://d3js.org/d3.v7.min.js"
  ]
}
```
