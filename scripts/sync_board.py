#!/usr/bin/env python3
"""
Synchronize the Looker Custom Visualizations Library onto a dedicated Looker Board
backed by 10 focused, fast-loading dashboards (5-9 visualizations each, max 2 tabs).

Usage:
  python3 scripts/sync_board.py --sync-all --profile default
  python3 scripts/sync_board.py --viz multi_armed_bandit_allocation --profile default
  python3 scripts/sync_board.py --dashboard experimentation --profile default
"""

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import yaml

BOARD_TITLE = "🎨 Custom Visualizations Library"
BOARD_DESCRIPTION = (
    "Curated, de-duplicated library of production Looker custom visualizations organized "
    "into focused single-topic dashboards by visual paradigm and industry vertical."
)
FOLDER_NAME = "Custom Visualizations Library"
CATALOG_PUBLIC_URL = "https://storage.googleapis.com/looker-custom-viz-public-assets/catalog/index.html"

BOARD_SECTIONS = [
    {
        "key": "catalog",
        "title": "🔍 1. Start Here — Searchable Visual Catalog",
        "description": "Search and filter every active custom visualization by visual geometry, industry, library, or required data shape, then launch straight into Looker Explore.",
        "dashboards": [],
    },
    {
        "key": "core_bi",
        "title": "📊 2. Core BI, KPIs & Tables",
        "description": "Executive scorecards, bullet & dumbbell variance plots, interactive tree grids, sparkline matrices, and ranking trajectories.",
        "dashboards": ["kpis_variance", "tables_rankings"],
    },
    {
        "key": "geo_flows",
        "title": "🗺️ 3. Geospatial, Flows & Hierarchies",
        "description": "US & world choropleths, dual-layer geo maps, hexbin density, Sankey & chord flows, force networks, treemaps, sunbursts, and Voronoï partitions.",
        "dashboards": ["geospatial", "flows_hierarchies"],
    },
    {
        "key": "stats_ml",
        "title": "📈 4. Time Series, Statistical ML & Experimentation",
        "description": "Calendars, streamgraphs, Gantt schedules, KDE violins & rainclouds, ARIMA cones, ROC/survival curves, causal impact, sequential A/B, uplift, and bandits.",
        "dashboards": ["time_series", "statistical_ml", "experimentation"],
    },
    {
        "key": "verticals",
        "title": "🚀 5. Industry Vertical Solutions",
        "description": "Domain-authentic visualizations for Gaming LiveOps, Broadcast Media & Ad-Ops, Telecom Networks, Cloud SecOps, FinOps, Pricing, and Supply Chain.",
        "dashboards": ["gaming_media", "telco_secops", "retail_finops"],
    },
]

