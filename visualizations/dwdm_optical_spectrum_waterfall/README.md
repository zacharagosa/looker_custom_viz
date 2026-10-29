# DWDM Optical Spectrum & Span Attenuation Waterfall

An enterprise-grade Looker custom visualization designed for optical transport networks, hyperscale Data Center Interconnects (DCI), and telecom fiber backbone monitoring. Built with D3.js v7 for Looker Custom Visualizations API v2.

Directly resolves Buganizer Cloud Blockers and Customer Requirements (**b/482019481**, **b/394109282**, **b/520193847**, **go/cloudbi-cbs**) for carrier network operations and optical engineering teams (Zayo, Google Cloud Interconnect, Lumen, Crown Castle, Nokia, Ciena, Infinera).

---

## 📡 Overview & Problem Statement

Optical transport networks (DWDM, OTN, ROADM) carry hundreds of Terabits per second over long-haul fiber spans. Managing optical health requires monitoring:
1. **ITU-T C-Band DWDM Channel Power Spectrum (1530nm–1565nm)**: Multi-channel optical power density across 96 channels (50GHz spacing) to catch amplifier gain ripple, channel dropouts, and laser drift before bit errors accumulate.
2. **Span Attenuation vs Route Distance Envelope**: Detecting physical fiber degradation, macro-bends, and fiber cuts by comparing observed attenuation ($\text{dB/km}$) against ITU-T specifications (G.652.D standard single-mode $\le 0.20\text{ dB/km}$, G.654.E ultra-low loss $\le 0.17\text{ dB/km}$).
3. **OSNR & Q-Factor Constellation Matrix**: Evaluating Optical Signal-to-Noise Ratio (OSNR) and Bit Error Rate (BER) margins against Hard-Decision (HD-FEC) and Soft-Decision (SD-FEC) thresholds to prevent packet drops on 400G/800G coherent wavelengths.
4. **Optical Health Scorecard Grid**: Real-time corridor telemetry status for NOC engineers and executive briefings.

---

## ⚡ 4 Multi-Modal Layout Modes

1. **DWDM C-Band Channel Power Spectrum (Waterfall 3D)** (`spectral_waterfall`):
   - Renders layered isometric 3D elevation ribbons for each monitored route corridor.
   - Plots ITU-T C-Band channels with EDFA gain ripple, carrier peaks, and spectral degradation dropouts.
2. **Span Distance vs Attenuation Loss Envelope (dB/km)** (`span_attenuation_envelope`):
   - 2D scatter and envelope view plotting route distance (miles) vs attenuation (dB/km).
   - Features shaded ITU-T G.654.E ULL, G.652.D SSMF, and elevated risk bands with configurable target threshold lines.
3. **OSNR (dB) vs Q-Factor & BER Constellation Matrix** (`osnr_qfactor_constellation`):
   - Phase-space constellation chart comparing OSNR (dB) and Q-Factor (dB) with Hard-Decision (15 dB) and Soft-Decision (22 dB) FEC margin zones.
4. **Optical Route Health & Telemetry Scorecard Matrix** (`optical_health_matrix`):
   - High-density corridor status grid featuring route name, fiber type badge, distance, attenuation gauge with benchmark tick, OSNR health indicator, and anomaly count badges.

---

## 🛠️ Required Data Shape & Domain-Authentic Binding

The visualization is bound to authentic optical network telemetry in `zayo_network_analytics::optical_telemetry_and_predictive_maintenance`:
- **Dimensions (1 to 3)**:
  - Route Corridor Dimension (e.g. `fiber_routes.corridor`)
  - Fiber Type Dimension (e.g. `fiber_routes.optical_fiber_type`)
  - Route Distance Dimension / Measure (e.g. `fiber_routes.distance_miles`)
- **Measures (1 to 3)**:
  - Optical Attenuation Loss Measure (e.g. `optical_span_anomalies.avg_attenuation_db_per_km`)
  - OSNR Margin Measure (e.g. `optical_span_anomalies.avg_osnr_db`)
  - Optical Anomaly Count Measure (e.g. `optical_span_anomalies.count`)

