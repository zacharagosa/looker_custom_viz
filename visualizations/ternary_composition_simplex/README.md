# Ternary 3-Component Composition Simplex Plot (`ternary_composition_simplex`)

A publication-grade **Barycentric Equilateral Ternary Simplex Plot** custom visualization for Looker built with **D3.js v7** (`d3.contourDensity`, `d3.polygonHull`, and exact equilateral barycentric projection). Designed with chart-first minimalism so the simplex geometry owns 90%+ of the viewport by default.

---

## Visual Paradigm & Capabilities

- **True Barycentric Coordinate Geometry**: Maps any 3 non-negative components $(A, B, C)$ onto the 2D probability simplex $p_A + p_B + p_C = 100\%$ inside an equilateral triangle with directional scientific tick marks and iso-proportion gridlines.
- **Clamped 2D KDE Density Contours**: Uses `d3.contourDensity()` clipped strictly to the equilateral simplex boundary (`<clipPath>`) to reveal multi-modal concentration peaks without scatter overplotting.
- **Universal Data Shape Support**:
  - **3 Separate Measures**: e.g., `pve_hours`, `pvp_hours`, `social_hours` (plus optional 4th size measure).
  - **1 Measure Pivoted across 3 Categories**: e.g., `focus_unified_billing.total_effective_cost` pivoted by `provider_name` (`AWS`, `Google Cloud`, `Microsoft`).
- **4 Interactive Display Modes**:
  1. `scatter_contours`: Barycentric scatter points layered over 2D KDE density contours (default).
  2. `scatter_only`: Clean barycentric scatter / bubble plot with optional group convex hulls.
  3. `density_heatmap`: Topographic filled KDE density bands with group centroids.
  4. `centroids_hulls`: Group mean centroids and dashed convex hull envelopes.
- **Interactive Hover Iso-Guides & Looker Drill Menus**: Hovering any point projects 3 dashed barycentric guide lines directly to the triangle edges and surfaces exact shares + raw values; clicking opens `LookerCharts.Utils.openDrillMenu`.
- **Clean 2-Tab Configuration**: Strictly `Display` and `Style` tabs with dynamic query-populated field-role dropdowns (`registerOptions`).

---

## Data Requirements

- **Dimensions**:
  - Primary (1st): Observation label (e.g., `charge_period_start_week`, `cohort_id`, `campaign_name`).
  - Secondary (Optional, 2nd): Color group / cluster dimension (e.g., `service_category`, `guild_archetype`).
- **Measures**:
  - Either **3 numeric measures** (Top, Bottom-Left, Bottom-Right apexes), **or** **1 numeric measure pivoted** by a 3-category dimension.
  - Optional extra numeric measure for proportional bubble radius.

---

## Domain-Authentic Demo Binding

Bound to `multicloud_focus_finops::focus_unified_billing`, plotting 318 weekly multi-cloud workload spend compositions across **AWS**, **Google Cloud**, and **Microsoft** segmented by `service_category` (`AI and Machine Learning`, `Analytics`, `Compute`, `Containers`, `Databases`, `Storage`).
