# Interactive World & Regional Choropleth Map (`world_choropleth_map`)

An enterprise-grade, high-performance global and regional choropleth visualization built with **D3.js v7** and **TopoJSON Client**. Directly resolves premier Looker Buganizer Cloud Blockers (**`b/243984441`**, **`b/503077532`**, **`b/529195236`**), PRD **`go/prd-looker-map-viz-improvements`**, and internal YAQS threads (**`go/yeng/2594903516644376576`**, **`go/yeng/1995018768622813184`**).

Native Looker static map charts only support US states, UK postcodes, or a handful of metro areas out of the box, requiring developers to manually source, edit, and upload custom TopoJSON files into project git repositories with LookML `map_layer` definitions. Furthermore, native maps cannot dynamically pivot between global projections and 3D globes, provide zero continent drilldowns, lack proportional multi-metric bubble overlays, and fail when country names or non-standard ISO codes are returned.

This custom visualization solves all of these pain points out of the box with an integrated **Universal Country Resolution Engine**, **4 multi-modal projection modes (including an interactive 3D rotating globe)**, **continent drilldowns**, **multi-metric hybrid layering**, and **client-side high-density aggregation across 5,000+ rows**.

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
- **Dual-Metric Multi-Layer Hybrid Engine**:
  - **Layer 1 (Choropleth)**: Sequential / quantile gradient color fill based on Primary Measure (e.g. Total Revenue, Sales Volume).
  - **Layer 2 (Proportional Centroid Bubbles)**: Proportional circle pins placed at geographic centroids sized by Secondary Measure (e.g. Order Count, Gross Margin, Latency).
- **High-Density Scalability**:
  - Performs instant client-side grouping and aggregation across **5,000+ rows**, preventing query throttling or UI lag.
- **Executive Spatial KPI HUD**:
  - Global Total metric readout, leading country with % share, active reporting countries counter, and interactive top-ranking chips.
- **Real-Time Country Search**:
  - Instant search-as-you-type filter with glowing polygon highlight and camera auto-zoom.
- **Interactive Tooltips & Looker Drill-Downs**:
  - Glassmorphic hover cards displaying flag emoji, country name, continent, primary value & global share %, national rank, secondary metric value, and native drill menu hooks (`LookerCharts.Utils.openDrillMenu`).

---

## 📋 Data Requirements

| Field Type | Requirement | Supported Examples |
| :--- | :--- | :--- |
| **Dimension** | 1 Country / Region Dimension | `users.country`, `transactions.customer_country`, `stores.country` (supports English names, ISO-2, ISO-3, or Numeric ISO) |
| **Measures** | 1 to 2 Numeric Measures | `order_items.total_sale_price` (Primary Choropleth Fill), `order_items.order_count` (Secondary Centroid Bubble Pin) |

---

## 🎨 Configuration Options

Configuration options are strictly organized into **2 clean tabs** to prevent modal header wrapping:

### Section 1: Display
- **Projection & Layout Mode**: `natural_earth`, `orthographic_globe` (3D Globe), `mercator`, `equal_earth`.
- **Continent / Regional Focus**: `all` (Global), `north_america`, `europe`, `asia`, `south_america`, `africa`, `oceania`.
- **Secondary Bubble Pin Overlay**: Enable/disable proportional centroid bubbles for secondary measure.
- **Executive Spatial KPI HUD**: Toggle top summary header cards with global total and leading regions.
- **Real-Time Country Search Bar**: Toggle search input with golden glow highlight.
- **Auto-Rotate 3D Globe**: Continuous smooth planetary rotation in 3D globe mode.
- **Value Metric Format**: `compact_currency`, `compact_num`, `currency`, `number`, `percentage`.

### Section 2: Style
- **Color Theme Palette**: `google_enterprise` (Blues), `emerald_slate` (Teals/Greens), `sunset_amber` (Oranges/Corals), `ocean_breeze` (Cyans/Navy), `crimson_slate` (Reds), `monochrome_slate` (Graphite).
- **Color Scale Metric Curve**: `quantile` (Equal distribution across ranks), `linear` (Direct proportion), `log` (Dampen extreme outlier skew).
- **Show Lat/Long Gridlines (Graticule)**: Geographic latitude/longitude meridian lines.
- **Crisp Country Borders**: Clean white boundary strokes.
- **Unmatched / Empty Country Fill**: Background color for countries with zero reporting data.
- **Secondary Bubble Pin Color**: Accent color for centroid bubble pins.
