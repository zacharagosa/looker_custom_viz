# Calendar Activity Heatmap

A custom Looker visualization built with D3.js v7 that renders an interactive, GitHub-style contribution grid across rolling calendar dates.

## Features
- **53-Week Calendar Grid**: 7 days per week organized with month and day-of-week axes.
- **Quantile Color Scaling**: Automatically partitions non-zero metric values across 4 gradient intensity levels.
- **Interactive Tooltips**: Displays full formatted day, date, and exact metric count or revenue.
- **Summary Metrics Header**: Highlights total volume, active days, and peak day in a clean top bar.
- **Theme Palettes**: Switch effortlessly between GitHub Classic (Green), Electric Blue, Solar Ember (Orange), and Cyber Purple.
- **Configurable Geometry**: Fine-tune cell size, rounded corner radius, and cell spacing.

## Recommended Data Shapes
- **Dimension 1**: A Date field (e.g. `order_items.created_date`, `events.event_date`) formatted as `YYYY-MM-DD`.
- **Measure 1**: Any count or sum measure (e.g. `order_items.count`, `order_items.total_sale_price`).
- **Filter**: Filter by a relevant timeframe, such as `last 365 days` or `last 90 days`.

## Setup in Looker (`manifest.lkml`)
```lookml
visualization: {
  id: "calendar_activity_heatmap"
  label: "Calendar Activity Heatmap"
  file: "visualizations/calendar_activity_heatmap.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
