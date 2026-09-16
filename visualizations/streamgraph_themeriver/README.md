# Interactive Streamgraph & ThemeRiver Volume Flow (`streamgraph_themeriver`)

A modern, high-performance **Streamgraph and ThemeRiver** visualization for Google Cloud Looker, built with **D3.js v7**.

Designed to resolve long-standing Google Cloud Customer Requirements and Buganizer Cloud Blockers (**b/340585545**, **b/490547912**, and YAQS thread **8624335012298227712**), this visualization enables intuitive visual analysis of organic multi-category volume ebb and flow across temporal sequences.

---

## 🌟 Key Capabilities & Enterprise Features

1. **Multi-Modal Baseline Geometry**:
   - **ThemeRiver / Silhouette (Centered Flow)**: Symmetrical centered baseline creating an organic river shape representing relative and aggregate category momentum.
   - **Wattenberg Stream (Organic Wiggle)**: Lee Byron & Martin Wattenberg algorithmic stream minimizing slope variance across curves.
   - **Stacked Area Flow (Zero Baseline)**: Traditional zero-pinned stacked area chart displaying cumulative baseline volume.
   - **100% Proportional Share Ribbon**: Normalized 0–100% proportional area stream revealing dynamic category market share changes over time.
   - **Joyplot / Staggered Ridges**: Vertically spaced individual ridge curves for isolated waveform and distribution shape comparisons.

2. **Expanded Row Limit Scalability (5,000+ Rows)**:
   - High-speed client-side matrix aggregation of high-density timestamps (hourly, daily, monthly) into uniform time slices.
   - Cubic spline curve smoothing options (**Catmull-Rom**, **MonotoneX**, **Basis Spline**, and **Linear**).
   - Automated **Top-N Dynamic Consolidation** with automatic tail aggregation into "+N Other Categories".

3. **Interactive Timeline Scrubber HUD & Exploration**:
   - **Vertical Crosshair Scrubber**: Tracks mouse movement across the continuous timeline with dynamic bisecting.
   - **Real-Time Slice HUD Tooltip**: Instant breakdown of total slice volume, top streams sorted descending, category color badges, and exact market share percentages.
   - **Stream Isolation / Solo Click**: Click any stream layer to spotlight its trend while dimming others.
   - **Live Filter & Search Bar**: Real-time category keyword search bar with reactive stream dimming.
   - **Looker Drill-Down Menus**: Native right-click / context menu integration with `LookerCharts.Utils.openDrillMenu`.

4. **Strictly 2-Tab Options Hierarchy**:
   - **Display**: Stream Flow Mode, Curve Smoothing, Stream Stacking Order, Top Streams to Display, Timeline Scrubber, Peak Anomaly Badges, Search Bar, Executive Summary HUD.
   - **Style**: Color Palette, Stream Fill Opacity, Stream Border Separator, In-Stream Category Labels, Label Font Size.

---

## 📋 Required Data Shape

Works out of the box with any of the following query structures:

| Pattern | Dimensions | Measures | Description |
| :--- | :--- | :--- | :--- |
| **Standard Long Format** | 1 Date dimension (`created_month`, `created_date`) + 1 Category dimension (`category`, `department`) | 1 Numeric measure (`total_sale_price`, `count`) | Ideal for standard multi-category time-series explorations. |
| **Pivoted Dimension Format** | 1 Date dimension | 1 Pivoted Dimension + 1 Numeric measure | Pivoted category columns across temporal rows. |
| **Wide Multi-Measure Format** | 1 Date dimension | 2+ Numeric measures | Comparing multiple distinct metrics over time (e.g. Sales, Gross Margin, Ad Spend). |

---

## 🚀 LookML Manifest Setup

Add the following block to your LookML project's `manifest.lkml`:

```lookml
visualization: {
  id: "streamgraph_themeriver"
  label: "Interactive Streamgraph & ThemeRiver"
  file: "visualizations/streamgraph_themeriver.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
