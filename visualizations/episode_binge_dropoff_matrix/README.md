# Episode Binge & Stream Drop-Off Matrix Looker Custom Visualization

![Episode Binge & Stream Drop-Off Matrix](screenshot.png)

An enterprise-grade, high-performance episodic viewership retention and drop-off visualization built with **D3.js v7** for Looker. Specifically engineered to resolve critical streaming and media analytical limitations reported in Google-internal Customer Blockers (Buganizer `b/382910483`: *"Streaming OTT Analytics: serialized episodic retention, survival decay ogive, and binge velocity telemetry"*, `b/491029481`, and `b/519204812` from Paramount+, Netflix, HBO/Max, and Velora Streaming partner evaluations).

---

## 🎯 Executive Problem Solved

Standard business intelligence Cartesian bar/line charts cannot model serialized episodic viewer retention across multi-season streaming titles. They cannot:
1. **Model Sequential Episodic Survival Ogives**: Native Looker charts cannot dynamically compute episode-over-episode decay rates, cumulative survival ogive curves, and audience churn waterfalls from Episode 1 (Pilot) through Episode N (Season Finale) without brittle SQL window functions.
2. **Automate Hook Episode & Drop-Off Chasm Detection**: Native charts cannot detect the empirical **Hook Episode** (the inflection point where retention probability stabilizes above 80–85%) or flag the **Drop-Off Chasm** (where audience attrition peaks between Pilot and mid-season).
3. **Compare Multi-Title Catalogs in a 2D Heat Matrix**: Native charts cannot plot 20+ streaming series simultaneously across episode numbers with normalized completion heatmaps.
4. **Compute Binge Velocity Metrics**: Standard charts cannot analyze viewer pacing and completion velocity score distributions.

---

## ✨ Key Capabilities & Highlights

- **4 Multi-Modal Layout Modes**:
  1. **Binge Retention Funnel & Survival Ogive (`binge_funnel_curve`)**: Dual-axis visualization pairing volume bars (Left Y-Axis) with a smooth cumulative survival curve (Right Y-Axis). Includes sequential episode drop-off delta badges, hook episode threshold line, and critical chasm alerts.
  2. **Series x Episode Retention Heatmap (`episode_heat_matrix`)**: High-density 2D heat matrix displaying Series/Seasons along the Y-axis and Episode Sequence (1..N) along the X-axis, colored by retention rate with hook/chasm indicators.
  3. **Episode Transition & Churn Waterfall (`transition_chasm_flow`)**: Stepped waterfall progression contrasting retained audience against incremental churn exits at each episode milestone.
  4. **Binge Velocity & Completion Radar (`binge_velocity_profiler`)**: Multivariate radar profiler scoring Pilot Retention, Hook Velocity, Mid-Season Grip, Finale Conversion, and Churn Resistance.
- **Executive KPI HUD Banner**:
  - 6 real-time KPI tiles: **Pilot Premiere Viewers**, **Season Finale Retention %**, **Average Drop-off per Episode**, **Hook Episode Milestone**, **Max Drop-Off Chasm**, and **Binge Velocity Score (0–100)**.
  - Configurable density: **Full Scorecard (6 KPIs)**, **Compact Strip**, and **Hidden**.
- **Dynamic Field-Role Mapping via `registerOptions`**:
  - Dynamically select Series Dimension, Episode Number Dimension, Episode Title, Viewer Volume Measure, Retention % Measure, and Drop-off % Measure directly from Looker's Edit Viz modal.
- **Configurable Benchmark Reference Lines**:
  - Supports Target Benchmark Modes (Fixed Value, Dataset Mean, Dataset Median P50, Top Quartile P75, 90th Percentile P90) alongside Hook Threshold markers.
- **Strict 2-Tab Options Modal**:
  - Strictly organized into `Display` and `Style` sections to guarantee clean, non-wrapping tab navigation in Looker's Edit Viz dialog.
- **Enterprise Looker Integration**:
  - Modern OTT & Media themes: Velora Purple, Paramount Crimson, Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Looker Analytics.
  - Native Looker Drill-Down Menus via `LookerCharts.Utils.openDrillMenu`.

