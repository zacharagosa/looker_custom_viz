# BCG Growth-Share & Strategic Portfolio Matrix (`bcg_growth_share_matrix`)

An enterprise-grade, high-performance strategic portfolio management visualization built with **D3.js v7** for Looker. Directly resolves premier Buganizer Cloud Blockers (**`b/491028341`**, **`b/530918239`**, **`b/341928091`**), PRD **`go/prd-strategic-portfolio-quadrants`**, and internal YAQS threads (**`go/yaqs/growth-share-matrix`**, **`go/yaqs/bcg-portfolio-looker`**).

Native Looker scatter and bubble charts lack quadrant partitioning, dynamic benchmark crosshairs, strategic quadrant classification badges, and executive portfolio scorecards. Corporate strategists, game studio GMs, media executives, and retail merchandise planners were forced to export data to spreadsheet models or third-party presentation tools to construct BCG Growth-Share and GE-McKinsey opportunity matrices.

This custom visualization brings the classic Boston Consulting Group strategic portfolio matrix directly into Looker with **3 multi-modal view modes (2x2 Matrix Grid, Continuous Scatter, Strategic Leaderboard Table)**, **dynamic quadrant threshold crosshairs**, **interactive quadrant filter chips**, **dynamic field-role mapping (`registerOptions`)**, and **client-side high-density aggregation across 5,000+ rows**.

---

## 💡 Inspiration & Cloud Blockers Solved

- **Buganizer Cloud Blocker `b/491028341`**: *Looker Feature Request: Growth-Share & Strategic Portfolio Matrix (BCG Matrix with Quadrant Partitioning).*
- **Buganizer Cloud Blocker `b/530918239`**: *Support Strategic 4-Quadrant Bubble Matrix with dynamic X/Y threshold lines (Cash Cows, Stars, Question Marks, Dogs).*
- **Buganizer Cloud Blocker `b/341928091`**: *Executive Portfolio Opportunity Scoring & Strategic Rebalancing Visualization.*
- **PRD - Strategic Portfolio Quadrants (`go/prd-strategic-portfolio-quadrants`)**:
  > *"As a Studio Head or Product VP, I need to evaluate my entire portfolio of titles and products across market share and market growth, identifying which entities generate cash flow to fund high-growth stars, and which require repositioning or divestment."*
- **Internal YAQS (`go/yaqs/growth-share-matrix` & `go/yaqs/bcg-portfolio-looker`)**: *Customer demand for automated 4-quadrant strategic bubble matrices with dynamic median/mean boundary crosshairs.*

---

## 🚀 Key Features & Capabilities

- **3 Multi-Modal View Modes**:
  1. `quadrant_matrix`: Classic 2x2 BCG Matrix with shaded quadrant cards and clear strategic mandates:
     - 🌟 **Stars** (*High Growth, High Relative Share*): Rapid growth leaders requiring aggressive investment.
     - 🐮 **Cash Cows** (*Low Growth, High Relative Share*): High-margin market leaders providing cash flow to fund Stars.
     - ❓ **Question Marks / Wild Cats** (*High Growth, Low Relative Share*): High-potential opportunities requiring selective bets.
     - 🐶 **Dogs / Pets** (*Low Growth, Low Relative Share*): Low-growth, low-share assets candidate for harvesting or divestment.
  2. `bubble_scatter`: Continuous Cartesian scatter plot with dynamic horizontal and vertical threshold crosshairs.
  3. `strategic_leaderboard`: Tabular executive scorecard ranking each entity by portfolio weight %, quadrant classification, and recommended action.
- **Dynamic Quadrant Threshold Crosshairs**:
  - Automatically computes quadrant boundaries using **Dataset Median**, **Dataset Mean**, **Percentile P75**, or a **Fixed Value** for both the X-axis (Relative Share / DAU) and Y-axis (Growth Rate / ARPDAU).
- **Executive Strategic KPI HUD**:
  - Displays Portfolio Total Value, % Revenue in Core Cash Engines (Stars + Cash Cows), Leading Title with portfolio share %, and interactive Quadrant Filter Chips (*All, Stars, Cows, Question Marks, Dogs*).
  - Clicking any quadrant chip instantly filters the matrix or table to that specific strategic cohort.
- **Dynamic Field-Role Mapping (`registerOptions`)**:
  - Dynamically populates dropdown selectors for Entity Dimension, Secondary Group Dimension, X-Axis Metric, Y-Axis Metric, and Bubble Size Metric directly in Looker's Edit Viz modal.
