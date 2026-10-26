# Interactive World & Regional Choropleth Map (`world_choropleth_map`)

An enterprise-grade, high-performance global and regional choropleth visualization built with **D3.js v7** and **TopoJSON Client**. Directly resolves premier Looker Buganizer Cloud Blockers (**`b/243984441`**, **`b/503077532`**, **`b/529195236`**), PRD **`go/prd-looker-map-viz-improvements`**, and internal YAQS threads (**`go/yeng/2594903516644376576`**, **`go/yeng/1995018768622813184`**).

Native Looker static map charts only support US states, UK postcodes, or a handful of metro areas out of the box, requiring developers to manually source, edit, and upload custom TopoJSON files into project git repositories with LookML `map_layer` definitions. Furthermore, native maps cannot dynamically pivot between global projections and 3D globes, provide zero continent drilldowns, lack proportional multi-metric bubble overlays, and fail when country names or non-standard ISO codes are returned.

This custom visualization solves all of these pain points out of the box with an integrated **Universal Country Resolution Engine**, **4 multi-modal projection modes (including an interactive 3D rotating globe)**, **continent drilldowns**, **multi-metric hybrid layering**, **dynamic field-role mapping (`registerOptions`)**, **customizable target benchmarks and anomaly alert thresholds**, **sorting & Top-N bucketing**, **executive HUD density controls**, and **client-side high-density aggregation across 5,000+ rows**.

---

## 💡 Inspiration & Cloud Blockers Solved

- **Buganizer Cloud Blocker `b/243984441`**: *Multi-layer maps, international regions, and multiple measures on maps.*
- **Buganizer Cloud Blocker `b/503077532`**: *Map Viz Configuration - Multiple measures on maps with expanded customization and vector map projection.*
- **Buganizer Cloud Blocker `b/529195236`**: *Custom Size Map Icons & Multi-Metric Bubble Pin Overlays.*
- **PRD - Looker Map Viz Improvements (`go/prd-looker-map-viz-improvements`)**:
  > *"As an Analyst, I should be able to plot multiple measures as distinct identifiers on a map... Google Map Viz should support multiple measures on the same map viz. Each measure should be displayed as an identifiable value. Analysts should be able to select the type and configure layers separately."*
- **Internal YAQS (`go/yeng/2594903516644376576` & `go/yeng/1995018768622813184`)**: *Native static map limitations: eliminates the requirement to upload custom TopoJSON files or configure complex LookML `map_layer` parameters.*

---

## 🚀 Key Features & Capabilities

- **Universal Country Resolution Engine**:
  - Automatically parses and resolves **English common country names** (*"United States"*, *"China"*, *"United Kingdom"*, *"Germany"*, *"France"*, *"Brazil"*, *"Japan"*, *"South Korea"*, etc.).
  - Resolves **ISO 3166-1 Alpha-2** (*"US"*, *"GB"*, *"DE"*, *"FR"*, *"CN"*, *"JP"*, *"BR"*, etc.).
  - Resolves **ISO 3166-1 Alpha-3** (*"USA"*, *"GBR"*, *"DEU"*, *"FRA"*, *"CHN"*, *"JPN"*, *"BRA"*, etc.).
  - Resolves **ISO 3166-1 Numeric codes** (*"840"*, *"826"*, *"276"*, *"250"*, *"156"*, etc.).
- **4 Multi-Modal Projections & Layouts**:
  1. `natural_earth`: Natural Earth balanced world projection with low shape and area distortion.
  2. `orthographic_globe`: Interactive 3D rotating globe with mouse drag-to-spin and auto-rotation toggle.
  3. `mercator`: Standard cylindrical web map projection.
  4. `equal_earth`: Equal-Earth true equal-area projection.
- **Continent & Regional Drilldown**:
  - Quick-focus presets for **North America**, **Europe**, **Asia**, **South America**, **Africa**, and **Oceania** with automated camera centering and scale zooming.
- **Dynamic Field-Role Mapping (`registerOptions`)**:
  - Select which query dimensions and measures drive the Country polygon fill, Secondary group, and Centroid bubble pin directly in the Edit Viz modal via dynamically populated dropdown menus.
- **Configurable Target Benchmarks & Anomaly Detection**:
  - Compare country performance against Dataset Mean, Dataset Median, Percentiles (P75/P90), a Fixed Quota value, or a Secondary Measure Column.
  - Automatically highlights territories deviating beyond the customizable Anomaly Alert Threshold (+/- %).
- **Sorting, Top-N Bucketing & Null Handling**:
  - Sort territories by Metric Value (Desc/Asc), Country Name (A-Z), or Variance vs Benchmark.
  - Top-N limiter with automatic "Other" rollup in executive summary statistics, and zero/null suppression toggle.
- **Dual-Metric Multi-Layer Hybrid Engine**:
  - **Layer 1 (Choropleth)**: Sequential / quantile / log gradient color fill based on Primary Measure (e.g. Total Revenue, Sales Volume).
  - **Layer 2 (Proportional Centroid Bubbles)**: Proportional circle pins placed at geographic centroids sized by Secondary Measure (e.g. Order Count, Gross Margin, Latency).