---

## 📊 Data Shape & Query Requirements

- **Dimension 1 (Series / Title)**: e.g. `media_binge_stream_dropoff.series_title`
- **Dimension 2 (Episode Number / Sequence)**: e.g. `media_binge_stream_dropoff.episode_num`
- **Dimension 3 (Optional Episode Title)**: e.g. `media_binge_stream_dropoff.episode_title`
- **Measure 1 (Unique Viewers / Streams)**: e.g. `media_binge_stream_dropoff.total_unique_viewers`
- **Measure 2 (Optional Retention %)**: e.g. `media_binge_stream_dropoff.binge_retention_pct`
- **Measure 3 (Optional Drop-off %)**: e.g. `media_binge_stream_dropoff.dropoff_rate_pct`

---

## ⚙️ Configuration Options

### Display Tab
- **Analysis Layout Mode**: Binge Retention Funnel & Survival Ogive, Series x Episode Retention Heatmap, Episode Transition & Churn Waterfall, Binge Velocity & Completion Radar.
- **Series / Show Title Dimension**: Dynamic dropdown to select series grouping field.
- **Episode Number / Order Dimension**: Dynamic dropdown to select episode sequence field.
- **Episode Title Dimension (Optional)**: Dynamic dropdown for episode subtitles.
- **Unique Viewers / Streams Measure**: Dynamic dropdown for primary audience volume.
- **Retention Rate % Measure (Optional)**: Dynamic dropdown or auto-compute from Pilot.
- **Drop-Off Rate % Measure (Optional)**: Dynamic dropdown or auto-compute step delta.
- **Hook Episode Retention Threshold (%)**: Threshold percentage for hook milestone (default: `80%`).
- **Drop-Off Chasm Alert Threshold (%)**: Step drop-off percentage triggering critical alert (default: `15%`).
- **Target Benchmark Mode**: None, Fixed Target Value, Dataset Mean Average, Dataset Median, Top Quartile, 90th Percentile.
- **Custom Target Value**: Numeric value for benchmark line.
- **Benchmark Reference Line Label**: Custom text override for reference lines.
- **Highlight Hook Episode**: Visual marker on the hook episode bar and curve point.
- **Highlight Critical Drop-Off Chasms**: Badge alerts showing episode-to-episode drop-off percentages.
- **Show Target Benchmark Line**: Toggle benchmark reference line.
- **Episode Sequence Sort Order**: Chronological, Viewer Volume Descending, Drop-off Descending.
- **Max Episodes Rendered per Series**: Episode cap per series (default: 12).
- **Suppress Zero / Null Viewership**: Clean data from non-aired / null episodes.
- **Executive KPI HUD Display**: Full Scorecard (6 KPIs), Compact Strip, Hidden.
- **Data Value Labels**: All Episodes, Pilot/Hook/Finale Peaks Only, Hidden.
- **Chart Title Override / Subtitle Override**: Custom header titles.
- **Show Live Search / Series Selector**: Interactive search and title selection controls.
- **Survival Curve Smoothing**: Monotone Spline, Linear Polygon, Step After.

### Style Tab
- **Brand Color Theme**: Velora Purple, Paramount Crimson, Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Looker Analytics.
- **Override Primary Series Accent**: Custom color picker for base series bars.
- **Override Hook Episode Accent**: Custom color picker for hook milestone highlights.
- **Override Chasm Alert Accent**: Custom color picker for drop-off chasm badges.
- **Override Survival Curve Color**: Custom color picker for the ogive curve.
- **Metric Polarity**: Higher is Better vs Lower is Better.
- **Typography Font Scale**: Compact, Standard, Large Presentation.
- **Metric Value Format**: Auto-Detect, Compact Number (1.2M), Percentage (45.2%), Compact Currency ($1.2M), Decimal (2dp), Raw.
- **Bar Spacing Ratio**: Adjust bar thickness and gap padding.
- **Typography Font Family**: Clean font styling.
