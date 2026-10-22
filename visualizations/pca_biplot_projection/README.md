# 🧬 Principal Component Analysis (PCA) Biplot & Multivariate Diagnostic Projection (`pca_biplot_projection`)

An enterprise-grade, high-performance **Principal Component Analysis (PCA) Biplot & Multivariate Diagnostic Projection Matrix** custom visualization for Looker. Built with **D3.js v7**, implementing exact client-side covariance eigendecomposition via cyclic Jacobi rotations to project high-dimensional continuous telemetry into interpretable 2D diagnostic spaces.

---

## 💡 Motivation & Customer Problems Solved

### Buganizer Cloud Blockers & Customer Requirements
- **Buganizer Cloud Blocker `b/372910482`**:
  - *"Multivariate Dimensionality Reduction, Principal Component Analysis (PCA) Biplot, and Feature Loading Vectors for Looker"*.
- **Buganizer Cloud Blocker `b/482910943`**:
  - *"High-Dimensional Telemetry & Feature Covariance Decomposition in Looker Dashboards"*.
- **Buganizer Cloud Blocker `b/510293847`**:
  - *"Outlier Detection & Hotelling $T^2$ / Mahalanobis Distance Inspection"*.
- **YAQS 9481920194821**:
  - *"How can Looker dashboards display 6–15 interrelated numeric metrics across hundreds of nodes/sites without generating unreadable multi-chart dashboards?"*

### The "Chart Bloat & Correlation Blindness" Challenge
Enterprise operations in Telecommunications (5G RAN cell towers), Cloud Infrastructure (Kubernetes node pools), and FinOps monitor 6 to 20 continuous metrics per entity (e.g. throughput, latency, packet drop rate, energy consumption, connected users, and alarm frequencies). Plotting each metric in individual bar or line charts creates dashboard clutter and blinds engineers to **cross-metric covariance** (e.g. high throughput accompanied by anomalous power spikes and latency degradation).

### The Mathematical Solution
`pca_biplot_projection` ingests $N$ rows and $P$ numeric features, calculates standardized $Z$-scores, forms the $P \times P$ sample covariance matrix, and executes a real-time **cyclic Jacobi eigendecomposition** to project observations onto orthogonal principal components ($\text{PC1}$ and $\text{PC2}$). Superimposed directional feature loading vectors display the orientation and strength of each underlying KPI, while Hotelling's $T^2$ metric flags multivariate statistical outliers based on $\chi^2$ critical boundaries.

---

## 🚀 Key Features

1. **4 Multi-Modal Diagnostic Paradigms**:
   - **`pca_biplot` (2D PCA Biplot & Feature Vectors)**: Projects entity scatter points onto PC1 vs PC2, with cluster convex hulls and directional eigenvector arrows indicating the gradient of each metric.
   - **`scree_variance` (Scree Plot & Cumulative % Variance)**: Stepped variance bar chart combined with a cumulative % explained spline curve and an 80% Pareto threshold line.
   - **`loading_heatmap` (Feature-to-Component Factor Loading Heatmap)**: Pairwise correlation matrix ($N$ features $\times K$ components) displaying exact factor loadings ($r \in [-1, 1]$) with diverging heat ramps.
   - **`mahalanobis_outliers` (Hotelling $T^2$ Outlier Inspector)**: Plots entities by PC1 vs Hotelling's $T^2$ statistic against $\chi^2_{0.05}(2) = 5.99$ and $\chi^2_{0.01}(2) = 9.21$ statistical control limits.
2. **Client-Side Cyclic Jacobi Eigendecomposition**:
   - Computes exact eigenvalues $\lambda_k$ and column eigenvectors $v_k$ directly in the browser in $O(N)$ time with zero external server dependencies.
3. **Dynamic Field-Role Remapping (`Display`)**:
   - Dynamic dropdown selectors populate from query dimensions and measures, allowing instant reassignment of Entity and Cluster dimensions.
4. **Configurable Reference Boundaries & Anomaly Alerts (`Display`)**:
   - Statistical control boundaries based on Chi-Square 95% ($T^2 = 5.99$), 99% ($T^2 = 9.21$), or custom numerical thresholds, with glowing outer alert rings and tooltip warnings.
5. **Executive Multivariate HUD**:
   - Displays real-time metrics: **PC1 Variance Explained %**, **PC2 Variance Explained %**, **Cumulative 2-Component Coverage %**, and **Outlier Count**.
6. **Domain-Authentic Telemetry Dataset**:
   - Authentically modeled against Nokia 5G RAN cell tower operations (`nokia_network_ops::network_operations`), evaluating throughput, latency, packet loss, energy consumption, connected users, and alarm frequencies across urban markets.
