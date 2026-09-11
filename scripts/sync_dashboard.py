#!/usr/bin/env python3
"""
Synchronize custom visualizations into the Looker Showcase Dashboard (ID: 164 / Slug: 7CQgKOwKT6t6wJrPuaypnh).
Organizes visualizations by Category tabs, with up to 5 visualizations per tab.
Each visualization features a descriptive markdown banner card above its interactive chart tile.
"""

import os
import sys
import json
import yaml
import urllib.request
import subprocess

DASHBOARD_ID = "164"  # Slug: 7CQgKOwKT6t6wJrPuaypnh
LOOKER_HOST = "3417a175-fe20-4370-974f-2f2b535340ab.looker.app"
# Limit dashboard to exactly 6 consolidated executive tabs (max 5 visualizations per tab)
MAX_TABS = 6
MAX_VIZ_PER_TAB = 5

CATEGORY_TAB_MAP = {
    # 1. Performance & Variance (KPI progress, targets, and divergence)
    "Performance & Variance": "🎯 Performance & Variance",
    "KPI & Performance": "🎯 Performance & Variance",
    "KPI & Progress": "🎯 Performance & Variance",
    "Comparison & Variance": "🎯 Performance & Variance",

    # 2. Leaderboards & Grids (rankings, bump charts, and matrix tables)
    "Leaderboards & Grids": "🏆 Leaderboards & Grids",
    "Rank & Volatility": "🏆 Leaderboards & Grids",
    "Advanced Tables & Grids": "🏆 Leaderboards & Grids",
    "Tables & Grids": "🏆 Leaderboards & Grids",
    "Tables": "🏆 Leaderboards & Grids",

    # 3. Time Series & Schedules (daily activity, broadcast dayparts, calendars)
    "Time Series & Schedules": "📅 Time Series & Schedules",
    "Time Series & Activity": "📅 Time Series & Schedules",
    "Media & Entertainment": "📅 Time Series & Schedules",
    "Media": "📅 Time Series & Schedules",

    # 4. Flow, Networks & Hierarchy (sankey flows, topology graphs, allocations)
    "Flow, Networks & Hierarchy": "🌊 Flow, Networks & Hierarchy",
    "Flow & Hierarchy": "🌊 Flow, Networks & Hierarchy",
    "Telco & Networks": "🌊 Flow, Networks & Hierarchy",
    "Telco": "🌊 Flow, Networks & Hierarchy",

    # 5. Geospatial Intelligence (choropleths, regional maps, density)
    "Geospatial Intelligence": "🗺️ Geospatial Intelligence",
    "Geospatial & Maps": "🗺️ Geospatial Intelligence",
    "Maps": "🗺️ Geospatial Intelligence",

    # 6. Telemetry & Cohort Decay (retention decay, game balance, user curves)
    "Telemetry & Cohort Decay": "🎮 Telemetry & Cohort Decay",
    "Gaming & Telemetry": "🎮 Telemetry & Cohort Decay",
    "Gaming": "🎮 Telemetry & Cohort Decay",
}

TAB_ORDER = [
    "🎯 Performance & Variance",
    "🏆 Leaderboards & Grids",
    "📅 Time Series & Schedules",
    "🌊 Flow, Networks & Hierarchy",
    "🗺️ Geospatial Intelligence",
    "🎮 Telemetry & Cohort Decay"
]

VIZ_EMOJI_MAP = {
    "dumbbell_plot": "📊",
    "bullet_graph": "🎯",
    "calendar_activity_heatmap": "📅",
    "radial_progress_gauge": "⭕",
    "choropleth_map": "🗺️",
    "sparkline_matrix_table": "📋",
    "retention_cohort_decay": "🎮",
    "broadcast_daypart_grid": "🎬",
    "network_topology_graph": "📡",
    "sankey_flow_diagram": "🌊",
    "rank_bump_chart": "🏆",
    "flow_arc_map": "🌐",
    "telemetry_conversion_funnel": "⚡",
    "hierarchical_tree_table": "🌲",
    "multi_layer_geo_map": "📍",
    "radar_polar_chart": "🕸️"
}

