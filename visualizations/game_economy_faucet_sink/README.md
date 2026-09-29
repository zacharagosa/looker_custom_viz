# Game Economy Faucet & Sink Analyzer

An enterprise-grade Looker custom visualization designed for LiveOps game economies, virtual currency telemetry, and in-game token sinks/faucets. Resolves Buganizer Cloud Blockers and Customer Requirements (**b/341928091**, **b/490547912**, **b/530822261**, **b/567332923**) for LiveOps games studios (EA, Epic Games, Riot Games, Blizzard, Sony PlayStation, Ubisoft).

---

## 🎮 Overview

In free-to-play (F2P), MMO, and competitive live-service games, managing virtual currency flows (Gold, Gems, Energy, Battle Pass Tokens) is vital to preventing runaway **in-game inflation**, currency hoarding, and economy crashes. Out-of-the-box Looker Cartesian bar and line charts cannot visualize:
1. **Faucet Sources vs Sink Drains**: Visualizing currency generation (quests, daily logins, level rewards, IAP faucets) versus currency destruction (cosmetics, upgrades, gacha, repair costs, marketplace fees) side-by-side or through a Sankey flow bridge.
2. **Net Inflation / Deflation Velocity**: Dynamic tracking of net currency minting velocity:
   $$\text{Net Velocity} = \text{Total Faucets} - \text{Total Sinks}$$
3. **Faucet-to-Sink Ratio ($\frac{\text{Faucet}}{\text{Sink}}$)**: Critical macro-economic equilibrium indicator. An alert threshold (e.g. $> 1.15$) immediately flags hyperinflation risks where currency is being minted faster than players can spend it.
4. **Reserve Liquidity Stockpile Accumulation**: Step-by-step waterfall tracking of opening balance, active faucets, active sinks, and closing player reserve balance.

---

## ⚡ 4 Multi-Modal Layout Modes

Users can toggle between four specialized layouts in the **Display** tab:

1. **Faucet & Sink Flow Bridge (Sankey)** (`sankey_faucet_sink`):
   - Left column displays green Faucet Sources flowing into a central In-Game Economy Node, which then branches out into right-column red Sink Drains with animated Bézier ribbons and currency particle flow indicators.
2. **Bilateral Divergence Balance** (`divergent_balance`):
   - Executive horizontal tornado/butterfly divergence chart with centered baseline. Faucets extend to the right (green positive minting), Sinks extend to the left (red negative burning), accompanied by net balance variance pills.
3. **Net Currency Velocity & Inflation Matrix** (`velocity_matrix`):
   - Macroeconomic health matrix plotting each category or activity stream with individual faucet volume, sink volume, net burn/mint velocity, and inflation health status badges (Healthy, Deflationary, Inflationary, Hyperinflationary).
4. **Economy Waterfall & Reserve Stockpile** (`waterfall_stockpile`):
   - Stepped cumulative waterfall cascade displaying Baseline Reserve, Faucet Additions, Sink Deductions, and Net Closing Reserve.

---

## 🛠️ Required Data Shape

The visualization adapts automatically to any of the following query structures:

### Option A: Standard Dimension + Measures (e.g. `thelook.order_items`)
- **Dimensions (1)**: Stream / Category / Activity Name (e.g. `products.category`, or game event type).
- **Measures (2 or 3)**:
  - Measure 1: Primary Faucet Volume / Minted Currency (e.g. `order_items.total_sale_price`).
  - Measure 2: Primary Sink Volume / Burned Currency (e.g. `order_items.total_gross_margin`).
  - Measure 3 (Optional): Transaction Count / Participant Players (e.g. `order_items.order_count`).

### Option B: Sliced Activity Dimension
- If only 1 Measure is provided, rows with negative values or labels containing `sink`, `burn`, `spend`, `drain`, `fee`, `cost` are automatically classified as Sinks, and positive values or labels containing `faucet`, `mint`, `reward`, `quest`, `iap` are classified as Faucets.

---

## 🎨 Clean 2-Tab Options Modal

To avoid crowding Looker's Edit Viz modal headers, all options are grouped into two clean sections:

### 1. `Display`
- **Layout Analysis Mode**: Toggle between Sankey Flow Bridge, Bilateral Divergence, Net Velocity Matrix, and Waterfall Stockpile.
- **Show Executive Economy HUD**: Toggle the 5-metric executive scorecard (Total Minted, Total Burned, Net Velocity, Faucet/Sink Ratio, Active Streams).
- **Faucet-to-Sink Ratio Alert Threshold**: Custom inflation ratio threshold (default: `1.15`).
- **Show Net Currency Velocity Badges**: Highlight net surplus (+) and net deficit (-) badges.
- **Enable Search & Stream Filter**: Real-time interactive instant search bar.

### 2. `Style`
- **Color Theme**:
  - `Cyberpunk Neon (Dark)`: High-contrast neon green faucets, crimson sinks, cyan accents on obsidian dark background.
  - `Modern Studio Slate (Light)`: Clean executive enterprise theme with emerald faucets, rose sinks, and soft slate containers.
  - `Golden Forge (Dark)`: Rich gold/amber bullion theme for RPG and fantasy in-game economies.
  - `Emerald Reserve (Light)`: Polished financial institution palette.
- **Virtual Currency Symbol**: Choose custom in-game currency glyph (`🪙`, `💎`, `⚡`, `⭐`, `💰`, `$`).
- **Show Particle Pulse Animation**: Toggle animated flow pulses along Sankey ribbons.
- **Metric Value Formatting**: Compact Numbers (`1.2M`), Currency (`$1.2M`), Percentage, or Raw.
