# 💰 Unit Economics & LTV:CAC Payback Breakeven Curve

A premier Looker Custom Visualization designed for **CFOs, VP RevOps, Growth Marketing Leaders, and SaaS/E-Commerce Strategy Teams**. It solves the foundational capital-efficiency and customer unit economics challenge: **visualizing the month-by-month cash payback trajectory, exact breakeven crossing point, underwater cash investment trough, and LTV expansion multiples across customer cohorts and acquisition channels**.

Built with **D3.js v7** to solve critical enterprise Cloud Blockers and Customer Deal Requirements (**b/419827361**).

---

## 🎯 Enterprise Problem Solved

Standard Looker native charts (lines, bars, area charts) face severe analytical limitations when modeling customer unit economics:
1. **Dynamic Payback Breakeven Modeling**: Native Looker line charts cannot dynamically calculate when cumulative gross margin crosses initial customer acquisition cost (CAC). They cannot plot the negative initial investment trough, detect fractional crossing months, or display breakeven pins without brittle custom SQL window functions.
2. **Underwater Cash Drain vs. Profit Accumulation Zones**: Automatically partitions the chart into a shaded **Underwater Cash Trough** (red/coral) where net capital is unrecovered, and an **Accumulated Profit Zone** (emerald) as cohorts mature past 1x, 2x, and 3x CAC.
3. **Multi-Channel Payback Trajectory Comparison**: Overlays acquisition channels (`Search`, `Email`, `Organic`, `Social`, `Display`) to instantly identify which channels achieve the fastest payback and highest 12-month LTV:CAC multiples.
4. **Single-Customer Unit Economics Waterfall**: Decomposes lifetime value step-by-step from initial CAC acquisition spend, first-order margin, repeat expansion, through returns and churn drag.
5. **LTV:CAC vs Payback Months Efficiency Matrix**: Evaluates channel efficiency in a 4-quadrant strategic matrix (Hyper-Efficient Growth, Slow Capital Recovery, Fast Churn Trap, Value Destroyer).

---

## 🚀 4 Multi-Modal Layout Modes

Switchable in real time via the **Display** options tab:

| Mode | Key | Description |
| :--- | :--- | :--- |
| **Cumulative Payback & Breakeven Curve** | `payback_curve` | Full trajectory line starting at `-CAC` with shaded underwater cash investment zone, breakeven crossing pin, and positive profit accumulation area. |
| **Multi-Channel Cohort Comparison** | `cohort_comparison` | Overlays multiple channel/cohort payback curves side-by-side with color-coded endpoints and payback duration badges. |
| **Single-Customer Waterfall** | `unit_economics_waterfall` | Step-by-step unit economics waterfall from acquisition CAC to net lifetime contribution. |
| **LTV:CAC Efficiency Matrix** | `ltv_cac_matrix` | 4-quadrant strategic scatter matrix plotting LTV:CAC ratio vs payback months. |

---

## 📊 Executive KPI HUD Scorecard

Equipped with real-time executive telemetry with configurable density (`full`, `compact`, `hidden`):
- **Blended CAC**: Formatted customer acquisition cost per customer (e.g. `$140.00`).
- **Payback Horizon**: Exact months to breakeven (e.g. `8.4 Months` with dynamic status badge: `🟢 Payback <10 mo`, `🟡 Moderate`, `🔴 Cash Underwater`).
- **12-Month LTV:CAC Ratio**: Real-time multiple (e.g. `3.8x` vs `3.0x Target`).
- **Gross Margin Assumption**: Interactive gross margin % model (e.g. `65% Assumed`).
- **12M Cumulative Profit**: Total dollar gross profit contribution per customer.

---

## 🛠️ Data Requirements

| Field Role | Required | Description | Example LookML Field |
| :--- | :---: | :--- | :--- |
| **Channel / Cohort Dimension** | **Yes** | Acquisition channel, cohort month, or customer segment | `users.traffic_source`, `users.created_month` |
| **Time Dimension** | Optional | Order month, cohort progression period (M0, M1, M2...) | `order_items.created_month` |
| **Gross Revenue Measure** | **Yes** | Total revenue or sales generated | `order_items.total_sale_price` |
| **Orders Measure** | Optional | Total order or transaction volume | `order_items.order_count` |
| **Customers Measure** | Optional | Distinct customer count or unit volume | `order_items.count` |

*Supports up to 5,000+ rows with performant client-side O(N) cohort rollup.*

---

## 🎨 Clean 2-Tab Options Architecture

In strict accordance with Looker Custom Visualization design guidelines, configuration options are minimized to **exactly 2 tabs** to prevent modal header crowding:

### 1. `Display` Tab
- **Layout & Analytical Mode**: Payback Curve, Cohort Comparison, Unit Economics Waterfall, or LTV:CAC Matrix.
- **Field-Role Overrides**: Dynamic dropdown selectors for Channel Dimension, Time Dimension, Revenue Measure, Orders Measure, and Customers Measure.
- **CAC Calculation Mode**: Fixed Custom CAC Override ($) or Blended Acquisition Ratio (30% of M0 Revenue).
- **Fixed CAC Override Value ($)**: Customizable acquisition cost per customer.
- **Gross Margin Assumption (%)**: Percentage of gross revenue converted to gross profit.
- **Target Payback Horizon (Months)**: Target breakeven threshold for green/yellow/red status pills.
- **Target LTV:CAC Multiple**: Target multiple benchmark (default `3.0x`).
- **Top-N Channels / Cohorts**: Filter to top 3, 5, 8, or All channels.
- **Executive KPI HUD Scorecard**: Full Scorecard Strip, Compact Summary, or Hidden.
- **Data Point & Intercept Labels**: All Month Points, Breakeven & Peaks Only, or Hidden.
- **Custom Title / Subtitle Override**: Optional header text overrides.
- **Real-Time Channel Search Filter**: Search-as-you-type filter with glow focus and dimming.

### 2. `Style` Tab
- **Color Palette Theme**: Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Sunset Media, Wellverse Healthcare, Custom Hex Override.
- **Custom Primary / Secondary Color**: Hex overrides for recovery and underwater trough (`display: 'color'`).
- **Metric Polarity**: Higher is Better vs Lower is Better.
- **Typography Font Scale**: Compact, Standard, or Large Presentation.
- **Financial Metric Format**: Auto, Compact Currency (`$1.2M`), Compact Number (`1.2M`), Percentage (`15.2%`), Decimal, or Raw.
- **Trajectory Curve Smoothing**: Smooth Monotone Spline, Straight Linear Segments, or Stepped Cash-Flow Plateau.
- **Shade Investment & Profit Zones**: Toggle shaded background fills below and above breakeven.
- **Trajectory Line Thickness**: Hairline (1.5px), Standard (2.5px), Bold (3.5px).

---

## 🔗 Drill-Down Integration

Fully integrated with Looker's native drill paths. Right-clicking or Shift/Ctrl-clicking any cohort point opens the native Looker Drill Menu (`LookerCharts.Utils.openDrillMenu`) with all configured `drill_fields`.
