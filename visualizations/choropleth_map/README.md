# Interactive US Choropleth Map

An interactive, pure SVG **US State Choropleth Map** custom visualization for Google Cloud Looker, engineered with **D3.js v7** and **TopoJSON Client**.

Unlike native maps that require Google Maps API keys or third-party mapping subscriptions, this visualization renders directly as responsive SVG using official US Census TopoJSON boundaries. It supports quantile, linear, and quantize color scaling, interactive state hover cards, postal abbreviation labels, and Looker drill-down links.

---

## 📸 Key Features

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
- **Interactive Glassmorphism Tooltip**: Displays State Name, metric value, % contribution to national total, and national rank (`#1 of 50`).
- **One-Click Looker Drill Links**: Click any state polygon to trigger Looker's native drill-down overlay.
- **Integrated Gradient Legend**: Shows gradient spread, min/max values, and metric name.

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
| `colorTheme` | Select | `Google Blue` | Palette theme (`google_blue`, `emerald_forest`, `thermal_heat`, `midnight_cyber`, `sunset_amber`, `cool_purple`) |
| `colorScaleMode` | Select | `Quantile` | Distribution method (`quantile`, `linear`, `quantize`) |
| `showLabels` | Boolean | `true` | Display 2-letter postal abbreviation labels on states |
| `showLegend` | Boolean | `true` | Display gradient color bar with min/max values |
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
