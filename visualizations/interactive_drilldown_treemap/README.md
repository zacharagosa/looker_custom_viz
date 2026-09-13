# 🗂️ Interactive Hierarchical Drilldown Treemap

An enterprise-grade, high-density hierarchical treemap visualization for Looker built with **D3.js v7**.

Solves long-standing Google-internal Buganizer Cloud Blockers and enterprise customer requirements:
- **b/328594464**: *Treemap Visualization for Looker [Cloud Blocker]*
- **b/396197680**: *Treemap Color by dimension [Cloud Blocker]*
- **b/530822261**: *Native "Top N and Others" Visualization Bucketing [Cloud Blocker]*
- **b/325124429**: *Woolworths - Availability of new visualization features: Treemap Support*

---

## 🚀 Key Highlights & Architectural Features

1. **Multi-Mode Hierarchical Layouts**:
   - **Hierarchical Drilldown (Zoom & Breadcrumbs)**: Smooth animated zoom transitions when clicking any parent category. Interactive breadcrumb trail (`🏠 All Categories > Men > Jeans`) enables instant single-click drill-up navigation.
   - **Nested Multi-Tier**: Renders all levels of the hierarchy simultaneously with styled category ribbons and child bounding boxes.
   - **Dynamic Top-N & Others Bucketing**: Slices the top N leaf items (Top 10, 20, 50, 100) and automatically aggregates long-tail items into an interactive `+N Others` tile (b/530822261).

2. **Dual-Metric Visual Encoding (b/396197680)**:
   - **Tile Size**: Proportional to Primary Measure (e.g. Total Revenue, Order Volume).
   - **Tile Color**:
     - *Branch Categorical*: Distinct Looker Modern hues per top-level branch with depth-calibrated tinting.
     - *Secondary Metric Diverging*: Continuous gradient (Red -> Amber -> Green) based on Secondary Measure (e.g. Gross Margin % or YoY Growth).
     - *Secondary Metric Sequential*: Smooth gradient (Light Blue -> Deep Indigo).
     - *Depth Shading*: Monochromatic level shading.

3. **High-Density Scalability (5,000+ Rows)**:
   - Capable of processing 5,000+ rows directly from Looker with recursive client-side tree rollups (`d3.hierarchy().sum().sort()`).
   - Dynamic thresholding aggregates leaf nodes under 0.5% into consolidated buckets to ensure fluid 60 FPS transitions.

4. **Real-Time Interactive Search & Filter**:
   - Built-in search bar highlights matching categories and brands in real-time with an amber focus glow while dimming non-matching branches.

5. **Executive KPI HUD**:
   - Integrated executive summary bar tracking Total Universe Value, Active Branch, Top Contributor %, and Total Entities.

6. **Minimal Option Sections (Strictly 2 Clean Tabs)**:
   - **Display**: Display Mode, Tiling Algorithm (Squarified, Binary, Dice), Color Encoding Mode, Top-N Count, Value Format, Executive HUD, Breadcrumbs, Search, Tile Spacing.
   - **Style**: Color Palette Theme (Looker Modern, Executive Slate, Emerald, Sunset, Cyberpunk), Corner Radius, Font Size, Secondary Metric Label, Hover Effect.

---

## 📊 LookML / Explore Requirements

| Dimension / Measure | Requirement | Purpose |
| :--- | :--- | :--- |
| **Dimensions** (1 to 6) | Required (≥1) | Hierarchy branches (e.g. `Department > Category > Brand > SKU`) |
| **Primary Measure** | Required (1st Measure) | Determines tile surface area / volume (e.g. `Total Sale Price`) |
| **Secondary Measure** | Optional (2nd Measure) | Determines color gradient or sub-label (e.g. `Gross Margin %`) |

---

## 🛠️ Configuration Options

### Display Tab
- `displayMode`: Choose between `Hierarchical Zoom & Breadcrumbs`, `Nested Multi-Tier`, or `Dynamic Top-N & Others Bucketing`.
- `tilingMethod`: Choose between `Squarified`, `Binary`, or `Dice`.
- `colorMode`: Choose between `Categorical by Branch`, `Secondary Metric Diverging`, `Secondary Metric Sequential`, or `Depth Shading`.
- `topNCount`: Limit leaves to Top 10, 20, 50, 100, or All.
- `valueFormat`: `Compact Currency ($1.2M)`, `Compact Number (1.2M)`, `Percentage (12.5%)`, or `Raw`.
- `showExecutiveHUD`: Toggle executive KPI summary banner.
- `showBreadcrumbs`: Toggle interactive breadcrumb navigation bar.
- `showSearch`: Toggle search-as-you-type filter input.
- `tilePadding`: Flush (0px), Compact (2px), Standard (4px), Relaxed (6px).

### Style Tab
- `colorTheme`: `Looker / Google Modern`, `Executive Slate & Indigo`, `Emerald & Mint`, `Sunset Ember`, or `Cyberpunk Dark`.
- `tileCornerRadius`: Sharp (0px), Subtle (4px), Modern Rounded (8px).
- `labelFontSize`: Small (10px), Medium (12px), Large (14px).
- `showSecondaryMetricInLabel`: Toggle secondary measure display inside tile labels.
- `hoverEffect`: Elevate & Glow, Brighten, or Subtle Border.
