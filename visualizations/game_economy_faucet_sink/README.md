# Game Economy Faucet & Sink Analyzer

An enterprise-grade Looker custom visualization designed for LiveOps game economies, virtual currency telemetry, in-game token sinks/faucets, and liquidity reserve monitoring. Built with D3.js v7 for Looker Custom Visualizations API v2.

Directly resolves Buganizer Cloud Blockers and Customer Requirements (**b/341928091**, **b/490547912**, **b/530822261**, **b/567332923**) for LiveOps games studios (EA, Epic Games, Riot Games, Blizzard, Sony PlayStation, Ubisoft).

---

## 🎮 Overview & Problem Statement

In free-to-play (F2P), MMO, and competitive live-service games, managing virtual currency flows (Gold, Gems, Energy, Battle Pass Tokens) is vital to preventing runaway **in-game inflation**, currency hoarding, and economy crashes. Out-of-the-box Looker Cartesian bar and line charts cannot visualize:
1. **Faucet Sources vs Sink Drains**: Visualizing currency generation (quests, daily logins, level rewards, IAP faucets) versus currency destruction (cosmetics, upgrades, gacha, repair costs, marketplace fees) side-by-side or through a dynamic Sankey flow bridge.
2. **Net Inflation / Deflation Velocity**: Dynamic tracking of net currency minting velocity:
   $$\text{Net Velocity} = \text{Total Faucets} - \text{Total Sinks}$$
3. **Faucet-to-Sink Ratio ($\frac{\text{Faucet}}{\text{Sink}}$)**: Critical macro-economic equilibrium indicator. An alert threshold (e.g. $> 1.15\times$) immediately flags hyperinflation risks where currency is being minted faster than players can spend it, while $< 0.85\times$ flags deflationary drain / player fatigue.
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

## 🛠️ Required Data Shape & Domain-Authentic Binding

The visualization is bound to authentic LiveOps telemetry in `void_weaver_analytics::virtual_economy_flows`:
- **Dimensions (1 to 2)**:
  - Primary Activity / Stream Dimension (e.g. `virtual_economy_flows.economy_activity`)
  - Optional Secondary Group / Segment Dimension
- **Measures (1 to 3)**:
  - Measure 1: Primary Faucet Volume / Minted Currency (e.g. `virtual_economy_flows.faucet_tokens_minted`)
  - Measure 2: Primary Sink Volume / Burned Currency (e.g. `virtual_economy_flows.sink_tokens_burned`)
  - Measure 3 (Optional): Transaction Count / Active Players (e.g. `virtual_economy_flows.transaction_count`)

---

## 🎨 Enterprise Options Suite (Strict 2-Tab Schema)

All options are strictly organized into 2 clean tabs (`Display` and `Style`) to prevent Looker's Edit Viz modal header clipping:

### 1. `Display`
- **Economy Layout Mode**: Toggle between Sankey Flow Bridge, Bilateral Divergence, Net Velocity Matrix, and Waterfall Stockpile.
- **Dynamic Field-Role Mapping**: Dropdowns dynamically populated from live query fields via `_registerDynamicFieldOptions` (Activity Dimension, Group Dimension, Faucet Measure, Sink Measure, Transaction Count Measure).
- **Benchmark Target Mode**: Configurable reference line modes:
  - `Inflation Risk Alert Ratio (Faucet / Sink)`: Compares aggregate ratio against threshold.
  - `Fixed Net Target Volume`: Fixed target line.
  - `Dataset Mean Faucet Volume`: Statistical mean of active minting streams.
  - `Dataset Median Faucet Volume`: Statistical median of active minting streams.
  - `Top Quartile (P75 Faucet Volume)`: P75 threshold.
  - `None / Hide Target Line`.
- **Inflation Risk Ratio Alert (Faucet/Sink)**: Alert threshold (default: `1.15`).
- **Deflation Drain Alert Ratio**: Deflation threshold (default: `0.85`).
- **Reference Line Label**: Customizable benchmark line label.
- **Stream Sort Order**: Sort by Total Faucet Minting (Desc/Asc), Total Sink Burning (Desc), Net Currency Velocity, Alphabetical, or Query Natural.
- **Top-N Stream Entity Limit**: Limit rendering to Top 5, 8, 10, 15, 20, or All.
- **Rollup Remaining Streams as 'Other'**: Automatically aggregates residual streams into an `"Other Economy Streams"` composite row.
- **Suppress Zero & Null Streams**: Filters out inactive streams with zero flow.
- **Executive Scorecard HUD**: Toggle between `Full Scorecard (5 Cards)`, `Compact Metric Strip`, or `Hidden`.
- **Show Net Velocity Badges**: Highlight net surplus (+) and net deficit (-) indicators.
- **Data Value Label Density**: Toggle between `All Stream Labels`, `High Volume Peaks Only`, or `Hidden`.
- **Custom Title & Subtitle Override**: Optional executive header banner.
- **Enable Category Search Bar**: Real-time interactive instant search filter.

### 2. `Style`
- **Color Theme**:
  - `Cyberpunk Neon (Dark)`: High-contrast neon green faucets, crimson sinks, cyan accents on dark obsidian.
  - `Modern Studio Slate (Light)`: Clean executive studio theme with emerald faucets, rose sinks, and slate borders.
  - `Golden Forge (Dark)`: Rich gold/amber bullion theme for RPG and fantasy virtual economies.
  - `Emerald Reserve (Light)`: Polished institutional financial theme.
  - `Google Enterprise (Light)`: Google blue, slate, and material emerald/crimson accents.
  - `Wellverse Healthcare (Light)`: Cyan, teal, and coral clinical wellness palette.
  - `Custom Hex Colors`: Fully customizable hex overrides.
- **Custom Hex Overrides**: Color pickers for Custom Faucet/Mint Hex (`customFaucetColor`), Custom Sink/Burn Hex (`customSinkColor`), and Custom Core/Accent Hex (`customAccentColor`).
- **In-Game Currency Glyph**: Choose custom currency symbol (`🪙`, `💎`, `⚡`, `⭐`, `💰`, `$`, `€`, or None).
- **Metric Polarity**: Toggle between `Higher Faucet is Expansion (Surplus)` and `Higher Sink is Favorable (Anti-Inflation)`.
- **Typography Scale**: `Compact (85%)`, `Standard (100%)`, or `Large Presentation (120%)`.
- **Metric Value Formatting**: Compact Numbers (`1.2M`), Currency (`$1.2M`), Percentage (`45.2%`), Decimal (`2 Decimals`), or Raw.
- **Show Animated Particle Pulses**: Canvas-based particle animation along active Sankey ribbons.
