#!/usr/bin/env python3
"""
Deploy a custom Looker visualization to a Looker project and register it instance-wide.
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile
import urllib.request
import yaml

LOOKER_HOST = "3417a175-fe20-4370-974f-2f2b535340ab.looker.app"
GCS_BUCKET = "looker-custom-viz-public-assets"

def run_cmd(cmd, check=True, input_data=None):
    res = subprocess.run(
        cmd,
        shell=True,
        text=True,
        input=input_data,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    if check and res.returncode != 0:
        raise RuntimeError(f"Command failed ({res.returncode}): {cmd}\nStdout: {res.stdout}\nStderr: {res.stderr}")
    return res

def ensure_dev_workspace(profile="default"):
    print("[1/6] Ensuring Looker CLI session is in dev workspace mode...")
    payload = json.dumps({"workspace_id": "dev"})
    cmd = f"looker-cli api session update_session - --profile {profile}"
    res = run_cmd(cmd, check=False, input_data=payload)
    if res.returncode != 0:
        print(f"Warning setting workspace: {res.stderr}")
    else:
        print("  -> Workspace set to 'dev'")

def deploy_file_to_project(project, remote_path, local_path, profile="default"):
    print(f"[2/6] Uploading {local_path} to project '{project}' as '{remote_path}'...")
    check_cmd = f"looker-cli project file cat {project} {remote_path} --profile {profile}"
    res = run_cmd(check_cmd, check=False)
    if res.returncode == 0:
        cmd = f"looker-cli project file update {project} {remote_path} {local_path} --profile {profile}"
        print(f"  -> File exists. Updating file in project...")
    else:
        cmd = f"looker-cli project file create {project} {remote_path} {local_path} --profile {profile}"
        print(f"  -> Creating new file in project...")
    run_cmd(cmd)
    print("  -> File upload successful.")

def update_manifest(project, viz_id, snippet_path, profile="default"):
    print(f"[3/6] Checking manifest.lkml in project '{project}'...")
    manifest_cmd = f"looker-cli project file cat {project} manifest.lkml --profile {profile}"
    res = run_cmd(manifest_cmd)
    current_manifest = res.stdout

    if f'id: "{viz_id}"' in current_manifest or f"id: '{viz_id}'" in current_manifest:
        print(f"  -> Visualization '{viz_id}' already registered in manifest.lkml.")
        return

    with open(snippet_path, "r", encoding="utf-8") as f:
        snippet = f.read().strip()

    updated_manifest = current_manifest.rstrip() + "\n\n" + snippet + "\n"

    with tempfile.NamedTemporaryFile("w", suffix=".lkml", delete=False) as tf:
        tf.write(updated_manifest)
        temp_path = tf.name

    try:
        print(f"  -> Registering visualization '{viz_id}' in manifest.lkml...")
        update_cmd = f"looker-cli project file update {project} manifest.lkml {temp_path} --profile {profile}"
        run_cmd(update_cmd)
        print("  -> manifest.lkml updated successfully.")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def register_instance_wide(viz_id, label, js_local_path, dependencies, profile="default"):
    print(f"[4/6] Registering visualization '{viz_id}' instance-wide...")
    # Upload to public GCS bucket
    gcs_dest = f"gs://{GCS_BUCKET}/{viz_id}.js"
    cmd = f"gcloud storage cp {js_local_path} {gcs_dest} --content-type=application/javascript"
    run_cmd(cmd)
    public_url = f"https://storage.googleapis.com/{GCS_BUCKET}/{viz_id}.js"
    print(f"  -> Uploaded JS bundle to public HTTPS URL: {public_url}")

    # Read access token
    config_path = os.path.expanduser("~/.config/looker-cli/config.yaml")
    with open(config_path, "r", encoding="utf-8") as f:
        conf = yaml.safe_load(f)
    prof_conf = conf["profiles"].get(profile, {})
    host = prof_conf.get("host", LOOKER_HOST)
    token = prof_conf.get("access_token")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Check if already registered
    list_url = f"https://{host}/api/4.0/vis_manifest"
    req = urllib.request.Request(list_url, headers=headers)
    existing_id = None
    try:
        with urllib.request.urlopen(req) as resp:
            items = json.load(resp)
            for item in items:
                if item.get("vis_id") == viz_id:
                    existing_id = item.get("id")
                    break
    except Exception as e:
        print(f"  -> Notice checking existing vis_manifest: {e}")

    payload = {
        "vis_id": viz_id,
        "label": label,
        "main": public_url,
        "dependencies": dependencies or []
    }

    if existing_id:
        print(f"  -> Updating existing registration (Manifest ID: {existing_id})...")
        update_url = f"https://{host}/api/4.0/vis_manifest/{existing_id}"
        req = urllib.request.Request(update_url, data=json.dumps(payload).encode(), headers=headers, method="PATCH")
        with urllib.request.urlopen(req) as resp:
            print("  -> Instance-wide registration updated successfully.")
    else:
        print("  -> Creating new instance-wide registration...")
        create_url = f"https://{host}/api/4.0/vis_manifest"
        req = urllib.request.Request(create_url, data=json.dumps(payload).encode(), headers=headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            print("  -> Instance-wide registration created successfully.")

def create_demo_query(viz_id, base_dir=None, profile="default"):
    print(f"[5/6] Creating demo query for visualization '{viz_id}'...")
    custom_query_file = None
    if base_dir:
        custom_query_file = os.path.join(base_dir, "visualizations", viz_id, "demo_query.json")

    if custom_query_file and os.path.exists(custom_query_file):
        print(f"  -> Using visualization-specific demo query from {custom_query_file}")
        with open(custom_query_file, "r", encoding="utf-8") as f:
            query_def = json.load(f)
    else:
        query_def = {
            "model": "thelook",
            "view": "order_items",
            "fields": [
                "products.category",
                "order_items.total_sale_price"
            ],
            "limit": "6",
            "vis_config": {
                "type": viz_id,
                "showCenterText": True,
                "colorPalette": "google"
            }
        }
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
        json.dump(query_def, tf)
        temp_path = tf.name

    try:
        cmd = f"looker-cli api query create_query {temp_path} --profile {profile}"
        res = run_cmd(cmd)
        q_res = json.loads(res.stdout)
        share_url = q_res.get("share_url")
        expanded_share_url = q_res.get("expanded_share_url")
        slug = q_res.get("slug")
        client_id = q_res.get("client_id")

        # Format URL so the visualization pane is open/expanded by default
        if expanded_share_url:
            if "toggle=" not in expanded_share_url:
                demo_url = expanded_share_url + "&toggle=vis"
            else:
                demo_url = expanded_share_url
        elif share_url:
            demo_url = share_url + "?toggle=vis"
        else:
            demo_url = None

        print(f"  -> Demo query created!")
        print(f"  -> Live Demo URL (vis open): {demo_url}")
        return {
            "demo_url": demo_url,
            "share_url": share_url,
            "expanded_share_url": expanded_share_url,
            "slug": slug,
            "client_id": client_id
        }
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def main():
    parser = argparse.ArgumentParser(description="Deploy custom Looker viz")
    parser.add_argument("--viz", required=True, help="Visualization directory name, e.g. radial_progress_gauge")
    parser.add_argument("--project", default="thelookevent", help="Looker project ID (default: thelookevent)")
    parser.add_argument("--profile", default="default", help="Looker CLI profile (default: default)")
    parser.add_argument("--dashboard", default="164", help="Looker showcase dashboard ID/slug (default: 164)")
    parser.add_argument("--skip-dashboard-sync", action="store_true", help="Skip syncing to the showcase dashboard")
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    viz_dir = os.path.join(base_dir, "visualizations", args.viz)

    if not os.path.exists(viz_dir):
        print(f"Error: Visualization folder '{viz_dir}' not found.")
        sys.exit(1)

    js_file = os.path.join(viz_dir, f"{args.viz}.js")
    snippet_file = os.path.join(viz_dir, "manifest_snippet.lkml")

    if not os.path.exists(js_file):
        print(f"Error: JS file '{js_file}' not found.")
        sys.exit(1)
    if not os.path.exists(snippet_file):
        print(f"Error: Manifest snippet '{snippet_file}' not found.")
        sys.exit(1)

    # Read label and dependencies from catalog if possible
    catalog_path = os.path.join(base_dir, "catalog.json")
    label = args.viz.replace("_", " ").title()
    deps = ["https://d3js.org/d3.v7.min.js"]
    if os.path.exists(catalog_path):
        try:
            with open(catalog_path, "r", encoding="utf-8") as f:
                cat = json.load(f)
            for item in cat:
                if item.get("id") == args.viz:
                    label = item.get("name", label)
                    deps = item.get("dependencies", deps)
        except Exception as e:
            print(f"Notice reading catalog: {e}")

    remote_js_path = f"visualizations/{args.viz}.js"

    ensure_dev_workspace(profile=args.profile)
    deploy_file_to_project(args.project, remote_js_path, js_file, profile=args.profile)
    update_manifest(args.project, args.viz, snippet_file, profile=args.profile)
    register_instance_wide(args.viz, label, js_file, deps, profile=args.profile)
    query_info = create_demo_query(args.viz, base_dir=base_dir, profile=args.profile)

    # Update catalog.json
    if os.path.exists(catalog_path):
        try:
            with open(catalog_path, "r", encoding="utf-8") as f:
                catalog = json.load(f)
            for item in catalog:
                if item.get("id") == args.viz:
                    item["looker_demo_url"] = query_info["demo_url"]
                    item["deployed"] = True
                    item["instance_wide"] = True
            with open(catalog_path, "w", encoding="utf-8") as f:
                json.dump(catalog, f, indent=2)
            print(f"[6/6] Updated {catalog_path} with demo URL and instance-wide flag.")
        except Exception as e:
            print(f"Notice updating catalog: {e}")

    # Step 7: Sync to consolidated showcase dashboard organized by category (max 5 viz/tab)
    dash_url = None
    if not args.skip_dashboard_sync:
        print(f"[7/7] Syncing to Looker Showcase Dashboard '{args.dashboard}' by category tabs...")
        try:
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            from sync_dashboard import sync_dashboard
            dash_url = sync_dashboard(dashboard_id=args.dashboard, profile=args.profile)
            print(f"  -> Showcase Dashboard updated successfully: {dash_url}")
        except Exception as e:
            print(f"  -> Notice syncing to showcase dashboard: {e}")

    print("\n" + "="*60)
    print("DEPLOYMENT & INSTANCE-WIDE REGISTRATION COMPLETE!")
    print(f"Visualization: {args.viz}")
    print(f"Label: {label}")
    print(f"Live Looker URL (viz open): {query_info['demo_url']}")
    if dash_url:
        print(f"Showcase Dashboard: {dash_url}")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
