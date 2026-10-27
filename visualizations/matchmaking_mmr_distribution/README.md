# ⚔️ Matchmaking Latency & MMR Distribution Analyzer

A high-performance Looker Custom Visualization designed for **Game Studios, LiveOps Engineers, SREs, and Competitive Multiplayer Analytics Teams**. It solves the foundational matchmaking dilemma in modern PvP/PvE games: **balancing queue wait times against fair match quality across the player skill curve**.

Built with **D3.js v7** to directly overcome critical BI limitations tracked in enterprise Cloud Blockers and Customer Requirements (**b/341928091**, **b/490547912**, **b/530822261**).

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
| **Queue Latency & Wait-Time Envelope** | `latency_envelope` | Dual-axis view with player volume on the left Y-axis, median queue wait time line on the right Y-axis, shaded risk envelope, and customizable queue SLA threshold line. |
| **Competitive Rank Tier Stratification** | `tier_stratification` | Tier-by-tier population breakdown bar chart (Bronze through Grandmaster) showing population % share and cumulative CDF curve (0% to 100%). |
| **Fairness & Win-Rate Parity Matrix** | `winrate_parity` | Win-rate parity curve against the ideal 50% fair match line, shaded $\pm 5\%$ fair corridor (45%–55%), and player volume bubble density. |

---

## 📊 Executive Telemetry HUD

Equipped with a real-time executive KPI scorecard (configurable as **Full Telemetry Scorecard**, **Compact Metric Strip**, or **Hidden**):
- **Total Players / Matches**: Total volume across all skill rating buckets.
- **Mean Skill Rating ($\mu$) & Spread ($\sigma$)**: Distribution center and variance.
- **Median Queue Wait ($P_{50}$)**: Typical wait time experienced by the majority of players.
- **Tail Queue Risk ($P_{95}$)**: Latency tail indicator with automatic SLA breach warning badges (`⚠️ SLA Breach` vs `✅ Within SLA`).
- **Fair Match Parity Rate**: Percentage of matches falling within the fair 45%–55% win-rate corridor.

---

## 🛠️ Data Requirements & Domain Dataset

Domain-authentic data is sourced directly from LookML model `void_weaver_analytics` and explore `matchmaking_mmr_telemetry`:

| Field Role | Required | Description | Authentic Domain LookML Field |
| :--- | :---: | :--- | :--- |
| **Skill Rating / MMR Bucket** | **Yes** | Rating bucket, continuous MMR score, or rank tier | `matchmaking_mmr_telemetry.mmr_bucket` |
| **Player Volume** | **Yes** | Active ranked players / match volume | `matchmaking_mmr_telemetry.active_players` |
| **Queue Wait Time** | Optional | Average matchmaking queue wait (seconds) | `matchmaking_mmr_telemetry.avg_queue_wait_sec` |
| **Win Rate Parity** | Optional | Average win rate percentage (45%–55% parity zone) | `matchmaking_mmr_telemetry.avg_win_rate_pct` |
| **Target Benchmark** | Optional | Comparison SLA target or historical wait threshold | Custom measure or table calculation |

*Supports up to 5,000+ rows with performant client-side O(N) rollup, debounced ResizeObserver (<4px guard), and native Looker drill-down menus.*

---

## 🎨 Clean 2-Tab Options Architecture

In strict accordance with Looker Custom Visualization design guidelines, configuration options are organized into **exactly 2 clean tabs** (`Display` and `Style`) to prevent modal header crowding:

### 1. `Display` Tab
- **Layout Analysis Mode**: Switch between Gaussian Bell, Latency Envelope, Tier Stratification, or Win-Rate Parity.
- **Dynamic Field-Role Mapping**: Re-map which query columns drive Skill Rating, Player Volume, Queue Wait Time, Win Rate, and Target Benchmark via dropdown selectors populated dynamically via Looker's `registerOptions`.
- **SLA Target Goal Mode**: Choose benchmark reference line source: `Fixed Benchmark Value`, `Dataset Mean Wait Time`, `Dataset Median (P50)`, `Percentile P75 Target`, `Percentile P90 SLA`, or `Target Measure Column`.
- **Fixed Target / SLA Threshold (sec)**: Numerical target (e.g. 120s) for SLA breach detection.
- **Target Reference Line Label**: Custom label for reference line (e.g. "Competitive SLA (120s)").
- **High Latency Risk Threshold (%)**: Percentage multiplier for highlighting critical queue risks (e.g. 130%).
- **Show Fitted Gaussian Curve**: Toggle theoretical normal curve and confidence area overlay.
- **Show Competitive Rank Tier Cutoffs**: Toggle tier background bands and clickable filter pills.
- **Show Fair Match Parity Bands (45-55%)**: Highlight fair matchmaking zones vs blowout danger zones.
- **Sort Order**: Re-order skill buckets by Natural/MMR Ascending, Volume Descending, Volume Ascending, or Alphabetical.
- **Top-N Skill Buckets**: Limit displayed buckets to Top 10, 20, 50, or All, with optional automatic `'Other'` rollup.
- **Suppress Zero / Null Player Volumes**: Exclude empty buckets.
- **Show Executive Telemetry HUD**: Toggle executive KPI scorecard.
- **Executive HUD Display Mode**: Choose between `Full Telemetry Scorecard`, `Compact Metric Strip`, or `Hidden`.
- **Data Value Labels**: Choose between `All Skill Buckets`, `Min/Max Peaks Only`, or `Hidden / Tooltip Only`.
- **Custom Title & Subtitle Override**: Optional chart header text.
- **Enable Tier & Rating Search Bar**: Interactive real-time search filter.

### 2. `Style` Tab
- **Brand Palette Preset**:
  - `Google Enterprise` (Enterprise Blue `#1a73e8`, Red `#ea4335`, Green `#1e8e3e`, Amber `#f9ab00`)
  - `Modern Studio Slate` (Slate `#0f172a`, Blue `#2563eb`, Emerald `#059669`, Crimson `#dc2626`)
  - `Cyberpunk Dark` (Cyber Cyan `#38bdf8`, Rose `#f43f5e`, Violet `#a855f7`, Gold `#fbbf24`)
  - `Emerald FinOps` (Emerald `#059669`, Teal `#0d9488`, Amber `#d97706`, Coral `#dc2626`)
  - `Sunset Media` (Sunset Orange `#ea580c`, Purple `#9333ea`, Rose `#e11d48`)
  - `Wellverse Healthcare` (Med Teal `#0d9488`, Navy `#1e3a8a`, Rose `#be123c`)
  - `Custom Hex Override` (Activates custom color pickers below)
- **Custom Primary / Positive / Negative Accent Hex**: Color picker inputs (`display: 'color'`).
- **Metric Polarity**: `Lower is Better (Queue Latency, Churn, Wait)` vs `Higher is Better (Player Volume, Win Rate)`.
- **Typography & Font Scaling**: `Compact (Dense Tiles)`, `Standard (Balanced)`, or `Large Presentation (Executive Boardroom)`.
- **Metric Value Formatting**: Auto / Compact Number (`1.2M`), Compact Currency (`$1.2M`), Percentage (`45.2%`), Decimal (2dp), or Raw.
- **Curve Smoothing Interpolation**: Monotone Cubic, Catmull-Rom Spline, Basis Spline, or Linear.
- **Show Background Gridlines**: Subtle dashed gridlines.

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
