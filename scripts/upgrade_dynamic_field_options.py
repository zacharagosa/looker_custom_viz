#!/usr/bin/env python3
"""
Convert free-text "Field Index or Name" override options into dynamic dropdowns that are
populated from the live query's dimensions / measures via Looker's `registerOptions` trigger.

Idempotent: re-running on an already patched file is a no-op.
"""
import os
import re
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIZ_DIR = os.path.join(BASE, "visualizations")

# viz_id -> { optionKey: (role, defaultIdx) }   role in {"dimension", "measure", "any"}
# defaultIdx = -1 means "" resolves to None / not used (optional field).
FIELD_SPECS = {
    "cloud_finops_commit_horizon": {
        "entityDimOverride": ("dimension", 0),
        "dateDimOverride": ("dimension", 1),
        "measureFieldOverride": ("measure", 0),
        "wasteMeasureOverride": ("measure", 1),
    },
    "rank_bump_chart": {
        "dimFieldOverride": ("dimension", 0),
        "pivotFieldOverride": ("dimension", 1),
        "measureFieldOverride": ("measure", 0),
        "targetMeasureOverride": ("measure", -1),
    },
    "broadcast_daypart_grid": {
        "dayDimOverride": ("dimension", 0),
        "hourDimOverride": ("dimension", 1),
        "sliceDimOverride": ("dimension", 2),
        "primaryMeasureOverride": ("measure", 0),
        "targetMeasureOverride": ("measure", -1),
    },
    "raincloud_plot": {
        "categoryDimOverride": ("dimension", 0),
        "observationDimOverride": ("dimension", 1),
        "metricMeasureOverride": ("measure", 0),
        "sizeMeasureOverride": ("measure", -1),
    },
    "retention_cohort_decay": {
        "cohortDimOverride": ("dimension", 0),
        "periodDimOverride": ("dimension", 1),
        "measureOverride": ("measure", 0),
        "targetMeasureOverride": ("measure", -1),
    },
    "bullet_graph": {
        "dimFieldOverride": ("dimension", 0),
        "measureFieldOverride": ("measure", 0),
        "targetMeasureOverride": ("measure", 1),
        "baselineMeasureOverride": ("measure", 2),
    },
    "calendar_activity_heatmap": {
        "dimFieldOverride": ("dimension", 0),
        "measureFieldOverride": ("measure", 0),
        "targetMeasureOverride": ("measure", 1),
    },
    "cell_tower_polar_coverage": {
        "siteFieldOverride": ("dimension", 0),
        "sectorAngleOverride": ("dimension", -1),
        "primaryMeasureOverride": ("measure", 0),
        "secondaryMeasureOverride": ("measure", 1),
    },
    "choropleth_map": {
        "stateFieldOverride": ("dimension", 0),
        "measureFieldOverride": ("measure", 0),
        "secondaryMeasureOverride": ("measure", 1),
    },
    "dumbbell_plot": {
        "dimFieldOverride": ("dimension", 0),
        "measureFieldAOverride": ("measure", 0),
        "measureFieldBOverride": ("measure", 1),
    },
    "forecast_confidence_cone": {
        "dimFieldOverride": ("dimension", 0),
        "seriesDimOverride": ("dimension", 1),
        "measureFieldOverride": ("measure", 0),
        "lowerBoundOverride": ("measure", 1),
        "upperBoundOverride": ("measure", 2),
    },
    "inventory_stockout_sawtooth": {
        "dateFieldOverride": ("dimension", 0),
        "entityFieldOverride": ("dimension", 1),
        "inventoryMeasureOverride": ("measure", 0),
        "coverageMeasureOverride": ("measure", 1),
        "costMeasureOverride": ("measure", 2),
    },
    "marimekko_market_matrix": {
        "dimFieldOverride": ("dimension", 0),
        "subDimOverride": ("dimension", 1),
        "measureFieldOverride": ("measure", 0),
        "secondaryMeasureOverride": ("measure", 1),
    },
    "media_audience_overlap_euler": {
        "networkFieldOverride": ("dimension", 0),
        "segmentFieldOverride": ("dimension", 1),
        "demoFieldOverride": ("dimension", 2),
        "reachMeasureOverride": ("measure", 0),
        "secondaryMeasureOverride": ("measure", 1),
    },
    "mitre_attack_matrix": {
        "dimTacticOverride": ("dimension", 0),
        "dimTechniqueOverride": ("dimension", 1),
        "measureVolumeOverride": ("measure", 0),
        "measureSeverityOverride": ("measure", 1),
    },
    "multi_touch_attribution_pathway": {
        "touchpointDimOverride": ("dimension", 0),
        "stageDimOverride": ("dimension", 1),
        "spendMeasureOverride": ("measure", 0),
        "conversionMeasureOverride": ("measure", 1),
    },
    "radial_progress_gauge": {
        "dimFieldOverride": ("dimension", 0),
        "measureFieldOverride": ("measure", 0),
        "targetMeasureOverride": ("measure", 1),
    },
    "roc_curve_evaluator": {
        "thresholdFieldOverride": ("any", 0),
        "fprFieldOverride": ("any", 1),
        "recallFieldOverride": ("any", 2),
        "precisionFieldOverride": ("any", 3),
        "f1FieldOverride": ("any", 4),
        "accuracyFieldOverride": ("any", 5),
        "tpFieldOverride": ("any", 6),
        "fpFieldOverride": ("any", 7),
        "tnFieldOverride": ("any", 8),
        "fnFieldOverride": ("any", 9),
    },
    "sankey_flow_diagram": {
        "sourceDimOverride": ("dimension", 0),
        "intermediateDimOverride": ("dimension", 1),
        "targetDimOverride": ("dimension", 2),
        "volumeMeasureOverride": ("measure", 0),
        "secondaryMeasureOverride": ("measure", -1),
    },
    "sparkline_matrix_table": {
        "dimFieldOverride": ("dimension", 0),
        "pivotFieldOverride": ("dimension", 1),
        "measureFieldOverride": ("measure", 0),
        "secondaryMeasureOverride": ("measure", 1),
    },
}