---

## 🎨 Enterprise Options Suite (Strict 2-Tab Schema)

All options are strictly organized into 2 clean tabs (`Display` and `Style`):

### 1. `Display`
- **Optical Analysis Mode**: Toggle between Spectral Waterfall, Attenuation Envelope, OSNR Constellation, and Health Matrix.
- **Dynamic Field-Role Mapping**: Dropdowns dynamically populated from live query fields via `_registerDynamicFieldOptions` (Corridor Dimension, Fiber Type Dimension, Distance Field, Attenuation Measure, OSNR Measure, Anomaly Measure).
- **Attenuation Benchmark Target Mode**: Configurable reference line modes:
  - `ITU-T G.652.D Spec (0.20 dB/km)`
  - `ITU-T G.654.E Ultra-Low Loss (0.17 dB/km)`
  - `Dataset Mean Attenuation`
  - `Dataset Median Attenuation`
  - `P90 Loss Anomaly Threshold`
  - `Fixed Custom Threshold`
  - `None / Hide Target Line`
- **Fixed Attenuation Threshold (dB/km)**: Customizable loss threshold (default: `0.22`).
- **Critical OSNR Threshold (dB)**: Critical alert boundary (default: `20.0`).
- **Reference Line Label**: Customizable reference line label.
- **Route Sort Order**: Highest Attenuation Loss First, Lowest Attenuation Loss First, Lowest OSNR First, Highest Anomalies Detected, Alphabetical, or Natural Query Order.
- **Top-N Corridor Entity Limit**: All, 5, 8, 10, 12, 16.
- **Rollup Remaining Corridors as 'Other'**: Aggregate remaining routes into composite row.
- **Suppress Zero & Null Attenuation Rows**: Filter out zero-measurement rows.
- **Executive Scorecard HUD**: `Full Scorecard (5 Cards)`, `Compact Metric Strip`, or `Hidden`.
- **Data Value Label Density**: `All Corridor Labels`, `Critical Loss Peaks Only`, or `Hidden`.
- **Custom Title & Subtitle Override**: Executive banner overrides.
- **Enable Corridor Search Bar**: Real-time interactive instant search filter.

### 2. `Style`
- **Color Theme**:
  - `Zayo Telecom (Dark Slate & Orange)`: High-contrast Zayo Orange `#f5831f`, Dark Slate `#0f172a`, Emerald `#10b981`, Crimson `#ef4444`.
  - `Google Enterprise (Light)`: Google Blue `#1a73e8`, Slate `#1e293b`, Green `#188038`, Red `#d93025`.
  - `Coherent Laser Optics (Dark Cyan)`: Laser Cyan `#06b6d4`, Neon Emerald `#10b981`, Deep Navy `#060913`.
  - `Modern Studio Slate (Light)`: Studio Slate `#0f172a`, Blue `#2563eb`.
  - `Cyberpunk Dark (Neon Green & Crimson)`: Cyberpunk Neon `#00ffcc`, Crimson `#ff0055`.
  - `Wellverse Telecom (Light Teal & Navy)`: Healthcare/Telecom Teal `#059669`.
  - `Custom Hex Colors`: Fully customizable hex colors.
- **Custom Hex Overrides**: Custom Primary/Carrier Hex (`customPrimaryColor`), Nominal/Pass Hex (`customNominalColor`), Warning Hex (`customWarningColor`), and Critical Loss Hex (`customCriticalColor`).
- **Attenuation Metric Polarity**: `Lower Attenuation Loss is Better` vs `Higher is Better`.
- **Typography Scale**: `Compact (85%)`, `Standard (100%)`, or `Large Presentation (120%)`.
- **Attenuation Formatting**: High Precision 3 Decimals (`0.198 dB/km`), 2 Decimals (`0.20 dB/km`), Compact Numbers, or Raw.
- **Show 3D Isometric Elevation Shading**: Shaded elevation ribbons on spectral curves.
