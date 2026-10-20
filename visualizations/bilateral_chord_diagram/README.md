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

## 🌟 Upgraded Options & Flexibility (Strict 2-Tab Schema)

The visualization implements a clean 2-tab configuration schema (`Display` and `Style`) to ensure Looker's Edit Viz modal headers never crowd or overlap:

### 📋 Display Tab
1. **Visualization Layout Mode**: Select between:
   - `Circular Directed Chord` (Default): Circular chord diagram with outer perimeter entity arcs, proportional quadratic Bezier ribbons, and directional gradient shading.
   - `Bilateral Flow Matrix (Heatmap)`: N x N grid heatmap showing Source-to-Target volume intensities, diagonal self-loop indicators, row outbound subtotals, and column inbound subtotals.
   - `Bipartite Split Corridor`: Groups source entities on the left and destination entities on the right with smooth bridging flow corridors.
2. **Dynamic Field-Role Mapping**:
   - `Source Entity Dimension`: Map which query dimension represents the origin/source entity.
   - `Target Entity Dimension`: Map which query dimension represents the destination/target entity.
   - `Primary Flow Measure`: Select which query measure drives flow volume and ribbon width.
   - `Comparison / Target Measure`: Select an optional comparison metric for benchmarking.
3. **Corridor Targets, Reference Lines & Thresholds**:
   - `Corridor Target & Benchmark Mode`: Benchmark against `Dataset Mean`, `Dataset Median`, `Percentile P75`, `Percentile P90`, `Fixed Target Value`, or a `Target Measure Column`.
   - `Custom Target Value`: Numeric target override.
   - `Benchmark Reference Label`: Custom label for reference indicators.
   - `Anomaly Alert Threshold (%)`: Threshold percentage above benchmark to trigger warning indicators (default 130%).
4. **Sorting, Capacity Limiter & Null Handling**:
   - `Entity & Ribbon Sort Order`: `Metric Volume Descending`, `Metric Volume Ascending`, `Alphabetical / Entity Name`, or `Chronological / Natural Order`.
   - `Entity Capacity Limiter`: Cap rendering to `Top 8`, `Top 10`, `Top 12`, `Top 16`, `Top 20`, `Top 30`, or `All Entities`.
   - `Bundle Remainder into "Other"`: Roll up long-tail entities into a unified `"+N Other Entities"` arc.
   - `Suppress Zero & Null Flows`: Filter out inactive corridors automatically.
   - `Show Self-Flow (Intra-Entity)`: Toggle internal self-loops (e.g. A ➔ A).
   - `Directional Ribbon Gradients`: Linear gradients indicating source-to-target direction.
5. **HUD, Search & Density Controls**:
   - `Executive Flow KPI HUD`: Multi-density options (`Full Scorecard Strip`, `Compact Strip`, or `Hidden`).
   - `Data Value Labels Density`: `All Visible Entities`, `Peak Corridors Only`, or `Hidden`.
   - `Custom Chart Title Override` & `Custom Subtitle Override`: Clean dashboard title headers.
   - `Entity Quick-Search Bar`: Real-time instant search input with interactive corridor dimming.

### 🎨 Style Tab
1. **Color Palette & Brand Themes**: Select from `Google Enterprise Spectrum`, `Modern Slate (Executive)`, `Cyberpunk Glow`, `Emerald FinOps`, `Sunset Media`, `Wellverse Healthcare`, or `Custom Hex Override`.
2. **Custom Hex Overrides**: Specify `Custom Primary Accent Hex`, `Custom Positive Benchmark Hex`, and `Custom Negative Anomaly Hex`.
3. **Metric Polarity**: Toggle between `Higher is Better` (Volume, Sales) and `Lower is Better` (Latency, Churn, Waste).
4. **Font Scale & Density**: `Compact`, `Standard`, or `Large Presentation`.
5. **Value Formatting**: Choose between `Auto Detect`, `Compact Number (1.2M)`, `Compact Currency ($1.2M)`, `Percentage (45.2%)`, `Decimal (2 Decimal Places)`, or `Raw Exact Number`.
6. **Geometry Styling**: `Ribbon Flow Opacity` (0.2–0.9), `Perimeter Arc Thickness` (px), `Arc Gap Spacing`, and `Entity Label Placement` (`Radial`, `Circumference`, or `Hidden`).

---

## 📊 Data Shape Requirements

| Field Type | Required Count | Purpose | Example (`thelook::order_items`) |
| :--- | :--- | :--- | :--- |
| **Dimension 1** | `1` *(Required)* | Source Entity (Origin Hub, Starting Tier, Departure Point) | `distribution_centers.name` |
| **Dimension 2** | `1` *(Required)* | Target Entity (Destination Market, New Tier, Arrival Point) | `users.state` *(or pivoted)* |
| **Measure 1** | `1` *(Required)* | Primary Flow Volume Metric (Sales, Volume, Bandwidth, Migration Count) | `order_items.total_sale_price` |
| **Measure 2** | `0 to 1` *(Optional)* | Secondary Transaction Count / Target Metric | `order_items.order_count` |

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