7. **Strict 2-Tab Options Hierarchy**:
   - All configuration parameters strictly organized into **Display** and **Style** tabs to avoid crowding Looker's Edit Viz modal headers.

---

## 📊 Data Requirements

- **Dimensions**:
  - Primary (1st): Observation / Entity identifier (e.g. `cell_towers.site_name`, `servers.host_id`, `customers.company`).
  - Secondary (Optional, 2nd): Categorical cluster grouping (e.g. `cell_towers.market`, `clusters.region`, `tiers.plan`).
- **Measures**:
  - Requires 2 or more numeric measures (typically 4 to 12 continuous KPIs, e.g. throughput, latency, packet loss, energy kWh, connected users, alarm count).

---

## ⚙️ Configuration Reference

### Section: `Display`
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `layout_mode` | select | `pca_biplot` | Toggle: `pca_biplot`, `scree_variance`, `loading_heatmap`, `mahalanobis_outliers` |
| `dimEntityOverride` | select | `Auto` | Select query dimension for entity observations |
| `dimClusterOverride` | select | `Auto` | Select query dimension for cluster/category color encoding |
| `target_mode` | select | `chi2_95` | Outlier limit: `chi2_95` (95%), `chi2_99` (99%), `fixed`, `none` |
| `custom_target_value` | number | `5.99` | Custom Hotelling $T^2$ cutoff threshold |
| `highlight_anomalies` | boolean | `true` | Highlight multivariate outliers exceeding control boundary |
| `sort_order` | select | `natural` | Sort: `natural`, `t2_desc`, `pc1_desc`, `alpha` |
| `top_n_limit` | select | `all` | Top-N entities filter: `all`, `20`, `50`, `100` |
| `top_n_rollup_other` | boolean | `true` | Retain non-top N entities in background styling |
| `hud_mode` | select | `full` | Executive HUD mode: `full`, `compact`, or `hidden` |
| `label_density` | select | `peaks` | Label density: `peaks`, `all`, `centroids`, `hidden` |
| `show_vector_arrows` | boolean | `true` | Display directional feature loading eigenvector arrows |
| `show_cluster_hulls` | boolean | `true` | Display cluster confidence convex hulls |
| `custom_chart_title` | string | `""` | Custom chart title override |
| `custom_chart_subtitle` | string | `""` | Custom subtitle / description override |
| `show_search` | boolean | `true` | Show instant entity/cluster search filter |
| `show_legend` | boolean | `true` | Show cluster / component legend |

### Section: `Style`
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `color_palette` | select | `google_enterprise` | Palette: `google_enterprise`, `modern_slate`, `cyberpunk_dark`, `emerald_finops`, `sunset_media`, `wellverse_healthcare`, `turbo`, `viridis` |
| `custom_primary_hex` | color | `#4285f4` | Custom primary accent color |
| `custom_secondary_hex` | color | `#34a853` | Custom secondary accent color |
| `theme_mode` | select | `light_clean` | Theme: `light_clean`, `dark_slate`, `midnight_navy` |
| `vector_arrow_color` | select | `#f59e0b` | Arrow color: Amber Gold, Coral Red, Cyan Electric, Slate Charcoal |
| `font_scale` | select | `standard` | Font scale: `compact` (11px), `standard` (13px), `large` (15px) |
| `value_format` | select | `auto` | Metric format: `auto`, `decimal_2dp`, `percentage` |

---

## 🛠️ Mathematical Model

Given normalized $Z$-scores $Z_{i,j} = \frac{X_{i,j} - \mu_j}{\sigma_j}$, the $P \times P$ sample covariance matrix $C$ is decomposed into eigenvalues $\lambda_k$ and eigenvectors $v_k$:

$$C v_k = \lambda_k v_k$$

Entity projections on the first two principal axes:

$$\text{PC1}_i = \sum_{j=1}^P Z_{i,j} v_{j,1}, \quad \text{PC2}_i = \sum_{j=1}^P Z_{i,j} v_{j,2}$$

Feature loading vectors (correlations with principal components):

$$L_{j,1} = v_{j,1} \sqrt{\lambda_1}, \quad L_{j,2} = v_{j,2} \sqrt{\lambda_2}$$

Hotelling's $T^2$ multivariate distance metric:

$$T_i^2 = \frac{\text{PC1}_i^2}{\lambda_1} + \frac{\text{PC2}_i^2}{\lambda_2} \sim \chi^2(2)$$
