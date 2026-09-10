# Telemetry & Conversion Funnel Looker Custom Visualization

![Telemetry & Conversion Funnel Looker Custom Visualization](screenshot.png)


An executive-grade, high-performance telemetry pipeline and conversion funnel visualization built with **D3.js v7** for Looker. Specifically engineered for **Gaming Telemetry** (FTUE level progression, player drop-off, in-game economy sink funnels), **E-Commerce & Retail** (Checkout conversion, cart abandonment, multi-touch attribution channels), and **SaaS & Product Telemetry** (Onboarding activation, sign-up workflows, product feature adoption).

---

## Key Capabilities & Highlights

- **4 Multi-Mode Pipeline Layouts**:
  1. **Curved Stream Pipeline**: Smooth continuous Bézier flow ribbon connecting stage pillars with organic liquid contours and bottleneck drop-off indicators.
  2. **Stepped Isometric Funnel**: Classic trapezoidal stage blocks with highlighted drop-off lateral badges and stage-to-stage conversion metrics.
  3. **Waterfall Drop-off Stack**: Dual-column bar layout pairing retained stage volume with red downward churn columns highlighting exact lost counts.
  4. **Segmented Stacked Stream**: Multi-channel or multi-cohort stage breakdown displaying stacked categorical bands across every funnel step.
- **Dual-Metric Telemetry Support**: Compare primary throughput volume (users, events, sessions) with a secondary business metric (revenue, gross margin, processing time) simultaneously.
- **Client-Side Scalability (5,000+ Rows)**: High-performance client-side aggregation, multi-dimensional slicing, and dynamic sorting ensure smooth 60fps rendering even on massive datasets.
- **Interactive Executive HUD Bar**: Real-time KPI summary displaying Top-of-Funnel Entry, Bottom-of-Funnel Conversion %, Total Steps, and automated Primary Bottleneck Detection.
- **Client-Side Live Filtering**: Instantaneous in-memory stage search filter and interactive segment/channel dropdown selector.
- **Rich Glassmorphism Tooltips & Looker Drill-Down**: Deep stage insights with step-to-step conversion, top-of-funnel conversion, drop-off quantities, and native Looker drill-down menu support.
- **Streamlined 2-Tab Options Modal**: Options are strictly organized into `Display` and `Style` tabs to prevent crowded or overlapping edit dialog headers in Looker.

---

## Data Shape & Query Requirements

The visualization supports three versatile data formats:

### Format A: Multi-Dimensional Cohort / Channel Funnel (Recommended)
- **Dimension 1 (Segment/Channel)**: e.g. `users.traffic_source`, `users.country`, `device_type`
- **Dimension 2 (Funnel Stage)**: e.g. `order_items.status`, `events.event_name`, `levels.level_number`
- **Measure 1 (Primary Volume)**: e.g. `order_items.order_count`, `events.count`, `users.count`
- **Measure 2 (Optional Secondary Metric)**: e.g. `order_items.total_sale_price`, `orders.total_revenue`

### Format B: Single-Dimension Funnel
- **Dimension 1 (Funnel Stage)**: e.g. `order_items.status`
- **Measure 1 (Primary Volume)**: e.g. `order_items.order_count`
- **Measure 2 (Optional Secondary Metric)**: e.g. `order_items.total_sale_price`

### Format C: Multi-Measure Funnel
- **0 Dimensions**
- **2 to 8 Measures representing sequential funnel stages**: e.g. `Visits`, `Cart Adds`, `Checkouts Initiated`, `Purchases Completed`

---

## Configuration Options

### Section 1: Display
- **Funnel Pipeline Layout**: `Curved Stream Pipeline`, `Stepped Isometric Funnel`, `Waterfall Drop-off Stack`, `Segmented Stacked Stream`
- **Metric Display Mode**: `Primary Volume Only`, `Primary Volume + Secondary Metric`, `Conversion Percentage Only`
- **Conversion % Reference**: `Step-to-Step Conversion`, `Top of Funnel Overall`, `Both Metrics`
- **Pipeline Orientation**: `Horizontal Flow (Left to Right)`, `Vertical Pipeline (Top to Bottom)`
- **Show Drop-off Badges & Leakage %**: Toggle red loss indicators between stages
- **Show Executive KPI HUD Bar**: Toggle top summary KPI cards
- **Show In-Stage Value Labels**: Toggle metric value readouts on stage blocks
- **Show Stage Titles**: Toggle stage name labels
- **Show Live Search & Filter Bar**: Toggle in-memory search input
- **Primary Value Formatting**: `Compact Number (1.2M, 45K)`, `Compact Currency ($1.2M)`, `Full Currency ($1,234,567.89)`, `Raw Integer`

### Section 2: Style
- **Color Palette & Theme**: `Cyber Teal (Dark)`, `Neon Violet (Dark)`, `Executive Slate (Light)`, `Emerald Growth (Light)`, `Sunset Amber (Light)`
- **Surface Styling**: `Smooth Gradient Blend`, `Solid Color Stages`, `Glass Translucent Fill`
- **Curvature & Neck Shaping**: `High Flow Bézier Curves`, `Subtle Dynamic Arcs`, `Linear Sharp Edges`
- **Stage Gap Padding (px)**: Spacing between stages (default: 16px)
- **Minimum Neck Thickness (px)**: Minimum rendering thickness for small downstream stages (default: 28px)
