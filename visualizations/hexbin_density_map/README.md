# ⬢ Geospatial Hexbin & Density Heatmap (`hexbin_density_map`)

An enterprise-grade, high-performance **Geospatial Hexagonal Binning & Point Density Heatmap** custom visualization for Looker. Built with **D3.js v7** and **TopoJSON Client**, designed to scale effortlessly to **5,000+ raw data rows** with zero browser lag or visual occlusion.

---

## 💡 Motivation & Customer Problems Solved

### Buganizer Cloud Blockers & Customer Requirements
- **Buganizer Cloud Blockers `b/418217123`, `b/537254276`, `b/556359527`**:
  - *"Review Hexbin Map / Map Density Heatmap Visualization Rendered in Embedded Dashboard / Point Density Accumulation with Shader & Color Ramps"*.
- **Buganizer Cloud Blockers `b/503077532`, `b/243984441` (Verizon M5 & Looker Map PRD `go/prd-looker-map-viz-improvements`)**:
  - *"Enhanced Geospatial / Map Chart Types: Vector Maps, Layers, Polygons, Hexbins, and Point Density Clustering"*.
- **Looker Map Legacy Deprecation (Looker 24.18)**:
  - Looker disabled the legacy Map chart type, removing the legacy "Automagic Heatmap". Enterprise teams in Telecommunications (cell tower signal density), Logistics (fulfillment routing clusters), and E-commerce (order volume density) were left without a native way to aggregate thousands of raw coordinate points into regular spatial density bins.
- **The "Ink Blob / Hairball" Occlusion Problem**:
  - Out-of-the-box Looker maps plot individual SVG circles for each coordinate. When dealing with 2,000–5,000+ points in urban corridors (e.g. New York, Los Angeles, Chicago), the points completely overlap into an illegible solid blob, while causing severe browser DOM slowdown.
  - **The Solution**: Client-side mathematical hexagonal tessellation aggregates points into discrete, uniform spatial cells, calculating density, sums, averages, and national rankings in $O(N)$ time.

---

## 🚀 Key Features & Flexibility Upgrade

1. **4 Multi-Modal Rendering Layouts**:
   - **`hexbin_density` (Hexagonal Spatial Binning)**: Pointy-topped hexagonal tessellation grid encoding metric intensity via sequential color ramps and optional proportional area sizing.
   - **`density_heatmap` (Continuous Gaussian Heatmap)**: Smooth radial Gaussian density halos and kernel density estimation (KDE) contours displaying intense geographic hotspots without discrete cell lines.
   - **`cluster_bubbles` (Spatial Bubble Clusters)**: Proportional centroid bubble clusters with localized point counts and pulse halos.
   - **`hex_cartogram` (Equal-Area US State Cartogram)**: Equal-area hexagonal state tiles eliminating land-area bias (e.g. preventing Alaska, Texas, and Montana from dwarfing Rhode Island and New Jersey).
2. **Dynamic Field-Role Mapping (`Display`)**:
   - Dropdown selectors dynamically populated via `registerOptions` allow mapping which query dimensions represent State/Latitude or Longitude, and which measures drive Primary Volume, Point Count, or Target Benchmarks without editing LookML.
3. **Configurable Reference Lines, Targets & Thresholds (`Display`)**:
   - Benchmark targets can be dynamically sourced from a measure column, fixed custom value, dataset mean, median, P75, or P90.
   - Statistical anomaly alert highlighting flags cells exceeding user-defined standard deviation thresholds (1.0σ, 1.5σ, 2.0σ, 2.5σ) with glowing warning indicators and tooltip badges.
4. **Sorting, Top-N Bucketing & Null Handling (`Display`)**:
   - Supports Natural, Metric Descending/Ascending, Alphabetical, and Point Density sorting.
   - Configurable Top-N capacity limits (Top 10, 25, 50, 100) with automatic non-top entity background rollup.
   - Zero/null coordinate suppression toggle.
5. **HUD, Legend & Label Density Controls (`Display`)**:
   - Executive spatial HUD configurable to **Full Scorecard Cards**, **Compact Summary Strip**, or **Hidden**.
   - Data label density controls: State Postal Codes, Peak Hotspots & Anomalies Only, All Visible Cells, or Hidden.
   - Custom title and subtitle overrides.
6. **Custom Brand Palettes, Polarity & Typography (`Style`)**:
   - Curated enterprise palettes: *Plasma, Turbo, Viridis, Inferno, Electric Blue, Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Sunset Media, Wellverse Healthcare*, and *Custom Hex Two-Color Gradient*.
   - Metric polarity toggle (`Higher is Better` vs `Lower is Better` for latency/cost).
   - Typography font scaling (*Compact 11px*, *Standard 13px*, *Large Presentation 15px*) and flexible value metric formatting (*Auto, Compact Number, Compact Currency, Percentage, Decimal, Raw Integer*).
7. **5,000+ Row Scalability**:
   - Client-side spatial indexing and $O(N)$ binning engine scales seamlessly across dense datasets.
8. **Interactive Pan, Zoom, Search & Drill**:
   - Full D3 pan/zoom with reset button, live search-as-you-type filter, and native Looker drill-down menus (`LookerCharts.Utils.openDrillMenu`).
