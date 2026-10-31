# OTDR Fiber Event & Distance-to-Break Analyzer

Enterprise-grade Optical Time-Domain Reflectometry (OTDR) fiber trace reflectogram, distance-to-fault analysis, optical loss budget waterfall, and corridor fault matrix built with D3.js v7 for the Looker Custom Visualizations v2 API.

Resolves Buganizer Cloud Blockers b/492104921, b/394109282, and b/520193847 for optical transport networks, hyperscale DCIs, long-haul fiber carriers, and telecom NOC operations (Zayo, Google Fiber, Nokia, Ciena).

---

## 4 Multi-Modal Layout Paradigms

1. **OTDR Trace Reflectogram & Event Pins (`otdr_trace_reflectogram`)**:
   - High-resolution Rayleigh backscatter decay trace (dB loss vs physical distance in km / route miles).
   - Detects and marks discrete optical events: launch interface, fusion splices, patch panels/connectors, macrobends, and terminal end-of-fiber / fiber cut Fresnel reflection peaks.
   - Overlays ITU-T G.652.D standard (0.20 dB/km) and ITU-T G.654.E Ultra-Low Loss (0.17 dB/km) reference envelopes.
   - Interactive hover tooltips with event type, exact location (km/mi), event loss (dB), reflectance (dB), and cumulative attenuation.

2. **Optical Loss Budget Waterfall (`event_loss_waterfall`)**:
   - Decomposes cumulative span attenuation into a discrete loss waterfall: Launch Interface, Bulk Rayleigh Fiber Loss, Fusion Splices, Patch Panels, and Macrobend Anomalies.
   - Highlights total span loss vs maximum link budget margin (22.0 dB).

3. **Corridor Fault & Risk Heatmap (`corridor_fault_matrix`)**:
   - Multi-corridor risk matrix evaluating Rayleigh Slope, Splice Loss, Connector Reflection, Macrobends, and Fiber Cut Risk.
   - Color-coded severity indicators for immediate NOC triage and MTTR reduction.

4. **Executive Fiber Health Scorecard (`executive_fiber_health_hud`)**:
   - High-level fiber plant integrity scorecard displaying Total Route Miles, Mean Span Attenuation, Peak Fiber Loss, and Critical OTDR Events with dispatch status guidance.

---

## Configuration Options (Strict 2-Tab Schema)

### Display Options
- `layoutMode`: Switch between the 4 layout paradigms.
- `dimCorridorOverride`: Dynamic dropdown for Route Corridor / Span Dimension.
- `dimFiberTypeOverride`: Dynamic dropdown for Fiber Specification Dimension.
- `measDistanceOverride`: Dynamic dropdown for Route Distance / Span Length.
- `measAttenuationOverride`: Dynamic dropdown for Optical Attenuation (dB/km).
- `measOsnrOverride`: Dynamic dropdown for Optical Signal-to-Noise Ratio (OSNR dB).
- `measAnomalyCountOverride`: Dynamic dropdown for Anomaly / Event Count.
- `targetGoalMode`: Benchmark mode (ITU-T G.652.D 0.20 dB/km, G.654.E 0.17 dB/km, Dataset Mean, Dataset Median, P75, Fixed Value, None).
- `criticalAttenuationThreshold`: Configurable threshold for critical anomaly alerting (default 0.25 dB/km).
- `sortOrder`: Attenuation Descending, Attenuation Ascending, Distance Descending, Alphabetical, Natural.
- `topNLimit` & `enableOtherRollup`: Top-N corridor filter with automatic Other rollup.
- `showExecutiveHUD` & `hudMode`: Executive Scorecard HUD (Full Scorecard, Compact Strip, Hidden).
- `labelDensity`: All Event Labels, Critical Peaks Only, Hidden (Tooltips only).
- `showSearch`: Real-time interactive corridor filter bar.
- `animateTrace`: Smooth trace pulse animation toggle.

### Style Options
- `colorTheme`: 8 curated enterprise palettes (Zayo Telecom, Google Enterprise, Modern Slate, Cyberpunk Neon, Emerald Optical, Sunset Amber, Wellverse Ocean, Custom Hex Override).
- `customPrimaryHex`, `customNominalHex`, `customCriticalHex`: Color pickers (`display: 'color'`).
- `metricPolarity`: Lower is Better vs Higher is Better.
- `fontScale`: Compact, Standard, Large Presentation.
- `valueFormat`: Decimal 3dp, Decimal 2dp, Miles, Compact Number, Percentage, Raw.

---

## Domain-Authentic Query Binding

Bound authentically to optical telemetry and predictive maintenance telemetry in LookML model `zayo_network_analytics`:

```json
{
  "model": "zayo_network_analytics",
  "view": "optical_telemetry_and_predictive_maintenance",
  "fields": [
    "fiber_routes.corridor",
    "fiber_routes.optical_fiber_type",
    "fiber_routes.distance_miles",
    "fiber_routes.provisioned_capacity_tbps",
    "optical_span_anomalies.avg_attenuation_db_per_km",
    "optical_span_anomalies.avg_osnr_db",
    "optical_span_anomalies.count"
  ],
  "sorts": [
    "optical_span_anomalies.avg_attenuation_db_per_km desc"
  ],
  "limit": "50"
}
```
