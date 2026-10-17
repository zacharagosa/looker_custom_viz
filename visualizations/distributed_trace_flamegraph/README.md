# 🔥 Distributed Trace & Span Waterfall Flamegraph

An enterprise-grade **Distributed Trace & Span Waterfall Flamegraph** custom visualization for Google Cloud Looker, engineered with **D3.js v7**.

Designed to resolve Google Cloud Blockers **`b/394819201`** (native OpenTelemetry & Google Cloud Trace span waterfall in Looker), **`b/482019482`** (hierarchical microservice latency call graph & flamegraph profiling), and **`b/510293847`** (critical-path bottleneck latency isolation across distributed cloud services).

---

## 📸 Key Features

- **4 Multi-Modal Trace Visualizations**:
  1. **Top-Down Hierarchical Icicle (Default)**: Top-down hierarchical trace tree inspired by Google Cloud Trace and OpenTelemetry, with root services spanning across the top and downstream operations/RPCs cascading downwards.
  2. **Bottom-Up Flame Graph**: Classic Brendan Gregg call-stack flame graph with entry points at the bottom and CPU/latency stacks building upwards.
  3. **Distributed Trace Waterfall Timeline**: Sequential span bars offset along an elapsed timeline showing concurrency, async waiting gaps, and critical path.
  4. **Critical Path Bottleneck Chain**: Isolates and highlights only the slowest critical-path execution chain with bottleneck percentage indicators, dimming non-critical concurrent calls.
- **Interactive Sub-Tree Zoom & Pan**:
  - Click on any service or span block to zoom into its call sub-tree, expanding it to 100% width.
  - Interactive breadcrumb navigation with a quick one-click "⬅ Zoom Out" button in the HUD header.
- **Self-Time vs Cumulative Duration**:
  - Automatically calculates cumulative span duration and isolates self-time from child RPC latency.
- **Executive Telemetry HUD**:
  - Scorecard metrics: Root Services Count, Total Spans, Critical Path Bottleneck Span, SLA Target Status, and Error/Critical Span Rate (%).
  - Search-as-you-type filter to locate specific microservices, RPC endpoints, or attack techniques.
- **Looker Drill-Downs**:
  - Direct integration with `LookerCharts.Utils.openDrillMenu` to drill from any flamegraph span into raw forensic logs, traces, or incident tickets.
- **Strictly Minimized Options**:
  - Strictly organized into only 2 tabs (`Display` and `Style`) to prevent header crowding in Looker's Edit Viz modal.

---

## 📊 Data Shape Requirements

| Field Type | Count | Purpose | Examples |
| :--- | :--- | :--- | :--- |
| **Dimension** | `1` *(Required)* | Root Service / Tactic (Parent Span) | `cortex_security_incidents.mitre_tactic`, `traces.service_name` |
| **Dimension** | `1` *(Required)* | Operation / Technique (Child Span) | `cortex_security_incidents.mitre_technique`, `traces.operation_name` |
| **Dimension** | `0` or `1` *(Optional)* | Status / Severity / Health | `cortex_security_incidents.severity`, `traces.status_code` |
| **Numeric Measure** | `1` *(Required)* | Execution Duration / Latency / MTTR | `cortex_security_incidents.avg_mttr_minutes`, `traces.duration_ms` |
| **Numeric Measure** | `0` or `1` *(Optional)* | Call Volume / Ingest Count | `cortex_security_incidents.total_alerts`, `traces.span_count` |

---

## ⚙️ Configuration Options

### Section 1: Display
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `layoutMode` | Select | `Top-Down Hierarchical Icicle` | Layout mode: `topdown_icicle`, `bottomup_flame`, `waterfall_timeline`, `critical_path_chain` |
| `parentServiceDimOverride`| Select | `Auto` | Dynamic dropdown to remap Parent Service / Root Tactic |
| `childOperationDimOverride`| Select | `Auto` | Dynamic dropdown to remap Child Operation / Technique |
| `statusSeverityDimOverride`| Select | `Auto / None` | Dynamic dropdown to remap Status / Severity Dimension |
| `durationMeasureOverride` | Select | `Auto` | Dynamic dropdown to remap Duration / MTTR Measure |
| `volumeMeasureOverride` | Select | `Auto / None` | Dynamic dropdown to remap Call Volume / Alert Count |
| `targetCalculationMode` | Select | `Dataset Median Latency` | SLA target mode: `dataset_median`, `dataset_mean`, `percentile_p75`, `percentile_p90`, `fixed_value`, `none` |
| `fixedTargetValue` | Number | `45` | Fixed SLA target value (minutes or ms) |
| `referenceLineLabel` | String | `SLA Latency Cap` | Label for SLA benchmark target badge |
| `latencyThresholdAlert` | Number | `45` | Critical bottleneck alert threshold |
| `sortOrder` | Select | `Span Duration Descending` | Sorting: `duration_desc`, `duration_asc`, `volume_desc`, `alphabetical`, `natural` |
| `topN` | Select | `All Spans` | Focus limit: `all`, `10`, `15`, `20`, `30`, `50` |
| `rollupOther` | Boolean | `false` | Rollup excluded spans into a synthesized `'Other'` service |
| `suppressNulls` | Boolean | `true` | Suppress spans with zero or null duration |
| `hudMode` | Select | `Full Scorecard Strip` | Executive HUD density: `full`, `compact`, `hidden` |
| `showSearch` | Boolean | `true` | Enable real-time service/span search bar |
| `chartTitleOverride` | String | `""` | Custom chart title override |
| `chartSubtitleOverride` | String | `""` | Custom subtitle override |

### Section 2: Style
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `colorTheme` | Select | `Google Cloud Trace` | Palettes: `google_cloud_trace`, `jaeger_telemetry`, `cyberpunk_noc`, `hot_flame`, `monochrome_slate`, `wellverse`, `custom` |
| `customPrimaryColor` | Color | `""` | Custom primary accent hex override |
| `colorBySeverity` | Boolean | `true` | Color spans by health status (Critical=Red, High=Orange, Medium=Amber, Low=Green) |
| `barHeight` | Select | `Standard (28px)` | Span bar height: `compact` (22px), `standard` (28px), `roomy` (36px) |
| `showSpanLabels` | Boolean | `true` | Show span name and duration text on bars |
| `metricPolarity` | Select | `Lower is Better` | Polarity: `lower_is_better` (latency/MTTR) vs `higher_is_better` |
| `fontScale` | Select | `Standard` | Typography & UI scale: `compact`, `standard`, `large` |
| `valueFormat` | Select | `Auto Detect` | Numeric format: `auto`, `compact_num`, `compact_currency`, `percentage`, `decimal_2dp`, `raw` |

---

## 🚀 Installation & LookML Setup

### Manifest Registration (`manifest.lkml`)
```lookml
visualization: {
  id: "distributed_trace_flamegraph"
  label: "Distributed Trace & Span Waterfall Flamegraph"
  file: "visualizations/distributed_trace_flamegraph.js"
  dependencies: [
    "https://d3js.org/d3.v7.min.js"
  ]
}
```
