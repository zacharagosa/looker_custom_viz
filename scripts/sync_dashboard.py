#!/usr/bin/env python3
"""
Synchronize custom visualizations across TWO Looker Showcase Dashboards:
  - Vol. 1: Core BI, Geospatial & Executive Grids (ID: 164 / Slug: 7CQgKOwKT6t6wJrPuaypnh)
  - Vol. 2: Industry Verticals, Telemetry & Advanced Data Apps (ID: 179 / Slug: xFkJtj1jOEegmMpgWoxune)

Organizes visualizations by Category tabs, with up to 5 visualizations per tab.
Includes a cross-navigation banner at the top of each dashboard to jump between Vol. 1 and Vol. 2,
and a descriptive HTML banner card above every interactive visualization tile.
"""

import os
import sys
import json
import yaml
import urllib.request
import subprocess

DASHBOARD_VOL1_ID = "164"  # Slug: 7CQgKOwKT6t6wJrPuaypnh
DASHBOARD_VOL2_ID = "179"  # Slug: xFkJtj1jOEegmMpgWoxune
LOOKER_HOST = "3417a175-fe20-4370-974f-2f2b535340ab.looker.app"
MAX_TABS = 6
MAX_VIZ_PER_TAB = 5

# Vol. 1: Core BI, Geospatial & Executive Grids
VOL1_TABS = [
    "🎯 Performance & Variance",
    "🏆 Leaderboards & Grids",
    "🌊 Flow, Networks & Hierarchy",
    "🗺️ Geospatial Intelligence",
    "📅 Time Series & Schedules"
]

# Vol. 2: Industry Verticals, Telemetry & Advanced Data Apps
VOL2_TABS = [
    "🎮 Gaming & Telemetry",
    "🎬 Media, Broadcast & Ad-Ops",
    "📡 Telecom, Cloud & SecOps",
    "🔬 Statistical, ML & Forecasting",
    "🛍️ Retail, Supply Chain & FinOps"
]

# Explicit assignment of vertical / specialized visualization IDs to Vol. 2 tabs
VOL2_VIZ_MAP = {
    "retention_cohort_decay": "🎮 Gaming & Telemetry",
    "telemetry_conversion_funnel": "🎮 Gaming & Telemetry",
    "level_progression_balance_curve": "🎮 Gaming & Telemetry",
    "matchmaking_mmr_distribution": "🎮 Gaming & Telemetry",
    "game_economy_faucet_sink": "🎮 Gaming & Telemetry",
    "broadcast_daypart_grid": "🎬 Media, Broadcast & Ad-Ops",
    "ad_reach_frequency_curve": "🎬 Media, Broadcast & Ad-Ops",
    "network_topology_graph": "📡 Telecom, Cloud & SecOps",
    "mitre_attack_matrix": "📡 Telecom, Cloud & SecOps",
    "violin_distribution_plot": "🔬 Statistical, ML & Forecasting",
    "forecast_confidence_cone": "🔬 Statistical, ML & Forecasting",
    "roc_curve_evaluator": "🔬 Statistical, ML & Forecasting",
    "pareto_cumulative_analyzer": "🛍️ Retail, Supply Chain & FinOps",
    "bilateral_chord_diagram": "🛍️ Retail, Supply Chain & FinOps"
}