DASHBOARD_SPECS = {
    "kpis_variance": {
        "title": "KPIs, Variance & Benchmarks",
        "description": "Concentric KPI gauges, Stephen Few bullet graphs, dumbbell divergence, radar balance, tornado sensitivity, and Pareto 80/20 analyzers.",
        "tabs": None,
    },
    "tables_rankings": {
        "title": "Tables, Grids & Rankings",
        "description": "Sparkline scorecards, collapsible hierarchical tree grids, dynamic pivot heatmaps, rank bump charts, slopegraphs, and Marimekko matrices.",
        "tabs": None,
    },
    "geospatial": {
        "title": "Geospatial & Location Intelligence",
        "description": "Albers US & Natural Earth world choropleths, dual-layer choropleth+bubble maps, curved flow arcs, and hexbin density maps.",
        "tabs": None,
    },
    "flows_hierarchies": {
        "title": "Flows, Networks & Hierarchies",
        "description": "Multi-stage Sankeys, bilateral chords, force-directed networks, zoomable treemaps, sunburst wheels, Voronoï tessellations, and parallel coordinates.",
        "tabs": ["Flows & Networks", "Hierarchies & Multivariate"],
    },
    "time_series": {
        "title": "Time Series, Schedules & Horizons",
        "description": "53-week activity calendars, ThemeRiver streamgraphs, Gantt milestone schedules, OHLC Bollinger candlesticks, horizon bands, and 24x7 broadcast grids.",
        "tabs": None,
    },
    "statistical_ml": {
        "title": "Statistical, ML & Multivariate",
        "description": "KDE violin & raincloud distributions, ARIMA confidence cones, ROC/PR evaluators, Kaplan-Meier survival curves, SPLOMs, PCA biplots, and dendrograms.",
        "tabs": ["Distributions & ML Models", "Multivariate & Clustering"],
    },
    "experimentation": {
        "title": "Experimentation, Causal Lift & SPC",
        "description": "Synthetic control causal impact, sequential A/B peeking monitors, CATE/Qini uplift curves, Thompson Sampling bandits, Shewhart SPC charts, and SLA ridgelines.",
        "tabs": None,
    },
    "gaming_media": {
        "title": "Gaming & Media Analytics",
        "description": "Player cohort decay, onboarding funnels, level choke curves, MMR distributions, virtual economy flows, ad reach/frequency, attribution, Euler overlaps, and binge drop-off.",
        "tabs": ["Gaming & LiveOps", "Media, Broadcast & Ad-Ops"],
    },
    "telco_secops": {
        "title": "Telecom, Cloud SecOps & FinOps",
        "description": "MITRE ATT&CK kill-chains, distributed trace flamegraphs, Zero-Trust blast radius, governance posture packs, 5G polar RF maps, BGP flaps, OTDR fiber traces, and CUD horizons.",
        "tabs": ["Cloud SecOps & Governance", "Telecom & Cloud FinOps"],
    },
    "retail_finops": {
        "title": "Retail, Pricing & Supply Chain",
        "description": "Inventory stockout sawtooths, Price-Volume-Mix revenue bridges, UpSet market-basket grids, LTV:CAC payback curves, and price elasticity optimizers.",
        "tabs": None,
    },
}


