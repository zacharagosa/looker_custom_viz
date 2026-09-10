# Rank Bump & Trajectory Chart Looker Custom Visualization

![Rank Bump & Trajectory Chart Looker Custom Visualization](screenshot.png)


An executive multi-mode **Rank Bump & Trajectory Chart** built with **D3.js v7** for Looker. Designed for executive rank volatility analysis, market share shifts, competitive telemetry, customer segment ranking, and sports/gaming leaderboards over time.

---

## Key Features

- **Multi-Mode Functional Adaptability**:
  - `bump`: Classic smooth cubic Bézier rank bump curves with inverted rank axis (#1 at top).
  - `slope`: Two-period comparative slopegraph highlighting net gainers and fallers.
  - `parallel_coords`: Normalized coordinate trajectories across discrete multi-stage dimensions.
  - `stream`: Flow-volume area streams with rank ordering.
- **Interpolation Controls**:
  - Supports `bumpX` (smooth cubic Bézier), `natural` (smooth natural spline), `monotoneX` (monotone cubic), and `linear` (direct angular connections).
- **Interactive Executive HUD**:
  - Displays instant summary stats: Total Entities Tracked, Top Ranked Entity (#1), Biggest Gainer (rank delta), and Biggest Faller.
- **Client-Side Quick Filter & Search**:
  - Live search input to highlight specific entities and dim others instantly.
- **Entity Hover & Focus Isolation**:
  - Hovering any curve, node, or legend item isolates that entity's path, bringing it forward with a glowing drop-shadow while dimming background paths.
- **Looker Native Drill-Down Integration**:
  - Clicking any node opens Looker's context drill menu for granular exploration.
- **Scalability for Expanded Row Limits (5,000+ rows)**:
  - Client-side data rollups and configurable Top-N ranking truncation (Top 5 to Top 50, or All) to maintain 60 FPS rendering.
- **Strict 2-Tab Options Architecture**:
  - Organized strictly into `Display` and `Style` sections to ensure Looker's Edit Viz modal stays clean and uncrowded.

---

## Data Shape & Query Requirements

The visualization supports two flexible data layouts:

### Layout A: Pivoted Time Series (Recommended)
1. **Dimensions**: 1 Categorical Dimension (e.g. `products.category`, `users.state`, `teams.name`).
2. **Pivots**: 1 Temporal or Milestone Dimension (e.g. `order_items.created_month`, `tournaments.stage`).
3. **Measures**: 1 Numeric Measure (e.g. `order_items.total_sale_price`, `orders.count`).

### Layout B: Multi-Measure / Direct Dimensions
1. **Dimensions**: 1 Entity Dimension (e.g. `products.category`).
2. **Measures**: 2 to 12 Numeric Measures representing chronological periods (e.g. `q1_sales`, `q2_sales`, `q3_sales`).

---

## Configuration Options

### Display Tab
- **Visualization Layout Mode**: Bump Chart (`bump`), Slopegraph (`slope`), Parallel Coordinates (`parallel_coords`), Streamgraph (`stream`).
- **Curve Interpolation**: `bumpX` (Bézier), `natural`, `monotoneX`, `linear`.
- **Rank Scope & Filter**: Show Top 5, 10, 15, 20, 25, or All entities.
- **Line Width & Node Radius**: Sliders to adjust stroke thickness and marker sizes.
- **Show Node Rank Numbers**: Displays #1, #2, #3 inside the node markers.
- **Show End Labels & Net Rank Badges**: Displays entity names and green/red delta badges (+3, -2) at the final period.
- **Executive Summary HUD**: Toggles the executive KPI metric header.
- **Client-Side Search**: Toggles the interactive search filter bar.
- **Value Format**: Currency, Compact Currency, Integer, Percentage.

### Style Tab
- **Color Theme**: Corporate Modern, Google Vibrant, Cyber Dark, Sunset Ember, Emerald Wealth, Monochromatic Steel.
- **Background & Canvas Controls**: Dark mode / Light mode adaptive contrast.
- **Gridlines & Ticks**: Toggle temporal vertical divider gridlines.

---

## Demo Query Configuration

Run with the preconfigured Explore query:
- **Model**: `thelook`
- **Explore**: `order_items`
- **Fields**: `products.category`, `order_items.created_month`, `order_items.total_sale_price`
- **Pivots**: `order_items.created_month`
- **Filters**: `order_items.created_date`: `6 months`
- **Sorts**: `order_items.created_month asc`, `order_items.total_sale_price desc`