CATEGORY_TAB_MAP = {
    # Vol. 1 Categories
    "Performance & Variance": ("vol1", "🎯 Performance & Variance"),
    "KPI & Performance": ("vol1", "🎯 Performance & Variance"),
    "KPI & Progress": ("vol1", "🎯 Performance & Variance"),
    "Comparison & Variance": ("vol1", "🎯 Performance & Variance"),

    "Leaderboards & Grids": ("vol1", "🏆 Leaderboards & Grids"),
    "Rank & Volatility": ("vol1", "🏆 Leaderboards & Grids"),
    "Advanced Tables & Grids": ("vol1", "🏆 Leaderboards & Grids"),
    "Tables & Grids": ("vol1", "🏆 Leaderboards & Grids"),
    "Tables": ("vol1", "🏆 Leaderboards & Grids"),

    "Flow, Networks & Hierarchy": ("vol1", "🌊 Flow, Networks & Hierarchy"),
    "Flow & Hierarchy": ("vol1", "🌊 Flow, Networks & Hierarchy"),

    "Geospatial Intelligence": ("vol1", "🗺️ Geospatial Intelligence"),
    "Geospatial & Maps": ("vol1", "🗺️ Geospatial Intelligence"),
    "Maps": ("vol1", "🗺️ Geospatial Intelligence"),

    "Time Series & Schedules": ("vol1", "📅 Time Series & Schedules"),
    "Time Series & Activity": ("vol1", "📅 Time Series & Schedules"),

    # Vol. 2 Categories
    "Telemetry & Cohort Decay": ("vol2", "🎮 Gaming & Telemetry"),
    "Gaming & Telemetry": ("vol2", "🎮 Gaming & Telemetry"),
    "Gaming": ("vol2", "🎮 Gaming & Telemetry"),

    "Media & Entertainment": ("vol2", "🎬 Media, Broadcast & Ad-Ops"),
    "Media, Broadcast & Ad-Ops": ("vol2", "🎬 Media, Broadcast & Ad-Ops"),
    "Media": ("vol2", "🎬 Media, Broadcast & Ad-Ops"),

    "Telco & Networks": ("vol2", "📡 Telecom, Cloud & SecOps"),
    "Telecom & Network Infrastructure": ("vol2", "📡 Telecom, Cloud & SecOps"),
    "Telecom, Cloud & SecOps": ("vol2", "📡 Telecom, Cloud & SecOps"),
    "Telco": ("vol2", "📡 Telecom, Cloud & SecOps"),

    "Statistical, ML & Forecasting": ("vol2", "🔬 Statistical, ML & Forecasting"),
    "Data Science & ML": ("vol2", "🔬 Statistical, ML & Forecasting"),

    "Retail, Supply Chain & FinOps": ("vol2", "🛍️ Retail, Supply Chain & FinOps"),
    "Financial & Pricing": ("vol2", "🛍️ Retail, Supply Chain & FinOps"),
}

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
    "radar_polar_chart": "🕸️",
    "interactive_drilldown_treemap": "🗂️",
    "violin_distribution_plot": "🎻",
    "dynamic_pivot_matrix": "🔢",
    "streamgraph_themeriver": "〰️",
    "bilateral_chord_diagram": "🔄",
    "level_progression_balance_curve": "🕹️",
    "hexbin_density_map": "⬢",
    "gantt_milestones_timeline": "🗓️",
    "pareto_cumulative_analyzer": "📉",
    "matchmaking_mmr_distribution": "⚔️",
    "sunburst_partition_wheel": "☀️",
    "ad_reach_frequency_curve": "🎯",
    "world_choropleth_map": "🌍",
    "game_economy_faucet_sink": "🪙",
    "mitre_attack_matrix": "🛡️",
    "forecast_confidence_cone": "🔮",
    "marimekko_market_matrix": "🧱",
    "roc_curve_evaluator": "📈"
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
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
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