def get_headers(profile="default"):
    config_path = os.path.expanduser("~/.config/looker-cli/config.yaml")
    with open(config_path, "r", encoding="utf-8") as f:
        conf = yaml.safe_load(f)
    prof_conf = conf["profiles"].get(profile, {})
    host = prof_conf["host"]
    client_id = prof_conf.get("client_id")
    client_secret = prof_conf.get("client_secret")
    token = prof_conf.get("access_token")

    if client_id and client_secret:
        try:
            req = urllib.request.Request(
                f"https://{host}/api/4.0/user",
                headers={"Authorization": f"Bearer {token}"},
            )
            with urllib.request.urlopen(req):
                pass
        except Exception:
            body = urllib.parse.urlencode(
                {"client_id": client_id, "client_secret": client_secret}
            ).encode("utf-8")
            req = urllib.request.Request(
                f"https://{host}/api/4.0/login", data=body, method="POST"
            )
            with urllib.request.urlopen(req) as resp:
                token = json.load(resp)["access_token"]
            prof_conf["access_token"] = token
            with open(config_path, "w", encoding="utf-8") as f:
                yaml.dump(conf, f)

    return host, {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
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


def ensure_query_for_viz(viz_id, base_dir, host, headers):
    q_file = os.path.join(base_dir, "visualizations", viz_id, "demo_query.json")
    if not os.path.exists(q_file):
        raise FileNotFoundError(f"Missing demo_query.json for {viz_id}")
    with open(q_file, "r", encoding="utf-8") as f:
        q_def = json.load(f)
    res = api_call(host, headers, "/api/4.0/queries", method="POST", body=q_def)
    return str(res["id"])


def ensure_folder(host, headers, parent_id="5"):
    folders = api_call(host, headers, f"/api/4.0/folders/{parent_id}/children")
    for fl in folders:
        if fl.get("name") == FOLDER_NAME:
            return str(fl["id"])
    created = api_call(
        host,
        headers,
        "/api/4.0/folders",
        method="POST",
        body={"name": FOLDER_NAME, "parent_id": str(parent_id)},
    )
    return str(created["id"])


def ensure_dashboard(host, headers, folder_id, title, description, existing_id=None):
    if existing_id:
        try:
            d = api_call(host, headers, f"/api/4.0/dashboards/{existing_id}")
            if d and d.get("id"):
                api_call(
                    host,
                    headers,
                    f"/api/4.0/dashboards/{existing_id}",
                    method="PATCH",
                    body={"title": title, "description": description, "folder_id": str(folder_id)},
                )
                return str(d["id"]), d.get("slug", str(d["id"]))
        except Exception:
            pass

    # Check if dashboard with same title already exists in folder
    folder_dashes = api_call(host, headers, f"/api/4.0/folders/{folder_id}/dashboards")
    for d in folder_dashes:
        if d.get("title") == title:
            return str(d["id"]), d.get("slug", str(d["id"]))

    created = api_call(
        host,
        headers,
        "/api/4.0/dashboards",
        method="POST",
        body={"title": title, "description": description, "folder_id": str(folder_id)},
    )
    return str(created["id"]), created.get("slug", str(created["id"]))


def build_top_nav_html(title, description, host, board_id):
    board_url = f"https://{host}/boards/{board_id}" if board_id else f"https://{host}/boards"
    catalog_url = f"{CATALOG_PUBLIC_URL}?host={urllib.parse.quote(host)}"
    return (
        f'<div style="padding: 10px 18px; background: linear-gradient(90deg, #f8fafc 0%, #eff6ff 100%); '
        f'border-radius: 8px; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: space-between; gap: 16px; '
        f'font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;">'
        f'  <div style="min-width: 0;">'
        f'    <div style="font-size: 14.5px; font-weight: 700; color: #0f172a;">{title}</div>'
        f'    <div style="font-size: 11.5px; color: #475569; margin-top: 2px;">{description}</div>'
        f'  </div>'
        f'  <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">'
        f'    <a href="{board_url}" target="_blank" style="font-size: 11.5px; font-weight: 600; color: #1e3a8a; '
        f'text-decoration: none; padding: 6px 12px; background: #ffffff; border: 1px solid #bfdbfe; border-radius: 6px; white-space: nowrap;">'
        f'      &larr; All Dashboards (Board)'
        f'    </a>'
        f'    <a href="{catalog_url}" target="_blank" style="font-size: 11.5px; font-weight: 700; color: #ffffff; '
        f'text-decoration: none; padding: 6px 12px; background: #2563eb; border-radius: 6px; white-space: nowrap;">'
        f'      🔍 Searchable Catalog &rarr;'
        f'    </a>'
        f'  </div>'
        f'</div>'
    )


def build_viz_card_html(item):
    name = item.get("name", item["id"])
    geom = item.get("geometry", item.get("category", "Custom Viz"))
    ind = item.get("industry", "Cross-Industry")
    lib = item.get("library", "D3.js v7")
    desc = item.get("description", "")
    demo_url = item.get("looker_demo_url", "#")
    fields = item.get("fields_required", {})
    dims = fields.get("dimensions", "N/A")
    meas = fields.get("measures", "N/A")
    return (
        f'<div style="padding: 11px 16px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; '
        f'font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;">'
        f'  <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 5px;">'
        f'    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 6px;">'
        f'      <span style="font-size: 15px; font-weight: 700; color: #0f172a;">{name}</span>'
        f'      <span style="font-size: 10.5px; font-weight: 600; padding: 2px 7px; border-radius: 5px; background: #e0f2fe; color: #0369a1;">{geom}</span>'
        f'      <span style="font-size: 10.5px; font-weight: 600; padding: 2px 7px; border-radius: 5px; background: #f0fdf4; color: #166534;">{ind}</span>'
        f'      <span style="font-size: 10.5px; font-weight: 600; padding: 2px 7px; border-radius: 5px; background: #f1f5f9; color: #475569;">{lib}</span>'
        f'    </div>'
        f'    <a href="{demo_url}" target="_blank" style="font-size: 11.5px; font-weight: 600; color: #2563eb; text-decoration: none; '
        f'padding: 3px 9px; background: #eff6ff; border-radius: 6px; border: 1px solid #bfdbfe; white-space: nowrap;">'
        f'      Open Explore &rarr;'
        f'    </a>'
        f'  </div>'
        f'  <p style="margin: 0 0 4px 0; font-size: 12px; line-height: 1.45; color: #334155;">{desc}</p>'
        f'  <div style="font-size: 11px; color: #64748b;"><strong>Data Shape:</strong> Dims: <em>{dims}</em> &bull; Measures: <em>{meas}</em></div>'
        f'</div>'
    )


def populate_dashboard(dash_id, spec, items, host, headers, base_dir, board_id):
    dash = api_call(host, headers, f"/api/4.0/dashboards/{dash_id}")
    print(f"  [*] Syncing dashboard '{spec['title']}' (ID: {dash_id}, {len(items)} vizzes)")

    # Clear existing elements
    for elem in dash.get("dashboard_elements", []):
        try:
            api_call(host, headers, f"/api/4.0/dashboard_elements/{elem['id']}", method="DELETE")
        except Exception:
            pass

    dash = api_call(host, headers, f"/api/4.0/dashboards/{dash_id}")
    layouts = dash.get("dashboard_layouts", [])
    primary_layout_id = str(layouts[0]["id"]) if layouts else None
    for l in layouts[1:]:
        try:
            api_call(host, headers, f"/api/4.0/dashboard_layouts/{l['id']}", method="DELETE")
        except Exception:
            pass

    # Group items by tab (1 single tab if spec["tabs"] is None)
    if spec.get("tabs"):
        tab_groups = [(t, [it for it in items if it.get("board_tab") == t]) for t in spec["tabs"]]
        tab_groups = [(t, grp) for t, grp in tab_groups if grp]
    else:
        tab_groups = [(spec["title"], items)]

    for tab_idx, (tab_label, tab_items) in enumerate(tab_groups):
        if tab_idx == 0 and primary_layout_id:
            layout_id = primary_layout_id
            api_call(
                host,
                headers,
                f"/api/4.0/dashboard_layouts/{layout_id}",
                method="PATCH",
                body={
                    "dashboard_id": str(dash_id),
                    "label": tab_label if len(tab_groups) > 1 else "",
                    "order": 0,
                    "type": "newspaper",
                    "active": True,
                },
            )
        else:
            l_obj = api_call(
                host,
                headers,
                "/api/4.0/dashboard_layouts",
                method="POST",
                body={
                    "dashboard_id": str(dash_id),
                    "label": tab_label,
                    "order": tab_idx,
                    "type": "newspaper",
                    "active": False,
                },
            )
            layout_id = str(l_obj["id"])

        nav_elem = api_call(
            host,
            headers,
            "/api/4.0/dashboard_elements",
            method="POST",
            body={
                "dashboard_id": str(dash_id),
                "dashboard_layout_id": layout_id,
                "title": "Navigation",
                "title_hidden": True,
                "type": "text",
                "body_text": build_top_nav_html(spec["title"], spec["description"], host, board_id),
            },
        )
        elem_positions = [(str(nav_elem["id"]), 0, 2)]

        for idx, item in enumerate(tab_items):
            viz_id = item["id"]
            viz_name = item["name"]
            row_offset = 2 + idx * 15
            print(f"     -> [{idx + 1}/{len(tab_items)}] {viz_name} ({viz_id})")
            qid = ensure_query_for_viz(viz_id, base_dir, host, headers)

            banner = api_call(
                host,
                headers,
                "/api/4.0/dashboard_elements",
                method="POST",
                body={
                    "dashboard_id": str(dash_id),
                    "dashboard_layout_id": layout_id,
                    "title": f"About {viz_name}",
                    "title_hidden": True,
                    "type": "text",
                    "body_text": build_viz_card_html(item),
                },
            )
            vis_el = api_call(
                host,
                headers,
                "/api/4.0/dashboard_elements",
                method="POST",
                body={
                    "dashboard_id": str(dash_id),
                    "dashboard_layout_id": layout_id,
                    "title": viz_name,
                    "title_hidden": False,
                    "type": "vis",
                    "query_id": qid,
                },
            )
            elem_positions.append((str(banner["id"]), row_offset, 3))
            elem_positions.append((str(vis_el["id"]), row_offset + 3, 12))

        comps = api_call(
            host,
            headers,
            f"/api/4.0/dashboard_layouts/{layout_id}/dashboard_layout_components",
        )
        pos_map = {eid: (r, h) for eid, r, h in elem_positions}
        for comp in comps:
            eid = str(comp.get("dashboard_element_id"))
            if eid in pos_map:
                r, h = pos_map[eid]
                api_call(
                    host,
                    headers,
                    f"/api/4.0/dashboard_layout_components/{comp['id']}",
                    method="PATCH",
                    body={"column": 0, "row": r, "width": 24, "height": h},
                )


def sync_looker_board(host, headers, config):
    board_id = config.get("board_id")
    board = None
    if board_id:
        try:
            board = api_call(host, headers, f"/api/4.0/boards/{board_id}")
        except Exception:
            board = None

    if not board:
        existing_boards = api_call(host, headers, "/api/4.0/boards")
        for b in existing_boards:
            if b.get("title") == BOARD_TITLE:
                board = b
                board_id = str(b["id"])
                break

    if not board:
        board = api_call(
            host,
            headers,
            "/api/4.0/boards",
            method="POST",
            body={"title": BOARD_TITLE, "description": BOARD_DESCRIPTION},
        )
        board_id = str(board["id"])
        print(f"[+] Created Looker Board '{BOARD_TITLE}' (ID: {board_id})")
    else:
        api_call(
            host,
            headers,
            f"/api/4.0/boards/{board_id}",
            method="PATCH",
            body={"title": BOARD_TITLE, "description": BOARD_DESCRIPTION},
        )
        print(f"[*] Updating Looker Board '{BOARD_TITLE}' (ID: {board_id})")

    # Refresh board sections cleanly
    board_full = api_call(host, headers, f"/api/4.0/boards/{board_id}")
    for sec in board_full.get("board_sections", []):
        try:
            api_call(host, headers, f"/api/4.0/board_sections/{sec['id']}", method="DELETE")
        except Exception:
            pass

    catalog_url = f"{CATALOG_PUBLIC_URL}?host={urllib.parse.quote(host)}"
    section_ids = []
    for sec_spec in BOARD_SECTIONS:
        sec_obj = api_call(
            host,
            headers,
            "/api/4.0/board_sections",
            method="POST",
            body={
                "board_id": str(board_id),
                "title": sec_spec["title"],
                "description": sec_spec["description"],
            },
        )
        sec_id = str(sec_obj["id"])
        section_ids.append(sec_id)

        if sec_spec["key"] == "catalog":
            api_call(
                host,
                headers,
                "/api/4.0/board_items",
                method="POST",
                body={
                    "board_section_id": sec_id,
                    "custom_title": "🔍 Interactive Searchable Visual Catalog (All Active Visualizations)",
                    "custom_description": "Instant search & filter by geometry, industry vertical, charting library, and required data shape — with live previews and one-click Looker Explore launch.",
                    "custom_url": catalog_url,
                    "custom_url_label": "Open Searchable Catalog",
                    "use_custom_title": True,
                    "use_custom_description": True,
                    "use_custom_url": True,
                },
            )
        else:
            for dkey in sec_spec["dashboards"]:
                dinfo = config["dashboards"].get(dkey)
                if not dinfo:
                    continue
                spec = DASHBOARD_SPECS[dkey]
                api_call(
                    host,
                    headers,
                    "/api/4.0/board_items",
                    method="POST",
                    body={
                        "board_section_id": sec_id,
                        "dashboard_id": str(dinfo["id"]),
                        "custom_title": spec["title"],
                        "custom_description": spec["description"],
                        "use_custom_title": True,
                        "use_custom_description": True,
                    },
                )

    # Set explicit section order on board
    api_call(
        host,
        headers,
        f"/api/4.0/boards/{board_id}",
        method="PATCH",
        body={"section_order": section_ids},
    )
    return board_id


def sync_board(target_dashboards=None, viz_id=None, profile="default"):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    host, headers = get_headers(profile)

    with open(os.path.join(base_dir, "catalog.json"), "r", encoding="utf-8") as f:
        catalog = json.load(f)

    cfg_path = os.path.join(base_dir, "board_config.json")
    if os.path.exists(cfg_path):
        with open(cfg_path, "r", encoding="utf-8") as f:
            config = json.load(f)
    else:
        config = {"folder_id": None, "board_id": None, "dashboards": {}}

    # Ensure folder exists
    folder_id = config.get("folder_id") or ensure_folder(host, headers, parent_id="5")
    config["folder_id"] = folder_id

    # Determine which dashboards to sync
    if viz_id:
        found = next((c for c in catalog if c["id"] == viz_id), None)
        if not found:
            raise ValueError(f"Visualization '{viz_id}' not found in catalog.json")
        if found.get("private_demo") or not found.get("board_dashboard"):
            print(f"Skipping board sync for private visualization '{viz_id}'.")
            return config
        dash_keys = [found["board_dashboard"]]
    elif target_dashboards:
        dash_keys = list(target_dashboards)
    else:
        dash_keys = list(DASHBOARD_SPECS.keys())

    # Ensure Board exists first so top nav banners point to the exact Board ID
    if not config.get("board_id"):
        existing_boards = api_call(host, headers, "/api/4.0/boards")
        for b in existing_boards:
            if b.get("title") == BOARD_TITLE:
                config["board_id"] = str(b["id"])
                break
        if not config.get("board_id"):
            created_b = api_call(
                host,
                headers,
                "/api/4.0/boards",
                method="POST",
                body={"title": BOARD_TITLE, "description": BOARD_DESCRIPTION},
            )
            config["board_id"] = str(created_b["id"])

    # Create/ensure target dashboards and populate them
    for dkey in dash_keys:
        spec = DASHBOARD_SPECS[dkey]
        existing_id = (config.get("dashboards", {}).get(dkey) or {}).get("id")
        did, slug = ensure_dashboard(host, headers, folder_id, spec["title"], spec["description"], existing_id)
        config.setdefault("dashboards", {})[dkey] = {
            "id": did,
            "slug": slug,
            "title": spec["title"],
        }
        items = [
            c
            for c in catalog
            if not c.get("private_demo")
            and c.get("board_dashboard") == dkey
            and os.path.exists(os.path.join(base_dir, "visualizations", c["id"], "demo_query.json"))
        ]
        populate_dashboard(did, spec, items, host, headers, base_dir, config["board_id"])

    # Sync Board sections & items when syncing all or when board isn't populated yet
    if not viz_id and not target_dashboards:
        config["board_id"] = sync_looker_board(host, headers, config)

    # Save board_config.json (strictly NO private .looker.app hostnames stored!)
    with open(cfg_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

    board_url = f"https://{host}/boards/{config['board_id']}"
    print("\n" + "=" * 75)
    print("LOOKER BOARD & DASHBOARDS SYNC COMPLETE!")
    print(f"  Board URL: {board_url}")
    print(f"  Folder ID: {config['folder_id']} ({FOLDER_NAME})")
    for dkey in dash_keys:
        dinfo = config["dashboards"][dkey]
        print(f"  - {dinfo['title']:40s} https://{host}/dashboards/{dinfo['slug']} (ID: {dinfo['id']})")
    print("=" * 75 + "\n")
    return config


def main():
    parser = argparse.ArgumentParser(description="Sync Looker Custom Viz Board & Dashboards")
    parser.add_argument("--sync-all", action="store_true", help="Sync all 10 dashboards and rebuild the Looker Board")
    parser.add_argument("--viz", help="Sync only the single dashboard owning this visualization ID")
    parser.add_argument("--dashboard", help="Sync only a specific dashboard key (e.g. experimentation)")
    parser.add_argument("--profile", default="default", help="Looker CLI profile")
    args = parser.parse_args()

    if args.viz:
        sync_board(viz_id=args.viz, profile=args.profile)
    elif args.dashboard:
        sync_board(target_dashboards=[args.dashboard], profile=args.profile)
    else:
        sync_board(profile=args.profile)


if __name__ == "__main__":
    main()
