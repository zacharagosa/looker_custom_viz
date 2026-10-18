# Candlestick / OHLC & Bollinger Volatility Envelope

An institutional-grade financial and operational volatility visualization for Looker, built with **D3.js v7** and SVG.

Designed to resolve long-standing Looker Cloud Blockers and community gaps:
- **b/271849182 & b/315920194**: *Native Candlestick / OHLC chart with technical overlays (Bollinger Bands, Moving Averages, Volume bars)*.
- **b/482910482**: *Dual-panel time series with integrated volume histogram*.

---

## 🌟 Key Features

1. **4 Multi-Modal Visual Paradigms (`layoutMode`)**:
   - **Candlestick & Bollinger Volatility Envelope (`candlestick_bollinger`)**: Classic Japanese Candlesticks (emerald bullish & crimson bearish real bodies with high/low wicks) + 20-period center Simple Moving Average (SMA) + Upper & Lower Bollinger Bands with translucent shaded volatility ribbon.
   - **Western OHLC Tick Bars (`ohlc_bars`)**: Traditional high-low vertical range bar with left tick for Open and right tick for Close.
   - **Heikin-Ashi Smoothed Trend (`heikin_ashi`)**: Noise-filtered trend candles based on smoothed average prices, highlighting sustained momentum and trend reversals.
   - **Bandwidth %B Volatility Oscillator (`bandwidth_oscillator`)**: Quantifies market volatility squeezes and expansion breakouts.

2. **Volume Histogram Sub-Chart (`showVolumeSubchart`)**:
   - Secondary bottom panel displaying daily volume bars color-matched to day's bullish/bearish candle.

3. **Dynamic Field-Role Mapping (`Display`)**:
   - Re-map Date, Open, High, Low, Close, and Volume measures on the fly using dynamic Looker select dropdowns populated via `registerOptions`.

4. **Configurable Bollinger Parameters**:
   - Customizable Moving Average period (`10`, `14`, `20`, `30`, `50`) and Standard Deviation multiplier (`1.5`, `2.0`, `2.5`, `3.0`).

5. **Executive KPI HUD & Floating Crosshair Tracker**:
   - Scorecard strip displaying Latest Close, Period Return %, Period High/Low range, and Bollinger Bandwidth Squeeze alert state.
   - Interactive vertical dashed crosshair scrubber with real-time floating inspection card displaying Open, High, Low, Close, Net %, Volume, SMA, and Band levels.

6. **Looker Drill-Down Menus**:
   - Full integration with Looker's native drill-down actions (`LookerCharts.Utils.openDrillMenu`) on candle click.

7. **Strictly 2 Configuration Sections**:
   - Only `Display` and `Style` sections, keeping Looker's Edit Viz modal headers clean and uncluttered.

---

## 📊 Data Shape & Requirements

| Field Type | Requirement | Description |
| :--- | :--- | :--- |
| **Dimension 1** | **Required** (1 field) | Date / Time dimension (e.g. `virtual_currency_candlestick.trading_date`) |
| **Measure 1** | **Required** (1 field) | Open Price measure |
| **Measure 2** | **Required** (1 field) | High Price measure |
| **Measure 3** | **Required** (1 field) | Low Price measure |
| **Measure 4** | **Required** (1 field) | Close Price measure |
| **Measure 5** | *Optional* (1 field) | 24h Trading Volume measure |

---

## 🚀 LookML Explore & Domain Dataset
- **Model**: `void_weaver_analytics`
- **Explore**: `virtual_currency_candlestick` (14. Virtual Token Candlestick & Bollinger Bands)
- **Table**: `aragosalooker.vw_consumption.virtual_currency_candlestick` (90 daily candles of in-game token exchange rates)