def get_headers(profile="default"):
    config_path = os.path.expanduser("~/.config/looker-cli/config.yaml")
    with open(config_path, "r", encoding="utf-8") as f:
        conf = yaml.safe_load(f)
    prof_conf = conf["profiles"].get(profile, {})
    host = prof_conf.get("host", LOOKER_HOST)
    token = prof_conf.get("access_token")
    client_id = prof_conf.get("client_id")
    client_secret = prof_conf.get("client_secret")

    # Refresh token if needed
    if client_id and client_secret:
        try:
            req = urllib.request.Request(f"https://{host}/api/4.0/user", headers={"Authorization": f"Bearer {token}"})
            with urllib.request.urlopen(req) as resp:
                pass
        except Exception:
            login_url = f"https://{host}/api/4.0/login?client_id={client_id}&client_secret={client_secret}"
            req = urllib.request.Request(login_url, method="POST")
            with urllib.request.urlopen(req) as resp:
                data = json.load(resp)
                token = data["access_token"]
            # Save back to config
            for p in conf.get("profiles", {}).values():
                p["access_token"] = token
            with open(config_path, "w", encoding="utf-8") as f:
                yaml.dump(conf, f)

    return host, {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def api_call(host, headers, path, method="GET", body=None):
    url = f"https://{host}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"API Error {e.code} on {method} {path}: {err_body}", file=sys.stderr)
        raise

def ensure_query_for_viz(viz_id, base_dir, profile="default"):
    q_file = os.path.join(base_dir, "visualizations", viz_id, "demo_query.json")
    if not os.path.exists(q_file):
        raise FileNotFoundError(f"Missing demo_query.json for {viz_id}")
    cmd = f"looker-cli api query create_query {q_file} --profile {profile}"
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=True)
    q_data = json.loads(res.stdout)
    return str(q_data.get("id"))

def build_banner_html(item, emoji):
    name = item.get("name", item.get("id"))
    category = item.get("category", "Custom Viz")
    library = item.get("library", "D3.js v7")
    description = item.get("description", "")
    demo_url = item.get("looker_demo_url", "#")
    fields = item.get("fields_required", {})
    dims = fields.get("dimensions", "N/A")
    meas = fields.get("measures", "N/A")

    return (
        f'<div style="padding: 12px 18px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; '
        f'box-shadow: 0 1px 3px rgba(0,0,0,0.04); font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;">'
        f'  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">'
        f'    <div style="display: flex; align-items: center; gap: 8px;">'
        f'      <span style="font-size: 16px; font-weight: 700; color: #0f172a;">{emoji} {name}</span>'
        f'      <span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; background: #e0f2fe; color: #0369a1;">{category}</span>'
        f'      <span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; background: #f1f5f9; color: #475569;">{library}</span>'
        f'    </div>'
        f'    <a href="{demo_url}" target="_blank" style="font-size: 12px; font-weight: 600; color: #2563eb; text-decoration: none; padding: 3px 8px; background: #eff6ff; border-radius: 6px; border: 1px solid #bfdbfe;">'
        f'      Open Standalone Explore &rarr;'
        f'    </a>'
        f'  </div>'
        f'  <p style="margin: 0 0 5px 0; font-size: 12.5px; line-height: 1.45; color: #334155;">{description}</p>'
        f'  <div style="font-size: 11.5px; color: #64748b;">'
        f'    <strong>Required Fields:</strong> Dimensions: <em>{dims}</em> &bull; Measures: <em>{meas}</em>'
        f'  </div>'
        f'</div>'
    )