METHOD_TEMPLATE = '''    // ------------------------------------------------------------------
    // Dynamic Field-Role Dropdowns
    // Populates every field-role selector from the live query's actual
    // dimensions & measures (via Looker's `registerOptions` trigger) so users
    // pick columns by name instead of typing 1-based column indexes.
    // ------------------------------------------------------------------
    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
%(spec_lines)s
      };
      if (!queryResponse || !queryResponse.fields || typeof self.trigger !== "function") return;
      var f = queryResponse.fields;
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (!meas.length && f.table_calculations && f.table_calculations.length) meas = f.table_calculations;

      var signature = dims.map(function (d) { return d.name; }).join("|") + "::" + meas.map(function (m) { return m.name; }).join("|");
      if (self._dynamicFieldSignature === signature) return;
      self._dynamicFieldSignature = signature;

      if (!self._baseOptions) self._baseOptions = self.options || {};
      var newOptions = {};
      Object.keys(self._baseOptions).forEach(function (k) {
        newOptions[k] = Object.assign({}, self._baseOptions[k]);
      });

      function fieldLabel(fld) { return fld.label || fld.label_short || fld.name; }

      Object.keys(FIELD_ROLE_OPTIONS).forEach(function (key) {
        var spec = FIELD_ROLE_OPTIONS[key];
        if (!newOptions[key]) return;
        var list = spec.role === "measure" ? meas : (spec.role === "any" ? dims.concat(meas) : dims);
        var autoField = spec.defaultIdx >= 0 ? list[spec.defaultIdx] : null;
        var autoLabel = autoField ? ("Auto \\u2192 " + fieldLabel(autoField)) : "Auto / None";
        var values = [];
        var autoEntry = {};
        autoEntry[autoLabel] = "";
        values.push(autoEntry);
        var seen = {};
        list.forEach(function (fld) {
          var lbl = fieldLabel(fld);
          if (seen[lbl]) lbl = lbl + " (" + fld.name + ")";
          seen[lbl] = true;
          var entry = {};
          entry[lbl] = fld.name;
          values.push(entry);
        });
        newOptions[key].type = "string";
        newOptions[key].display = "select";
        newOptions[key].values = values;
        newOptions[key].default = "";
      });

      try {
        self.trigger("registerOptions", newOptions);
      } catch (e) {
        console.warn("registerOptions unavailable in this host:", e);
      }
    },

'''

