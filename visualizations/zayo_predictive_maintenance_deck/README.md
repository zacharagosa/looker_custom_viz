# Zayo AutoML Predictive Maintenance & OTDR Span Diagnostics Deck

A specialized multi-modal Looker custom visualization designed for telecommunications network operations, fiber infrastructure monitoring, and autonomous NOC incident management.

## Capabilities & Features
- **Executive Scorecard Ribbon**: Real-time summary strip with Monitored Spans, Critical Interventions, and Total SLA Exposure Guarded.
- **Dynamic Field-Role Mapping (`Display`)**: Live dropdowns for mapping query dimensions and measures to Span ID, Corridor Name, Risk Tier, Failure Timeframe, Primary Anomaly Trigger, Anomaly Metric Value, Recommended Engineering Action, Dispatch Priority, Failure Probability %, and SLA Financial Risk Exposure ($).
- **Inline OTDR Reflectometry Traces**: Visualizes Rayleigh backscatter decay curves and identifies physical fault locations along fiber spans.
- **Configurable SLA Benchmarks & Alerts (`Display`)**: Benchmark target modes (`Measure Column`, `Fixed Value`, `Dataset Mean`, `Dataset Median`, `Percentile P75/P90`) and critical anomaly alert thresholds.
- **Interactive Triage Tabs & Search**: Filter by `All`, `P1 Immediate`, `P1/P2 High`, `P3 Watchlist`, and `Nominal` alongside real-time search filtering.
- **Enterprise Brand Palettes (`Style`)**: 8 themes including Zayo Telecom Corporate, Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Sunset Media, Wellverse Healthcare, and Custom Hex Overrides.
- **Container Hygiene & Responsive Sizing**: Zero tile-bleed, strict box-sizing, and debounced ResizeObserver (<4px guard).
- **Looker Drill-Down Support**: Native drill menu activation on row click (`LookerCharts.Utils.openDrillMenu`).

## Model & Explore Binding
- **Model**: `zayo_network_analytics`
- **Explore**: `predictive_maintenance_queue`
- **Primary Fields**: `predictive_maintenance_spans.span_id`, `predictive_maintenance_spans.span_name`, `predictive_maintenance_spans.risk_tier`, `predictive_maintenance_spans.predicted_failure_prob`, `predictive_maintenance_spans.sla_financial_risk_usd`