9. **Strict 2-Tab Options Hierarchy**:
   - All settings strictly consolidated into **Display** and **Style** to guarantee clean, uncrowded tabs in Looker's Edit Viz modal.

---

## 📊 Data Requirements

- **Dimensions**:
  - Primary: Latitude dimension (e.g. `users.approx_latitude`, `distribution_centers.latitude`)
  - Secondary: Longitude dimension (e.g. `users.approx_longitude`, `distribution_centers.longitude`)
  - *Fallback*: A single Geographic State/Region string dimension (e.g. `users.state`) will automatically map to geographic state centroids.
- **Measures**:
  - Primary Measure: Total Metric Volume (e.g. `order_items.total_sale_price`, `order_items.order_count`).
  - Secondary Measure (Optional): Secondary KPI for multi-metric hover comparisons.

---

## ⚙️ Configuration Reference

### Section: `Display`
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `layout_mode` | select | `hexbin_density` | Toggle between Hexagonal Binning, Gaussian Heatmap, Bubble Clusters, or Hex Cartogram |
| `aggregation_type` | select | `sum` | Aggregation method per cell: `sum`, `count`, `avg`, or `max` |
| `dimStateOrLatOverride` | select | `Auto` | Select query dimension for State or Latitude |
| `dimLonOverride` | select | `Auto` | Select query dimension for Longitude |
| `measureValueOverride` | select | `Auto` | Select primary volume/value measure |
| `measureCountOverride` | select | `Auto` | Select secondary measure or point count |
| `target_mode` | select | `none` | Target Benchmark: `none`, `measure_col`, `fixed`, `mean`, `median`, `p75`, `p90` |
| `custom_target_value` | number | `0` | Custom numerical target value |
| `target_reference_label` | string | `Target Quota` | Reference label for target in HUD and tooltip |
| `highlight_anomalies` | boolean | `false` | Highlight high-density statistical anomalies |
| `anomaly_threshold_stddev` | select | `2.0` | Anomaly sensitivity: 1.0σ, 1.5σ, 2.0σ, or 2.5σ |
| `sort_order` | select | `natural` | Sort: `natural`, `metric_desc`, `metric_asc`, `alpha`, `count_desc` |
| `top_n_limit` | select | `all` | Top-N Hotspots Filter: `all`, `10`, `25`, `50`, `100` |
| `top_n_rollup_other` | boolean | `true` | Retain non-top N entities in background styling |
| `suppress_zeros` | boolean | `true` | Suppress zero / null coordinates |
| `hud_mode` | select | `full` | Spatial HUD mode: `full`, `compact`, or `hidden` |
| `label_density` | select | `state_only` | Data label density: `state_only`, `peaks`, `all`, `hidden` |
| `custom_chart_title` | string | `""` | Custom chart title override |
| `custom_chart_subtitle` | string | `""` | Custom subtitle / description override |
| `show_search` | boolean | `true` | Show real-time state/region search bar |
| `show_legend` | boolean | `true` | Show color ramp gradient scale |
| `hex_radius` | number | `20` | Hexagon cell radius in pixels (8px – 50px) |
| `proportional_hex_size` | boolean | `true` | Scale hexagon polygon area by metric volume magnitude |
| `min_points_threshold` | number | `1` | Minimum points required to render a spatial cell |

### Section: `Style`
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `color_palette` | select | `plasma` | Palette: `plasma`, `turbo`, `viridis`, `inferno`, `electric_blue`, `google_enterprise`, `modern_slate`, `cyberpunk_dark`, `emerald_finops`, `sunset_media`, `wellverse_healthcare`, `custom_ramp` |
| `custom_primary_hex` | color | `#4285f4` | Custom primary / high-density color override |
| `custom_secondary_hex` | color | `#e8f0fe` | Custom base / low-density color override |
| `metric_polarity` | select | `higher_is_better` | Inverts color gradient if `lower_is_better` |
| `basemap_theme` | select | `light_clean` | Theme: `light_clean`, `dark_slate`, `midnight_navy`, `paper_minimal`, `no_basemap` |
| `hex_opacity` | number | `0.85` | Hexagon fill opacity (0.2 – 1.0) |
| `hex_stroke` | select | `crisp_white` | Border style: `crisp_white`, `subtle_dark`, `neon_accent`, `none` |
| `font_scale` | select | `standard` | Font scale: `compact` (11px), `standard` (13px), `large` (15px) |
| `value_format` | select | `auto` | Metric format: `auto`, `compact_num`, `compact_cur`, `percentage`, `decimal_2dp`, `raw_int` |

---

## 🛠️ Mathematical Model

Hexagonal coordinates are resolved using axial and cube lattice coordinate rounding:

$$\begin{aligned}
q &= \frac{\frac{\sqrt{3}}{3} x - \frac{1}{3} y}{R} \\
r &= \frac{\frac{2}{3} y}{R}
\end{aligned}$$

Cube coordinates $[x, y, z] = [q, -q-r, r]$ are rounded to the nearest integer triple enforcing $x + y + z = 0$. The geometric center $[c_x, c_y]$ is calculated as:

$$\begin{aligned}
c_x &= R \sqrt{3} \left(q + \frac{r}{2}\right) \\
c_y &= R \frac{3}{2} r
\end{aligned}$$