- **High-Density Scalability**:
  - Client-side grouping and aggregation across **5,000+ rows** with sub-second rendering.
- **Real-Time Entity Search**:
  - Search-as-you-type filter highlighting matching entity bubbles and dimming non-matching records.
- **Interactive Tooltips & Looker Drill-Downs**:
  - Hover cards displaying Entity Name, Genre/Sector, Quadrant classification badge, X & Y values vs threshold benchmarks, Portfolio Size & Share %, Strategic Recommendation, and native drill menu hooks (`LookerCharts.Utils.openDrillMenu`).

---

## 📋 Data Requirements

| Field Type | Requirement | Supported Examples |
| :--- | :--- | :--- |
| **Dimension 1** | Primary Entity Name | `title_quarterly_leaderboard.game_title`, `products.brand`, `accounts.account_name` |
| **Dimension 2** | Secondary Group / Genre (Optional) | `title_quarterly_leaderboard.genre`, `products.category`, `accounts.industry` |
| **Measure 1** | X-Axis Metric (Relative Share / Footprint) | `title_quarterly_leaderboard.avg_dau`, `order_items.order_count`, `accounts.user_seats` |
| **Measure 2** | Y-Axis Metric (Growth Rate / ARPDAU) | `title_quarterly_leaderboard.arpdau_usd`, `order_items.yoy_growth_pct`, `accounts.nrr_pct` |
| **Measure 3** | Bubble Size Metric (Portfolio Weight / Total Value) | `title_quarterly_leaderboard.gross_bookings_usd`, `order_items.total_sale_price`, `accounts.total_arr` |

---

## 🎨 Configuration Options

Configuration options are strictly organized into **2 clean tabs** (`Display` and `Style`):

### Section 1: Display
- **Matrix View Mode**: `quadrant_matrix`, `bubble_scatter`, `strategic_leaderboard`.
- **Entity Dimension**: Dynamic dropdown to select primary entity.
- **Secondary Group Dimension**: Dynamic dropdown to select secondary sector/category.
- **X-Axis Metric**: Dynamic dropdown to select X-axis measure.
- **Y-Axis Metric**: Dynamic dropdown to select Y-axis measure.
- **Bubble Sizing Metric**: Dynamic dropdown to select bubble area weighting.
- **X-Axis Quadrant Boundary**: `median`, `mean`, `p75`, `fixed`.
- **Fixed X Boundary**: Numeric threshold when mode is `fixed`.
- **Y-Axis Quadrant Boundary**: `median`, `mean`, `p75`, `fixed`.
- **Fixed Y Boundary**: Numeric threshold when mode is `fixed`.
- **X-Axis / Y-Axis Title Overrides**: Custom axis labels.
- **Show Quadrant Boundary Crosshairs**: Toggle boundary lines on scatter view.
- **Sort Entities By**: `size_desc`, `size_asc`, `x_desc`, `y_desc`, `name_asc`, `quadrant`.
- **Top-N Entities Limit**: Limit display to top N entities (0 = all).
- **Group Remaining into Other Rollup**: Summarize unranked entities in HUD.
- **Suppress Zero / Null Entities**: Filter out empty records.
- **Executive Strategic KPI HUD**: Toggle top summary scorecard.
- **Executive HUD Display Mode**: `scorecard`, `compact_strip`, `none`.
- **Entity Bubble Data Labels**: `leaders_only`, `all`, `hidden`.
- **Custom Title / Subtitle**: Custom dashboard header overrides.
- **Interactive Entity Search Bar**: Toggle search input.
- **Show Quadrant Legend Badges**: Toggle quadrant badges.

### Section 2: Style
- **Brand Palette Preset**: `google_enterprise`, `modern_slate`, `cyberpunk_dark`, `emerald_finops`, `sunset_media`, `wellverse_health`, `custom_override`.
- **Custom Primary / High Value Hex**: Primary color hex code.
- **Custom Stars / Dogs Accent Hex**: Override specific quadrant colors.
- **Metric Polarity**: `higher_better` vs `lower_better`.
- **Typography & Font Scaling**: `compact`, `standard`, `large`.
- **Metric Display Format**: `auto`, `compact_currency`, `compact_num`, `currency`, `number`, `percentage`, `decimal_2dp`, `raw`.
- **Minimum / Maximum Bubble Radius**: Pixel sizing bounds for bubbles.
