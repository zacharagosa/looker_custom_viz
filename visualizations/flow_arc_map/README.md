# 🌐 Geospatial Flow & Route Arc Map

An interactive, multi-modal geospatial flow, supply chain route, and flight path visualization built with **D3.js v7** and **TopoJSON Client** for Looker. Designed to solve a persistent analytics challenge across logistics, retail fulfillment, telecommunications, airline routing, and financial clearing networks.

---

## 💡 The Community Analytics Gap

Native Looker mapping capabilities are limited to static regional choropleths and basic point plots on Google Maps. Organizations attempting to visualize:
- **Supply Chain & E-Commerce Fulfillment**: Warehouse/distribution center origin hubs routing orders to destination customer states/cities.
- **Airline & Transportation Networks**: Multi-hub flight paths and passenger volume.
- **Telecommunications & Cloud Networking**: Data center egress traffic, cross-region replication, and inter-datacenter latency.
- **Financial Clearing & Remittances**: Origin accounts clearing through regional liquidity hubs.

...previously had no native Looker capability to render curved origin-to-destination flow corridors, animated directional pulses, or spatial hexbin clustering without requiring expensive third-party mapping tokens (Mapbox) or encountering severe overplotting when querying 5,000+ coordinate records.

The **Geospatial Flow & Route Arc Map** provides pure SVG/Canvas rendering with zero external API key requirements, client-side aggregation across 5,000+ rows, pan/zoom interactivity, origin hub isolation, and live route search.

---

## 🚀 Key Features

### 1. Multi-Mode Layouts
- **Bézier Flow Arcs (`curved_arcs`)**: Great-circle quadratic Bézier curves with dynamic elevation avoiding straight-line overlap. Stroke width scales with volume/sales; colors represent origin hub, volume intensity, or shipping latency.
- **Hub & Spoke Radial (`hub_spoke`)**: Radial spider diagram anchoring origin distribution hubs with concentric outer halo rings and directed spokes.
- **Hexbin Spatial Density Grid (`hexbin_density`)**: Client-side hexagonal spatial tessellation clustering high-density coordinate destinations into regular bins colored by aggregate flow volume or density.
- **Choropleth Corridor Overlay (`choropleth_overlay`)**: Geographic state polygons shaded by inbound destination volume or delivery time, overlaid with major arterial flow corridors.

### 2. High-Density Scalability (5,000+ Rows)
- **Client-Side Route Rollup**: Automatically groups raw transactional records into distinct origin-destination paths, computing real-time percentile ranks and volume shares.
- **Top-N Density Filter**: Filter displayed corridors to *Top 15 Primary Arterials*, *Top 25 Core Corridors*, *Top 50*, *Top 100*, or *All Active Routes*.
- **Live Search & Hub Selector**: Instant autocomplete search box and interactive dropdown to isolate routes originating from specific hubs (e.g. "Los Angeles CA", "Memphis TN").

### 3. Dynamic Interactivity & Visual Polish
- **Animated Flow Pulses**: Glowing particle pulses traverse corridors in the direction of flow at 60fps.
- **D3 Pan & Zoom**: Smooth mouse wheel zooming, click-and-drag panning, and floating HUD navigation buttons (+, −, ⟲ Reset).
- **Executive HUD Banner**: Floating glassmorphism summary card displaying total network flow ($), active routes count, origin hubs count, and weighted average transit days.
- **Interactive Tooltips**: Glassmorphism card displaying route corridor, volume, percentage of total network flow, national volume rank, and Looker drill-down links.

---

## 📊 Required Data Fields

| Field Role | Recommended Field | Supported Types |
| :--- | :--- | :--- |
| **Origin Dimension** | `distribution_centers.name` | String (Hub name or US State) |
| **Origin Lat / Lon** *(optional)* | `distribution_centers.latitude`, `longitude` | Latitude / Longitude numbers |
| **Destination Dimension** | `users.state` or `users.city` | String (State name, abbreviation, or city) |
| **Destination Lat / Lon** *(optional)* | `users.approx_latitude`, `longitude` | Latitude / Longitude numbers |
| **Flow Volume Measure** | `order_items.total_sale_price` | Sum, Count, or Volume metric |
| **Latency Measure** *(optional)* | `order_items.average_shipping_time` | Average transit days or latency |
| **Shipment Count** *(optional)* | `order_items.order_count` | Integer count |

*Note: If coordinates are omitted, the visualization automatically resolves US state names and abbreviations against its built-in geographic centroid dictionary.*

---

## ⚙️ Configuration Options

### Display Tab
- **Map Flow Layout**: `curved_arcs` (Bézier Flow Arcs), `hub_spoke` (Hub & Spoke), `hexbin_density` (Hexbin Density Grid), `choropleth_overlay` (Choropleth Corridor).
- **Route Density Filter**: `all`, `15`, `25`, `50`, `100`.
- **Arc Arch & Curvature**: `0.2` (Subtle), `0.35` (Balanced), `0.55` (High Great-Circle).
- **Flow Pulse Animation**: `pulse` (Animated Particles), `glow` (Subtle Glow), `none` (Static Arcs).
- **Show Executive KPI HUD**: Toggle floating network metrics banner.
- **Show Origin Hub Selector**: Toggle interactive origin dropdown filter.
- **Show Route Search Filter**: Toggle interactive search filter.
- **Volume Metric Format**: `compact_currency` ($1.2M), `currency` ($1,234,567), `compact_num` (1.2M), `integer`.

### Style Tab
- **Color Theme**:
  - `cyber_dark`: Deep slate background (`#0b0f19`), neon cyan origin hubs, hot pink destinations, and electric glowing corridors.
  - `executive_slate`: Clean corporate dark slate with crisp blue/teal gradients.
  - `light_minimal`: Crisp porcelain white background with slate borders and cobalt corridors.
  - `ocean_blue`: Deep maritime navy background with gold and turquoise accents.
- **Arc Coloring Scheme**: `by_origin` (Color by Origin Hub), `by_volume` (Color by Volume Intensity), `by_latency` (Turbo gradient by Transit Time), `monochrome`.
- **Base Arc Stroke Width**: 1.0 to 10.0.
- **Origin Hub Radius**: 4 to 20.
- **Show Node & State Labels**: Toggle state and origin hub typography.

---

## 🛠️ Deployment & Registration

The visualization is deployed instance-wide via:
```bash
python3 /usr/local/google/home/aragosa/looker_custom_viz/scripts/deploy_viz.py --viz flow_arc_map --profile default
```
This deploys the JS bundle to `gs://looker-custom-viz-public-assets/flow_arc_map.js`, registers it instance-wide via `POST /api/4.0/vis_manifest`, and synchronizes it to the consolidated Looker Showcase Dashboard.