def sync_dashboard(dashboard_id=DASHBOARD_ID, profile="default"):
    print(f"[*] Starting category-based sync on dashboard '{dashboard_id}' (max {MAX_VIZ_PER_TAB} viz/tab)...")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    host, headers = get_headers(profile)

    # 1. Load catalog
    catalog_path = os.path.join(base_dir, "catalog.json")
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    # Group visualizations by Category Tab according to predefined TAB_ORDER
    tabs_dict = {tab: [] for tab in TAB_ORDER}
    for item in catalog:
        cat = item.get("category", "Other")
        tab_name = CATEGORY_TAB_MAP.get(cat, "🎯 Performance & Variance")
        if tab_name not in tabs_dict:
            tabs_dict[tab_name] = []
        tabs_dict[tab_name].append(item)

    # Filter out empty tabs while strictly preserving TAB_ORDER
    tabs_dict = {k: v for k, v in tabs_dict.items() if len(v) > 0}

    print(f"[*] Identified {len(tabs_dict)} consolidated category tabs (Limit <= {MAX_TABS} tabs):")
    for t_name, items in tabs_dict.items():
        v_ids = [it["id"] for it in items]
        print(f"    - '{t_name}': {len(items)} viz ({', '.join(v_ids)})")

    # 2. Fetch current dashboard state
    dash = api_call(host, headers, f"/api/4.0/dashboards/{dashboard_id}")
    slug = dash.get("slug", dashboard_id)
    print(f"[*] Target Dashboard: '{dash.get('title')}' (Slug: {slug})")

    # Clean up all old dashboard elements
    print("[*] Cleaning up old dashboard elements...")
    for elem in dash.get("dashboard_elements", []):
        elem_id = elem["id"]
        try:
            api_call(host, headers, f"/api/4.0/dashboard_elements/{elem_id}", method="DELETE")
        except Exception as e:
            print(f"  -> Notice deleting element {elem_id}: {e}")

    # Clean up surplus layouts beyond primary
    dash = api_call(host, headers, f"/api/4.0/dashboards/{dashboard_id}")
    existing_layouts = dash.get("dashboard_layouts", [])
    primary_layout_id = str(existing_layouts[0]["id"]) if existing_layouts else None
    for l in existing_layouts[1:]:
        lid = str(l["id"])
        try:
            api_call(host, headers, f"/api/4.0/dashboard_layouts/{lid}", method="DELETE")
        except Exception as e:
            print(f"  -> Notice deleting layout {lid}: {e}")

    # 3. Create tabs and layout components
    tab_list = list(tabs_dict.items())
    for tab_idx, (tab_label, viz_items) in enumerate(tab_list):
        print(f"\n[{tab_idx+1}/{len(tab_list)}] Setting up tab: '{tab_label}' ({len(viz_items)} viz)...")

        if tab_idx == 0 and primary_layout_id:
            layout_id = primary_layout_id
            api_call(host, headers, f"/api/4.0/dashboard_layouts/{layout_id}", method="PATCH", body={
                "dashboard_id": str(dashboard_id),
                "label": tab_label,
                "order": 0,
                "type": "newspaper",
                "active": True
            })
            print(f"  -> Configured primary tab layout (ID: {layout_id})")
        else:
            l_obj = api_call(host, headers, "/api/4.0/dashboard_layouts", method="POST", body={
                "dashboard_id": str(dashboard_id),
                "label": tab_label,
                "order": tab_idx,
                "type": "newspaper",
                "active": False
            })
            layout_id = str(l_obj["id"])
            print(f"  -> Created tab layout (ID: {layout_id})")

        # Now place up to 5 visualizations on this tab
        for v_idx, item in enumerate(viz_items):
            viz_id = item["id"]
            viz_name = item["name"]
            emoji = VIZ_EMOJI_MAP.get(viz_id, "✨")
            row_offset = v_idx * 15  # Banner at row, Vis at row + 3, next viz at row + 15

            print(f"   [{v_idx+1}/{len(viz_items)}] Adding '{viz_name}' ({viz_id}) to tab '{tab_label}' at row {row_offset}...")

            query_id = ensure_query_for_viz(viz_id, base_dir, profile=profile)

            # Create banner text element
            banner_elem = api_call(host, headers, "/api/4.0/dashboard_elements", method="POST", body={
                "dashboard_id": str(dashboard_id),
                "dashboard_layout_id": layout_id,
                "title": f"About {viz_name}",
                "title_hidden": True,
                "type": "text",
                "body_text": build_banner_html(item, emoji)
            })
            banner_id = str(banner_elem["id"])

            # Create visual element
            vis_elem = api_call(host, headers, "/api/4.0/dashboard_elements", method="POST", body={
                "dashboard_id": str(dashboard_id),
                "dashboard_layout_id": layout_id,
                "title": viz_name,
                "title_hidden": False,
                "type": "vis",
                "query_id": query_id
            })
            vis_id_elem = str(vis_elem["id"])

            # Position components in this layout
            layout_comps = api_call(host, headers, f"/api/4.0/dashboard_layouts/{layout_id}/dashboard_layout_components")
            for comp in layout_comps:
                cid = str(comp["id"])
                eid = str(comp.get("dashboard_element_id"))
                if eid == banner_id:
                    api_call(host, headers, f"/api/4.0/dashboard_layout_components/{cid}", method="PATCH", body={
                        "column": 0,
                        "row": row_offset,
                        "width": 24,
                        "height": 3
                    })
                elif eid == vis_id_elem:
                    api_call(host, headers, f"/api/4.0/dashboard_layout_components/{cid}", method="PATCH", body={
                        "column": 0,
                        "row": row_offset + 3,
                        "width": 24,
                        "height": 12
                    })

    dash_url = f"https://{host}/dashboards/{slug}"
    print("\n" + "="*70)
    print("CATEGORY DASHBOARD SYNC COMPLETE (UP TO 5 VIZ PER TAB)!")
    print(f"Dashboard URL: {dash_url}")
    print("="*70 + "\n")
    return dash_url

if __name__ == "__main__":
    sync_dashboard()
