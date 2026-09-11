#!/usr/bin/env python3
"""
Generate high-resolution screenshots for all Looker custom visualizations
using live Looker query datasets and gbrowser headless browser.
"""

import json
import os
import shutil
import subprocess
import sys
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_PATH = os.path.join(BASE_DIR, "catalog.json")
ASSETS_DIR = os.path.join(BASE_DIR, "assets", "screenshots")
GBROWSER_BIN = "/google/bin/releases/gemini-agents-gbrowser/gbrowser"

os.makedirs(ASSETS_DIR, exist_ok=True)

with open(CATALOG_PATH, "r", encoding="utf-8") as f:
    catalog = json.load(f)

import argparse
parser = argparse.ArgumentParser()
parser.add_argument("--viz", help="Specific viz ID to capture")
args, _ = parser.parse_known_args()
if args.viz:
    catalog = [v for v in catalog if v["id"] == args.viz]

print(f"Processing {len(catalog)} visualizations from catalog.")

results = []

for idx, viz in enumerate(catalog, 1):
    vid = viz["id"]
    title = viz.get("title", vid)
    print(f"\n[{idx}/{len(catalog)}] Processing {title} ({vid})...")

    query_file = os.path.join(BASE_DIR, "visualizations", vid, "demo_query.json")
    if not os.path.exists(query_file):
        print(f"  -> Skipping: Missing {query_file}")
        continue

    with open(query_file, "r", encoding="utf-8") as f:
        query_def = json.load(f)
    vis_config = query_def.get("vis_config", {})

    # Fetch live query data from Looker
    print("  -> Fetching live query response via Looker CLI...")
    cmd_query = f"looker-cli api query run_inline_query json_detail {query_file} --profile default"
    q_res = subprocess.run(cmd_query, shell=True, capture_output=True, text=True)
    if q_res.returncode != 0:
        print(f"  -> Error fetching query data: {q_res.stderr[:200]}")
        continue

    try:
        query_response = json.loads(q_res.stdout)
    except Exception as e:
        print(f"  -> JSON decode error on query result: {e}")
        continue

    if "fields" in query_response:
        fields = query_response["fields"]
        if "dimension_like" not in fields:
            fields["dimension_like"] = fields.get("dimensions", [])
        if "measure_like" not in fields:
            fields["measure_like"] = fields.get("measures", [])
        if "dimensions" not in fields:
            fields["dimensions"] = fields.get("dimension_like", [])
        if "measures" not in fields:
            fields["measures"] = fields.get("measure_like", [])

    data = query_response.get("data", [])
    print(f"  -> Retrieved {len(data)} rows.")

    js_file = os.path.join(BASE_DIR, "visualizations", vid, f"{vid}.js")
    with open(js_file, "r", encoding="utf-8") as f:
        js_code = f.read()

    # Determine delay and dimensions
    delay_ms = 1200
    height = 720
    if vid in ("network_topology_graph", "flow_arc_map"):
        delay_ms = 2500
        height = 750
    elif vid == "choropleth_map":
        delay_ms = 2200
        height = 720
    elif vid in ("broadcast_daypart_grid", "retention_cohort_decay"):
        delay_ms = 1400
        height = 780
    elif vid in ("sankey_flow_diagram", "telemetry_conversion_funnel", "sparkline_matrix_table"):
        delay_ms = 1500
        height = 720

    # Determine background styling
    color_theme = str(vis_config.get("colorTheme", "")).lower()
    is_dark = "dark" in color_theme or "midnight" in color_theme or "cyber" in color_theme or vid in ("network_topology_graph", "flow_arc_map")
    bg_color = "#0b0f19" if is_dark else "#f8fafc"

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{vid} Preview</title>
  <style>
    * {{ box-sizing: border-box; }}
    html, body {{
      margin: 0;
      padding: 12px;
      width: 1280px;
      height: {height}px;
      overflow: hidden;
      background-color: {bg_color};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }}
    #viz-root {{
      width: 100%;
      height: 100%;
      position: relative;
    }}
  </style>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js"></script>
</head>
<body>
  <div id="viz-root"></div>
  <script>
    var registeredVis = null;
    window.looker = {{
      plugins: {{
        visualizations: {{
          add: function(vis) {{
            registeredVis = vis;
          }}
        }}
      }}
    }};
  </script>
  <script>
{js_code}
  </script>
  <script>
    window.addEventListener('DOMContentLoaded', function() {{
      if (!registeredVis) {{
        console.error('No custom viz registered!');
        return;
      }}
      registeredVis.clearErrors = function() {{}};
      registeredVis.addError = function(e) {{ console.error('Vis Error:', e); }};

      var container = document.getElementById('viz-root');
      var config = {json.dumps(vis_config)};
      var data = {json.dumps(data)};
      var queryResp = {json.dumps(query_response)};

      try {{
        registeredVis.create(container, config);
        registeredVis.updateAsync(data, container, config, queryResp, {{}}, function() {{}});
      }} catch (err) {{
        console.error('Create/update error:', err);
      }}

      setTimeout(function() {{
        var flag = document.createElement('div');
        flag.id = 'viz-rendered';
        document.body.appendChild(flag);
        console.log('Rendering stabilized.');
      }}, {delay_ms});
    }});
  </script>
</body>
</html>
"""

    temp_html = f"/tmp/render_{vid}.html"
    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html_content)

    out_png = os.path.join(BASE_DIR, "visualizations", vid, "screenshot.png")
    cmd_shot = f'{GBROWSER_BIN} screenshot file://{temp_html} {out_png} --width 1280 --height {height} --wait-for "#viz-rendered"'
    print(f"  -> Capturing screenshot (1280x{height}, wait {delay_ms}ms)...")
    shot_res = subprocess.run(cmd_shot, shell=True, capture_output=True, text=True)

    if shot_res.returncode == 0 and os.path.exists(out_png) and os.path.getsize(out_png) > 1000:
        size_kb = os.path.getsize(out_png) / 1024
        print(f"  ✓ Successfully captured: {out_png} ({size_kb:.1f} KB)")
        # Copy to central assets directory
        asset_copy = os.path.join(ASSETS_DIR, f"{vid}.png")
        shutil.copyfile(out_png, asset_copy)
        results.append((vid, title, out_png, size_kb))
    else:
        print(f"  ❌ Screenshot capture failed! returncode={shot_res.returncode}")
        print(f"     stderr: {shot_res.stderr[:200]}")

print("\n" + "="*60)
print(f"Summary: Successfully generated {len(results)} of {len(catalog)} screenshots:")
for vid, title, path, size in results:
    print(f" - {vid}: {size:.1f} KB ({path})")
print("="*60)