def build_volume_Switch_banner(vol_num, host):
    vol1_url = f"https://{host}/dashboards/7CQgKOwKT6t6wJrPuaypnh"
    vol2_url = f"https://{host}/dashboards/xFkJtj1jOEegmMpgWoxune"
    if vol_num == 1:
        title = "🎨 Looker Custom Visualizations Showcase — Vol. 1: Core BI, Geospatial & Executive Grids"
        sub = "Explore executive KPI gauges, bullet graphs, sparkline matrices, hierarchical drilldown trees, and TopoJSON choropleth/hexbin maps."
        btn_url = vol2_url
        btn_label = "Switch to Showcase Vol. 2 (Industry Verticals, Gaming, Media, Telco & ML) &rarr;"
    else:
        title = "🚀 Looker Custom Visualizations Showcase — Vol. 2: Industry Verticals, Telemetry & Statistical ML"
        sub = "Explore specialized domain visualizations for Gaming LiveOps, Broadcast & Media Ad-Ops, Telecom Networks, Statistical KDE/Violin, and Supply Chain."
        btn_url = vol1_url
        btn_label = "&larr; Switch to Showcase Vol. 1 (Core BI, Geospatial & Executive Grids)"

    return (
        f'<div style="padding: 10px 18px; background: linear-gradient(90deg, #eff6ff 0%, #f8fafc 100%); '
        f'border-radius: 8px; border: 1px solid #bfdbfe; display: flex; align-items: center; justify-content: space-between; '
        f'font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;">'
        f'  <div>'
        f'    <div style="font-size: 14px; font-weight: 700; color: #1e3a8a;">{title}</div>'
        f'    <div style="font-size: 11.5px; color: #475569; margin-top: 2px;">{sub}</div>'
        f'  </div>'
        f'  <a href="{btn_url}" target="_blank" style="font-size: 12px; font-weight: 700; color: #ffffff; '
        f'text-decoration: none; padding: 6px 14px; background: #2563eb; border-radius: 6px; white-space: nowrap;">'
        f'    {btn_label}'
        f'  </a>'
        f'</div>'
    )


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


def sync_single_dashboard(dashboard_id, tabs_dict, vol_num, host, headers, base_dir, profile="default"):
    dash = api_call(host, headers, f"/api/4.0/dashboards/{dashboard_id}")
    slug = dash.get("slug", dashboard_id)
    print(f"\n[*] Syncing Volume {vol_num}: '{dash.get('title')}' (ID: {dashboard_id}, Slug: {slug})")

    # Clean up old elements
    for elem in dash.get("dashboard_elements", []):
        elem_id = elem["id"]
        try:
            api_call(host, headers, f"/api/4.0/dashboard_elements/{elem_id}", method="DELETE")
        except Exception:
            pass

    dash = api_call(host, headers, f"/api/4.0/dashboards/{dashboard_id}")
    existing_layouts = dash.get("dashboard_layouts", [])
    primary_layout_id = str(existing_layouts[0]["id"]) if existing_layouts else None
    for l in existing_layouts[1:]:
        lid = str(l["id"])
        try:
            api_call(host, headers, f"/api/4.0/dashboard_layouts/{lid}", method="DELETE")
        except Exception:
            pass

    tab_list = [(k, v[:MAX_VIZ_PER_TAB]) for k, v in tabs_dict.items() if len(v) > 0]
    for tab_idx, (tab_label, viz_items) in enumerate(tab_list):
        print(f"  [{tab_idx+1}/{len(tab_list)}] Tab '{tab_label}' ({len(viz_items)} viz)...")
        if tab_idx == 0 and primary_layout_id:
            layout_id = primary_layout_id
            api_call(host, headers, f"/api/4.0/dashboard_layouts/{layout_id}", method="PATCH", body={
                "dashboard_id": str(dashboard_id),
                "label": tab_label,
                "order": 0,
                "type": "newspaper",
                "active": True
            })
        else:
            l_obj = api_call(host, headers, "/api/4.0/dashboard_layouts", method="POST", body={
                "dashboard_id": str(dashboard_id),
                "label": tab_label,
                "order": tab_idx,
                "type": "newspaper",
                "active": False
            })
            layout_id = str(l_obj["id"])

        # Add top volume switcher banner on row 0
        nav_elem = api_call(host, headers, "/api/4.0/dashboard_elements", method="POST", body={
            "dashboard_id": str(dashboard_id),
            "dashboard_layout_id": layout_id,
            "title": "Volume Navigation",
            "title_hidden": True,
            "type": "text",
            "body_text": build_volume_Switch_banner(vol_num, host)
        })
        nav_id = str(nav_elem["id"])

        elem_positions = [(nav_id, 0, 2)]

        for v_idx, item in enumerate(viz_items):
            viz_id = item["id"]
            viz_name = item["name"]
            emoji = VIZ_EMOJI_MAP.get(viz_id, "✨")
            row_offset = 2 + v_idx * 15

            print(f"     -> [{v_idx+1}/{len(viz_items)}] '{viz_name}' ({viz_id}) at row {row_offset}")
            query_id = ensure_query_for_viz(viz_id, base_dir, profile=profile)

            banner_elem = api_call(host, headers, "/api/4.0/dashboard_elements", method="POST", body={
                "dashboard_id": str(dashboard_id),
                "dashboard_layout_id": layout_id,
                "title": f"About {viz_name}",
                "title_hidden": True,
                "type": "text",
                "body_text": build_banner_html(item, emoji)
            })
            banner_id = str(banner_elem["id"])

            vis_elem = api_call(host, headers, "/api/4.0/dashboard_elements", method="POST", body={
                "dashboard_id": str(dashboard_id),
                "dashboard_layout_id": layout_id,
                "title": viz_name,
                "title_hidden": False,
                "type": "vis",
                "query_id": query_id
            })
            vis_id_elem = str(vis_elem["id"])

            elem_positions.append((banner_id, row_offset, 3))
            elem_positions.append((vis_id_elem, row_offset + 3, 12))

        layout_comps = api_call(host, headers, f"/api/4.0/dashboard_layouts/{layout_id}/dashboard_layout_components")
        pos_map = {eid: (r, h) for (eid, r, h) in elem_positions}
        for comp in layout_comps:
            cid = str(comp["id"])
            eid = str(comp.get("dashboard_element_id"))
            if eid in pos_map:
                r, h = pos_map[eid]
                api_call(host, headers, f"/api/4.0/dashboard_layout_components/{cid}", method="PATCH", body={
                    "column": 0,
                    "row": r,
                    "width": 24,
                    "height": h
                })

    return f"https://{host}/dashboards/{slug}"


