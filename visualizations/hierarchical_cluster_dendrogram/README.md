# Hierarchical Clustering Dendrogram & Heatmap 🌳

An enterprise-grade, unsupervised agglomerative hierarchical clustering visualization for Looker and Google Cloud BI, featuring dual row/column dendrogram bracket trees, interactive cluster cut-line slider ($k \in [2, 8]$), standardized z-score heat matrix, radial phylogenetic tree, and cluster centroid radar profiling. Built with **D3.js v7**.

---

## 🎯 Strategic Background & Buganizer Blockers Solved

Modern enterprise analytics teams require unsupervised clustering and multivariate grouping directly inside Looker dashboards without spinning up external Jupyter notebooks or Vertex AI pipelines:
1. **Buganizer Cloud Blocker [b/428190342](https://b.corp.google.com/issues/428190342)**:
   - *Title*: `Data Analytics > Looker > Hierarchical clustering tree with interactive distance cutoff and reordered matrix in Looker [Cloud Blocker]`
   - *Impact*: Telecom, cybersecurity, and genomics customers could not cluster multivariate entities (cell towers, network endpoints, genomic profiles) by similarity with visual dendrogram trees in Looker.
2. **Buganizer Feature Request [b/519401829](https://b.corp.google.com/issues/519401829)**:
   - *Title*: `Unsupervised agglomerative clustering dendrogram with dual tree brackets and heatmap in Looker`
   - *Impact*: Required for operational telemetry clustering where rows and feature columns must be reordered according to cophenetic correlation distance.
3. **Buganizer Blocker [b/639102471](https://b.corp.google.com/issues/639102471)**:
   - *Title*: `Hierarchical clustering heat matrix with cluster centroid profile and anomaly isolation`
   - *Impact*: Enterprise customers blocked from comparing cluster centroid metrics across discovered cohorts.

---

## 🚀 Multi-Modal Capabilities (4 Layout Modes)

| Layout Mode | Description | Primary Use Case |
| :--- | :--- | :--- |
| **Dual Dendrogram & Reordered Heatmap (`cluster_heatmap`)** | Full dual dendrogram with left row tree bracket, top column feature tree, and reordered z-score normalized heat matrix with cluster color badges. | Telecommunications cell tower performance clustering, genomics, customer behavioral segmentation. |
| **Radial Phylogenetic Tree (`radial_dendrogram`)** | Circular / radial phylogenetic tree with branch lengths proportional to merge distance, color-coded subtrees per cluster, and circular leaf labels. | High-density entity taxonomies, network topology cluster classification, device hierarchy exploration. |
| **Pairwise Proximity Matrix (`distance_matrix`)** | Full $N \times N$ pairwise dissimilarity distance matrix ordered by the hierarchical dendrogram tree, highlighting dense diagonal cluster blocks. | Correlation diagnosis, nearest-neighbor inspection, similarity cluster density validation. |
| **Cluster Centroid Radar Profiler (`cluster_profile_radar`)** | Multi-axis spider/radar chart displaying the standardized mean profile ($\bar{z}$) of each discovered cluster across all metric dimensions. | Executive cohort comparison, operational SLA benchmarking, anomaly cluster diagnosis. |

---

## 🔬 Mathematical & Algorithmic Foundation

- **Distance Metrics**:
  - *Euclidean*: $d(a, b) = \sqrt{\sum_{k} (a_k - b_k)^2}$
  - *Manhattan*: $d(a, b) = \sum_{k} |a_k - b_k|$
  - *Pearson Correlation*: $d(a, b) = 1 - r(a, b)$
  - *Cosine Distance*: $d(a, b) = 1 - \frac{a \cdot b}{\|a\| \|b\|}$
- **Linkage Criteria**:
  - *UPGMA / Average*: $D(A, B) = \frac{1}{|A||B|} \sum_{a \in A, b \in B} d(a, b)$
  - *Complete Linkage*: $D(A, B) = \max_{a \in A, b \in B} d(a, b)$
  - *Single Linkage*: $D(A, B) = \min_{a \in A, b \in B} d(a, b)$
  - *Ward's Minimum Variance*: Minimizes total within-cluster variance.
- **Dynamic Cluster Cut-Line**:
  - Interactive $k$ cluster parameter ($k \in [2, 8]$).
  - Cuts the agglomerative merge tree at the $(N - k)$-th merge height, dynamically coloring branches and assigning cluster IDs.
- **Z-Score Feature Standardization**:
  - $z_{ij} = \frac{x_{ij} - \mu_j}{\sigma_j}$ ensures fair distance calculation across metrics with disparate units (e.g. latency in ms vs. throughput in Mbps).

---

## ⚙️ Enterprise Flexibility Options

The visualization options are organized into strictly **two clean tabs** (`Display` and `Style`):

### 1. Display Tab
- **Layout Mode**: `cluster_heatmap`, `radial_dendrogram`, `distance_matrix`, `cluster_profile_radar`.
- **Clustering Parameters**:
  - `num_clusters_k`: Number of clusters $k$ (2 to 8).
  - `distance_metric`: Euclidean, Manhattan, Pearson Correlation, Cosine.
  - `linkage_method`: Average (UPGMA), Complete, Single, Ward.
  - `standardization`: Z-score Across Columns, Z-score Across Rows, Min-Max [0, 1], Raw Values.
- **Dynamic Field-Role Mapping**: Dropdown selectors (`registerOptions`) for:
  - `dimEntityOverride`: Primary Entity / Node Dimension (e.g. Cell Tower Site Name).
  - `dimCategoryOverride`: Secondary Category / Geography Dimension (e.g. Market).
  - Metric Overrides: Feature measures 1 through 6.
- **Sorting & Top-N Filtering**:
  - Sort by Hierarchical Tree Order, Cluster Group, Alphabetical, or Primary Metric.
  - Top-N limit (20, 50, 100, 250) with automatic `'Other'` rollup aggregation.
  - Null suppression toggle.
- **HUD & Legend Density**:
  - Executive KPI HUD: `Full Scorecard HUD`, `Compact Strip HUD`, or `Hidden`.
  - Task label density: `All Labels`, `Peaks Only`, or `Hidden`.
  - Custom Chart Title & Subtitle overrides.
  - Search filter and dendrogram tree toggles.

### 2. Style Tab
- **Color Palettes**: Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Sunset Media, Wellverse Healthcare, Turbo, Viridis, Custom Hex Override.
- **Custom Hex Overrides**: Primary, Positive/Done, and Negative/Blocked hex pickers (`display: "color"`).
- **Metric Polarity**: Higher is Better vs. Lower is Better.
- **Typography & Formatting**: Font scale (Compact 11px, Standard 13px, Large 15px) and Value formatting.
- **Surface Theme**: Crisp Clean Light, Subtle Glass / Slate, or Dark Slate.

---

## 📡 Domain-Authentic Demo Dataset

Bound authentically to **Nokia 5G RAN Cell Tower Operations Telemetry** (`nokia_network_ops::network_operations`):
- `cell_towers.site_name`: 5G cell tower site name
- `cell_towers.market`: Metro market / deployment geography (Seattle, Portland, Boise, Spokane)
- `network_kpi_telemetry.avg_throughput_mbps`: Downlink & uplink transmission throughput
- `network_kpi_telemetry.avg_latency_ms`: P95 user-plane latency in milliseconds
- `network_kpi_telemetry.avg_packet_loss_pct`: 5G packet loss rate percentage
- `network_kpi_telemetry.avg_energy_kwh`: Power draw and base-station electricity consumption
- `network_kpi_telemetry.avg_connected_users`: Concurrent active user equipment (UE) devices
- `incident_alarms.alarm_count`: Active optical & RF incident alarms
