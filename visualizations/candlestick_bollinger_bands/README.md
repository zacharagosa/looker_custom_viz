# Candlestick / OHLC & Bollinger Volatility Envelope

An institutional-grade financial and operational volatility visualization for Looker, built with **D3.js v7** and SVG.

Designed to resolve long-standing Looker Cloud Blockers and community gaps:
- **b/271849182 & b/315920194**: *Native Candlestick / OHLC chart with technical overlays (Bollinger Bands, Moving Averages, Volume bars)*.
- **b/482910482**: *Dual-panel time series with integrated volume histogram*.

---

## 🌟 Key Features & Flexibility Controls (Strictly 2 Tabs: `Display` & `Style`)

1. **4 Multi-Modal Visual Paradigms (`layoutMode`)**:
   - **Candlestick & Bollinger Volatility Envelope (`candlestick_bollinger`)**: Classic Japanese Candlesticks with high/low wicks + center Simple Moving Average (SMA) + Upper/Lower Bollinger Bands with translucent shaded volatility ribbon.
   - **Western OHLC Tick Bars (`ohlc_bars`)**: Traditional high-low vertical range bar with left tick for Open and right tick for Close.
   - **Heikin-Ashi Smoothed Trend (`heikin_ashi`)**: Noise-filtered trend candles highlighting sustained directional momentum.
   - **Bandwidth %B Volatility Squeeze Oscillator (`bandwidth_oscillator`)**: Upper price + Bollinger envelope paired with a lower `%B` / Squeeze oscillator panel (`0% / 50% / 100%` overbought/oversold reference lines).

2. **Dynamic Field-Role Mapping (`Display`)**:
   - Re-map Date, Open, High, Low, Close, Volume, and optional Target Benchmark Measure on the fly using dynamic Looker `select` dropdowns populated via `registerOptions`.

3. **Configurable Reference Lines, Targets & Thresholds (`Display`)**:
   - Supports `Dataset Mean`, `Dataset Median`, `Percentile P75`, `Percentile P90`, `Target Measure Column`, `Period High`, `Period Low`, `Fixed Value`, and `None`, plus custom label and Volatility Squeeze Alert Threshold (`% Bandwidth`).

4. **Sorting, Top-N Windowing & Null Handling (`Display`)**:
   - Interactive sort order (`Chronological Ascending`, `Chronological Descending`, `Close Descending`, `Close Ascending`, `Alphabetical`), Top-N candle windowing with excluded/prior summary rollup chip, and zero/null OHLC row suppression.

5. **Executive HUD, Interactive Search & Callout Density (`Display`)**:
   - Multi-density Scorecard HUD (`Full Scorecard`, `Compact Strip`, `Hidden`), peak/all data callout labels (`All`, `Min/Max Peaks Only`, `Hidden`), overlay legend toggle, custom title/subtitle overrides, and a live date search & signal filter bar (`All`, `Bullish`, `Bearish`, `Squeeze`).

6. **Enterprise Brand Palettes, Polarity & Typography (`Style`)**:
   - 8 presets (`Google Enterprise`, `Modern Slate`, `Cyberpunk Dark`, `Emerald FinOps`, `Sunset Media`, `Wellverse Healthcare`, `Trading Pro Dark`, `Custom Hex Override`), native `display: 'color'` pickers, metric polarity (`Higher is Better` vs `Lower is Better`), font scaling (`Compact`, `Standard`, `Large Presentation`), and 7 value formats (`Auto`, `Precise Currency`, `Compact Currency`, `Compact Number`, `Percentage`, `Decimal 2dp`, `Raw`).

7. **Looker Drill-Down & Responsive Sizing**:
   - Full `LookerCharts.Utils.openDrillMenu` integration on candle click and debounced `ResizeObserver` (`<4px` guard).

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