def sync_dashboard(dashboard_id=DASHBOARD_VOL1_ID, profile="default"):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    host, headers = get_headers(profile)

    catalog_path = os.path.join(base_dir, "catalog.json")
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    vol1_dict = {t: [] for t in VOL1_TABS}
    vol2_dict = {t: [] for t in VOL2_TABS}

    for item in catalog:
        viz_id = item.get("id")
        q_file = os.path.join(base_dir, "visualizations", viz_id, "demo_query.json")
        if not os.path.exists(q_file):
            print(f"  -> Skipping '{viz_id}' from showcase dashboard sync (no demo_query.json)")
            continue

        # Check explicit Vol. 2 override first
        if viz_id in VOL2_VIZ_MAP:
            t_label = VOL2_VIZ_MAP[viz_id]
            vol2_dict.setdefault(t_label, []).append(item)
            continue

        cat = item.get("category", "Performance & Variance")
        vol_target, t_label = CATEGORY_TAB_MAP.get(cat, ("vol1", "🎯 Performance & Variance"))

        if vol_target == "vol1":
            # If Vol. 1 tab is already at 5 items, overflow gracefully to Vol. 2
            if len(vol1_dict.get(t_label, [])) < MAX_VIZ_PER_TAB:
                vol1_dict.setdefault(t_label, []).append(item)
            else:
                vol2_dict.setdefault("🔬 Statistical, ML & Forecasting", []).append(item)
        else:
            vol2_dict.setdefault(t_label, []).append(item)

    url1 = sync_single_dashboard(DASHBOARD_VOL1_ID, vol1_dict, 1, host, headers, base_dir, profile=profile)
    url2 = sync_single_dashboard(DASHBOARD_VOL2_ID, vol2_dict, 2, host, headers, base_dir, profile=profile)

    print("\n" + "="*75)
    print("DUAL SHOWCASE DASHBOARD SYNC COMPLETE!")
    print(f"  - Showcase Vol. 1 (Core BI & Geospatial):      {url1}")
    print(f"  - Showcase Vol. 2 (Industry & Advanced Apps):  {url2}")
    print("="*75 + "\n")
    return url1


if __name__ == "__main__":
    sync_dashboard()
