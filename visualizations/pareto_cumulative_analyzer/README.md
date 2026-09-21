# Pareto 80/20 & ABC Stratification Analyzer Looker Custom Visualization

![Pareto 80/20 & ABC Stratification Analyzer](screenshot.png)

An enterprise-grade, high-performance Pareto Analysis and ABC Stratification Analyzer built with **D3.js v7** for Looker. Specifically engineered to resolve critical analytical limitations reported in Google-internal Customer Blockers (Buganizer `b/367544487`: *"LookML to support more sophisticated measure out of the box [Cloud Blocker] - Pareto analysis"*) and enterprise customer requirements from **Monzo Bank** (`b/425859046`), **Mango** (`b/530925562`), **Woolworth's** (`b/461541028`), and the **Renault PSO Looker Performance Study**.

---

## 🎯 Executive Problem Solved

Standard business intelligence Cartesian bar charts force users to view raw volume bars in isolation. They cannot:
1. **Model Cumulative Running Distributions Dynamically**: Native Looker Cartesian charts cannot dynamically sort thousands of categories descending by volume and compute running cumulative percentages ($0\%$ to $100\%$) without brittle LookML table calculations or expensive SQL window functions.
2. **Automate 80/20 Pareto Cutoff & ABC Stratification**: Standard charts cannot draw dynamic $80\%$ reference threshold lines or automatically stratify inventory/SKUs/defects into **Class A (Vital Few: 0–80%)**, **Class B (Useful Many: 80–95%)**, and **Class C (Trivial Many: 95–100%)**.
3. **Compute Inequality & Gini Coefficients**: Standard charts cannot plot the empirical Lorenz curve against the theoretical $45^\circ$ line of perfect equality or compute the Gini concentration index live in the executive header.
4. **Scale to 5,000+ High-Density SKUs**: Native charts lag or clutter when ingesting large product catalogs, error logs, or customer cohorts.

---

## ✨ Key Capabilities & Highlights

- **4 Multi-Modal Layout Modes**:
  1. **Classic Pareto & 80/20 Cutoff (`classic_pareto`)**: Dual Y-axis visualization pairing volume bars (Left Y-Axis) with a smooth cumulative percentage ogive curve (Right Y-Axis). Includes a dashed $80\%$ Pareto reference cutoff line with intersection highlights and vital-few background shading.
  2. **ABC Stratification Matrix (`abc_stratification`)**: 3 executive distribution cards segmenting the population into **Class A (Vital Few)**, **Class B (Useful Many)**, and **Class C (Trivial Many)** with item counts, percentage shares, cumulative metric sums, and ranked entity breakdowns.
  3. **Lorenz Inequality Curve & Gini (`lorenz_inequality`)**: Normalized inequality curve plotting Cumulative Share of Population ($X$-Axis) against Cumulative Share of Metric ($Y$-Axis) compared with the $45^\circ$ Line of Perfect Equality, complete with shaded inequality area and live Gini Index calculation.
  4. **Cumulative Stepped Waterfall (`cumulative_waterfall`)**: Stepped waterfall progression showing the incremental additive contribution of each category building towards the $100\%$ total volume.
- **Executive KPI HUD Banner**:
  - 6 real-time KPI tiles: **Total Population (SKUs)**, **Total Volume**, **Vital Few (Class A) Count & %**, **80% Cutoff Rank**, **Gini Concentration Index**, and **Top 1 Entity Concentration %**.
- **High-Density Scalability (5,000+ Rows)**:
  - Ingests high-cardinality datasets with client-side aggregation in $O(N)$ time and fast sorting. Automatically rolls up long tail items beyond the user-configured limit into a consolidated summary group while preserving exact cumulative totals.
- **Instant Client-Side Search Filter**:
  - Live search-as-you-type input to highlight and isolate specific categories, brands, or defect types instantly.
- **Strict 2-Tab Options Modal**:
  - Strictly organized into `Display` and `Style` sections to guarantee clean, non-wrapping tab navigation in Looker's Edit Viz dialog.
- **Enterprise Looker Integration**:
  - Supports Looker Modern Themes and Palettes (Modern Google, Looker Analytics, Emerald Teal, Sunset Amber, Neon Cyber, Monochrome Slate).
  - Native Looker Drill-Down Menus via `LookerCharts.Utils.openDrillMenu`.

---

## 📊 Data Shape & Query Requirements

- **Dimension 1 (Category / Entity / SKU)**: e.g. `products.category`, `products.brand`, `orders.customer_id`, `errors.error_code`.
- **Measure 1 (Primary Volume / Revenue / Frequency)**: e.g. `order_items.total_sale_price`, `order_items.order_count`, `defects.count`.
- **Measure 2 (Optional Secondary Comparison)**: e.g. `order_items.order_count`.

---

## ⚙️ Configuration Options

### Display Tab
- **Analysis Layout Mode**: Classic Pareto & 80/20 Cutoff, ABC Stratification Matrix, Lorenz Inequality Curve & Gini, Cumulative Stepped Waterfall.
- **Class A Cutoff (%)**: Threshold percentage for Class A (default: `80%`).
- **Class B Cutoff (%)**: Threshold percentage for Class B (default: `95%`).
- **Show Executive KPI HUD Banner**: Toggle top 6 KPI metric cards.
- **Show Live Search Filter**: Toggle interactive search bar.
- **Show 80% Pareto Reference Line**: Toggle reference cutoff line on right axis.
- **Show Bar & Point Labels**: Toggle data value labels.
- **Max Visible Items**: Maximum bars to render before rolling tail items into summary group.
- **Cumulative Curve Smoothing**: Monotone Spline, Linear Polygon, Step After.

### Style Tab
- **Color Theme & Palette**: Modern Google, Looker Analytics, Emerald Teal, Sunset Amber, Neon Cyber (Dark), Monochrome Slate.
- **Override Class A / B / C Accents**: Custom color pickers for each stratification tier.
- **Override Cumulative Curve Color**: Custom color picker for the ogive curve.
- **Bar Spacing Ratio**: Adjust bar thickness and gap padding.
- **Typography Font Family**: Clean font styling.
