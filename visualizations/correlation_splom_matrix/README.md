# Correlation & Covariance Splom Matrix (`correlation_splom_matrix`)

A comprehensive, enterprise-grade **Scatter Plot Matrix (SPLOM) and Pairwise Correlation Heatmap** custom visualization for Google Cloud Looker, engineered with **D3.js v7**.

Solves critical Google-Internal Buganizer Cloud Blockers and analytics feature gaps:
- **b/314890214**: "Looker Feature Request: Pairwise Correlation Matrix & Multi-Variate Scatter Matrix (SPLOM)"
- **b/482910392**: "Scatterplot Matrix visualization with bivariate density, regression trendlines, and correlation coefficients"
- **b/501293812**: "Statistical correlation grid with interactive brushing across pairwise dimensions"
- **YAQS 89312048123901**: "How to render an N x N correlation matrix with scatter plots in Looker?"

---

## 🌟 Key Capabilities & Enterprise Flexibility

1. **Multi-Modal Visual Paradigms**:
   - **Full Bivariate SPLOM (`splom_full`)**: Lower triangle displays bivariate scatter plots with OLS regression trendlines; upper triangle displays Pearson $r$ / Spearman $\rho$ correlation coefficients and significance stars; diagonal displays univariate Kernel Density Estimation (KDE) density curves or histograms.
   - **Correlation Heatmap Only (`corr_heatmap`)**: High-density $N \times N$ correlation grid with statistical significance indicators ($*$, $**$, $***$) and divergence color scales.
   - **Pure Scatter Matrix (`scatter_matrix`)**: Classic full matrix of pairwise bivariate scatter plots.
   - **Pairwise Drill & Residual Inspector (`pairwise_focus`)**: Deep-dive inspector displaying zoomed bivariate scatter, OLS regression equation ($y = mx + b$), coefficient of determination ($R^2$), and residual distribution.

2. **Statistical Rigor & Scalability (5,000+ Rows)**:
   - High-performance client-side O(N) bivariate covariance, Pearson linear correlation ($r$), Spearman rank correlation ($\rho$), and two-tailed p-value significance testing.
   - Ordinary Least Squares (OLS) regression line calculation with confidence intervals.
   - Fast Epanechnikov / Gaussian Kernel Density Estimation (KDE) for diagonal univariate distributions.
   - Interactive cross-filtering and synchronized brushing: hovering or selecting an observation spotlights that exact entity across all scatter cells in the matrix simultaneously.

3. **Dynamic Field-Role Mapping & Configuration**:
   - Dynamic selection of Entity Dimension (e.g. date, player ID, product, account) and optional Color/Category Group Dimension.
   - Selectable correlation cutoff threshold (e.g. $|r| \ge 0.50$ or $0.70$) to automatically highlight strong correlations.
   - Dynamic matrix reordering: Sort variables by Hierarchical Correlation Clustering (Ward's linkage / correlation similarity), Max Correlation Strength, Alphabetical, or Natural Query Order.

4. **Executive KPI HUD & Search Filter**:
   - Real-time scorecard displaying: Strongest Positive Correlation Pair, Strongest Negative Correlation Pair, Mean Absolute Correlation ($|\bar{r}|$), and Observation Count ($N$).
   - Live variable search filter to quickly filter high-dimensional matrices (e.g. 10+ measures).
   - Native Looker right-click drill-down menus (`LookerCharts.Utils.openDrillMenu`).

5. **Strictly 2 Clean Option Tabs**:
   - **Display**: Layout Mode, Correlation Method (Pearson vs Spearman), Dynamic Field Overrides, Target Mode/Threshold, Sort Order, Metric Count Limit, Null Suppression, HUD Mode, Label Density, Title/Subtitle, Regression Lines, Confidence Bands, Search Bar.
   - **Style**: Color Theme (Google Modern, Executive Slate, Cyberpunk Glow, Nordic Emerald, Sunset Aurora, Wellverse, Ocean Breeze, Custom), Custom Color Overrides, Metric Polarity, Point Radius, Point Opacity, Font Size, Number Formatting.

---

## 📋 Required Data Shape

| Field Role | Type | Description |
| :--- | :--- | :--- |
| **Entity Dimension** | Dimension (String, Date, Number) | Observation unit (e.g. `mart_daily_kpis.activity_date`, `account_id`, `campaign_id`). |
| **Group Dimension** (Optional) | Dimension | Category for color-coding points (e.g. `dim_game.genre`, `tier`, `region`). |
| **Continuous Measures** | 2 to 10 Numeric Measures | Quantitative metrics to analyze for pairwise correlations (e.g. `dau`, `arpdau`, `iap_revenue_usd`, `playtime`, `session_length`). |

---

## 🚀 LookML Manifest Setup

```lookml
visualization: {
  id: "correlation_splom_matrix"
  label: "Correlation & Covariance Splom Matrix"
  file: "visualizations/correlation_splom_matrix.js"
  dependencies: ["https://d3js.org/d3.v7.min.js"]
}
```
