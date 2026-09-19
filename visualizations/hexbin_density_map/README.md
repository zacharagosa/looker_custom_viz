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

## 🚀 Key Features

1. **4 Multi-Modal Rendering Layouts**:
   - **`hexbin_density` (Hexagonal Spatial Binning)**: Pointy-topped hexagonal tessellation grid encoding metric intensity via sequential color ramps and optional proportional area sizing.
   - **`density_heatmap` (Continuous Gaussian Heatmap)**: Smooth radial Gaussian density halos and kernel density estimation (KDE) contours displaying intense geographic hotspots without discrete cell lines.
   - **`cluster_bubbles` (Spatial Bubble Clusters)**: Proportional centroid bubble clusters with localized point counts and pulse halos.
   - **`hex_cartogram` (Equal-Area US State Cartogram)**: Equal-area hexagonal state tiles eliminating land-area bias (e.g. preventing Alaska, Texas, and Montana from dwarfing Rhode Island and New Jersey).
2. **5,000+ Row Client-Side Scalability**:
   - Ingests 5,000+ coordinate rows. High-performance axial/cube coordinate rounding executes in milliseconds, reducing 5,000 DOM elements down to ~50–200 smooth hexagonal SVG polygons.
3. **Flexible Geo-Resolution**:
   - Accepts raw GPS coordinates (`users.approx_latitude`, `users.approx_longitude`) OR standard state/region dimension strings (`users.state`) with automatic centroid fallback.
4. **Interactive Pan, Zoom & Search**:
   - Full D3 pan and zoom with bounds clamping and floating navigation controls (`[+]`, `[-]`, `[↺ Reset]`).
   - Live search-as-you-type filter with glowing boundary highlights on matching states and hexbins.
5. **Executive Spatial KPI HUD**:
   - Real-time national rollups: **Total Points**, **Aggregated Volume**, **Active Spatial Cells**, and **Peak Density**.
6. **Native Looker Drill Menus**:
   - Clicking any hexagon or cluster invokes `LookerCharts.Utils.openDrillMenu` with native LookML drill paths.
7. **Strict 2-Tab Options Hierarchy**:
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
| `hex_radius` | number | `20` | Hexagon cell radius in pixels (8px – 50px) |
| `proportional_hex_size` | boolean | `true` | Scale hexagon polygon area by metric volume magnitude |
| `min_points_threshold` | number | `1` | Minimum points required to render a spatial cell |
| `show_hud` | boolean | `true` | Show executive KPI summary banner |
| `show_search` | boolean | `true` | Show real-time state/region search bar |
| `show_legend` | boolean | `true` | Show color ramp gradient scale |

### Section: `Style`
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `color_palette` | select | `plasma` | Palette: `plasma`, `turbo`, `viridis`, `inferno`, `electric_blue`, `sunset_amber`, `emerald_surge` |
| `basemap_theme` | select | `light_clean` | Theme: `light_clean`, `dark_slate`, `midnight_navy`, `paper_minimal` |
| `hex_opacity` | number | `0.85` | Hexagon fill opacity (0.2 – 1.0) |
| `hex_stroke` | select | `crisp_white` | Border style: `crisp_white`, `subtle_dark`, `neon_accent`, `none` |

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