PLACEHOLDER_VALUES = '[{ "Auto (run the query to populate field choices)": "" }]'


def clean_label(label):
    lbl = label
    lbl = re.sub(r"\s*\(\d+\s*=\s*(?:Col(?:umn)?|Measure)\s*\d+\)", "", lbl)
    lbl = re.sub(r"\(\d+\s*=\s*(?:Col(?:umn)?|Measure)\s*\d+,\s*", "(", lbl)
    lbl = re.sub(r"\s*Index(?:\s*/\s*Name|\s+or\s+Name)?\b", "", lbl)
    lbl = re.sub(r"\s{2,}", " ", lbl).strip()
    lbl = re.sub(r"\s+\(\s*\)", "", lbl)
    return lbl


def patch_option_block(src, key):
    pattern = re.compile(
        r"^(?P<indent>[ \t]+)" + re.escape(key) + r": \{\n(?P<body>.*?)\n(?P=indent)\}(?P<comma>,?)\n",
        re.M | re.S,
    )
    m = pattern.search(src)
    if not m:
        return src, False
    body = m.group("body")
    if "display:" in body and "values:" in body:
        return src, False  # already a dropdown
    lab = re.search(r"label:\s*(['\"])(.*?)\1", body)
    sec = re.search(r"section:\s*(['\"])(.*?)\1", body)
    order = re.search(r"order:\s*(\d+)", body)
    label = clean_label(lab.group(2)) if lab else key
    section = sec.group(2) if sec else "Display"
    order_v = order.group(1) if order else "1"
    indent = m.group("indent")
    inner = indent + "  "
    new_block = (
        f"{indent}{key}: {{\n"
        f'{inner}type: "string",\n'
        f'{inner}label: "{label}",\n'
        f'{inner}display: "select",\n'
        f"{inner}values: {PLACEHOLDER_VALUES},\n"
        f'{inner}default: "",\n'
        f'{inner}section: "{section}",\n'
        f"{inner}order: {order_v}\n"
        f"{indent}}}{m.group('comma')}\n"
    )
    return src[: m.start()] + new_block + src[m.end():], True


def patch_file(viz_id, spec):
    path = os.path.join(VIZ_DIR, viz_id, f"{viz_id}.js")
    with open(path, "r", encoding="utf-8") as fh:
        src = fh.read()
    original = src
    changed_keys = []
    for key in spec:
        src, ok = patch_option_block(src, key)
        if ok:
            changed_keys.append(key)

    if "_registerDynamicFieldOptions" not in src:
        spec_lines = ",\n".join(
            f'        {k}: {{ role: "{role}", defaultIdx: {idx} }}' for k, (role, idx) in spec.items()
        )
        method = METHOD_TEMPLATE % {"spec_lines": spec_lines}
        anchor = "    create: function (element, config) {"
        if anchor not in src:
            raise RuntimeError(f"{viz_id}: create() anchor not found")
        src = src.replace(anchor, method + anchor, 1)

        ua = "    updateAsync: function (data, element, config, queryResponse, details, done) {\n"
        if ua not in src:
            raise RuntimeError(f"{viz_id}: updateAsync anchor not found")
        src = src.replace(ua, ua + "      this._registerDynamicFieldOptions(queryResponse);\n", 1)

    if src != original:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(src)
    return changed_keys, src != original


def main():
    only = sys.argv[1:] or list(FIELD_SPECS.keys())
    for viz_id in only:
        keys, changed = patch_file(viz_id, FIELD_SPECS[viz_id])
        print(f"{viz_id:<34} changed={changed} dropdowns={len(keys)} -> {keys}")


if __name__ == "__main__":
    main()
