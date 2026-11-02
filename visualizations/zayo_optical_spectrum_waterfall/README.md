# Zayo DWDM Optical Attenuation & Telemetry Spectrum Analyzer (`zayo_optical_spectrum_waterfall`)

Enterprise multi-modal D3.js Looker custom visualization designed for fiber telecom optical network operations, physical layer health monitoring, and proactive SLA root-cause analysis.

## Overview & Visual Paradigms
1. **Optical Attenuation Time-Series Envelope (`optical_threshold_envelope`)**:
   - High-precision continuous optical attenuation trace against the ITU-T G.652.D standard operating band (`< 0.20 dB/km`).
   - Dynamic BigQuery ML `ARIMA_PLUS` 90% confidence anomaly threshold boundary reference line with critical breach pulse pins.
   - Shaded area fills under telemetry and dual-axis secondary volume/OSNR correlation.
2. **SLA Financial Risk & Incident Root-Cause Lollipop (`root_cause_lollipop`)**:
   - Dual-metric horizontal stem-and-leaf lollipop chart for SLA financial penalties and incident/anomaly counts by corridor or root cause.
   - Dynamic label margin calculation scaling to longest corridor names without clipping.
3. **Corridor Optical Attenuation Waterfall (`corridor_waterfall`)**:
   - Stepped optical loss accumulation across fiber route corridors compared against total link budget headroom.

## Enterprise Flexibility Options (Strict 2-Tab Hierarchy)

### Display Options
- **Card Title & Subtitle Override**: Custom header text and telemetry tags.
- **Visualization Mode**: Auto-Detect, Optical Attenuation Time-Series Envelope, SLA Root-Cause Lollipop, Corridor Waterfall.
- **Executive KPI HUD Mode**: `Full Scorecard Strip` (Monitored Spans, Mean Telemetry, Peak Value, Anomaly Breaches), `Compact Summary`, or `Hidden`.
- **Benchmark Target Mode**: ITU-T G.652.D standard, Fixed Threshold Value, Measure Column, Dataset Mean, Dataset Median, Percentile P75, Percentile P90, or None.
- **Entity Sort Order**: Metric Descending, Metric Ascending, Alphabetical, Chronological/Query Natural.
- **Top-N Entity Limit & Other Rollup**: Top 5, 10, 15, 20, or All entities, with optional consolidated `'Other'` rollup.
- **Zero/Null Row Suppression**: Toggle to filter zero/null telemetry records.
- **Data Value Label Density**: All Labels, Peaks/Outliers Only, or Hidden.
- **Interactive Search Filter Bar**: In-tile real-time corridor/span search.
- **Dynamic Field-Role Dropdowns (`registerOptions`)**:
  - `dimTimeOrCategoryOverride`: Primary / Time Dimension
  - `dimCorridorOrRootCauseOverride`: Corridor / Root-Cause Dimension
  - `measurePrimaryOverride`: Primary Metric (Attenuation dB/km or SLA Penalty USD)
  - `measureSecondaryOverride`: Secondary Metric (OSNR dB or Incident Count)
  - `measureTargetOverride`: Benchmark / SLA Target Metric

### Style Options
- **Color Themes**: Zayo Telecom Corporate (`#f5831f`), Google Enterprise (`#1a73e8`), Modern Studio Slate (`#0f172a`), Cyberpunk Dark (`#00ffcc`), Emerald FinOps (`#10b981`), Sunset Media (`#ea580c`), Wellverse Healthcare (`#0284c7`), Custom Hex Override.
- **Custom Hex Color Overrides**: Dedicated color pickers (`display: 'color'`) for Primary, Positive/Nominal, and Alert/Breach tones.
- **Metric Polarity**: Lower is Better (Attenuation, SLA Risk, Loss) vs Higher is Better (Bandwidth, OSNR, Margin).
- **Typography & Scaling**: Compact, Standard, or Large Presentation scaling.
- **Value Formatting**: Auto-Detect, Decimal (3dp, 2dp), Compact Currency (`$1.2M`, `$45K`), Compact Number, Percentage, Raw.

## Authentic Domain Explore
- **Model**: `zayo_network_analytics`
- **Explore**: `optical_telemetry_and_predictive_maintenance`
- **Fields**: `optical_span_anomalies.timestamp_date`, `optical_span_anomalies.avg_attenuation_db_per_km`, `optical_span_anomalies.avg_osnr_db`, `optical_span_anomalies.count`
