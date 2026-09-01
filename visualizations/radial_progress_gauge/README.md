# Radial KPI Progress Gauge

A custom Looker visualization built with D3.js v7 providing multi-tier concentric progress rings inspired by Apple Watch fitness rings and cloud quota indicators.

## Features
- **Concentric Multi-Tier Rings**: Visualize multiple metrics simultaneously on concentric arcs.
- **Dynamic Goals**: Set a global target or let the visualization scale automatically.
- **Center KPI Metric**: Highlights average completion percentage and primary metric readout in the center.
- **Interactive Tooltips**: Hover over rings to view exact values, percentage of target, and labels.
- **Customizable Palettes**: Choose between Google Vibrant, Cyber Neon, Emerald Ocean, and Sunset Warmth themes.
- **Adaptive Sizing**: Uses SVG viewBox for crisp rendering on screens of any size or resolution.

## Recommended Data Shapes
1. **Multi-Measure View**: 1 row with 2 to 5 measures (e.g. `Total Sale Price`, `Order Count`, `Average Spend`).
2. **Dimension + Measure View**: 1 dimension and 1 measure across top 3-6 categories/items (e.g. `Product Category` and `Total Sales`).

## Setup in Looker (`manifest.lkml`)
```lookml
visualization: {
  id: "radial_progress_gauge"
  label: "Radial KPI Progress Gauge"
  file: "visualizations/radial_progress_gauge.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```

Or via jsDelivr CDN:
```lookml
visualization: {
  id: "radial_progress_gauge"
  label: "Radial KPI Progress Gauge"
  url: "https://cdn.jsdelivr.net/gh/zacharagosa/looker_custom_viz@main/visualizations/radial_progress_gauge/radial_progress_gauge.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
