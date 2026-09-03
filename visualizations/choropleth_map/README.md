# Interactive US Choropleth Map

An interactive, pure SVG **US State Choropleth Map** custom visualization for Google Cloud Looker, engineered with **D3.js v7** and **TopoJSON Client**.

Unlike native maps that require Google Maps API keys or third-party mapping subscriptions, this visualization renders directly as responsive SVG using official US Census TopoJSON boundaries. It supports quantile, linear, and quantize color scaling, interactive state hover cards, postal abbreviation labels, and Looker drill-down links.

---

## 📸 Key Features

- **Multi-Modal Display Options**:
  - `Choropleth Filled Polygons`: Classic continuous/quantile polygon shading.
  - `Proportional Bubble Pins`: Proportional circles scaled at state centroids using `d3.scaleSqrt()`, ideal for transaction frequency and volume pins.
  - `Hybrid Overlay`: Dual-layer visualization combining choropleth polygon fills with proportional bubble pin overlays.
- **5,000+ Row Expanded Row Limit Support**: Client-side high-density aggregation sums, averages, counts, and finds peaks across thousands of rows without requiring manual SQL pre-aggregation.
- **Interactive Pan & Zoom**: Smooth SVG navigation with floating Zoom In (`+`), Zoom Out (`−`), and Reset (`↺`) controls.
- **Full 50-State + DC Coverage**: Standard Albers USA projection rendered in scalable vector graphics.
- **Robust State Resolution**: Automatically parses full state names (`California`, `New York`), uppercase 2-letter postal codes (`CA`, `NY`), or FIPS codes.
- **Dynamic Color Scales**:
  - `Quantile` (Default): Equal count distribution across buckets for high visual contrast.
  - `Linear`: Continuous interpolation between minimum and maximum metric values.
  - `Quantize`: Equal-width interval buckets.
- **6 Executive Color Themes**:
  - `Google Blue` (Light ice blue to deep navy)
  - `Emerald Forest` (Mint to dark emerald)
  - `Thermal Heat` (Yellow-Orange-Red heat scale)
  - `Midnight Cyber` (Dark mode slate with glowing cyan)
  - `Sunset Amber` (Warm peach to terracotta)
  - `Cool Purple` (Lavender to deep violet)
- **Interactive Glassmorphism Tooltip**: Displays State Name, metric value, % contribution to national total, national rank (`#1 of 50`), and aggregated record count.
- **One-Click Looker Drill Links**: Click any state polygon or bubble pin to trigger Looker's native drill-down overlay.
- **Integrated Gradient Legend**: Shows gradient spread, min/max values, aggregation method, and metric name.

---

## 📊 Data Shape Requirements

| Field Type | Required Count | Purpose | Example (`order_items`) |
| :--- | :--- | :--- | :--- |
| **Dimension** | `1` *(Required)* | State Name or 2-letter Postal Code | `users.state` |
| **Measure 1** | `1` *(Required)* | Primary Numeric Metric | `order_items.total_sale_price`, `users.count` |

---

## ⚙️ Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `mapMode` | Select | `Choropleth Filled Polygons` | Visualization mode (`choropleth`, `bubble_pins`, `both_hybrid`) |
| `aggregationType` | Select | `Sum (Aggregate Total Value)` | High-density aggregation method across 5,000+ rows (`sum`, `avg`, `count`, `max`) |
| `colorTheme` | Select | `Google Blue` | Palette theme (`google_blue`, `emerald_forest`, `thermal_heat`, `midnight_cyber`, `sunset_amber`, `cool_purple`) |
| `colorScaleMode` | Select | `Quantile` | Distribution method (`quantile`, `linear`, `quantize`) |
| `showLabels` | Boolean | `true` | Display 2-letter postal abbreviation labels on states |
| `showLegend` | Boolean | `true` | Display gradient color bar with min/max values |
| `enableZoom` | Boolean | `true` | Enable interactive SVG pan and zoom with on-screen controls |
| `valueFormat` | Select | `Compact Currency` | Format for tooltip & legend (`compact_currency`, `full_currency`, `compact_number`, `full_number`, `percent`) |
| `nullColor` | Color | `#f1f5f9` | Color fill for states with no query data |
| `highlightColor` | Color | `#f59e0b` | Border stroke color on mouse hover |

---

## 🚀 Manifest Snippet (`manifest.lkml`)

```lookml
visualization: {
  id: "choropleth_map"
  label: "Interactive US Choropleth Map"
  file: "visualizations/choropleth_map.js"
  dependencies: [
    "https://d3js.org/d3.v7.min.js",
    "https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js"
  ]
}
```