- **Executive Spatial KPI HUD**:
  - Three layout modes: Full Executive Scorecard, Compact Metric Strip, or Hidden.
  - Displays Global Total, Benchmark Target with variance, Leading Region (#1) with global share %, and Active Reporting Countries.
- **Real-Time Country Search**:
  - Instant search-as-you-type filter with glowing polygon highlight and camera auto-zoom.
- **Interactive Tooltips & Looker Drill-Downs**:
  - Glassmorphic hover cards displaying flag emoji, country name, continent, primary value & global share %, national rank, secondary metric value, benchmark variance, anomaly alert badge, and native drill menu hooks (`LookerCharts.Utils.openDrillMenu`).

---

## 📋 Data Requirements

| Field Type | Requirement | Supported Examples |
| :--- | :--- | :--- |
| **Dimension** | 1 Country / Region Dimension (Optionally 1 Secondary Dimension) | `users.country`, `transactions.customer_country`, `stores.country` (supports English names, ISO-2, ISO-3, or Numeric ISO) |
| **Measures** | 1 to 2 Numeric Measures | `order_items.total_sale_price` (Primary Choropleth Fill), `order_items.order_count` (Secondary Centroid Bubble Pin) |

---

## 🎨 Configuration Options

Configuration options are strictly organized into **2 clean tabs** (`Display` and `Style`) to prevent modal header wrapping:

### Section 1: Display
- **Projection & Layout Mode**: `natural_earth`, `orthographic_globe` (3D Globe), `mercator`, `equal_earth`.
- **Continent / Regional Focus**: `all` (Global), `north_america`, `europe`, `asia`, `south_america`, `africa`, `oceania`.
- **Country Dimension Override**: Dynamic dropdown populated via `registerOptions` to map which dimension drives geographic lookup.
- **Secondary / Group Dimension**: Optional grouping dimension (e.g. Continent / Sub-region).
- **Primary Metric Measure**: Dynamic dropdown to re-map which measure drives the polygon color ramp.
- **Secondary Bubble Pin Measure**: Dynamic dropdown to re-map which measure drives centroid bubble pin radii.
- **Benchmark / Target Mode**: `none`, `second_measure`, `dataset_mean`, `dataset_median`, `percentile_p75`, `percentile_p90`, `fixed`.
- **Fixed Target / Quota Value**: Numeric target when mode is `fixed`.
- **Benchmark Reference Label**: Custom reference line label displayed in HUD and tooltips.
- **Show Benchmark in HUD & Tooltips**: Toggle benchmark display.
- **Anomaly Alert Threshold (+/- %)**: Percentage deviation threshold triggering visual anomaly alerts.
- **Sort Territories By**: `metric_desc`, `metric_asc`, `country_asc`, `variance_desc`, `natural`.
- **Top-N Territories Limit**: Restricts map/ranking to top N countries (0 = all).
- **Rollup Non-Top-N into Other**: Summarizes unranked territories in the executive summary strip.
- **Suppress Zero / Null Territories**: Exclude non-reporting countries from color gradient calculations.
- **Secondary Bubble Pin Overlay**: Enable/disable proportional centroid bubbles for secondary measure.
- **Executive Spatial KPI HUD Mode**: `scorecard` (Full KPI Header), `compact_strip` (Dense row), `none` (Hidden).
- **Country Map Data Labels**: `leaders_only` (Top 10), `all` (All reporting countries), `hidden` (Tooltip only).
- **Custom Map Title / Subtitle**: Custom dashboard header overrides.
- **Real-Time Country Search Bar**: Toggle search input with glowing polygon highlight.
- **Show Gradient Legend Bar**: Toggle color gradient bar with min/max and benchmark ticks.
- **Auto-Rotate 3D Globe**: Continuous smooth planetary rotation in 3D globe mode.

### Section 2: Style
- **Color Theme Palette**: `google_enterprise` (Blues), `modern_slate` (Slate/Indigo), `cyberpunk_dark` (Neon/Dark), `emerald_finops` (Mint/Emerald), `sunset_media` (Amber/Coral), `wellverse_health` (Teal/Cyan), `custom_override` (Custom Hex).
- **Custom Primary / High Value Hex**: Primary color hex code for custom palette generation.
- **Custom Positive / Goal Hex**: Positive benchmark color override.
- **Custom Negative / Alert Hex**: Alert / deficit color override.
- **Metric Polarity**: `higher_better` (Revenue/Adoption) vs `lower_better` (Inverts ramp for Latency/Churn/CO2).
- **Typography & Font Scale**: `compact` (0.88x), `standard` (1.0x), `large` (1.2x Presentation).
- **Value Metric Format**: `auto`, `compact_currency`, `compact_num`, `currency`, `number`, `percentage`, `decimal_2dp`, `raw`.
- **Color Scale Metric Curve**: `quantile` (Equal rank bins), `linear` (Direct scale), `log` (Dampens extreme outlier skew).
- **Show Lat/Long Gridlines (Graticule)**: Geographic latitude/longitude meridian lines.
- **Crisp Country Borders**: Clean boundary strokes.
- **Unmatched / Empty Country Fill**: Neutral background fill for non-reporting territories.
- **Secondary Bubble Pin Color**: Accent color for centroid bubble pins.
