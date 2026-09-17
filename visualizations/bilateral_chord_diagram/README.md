# Bilateral Chord Diagram & Directed Flow Matrix

An executive **Bilateral Chord Diagram & Directed Flow Matrix** custom visualization for Google Cloud Looker, engineered with **D3.js v7**.

Designed for **Supply Chain & Logistics** (fulfillment hub to destination market flow corridors), **Telecommunications & Cloud Networks** (bilateral traffic exchange, BGP peering asymmetries, autonomous system interconnection), **Customer Lifecycle & Marketing** (subscription tier migrations, customer brand-switching matrices, cross-category market basket affinity), and **Healthcare & Enterprise Operations** (inter-department patient or work-order handoffs).

---

## 💡 Why This Custom Visualization Was Built

Looker lacks native circular chord diagrams and bilateral relational flow matrices out of the box. Traditional Looker charts (bar charts, scatter plots, or static tables) fail to visualize bilateral, two-way reciprocal relationships and directional imbalances between interconnected entities.

Furthermore, Looker open-source Buganizer records document severe gaps:
- **`b/314340020`**: Looker Marketplace chord visualization repository was broken/empty with missing JavaScript code.
- **`b/213338627`** (*Panorama*): Customer requirement to understand inbound and outbound warehouse traffic via an interactive chord diagram.
- **`b/184376439`** & **`b/171817900`** / **`b/171818436`**: Customer requests to visualize complex bilateral affinity, migration corridors, and multi-dimensional entity relationships.

This visualization provides a robust, multi-modal, enterprise-grade solution that scales to 5,000+ rows with client-side matrix aggregation, directional flow gradients, real-time entity search, and Looker drill-down integration.

---

## 📸 Key Features

- **Multi-Modal Display Layouts**:
  - `Circular Directed Chord Flow` (Default): Circular chord diagram with outer perimeter entity arcs, proportional quadratic Bezier ribbons, and directional gradient shading.
  - `Bilateral Flow Matrix (Heatmap)`: N x N grid heatmap showing Source-to-Target volume intensities, diagonal self-loop indicators, row outbound subtotals, and column inbound subtotals.
  - `Bipartite Split Corridor`: Groups source entities on the left and destination entities on the right with smooth bridging flow corridors.
- **Executive Flow KPI HUD**:
  - Floating metric banner displaying **Total Bilateral Flow Volume**, **Active Corridors**, **Dominant Corridor** (top pair volume and share), and **Reciprocity Balance Index** (measures bidirectional symmetry vs one-way concentration).
- **Expanded Row Limit Scalability (5,000+ Rows)**:
  - In-memory aggregation engine collapses thousands of granular transaction rows into a weighted `N x N` matrix.
  - Configurable Top-N entity filter (`Top 8`, `Top 10`, `Top 12`, `Top 16`, `Top 20`, or `All`) with automatic remainder bundling into a unified `"Other Entities"` arc, preserving 60 FPS fluid rendering.
- **Interactive Ribbon Isolation & Pinning**:
  - Hovering any arc immediately highlights all connected inbound and outbound ribbons while dimming non-connected corridors.
  - Hovering ribbons reveals a rich glassmorphism tooltip with Forward Flow, Reverse Flow, Net Asymmetry (+/- badge), and global volume share.
  - Clicking an arc pins the focus and allows unpinning via a top-bar chip.
- **Real-Time Entity Search Filter**:
  - Built-in search input in the top bar allows users to instantly search and highlight any entity name across large networks.
- **Looker Drill-Down Integration**:
  - Full support for Looker drill links (`LookerCharts.Utils.openDrillMenu`) on arc or matrix cell click, with an automated `🔎 CLICK ANY ARC TO DRILL` header affordance pill.
- **5 Curated Color Palettes**:
  - `Looker Modern` (Modern Blue, Teal, Coral, Violet)
  - `Tech Electric` (Cyan, Purple, Azure, Emerald)
  - `Sunset Flame` (Amber, Coral, Violet)
  - `Emerald Forest` (Mint, Teal, Deep Forest)
  - `Spectral Spectrum` (Full Rainbow)

---

## 📊 Data Shape Requirements

| Field Type | Required Count | Purpose | Example (`order_items`) |
| :--- | :--- | :--- | :--- |
| **Dimension 1** | `1` *(Required)* | Source Entity (Origin Hub, Starting Tier, Departure Point) | `distribution_centers.name` |
| **Dimension 2** | `1` *(Required)* | Target Entity (Destination Market, New Tier, Arrival Point) | `users.state` *(or pivoted)* |
| **Measure 1** | `1` *(Required)* | Primary Flow Volume Metric (Sales, Volume, Bandwidth, Migration Count) | `order_items.total_sale_price` |
| **Measure 2** | `0 to 1` *(Optional)* | Secondary Transaction Count Metric | `order_items.order_count` |

*Supports unpivoted queries (Dimension 1 + Dimension 2 + Measure) as well as pivoted queries (Dimension 1 + Pivot Dimension + Measure).*

---

## ⚙️ Configuration Options

### 📋 Display Tab
- **Visualization Layout Mode**: Select between `Circular Directed Chord`, `Bilateral Flow Matrix (Heatmap)`, or `Bipartite Split Corridor`.
- **Entity Capacity Limiter**: Cap rendering to `Top 8`, `Top 10`, `Top 12`, `Top 16`, `Top 20`, or `All Entities`.
- **Bundle Remainder into "Other"**: Aggregate long-tail tail entities into an `"Other Entities"` arc.
- **Show Self-Flow (Intra-Entity)**: Toggle display of internal self-loops (e.g. A ➔ A).
- **Directional Ribbon Gradients**: Enable linear gradient shading along ribbons indicating flow direction.
- **Executive Flow KPI HUD**: Toggle visibility of the top KPI statistics card.
- **Entity Quick-Search Bar**: Enable or disable the real-time search box.
- **Value Formatting**: Choose between Currency (`$ USD`), Compact (`1.2M`), Standard (`1,234`), or Percentage (`%`).

### 🎨 Style Tab
- **Visual Color Palette**: Select between Looker Modern, Tech Electric, Sunset Flame, Emerald Forest, or Spectral Spectrum.
- **Ribbon Flow Opacity**: Adjust ribbon opacity (`0.2` to `0.9`, default `0.65`).
- **Perimeter Arc Thickness**: Outer arc ring width in pixels (`12px` to `32px`, default `18px`).
- **Arc Gap Spacing**: Gap between entity slices (`0.01` to `0.08`, default `0.03`).
- **Entity Label Placement**: `Radial (Outward from Arc)`, `Circumference (Along Arc)`, or `Hidden`.
- **Label Font Size**: Font size for arc entity labels (`9px` to `16px`, default `11px`).

---

## 🚀 Manifest Registration

```lookml
visualization: {
  id: "bilateral_chord_diagram"
  label: "Bilateral Chord & Directed Flow Matrix"
  file: "visualizations/bilateral_chord_diagram.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
