# Price Elasticity & Demand Revenue Optimizer (`price_elasticity_revenue_optimizer`)

Enterprise Looker custom visualization designed for strategic pricing analysis, microeconomic demand curve modeling, elasticity profiling, and revenue/profit maximization.

Resolves Buganizer Cloud Blockers `b/492109483`, `b/398201849`, and `b/520194830` (Strategic Revenue Optimization, Dynamic Pricing & Elasticity Modeling in Looker).

## Overview & Visual Paradigms
1. **Demand Schedule & Total Revenue Curve (`demand_revenue_curve`)**:
   - Plots empirical and fitted Quantity Demanded ($Q$) vs Price ($P$) on the primary Y-axis.
   - Overlays Total Revenue Curve $R(P) = P \times Q$ on the secondary Y-axis with shaded volume envelope.
   - Highlights the Unit Elasticity point ($|E_d| = 1.0$), pinning the exact **Revenue-Maximizing Optimal Price ($P^*$)**.
2. **Price Elasticity of Demand (|Ed|) Spectrum (`elasticity_spectrum`)**:
   - Computes point elasticity $|E_d| = \left| \frac{\% \Delta Q}{\% \Delta P} \right|$ across price tiers and SKUs.
   - Categorizes entities into:
     - **Inelastic ($|E_d| < 0.8$)**: High pricing power and economic moat (price hikes directly boost revenue).
     - **Unit Elastic ($0.8 \le |E_d| \le 1.2$)**: Revenue-maximizing sweet spot.
     - **Elastic ($|E_d| > 1.2$)**: Severe volume sensitivity (price hikes destroy volume and churn customers).
3. **Profit & Margin Optimization (`profit_margin_optimization`)**:
   - Visualizes Unit Cost $C$ and Gross Profit Curve $\Pi(P) = (P - C) \times Q(P)$ alongside Total Revenue, identifying the **Profit-Maximizing Price ($P_{\pi}^*$)** vs **Revenue-Maximizing Price ($P_R^*$)**.
4. **Strategic Pricing Power Quadrant Matrix (`pricing_power_matrix`)**:
   - 2D Strategic Quadrant Matrix mapping Gross Margin % vs Price Elasticity $|E_d|$:
     - **Premium Cash Cows (Top-Right in Power)**: High Margin, Inelastic. Safe to raise prices.
     - **Margin Traps**: High Margin, Elastic. Vulnerable to sudden volume drop-offs.
     - **Volume Builders**: Low Margin, Inelastic. Reliable volume workhorses.
     - **Commoditized Red Ocean**: Low Margin, Highly Elastic. Severe price war exposure.

## Enterprise Flexibility Options (Strict 2-Tab Hierarchy)

### Display Options
- **Chart Title & Subtitle Override**: Custom header text and economic model badges.
- **Visual Paradigm Mode**: Demand Schedule & Dual-Axis Revenue, Elasticity Spectrum, Profit Optimization, or Pricing Power Matrix.
- **Executive KPI HUD Mode**: `Full Scorecard Strip` (Optimal Price $P^*$, Mean Elasticity $|E_d|$, Total Demand Volume, Total Revenue), `Compact Summary`, or `Hidden`.
- **Benchmark Target Mode**: Revenue-Maximizing Price (Unit Elasticity $|E_d| = 1.0$), Fixed Target Price, Dataset Mean Price, Dataset Median Price, Percentile P75 Price, or None.
- **Entity Sort Order**: Price Ascending, Price Descending, Quantity Descending, Revenue Descending, Elasticity Descending, Alphabetical.
- **Top-N Entity Limit & Other Rollup**: Top 10, 15, 20, 30, or All entities.
- **Zero/Null Row Suppression**: Toggle to filter zero/null pricing rows.
- **Data Value Label Density**: All Data Points, Key Inflections Only, or Hidden.
- **Interactive Search Filter Bar**: In-tile real-time SKU search filter.
- **Dynamic Field-Role Dropdowns (`registerOptions`)**:
  - `dimEntityOverride`: Product / Category / SKU Dimension
  - `measurePriceOverride`: Price Metric (Average Sale Price / Retail Price)
  - `measureQuantityOverride`: Quantity Demanded (Units Sold / Order Count)
  - `measureRevenueOverride`: Total Revenue Metric
  - `measureProfitOverride`: Gross Profit / Margin Metric

### Style Options
- **Color Themes**: Google Enterprise (`#1a73e8`), Modern Studio Slate (`#0f172a`), Cyberpunk Dark (`#00ffcc`), Emerald FinOps (`#10b981`), Sunset Media (`#ea580c`), Wellverse Healthcare (`#0284c7`), Zayo Telecom (`#f5831f`), Custom Hex Override.
- **Custom Hex Color Overrides**: Dedicated color pickers (`display: 'color'`) for Primary, Demand Curve, Revenue Curve, and Profit Curve tones.
- **Elasticity Polarity**: Inelastic is Favorable (Pricing Power & Moat) vs Elastic is Favorable (Volume Surge on Discount).
- **Typography & Scaling**: Compact, Standard, or Large Presentation scaling.
- **Value Formatting**: Auto-Detect, Compact Currency (`$1.2M`, `$45K`), Compact Number, Decimal 2dp, Percentage, Raw.

## Authentic Domain Explore
- **Model**: `thelook`
- **Explore**: `order_items`
- **Fields**: `products.category`, `order_items.average_sale_price`, `order_items.count`, `order_items.total_sale_price`, `order_items.total_gross_margin`
