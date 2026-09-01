#!/usr/bin/env python3
"""
Deploy a custom Looker visualization to a Looker project using looker-cli.
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile

LOOKER_HOST = "3417a175-fe20-4370-974f-2f2b535340ab.looker.app"

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
    print("[1/5] Ensuring Looker CLI session is in dev workspace mode...")
    payload = json.dumps({"workspace_id": "dev"})
    cmd = f"looker-cli api session update_session - --profile {profile}"
    res = run_cmd(cmd, check=False, input_data=payload)
    if res.returncode != 0:
        print(f"Warning setting workspace: {res.stderr}")
    else:
        print("  -> Workspace set to 'dev'")

def deploy_file_to_project(project, remote_path, local_path, profile="default"):
    print(f"[2/5] Uploading {local_path} to project '{project}' as '{remote_path}'...")
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
    print(f"[3/5] Checking manifest.lkml in project '{project}'...")
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

def validate_project(project, profile="default"):
    print(f"[4/5] Validating project '{project}'...")
    val_cmd = f"looker-cli project validate {project} --profile {profile}"
    res = run_cmd(val_cmd, check=False)
    if res.returncode == 0:
        print("  -> Project validation passed.")
    else:
        print(f"  -> Validation warning/notice: {res.stdout.strip()}")

def create_demo_query(viz_id, base_dir=None, profile="default"):
    print(f"[5/5] Creating demo query for visualization '{viz_id}'...")
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
        share_url = q_res.get("share_url") or q_res.get("expanded_share_url")
        slug = q_res.get("slug")
        client_id = q_res.get("client_id")
        print(f"  -> Demo query created!")
        print(f"  -> Share URL: {share_url}")
        return {
            "share_url": share_url,
            "expanded_share_url": q_res.get("expanded_share_url"),
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

    remote_js_path = f"visualizations/{args.viz}.js"

    ensure_dev_workspace(profile=args.profile)
    deploy_file_to_project(args.project, remote_js_path, js_file, profile=args.profile)
    update_manifest(args.project, args.viz, snippet_file, profile=args.profile)
    query_info = create_demo_query(args.viz, base_dir=base_dir, profile=args.profile)

    # Update catalog.json
    catalog_path = os.path.join(base_dir, "catalog.json")
    if os.path.exists(catalog_path):
        try:
            with open(catalog_path, "r", encoding="utf-8") as f:
                catalog = json.load(f)
            for item in catalog:
                if item.get("id") == args.viz:
                    item["looker_demo_url"] = query_info["share_url"]
                    item["deployed"] = True
            with open(catalog_path, "w", encoding="utf-8") as f:
                json.dump(catalog, f, indent=2)
            print(f"  -> Updated {catalog_path} with demo URL.")
        except Exception as e:
            print(f"Notice updating catalog: {e}")

    print("\n" + "="*60)
    print("DEPLOYMENT COMPLETE!")
    print(f"Visualization: {args.viz}")
    print(f"Live Looker URL: {query_info['share_url']}")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
