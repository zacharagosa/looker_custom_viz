#!/usr/bin/env python3
"""
Build the Interactive Searchable Visual Catalog (docs/index.html) from catalog.json
and board_config.json, and optionally upload it (+ screenshots) to public GCS:
  https://storage.googleapis.com/looker-custom-viz-public-assets/catalog/index.html

Public-hygiene safe: NEVER embeds any private Looker hostname (*.looker.app) in HTML/JSON.
When opened with `?host=<looker-host>` (e.g. from the Looker Board), live Explore and
Board Dashboard launch links activate automatically.
"""

import argparse
import json
import os
import subprocess
import sys

GCS_BUCKET = "looker-custom-viz-public-assets"
SA_ACCOUNT = "bq-automation-sa-aragosalooker@aragosalooker.iam.gserviceaccount.com"

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Looker Custom Visualizations — Searchable Catalog</title>
<style>
  :root {
    --bg: #f8fafc;
    --surface: #ffffff;
    --border: #e2e8f0;
    --border-strong: #cbd5e1;
    --text: #0f172a;
    --muted: #475569;
    --subtle: #64748b;
    --accent: #1a73e8;
    --accent-soft: #eff6ff;
    --accent-border: #bfdbfe;
    --green-soft: #f0fdf4;
    --green-text: #166534;
    --radius: 10px;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.45;
  }
  header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 40;
  }
  .header-inner {
    max-width: 1380px;
    margin: 0 auto;
    padding: 14px 24px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .brand h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .brand-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent);
    border: 1px solid var(--accent-border);
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    color: var(--text);
    transition: background 0.12s, border-color 0.12s;
  }
  .btn:hover { background: #f1f5f9; border-color: #94a3b8; }
  .btn-primary {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
  .btn-primary:hover { background: #1557b0; border-color: #1557b0; }
  .controls {
    max-width: 1380px;
    margin: 0 auto;
    padding: 16px 24px 10px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .search-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }
  .search-input {
    flex: 1 1 320px;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    font-size: 14px;
    color: var(--text);
    outline: none;
  }
  .search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.12);
  }
  select.filter-select {
    padding: 9px 12px;
    border-radius: 8px;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    font-size: 12.5px;
    font-weight: 500;
    color: var(--text);
    cursor: pointer;
    outline: none;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .chip {
    padding: 5px 11px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    color: var(--muted);
    cursor: pointer;
    transition: all 0.12s;
  }
  .chip:hover { border-color: var(--accent); color: var(--accent); }
  .chip.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .meta-bar {
    max-width: 1380px;
    margin: 0 auto;
    padding: 4px 24px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12.5px;
    color: var(--subtle);
  }
  .grid {
    max-width: 1380px;
    margin: 0 auto;
    padding: 0 24px 48px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 18px;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: transform 0.14s, box-shadow 0.14s, border-color 0.14s;
  }
  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
    border-color: var(--accent-border);
  }
  .thumb-wrap {
    position: relative;
    aspect-ratio: 16 / 10;
    background: #f1f5f9;
    border-bottom: 1px solid var(--border);
    overflow: hidden;
    cursor: zoom-in;
  }
  .thumb-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
  }
  .card-body {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }
  .card-title {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
  }
  .card-id {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    color: var(--subtle);
  }
  .pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .pill {
    font-size: 10.5px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 5px;
    background: var(--accent-soft);
    color: #0369a1;
  }
  .pill-ind { background: var(--green-soft); color: var(--green-text); }
  .pill-lib { background: #f1f5f9; color: #475569; }
  .card-desc {
    margin: 0;
    font-size: 12.5px;
    color: var(--muted);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card-fields {
    font-size: 11px;
    color: var(--subtle);
    background: #f8fafc;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 8px;
    margin-top: auto;
  }
  .card-footer {
    padding: 10px 16px 14px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    border-top: 1px solid #f1f5f9;
  }
  .card-footer .btn {
    flex: 1 1 auto;
    justify-content: center;
    padding: 6px 10px;
    font-size: 11.5px;
  }
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.72);
    display: none;
    align-items: center;
    justify-content: center;
    padding: 24px;
    z-index: 100;
  }
  .modal-backdrop.open { display: flex; }
  .modal {
    background: var(--surface);
    border-radius: 12px;
    max-width: 980px;
    width: 100%;
    max-height: 92vh;
    overflow: auto;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
  }
  .modal-header {
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .modal-body { padding: 18px 20px; }
  .modal-body img {
    width: 100%;
    border-radius: 8px;
    border: 1px solid var(--border);
    margin-bottom: 14px;
  }
  pre.snippet {
    background: #0f172a;
    color: #e2e8f0;
    padding: 12px 14px;
    border-radius: 8px;
    font-size: 12px;
    overflow-x: auto;
    margin: 8px 0 0;
  }
  .empty {
    grid-column: 1 / -1;
    text-align: center;
    padding: 48px 20px;
    color: var(--subtle);
    background: var(--surface);
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius);
  }
</style>
</head>
<body>
<header>
  <div class="header-inner">
    <div class="brand">
      <h1>Looker Custom Visualizations Catalog</h1>
      <span class="brand-badge" id="totalBadge">0 Visualizations</span>
    </div>
    <div class="header-actions">
      <a id="boardBtn" class="btn btn-primary" href="#" target="_blank" style="display:none;">&larr; Open Looker Board</a>
      <button id="hostBtn" class="btn" type="button">Connect Looker Host</button>
      <a class="btn" href="https://github.com/zacharagosa/looker_custom_viz" target="_blank">GitHub Repo</a>
    </div>
  </div>
</header>

<section class="controls">
  <div class="search-row">
    <input id="searchInput" class="search-input" type="search" placeholder="Search by chart name, visual paradigm, industry, library, or field (e.g. sankey, kde, telecom, geo, bandit)..." />
    <select id="geometrySelect" class="filter-select"><option value="">All Visual Geometries</option></select>
    <select id="industrySelect" class="filter-select"><option value="">All Industries</option></select>
    <select id="librarySelect" class="filter-select"><option value="">All Libraries</option></select>
    <select id="sortSelect" class="filter-select">
      <option value="dashboard">Sort: Board Order</option>
      <option value="newest">Sort: Newest First</option>
      <option value="alpha">Sort: A &rarr; Z</option>
    </select>
  </div>
  <div class="chips" id="dashboardChips"></div>
</section>

<div class="meta-bar">
  <span id="resultCount">Loading catalog...</span>
  <button id="resetBtn" class="btn" type="button" style="padding:4px 10px;font-size:11.5px;display:none;">Clear Filters</button>
</div>

<main class="grid" id="catalogGrid"></main>

<div class="modal-backdrop" id="modalBackdrop">
  <div class="modal" role="dialog" aria-modal="true">
    <div class="modal-header">
      <div>
        <strong id="modalTitle" style="font-size:16px;"></strong>
        <div id="modalSubtitle" class="card-id"></div>
      </div>
      <button id="modalClose" class="btn" type="button">Close</button>
    </div>
    <div class="modal-body" id="modalBody"></div>
  </div>
</div>

<script>
const CATALOG_DATA = __CATALOG_JSON__;
const BOARD_CONFIG = __BOARD_CONFIG_JSON__;
const SCREENSHOT_PREFIX = "__SCREENSHOT_PREFIX__";

const params = new URLSearchParams(window.location.search);
let lookerHost = params.get("host") || localStorage.getItem("looker_viz_catalog_host") || "";
if (params.get("host")) {
  try { localStorage.setItem("looker_viz_catalog_host", lookerHost); } catch (e) {}
}

let activeDashboard = "";

function sanitizeHost(h) {
  return (h || "").replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim();
}

function updateHostUI() {
  lookerHost = sanitizeHost(lookerHost);
  const boardBtn = document.getElementById("boardBtn");
  const hostBtn = document.getElementById("hostBtn");
  if (lookerHost && BOARD_CONFIG.board_id) {
    boardBtn.href = "https://" + lookerHost + "/boards/" + BOARD_CONFIG.board_id;
    boardBtn.style.display = "inline-flex";
    hostBtn.textContent = "Looker Connected";
  } else if (lookerHost) {
    boardBtn.style.display = "none";
    hostBtn.textContent = "Looker Connected";
  } else {
    boardBtn.style.display = "none";
    hostBtn.textContent = "Connect Looker Host";
  }
}

function escapeHtml(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function uniqueSorted(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function populateFilters() {
  document.getElementById("totalBadge").textContent = CATALOG_DATA.length + " Active Visualizations";

  const geomSel = document.getElementById("geometrySelect");
  uniqueSorted(CATALOG_DATA.map(v => v.geometry)).forEach(g => {
    const o = document.createElement("option"); o.value = g; o.textContent = g; geomSel.appendChild(o);
  });

  const indSel = document.getElementById("industrySelect");
  uniqueSorted(CATALOG_DATA.map(v => v.industry)).forEach(i => {
    const o = document.createElement("option"); o.value = i; o.textContent = i; indSel.appendChild(o);
  });

  const libSel = document.getElementById("librarySelect");
  uniqueSorted(CATALOG_DATA.map(v => v.library)).forEach(l => {
    const o = document.createElement("option"); o.value = l; o.textContent = l; libSel.appendChild(o);
  });

  const chips = document.getElementById("dashboardChips");
  const counts = {};
  CATALOG_DATA.forEach(v => {
    const k = v.board_dashboard || "other";
    counts[k] = (counts[k] || 0) + 1;
  });

  const allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className = "chip active";
  allChip.dataset.key = "";
  allChip.textContent = "All (" + CATALOG_DATA.length + ")";
  allChip.onclick = () => { activeDashboard = ""; render(); };
  chips.appendChild(allChip);

  const dashMap = BOARD_CONFIG.dashboards || {};
  Object.keys(dashMap).forEach(k => {
    if (!counts[k]) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.dataset.key = k;
    btn.textContent = dashMap[k].title + " (" + counts[k] + ")";
    btn.onclick = () => { activeDashboard = (activeDashboard === k ? "" : k); render(); };
    chips.appendChild(btn);
  });
}

function openModal(item) {
  const dashInfo = (BOARD_CONFIG.dashboards || {})[item.board_dashboard];
  document.getElementById("modalTitle").textContent = item.name;
  document.getElementById("modalSubtitle").textContent = item.id + "  •  " + (item.geometry || "") + "  •  " + (item.industry || "");

  const imgSrc = SCREENSHOT_PREFIX + item.id + ".png";
  const manifest = `visualization: {\n  id: "${item.id}"\n  label: "${item.name}"\n  url: "https://storage.googleapis.com/looker-custom-viz-public-assets/${item.id}.js"\n  dependencies: ${JSON.stringify(item.dependencies || [])}\n}`;

  let actionsHtml = "";
  if (lookerHost && item.looker_demo_url) {
    actionsHtml += `<a class="btn btn-primary" href="https://${escapeHtml(lookerHost)}${item.looker_demo_url}" target="_blank">Open Live Explore (&toggle=vis) &rarr;</a> `;
  }
  if (lookerHost && dashInfo && dashInfo.slug) {
    actionsHtml += `<a class="btn" href="https://${escapeHtml(lookerHost)}/dashboards/${escapeHtml(dashInfo.slug)}" target="_blank">Open Dashboard: ${escapeHtml(dashInfo.title)}</a> `;
  }
  actionsHtml += `<a class="btn" href="https://github.com/zacharagosa/looker_custom_viz/tree/main/visualizations/${encodeURIComponent(item.id)}" target="_blank">Source & README</a>`;

  document.getElementById("modalBody").innerHTML =
    `<img src="${imgSrc}" alt="${escapeHtml(item.name)}" />` +
    `<p style="margin:0 0 12px;color:#334155;font-size:13.5px;">${escapeHtml(item.description)}</p>` +
    `<div style="margin-bottom:14px;display:flex;flex-wrap:wrap;gap:8px;">${actionsHtml}</div>` +
    `<div style="font-size:12px;color:#475569;margin-bottom:10px;"><strong>Dimensions:</strong> ${escapeHtml((item.fields_required||{}).dimensions || "N/A")}<br/><strong>Measures:</strong> ${escapeHtml((item.fields_required||{}).measures || "N/A")}</div>` +
    `<div style="font-size:12px;font-weight:700;color:#0f172a;">LookML Manifest Snippet</div>` +
    `<pre class="snippet">${escapeHtml(manifest)}</pre>`;

  document.getElementById("modalBackdrop").classList.add("open");
}

function render() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const geom = document.getElementById("geometrySelect").value;
  const ind = document.getElementById("industrySelect").value;
  const lib = document.getElementById("librarySelect").value;
  const sort = document.getElementById("sortSelect").value;

  document.querySelectorAll("#dashboardChips .chip").forEach(c => {
    c.classList.toggle("active", c.dataset.key === activeDashboard);
  });

  const hasFilter = !!(q || geom || ind || lib || activeDashboard);
  document.getElementById("resetBtn").style.display = hasFilter ? "inline-flex" : "none";

  let items = CATALOG_DATA.filter(v => {
    if (activeDashboard && v.board_dashboard !== activeDashboard) return false;
    if (geom && v.geometry !== geom) return false;
    if (ind && v.industry !== ind) return false;
    if (lib && v.library !== lib) return false;
    if (q) {
      const hay = [
        v.id, v.name, v.description, v.category, v.geometry, v.industry, v.library,
        (v.suggested_dataset||{}).model, (v.suggested_dataset||{}).explore,
        (v.fields_required||{}).dimensions, (v.fields_required||{}).measures
      ].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (sort === "newest") {
    items.sort((a, b) => (b.date_added || "").localeCompare(a.date_added || ""));
  } else if (sort === "alpha") {
    items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  document.getElementById("resultCount").textContent =
    "Showing " + items.length + " of " + CATALOG_DATA.length + " visualizations";

  const grid = document.getElementById("catalogGrid");
  grid.innerHTML = "";
  if (items.length === 0) {
    grid.innerHTML = '<div class="empty">No visualizations match those filters. Try clearing your search or selecting a broader geometry.</div>';
    return;
  }

  const dashMap = BOARD_CONFIG.dashboards || {};
  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "card";
    const dashInfo = dashMap[item.board_dashboard];
    const imgSrc = SCREENSHOT_PREFIX + item.id + ".png";

    let footerBtns = "";
    if (lookerHost && item.looker_demo_url) {
      footerBtns += `<a class="btn btn-primary" href="https://${escapeHtml(lookerHost)}${item.looker_demo_url}" target="_blank">Open Explore &rarr;</a>`;
    }
    if (lookerHost && dashInfo && dashInfo.slug) {
      footerBtns += `<a class="btn" href="https://${escapeHtml(lookerHost)}/dashboards/${escapeHtml(dashInfo.slug)}" target="_blank">Dashboard</a>`;
    }
    footerBtns += `<button class="btn detail-btn" type="button">Details</button>`;

    card.innerHTML =
      `<div class="thumb-wrap"><img loading="lazy" src="${imgSrc}" alt="${escapeHtml(item.name)}" /></div>` +
      `<div class="card-body">` +
        `<div><h2 class="card-title">${escapeHtml(item.name)}</h2><div class="card-id">${escapeHtml(item.id)}</div></div>` +
        `<div class="pill-row">` +
          `<span class="pill">${escapeHtml(item.geometry || item.category)}</span>` +
          `<span class="pill pill-ind">${escapeHtml(item.industry || "Cross-Industry")}</span>` +
          `<span class="pill pill-lib">${escapeHtml(item.library || "D3.js v7")}</span>` +
        `</div>` +
        `<p class="card-desc">${escapeHtml(item.description)}</p>` +
        `<div class="card-fields"><strong>Dims:</strong> ${escapeHtml((item.fields_required||{}).dimensions || "N/A")}<br/><strong>Measures:</strong> ${escapeHtml((item.fields_required||{}).measures || "N/A")}</div>` +
      `</div>` +
      `<div class="card-footer">${footerBtns}</div>`;

    card.querySelector(".thumb-wrap").onclick = () => openModal(item);
    card.querySelector(".detail-btn").onclick = () => openModal(item);
    grid.appendChild(card);
  });
}

document.getElementById("searchInput").addEventListener("input", render);
document.getElementById("geometrySelect").addEventListener("change", render);
document.getElementById("industrySelect").addEventListener("change", render);
document.getElementById("librarySelect").addEventListener("change", render);
document.getElementById("sortSelect").addEventListener("change", render);
document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  document.getElementById("geometrySelect").value = "";
  document.getElementById("industrySelect").value = "";
  document.getElementById("librarySelect").value = "";
  activeDashboard = "";
  render();
});
document.getElementById("modalClose").onclick = () => document.getElementById("modalBackdrop").classList.remove("open");
document.getElementById("modalBackdrop").onclick = (e) => {
  if (e.target.id === "modalBackdrop") e.target.classList.remove("open");
};
document.getElementById("hostBtn").onclick = () => {
  const next = window.prompt("Enter your Looker instance hostname (e.g. company.cloud.looker.com) to enable one-click Explore & Dashboard launch links:", lookerHost);
  if (next !== null) {
    lookerHost = sanitizeHost(next);
    try { localStorage.setItem("looker_viz_catalog_host", lookerHost); } catch (e) {}
    updateHostUI();
    render();
  }
};

updateHostUI();
populateFilters();
render();
</script>
</body>
</html>
"""


def build_catalog(upload_gcs=False):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    with open(os.path.join(base_dir, "catalog.json"), "r", encoding="utf-8") as f:
        raw_cat = json.load(f)

    active = [v for v in raw_cat if not v.get("private_demo") and not v.get("archived")]

    cfg_path = os.path.join(base_dir, "board_config.json")
    board_cfg = {}
    if os.path.exists(cfg_path):
        with open(cfg_path, "r", encoding="utf-8") as f:
            board_cfg = json.load(f)

    # Order items by board dashboard order
    dash_order = list((board_cfg.get("dashboards") or {}).keys())
    active.sort(key=lambda v: (
        dash_order.index(v["board_dashboard"]) if v.get("board_dashboard") in dash_order else 999,
        v.get("board_tab") or "",
        v.get("date_added") or "",
    ))

    cat_json = json.dumps(active, ensure_ascii=False)
    board_json = json.dumps(board_cfg, ensure_ascii=False)

    # 1. Write GitHub Pages version in docs/index.html (relative screenshots in ../assets/screenshots/)
    docs_html = (
        HTML_TEMPLATE
        .replace("__CATALOG_JSON__", cat_json)
        .replace("__BOARD_CONFIG_JSON__", board_json)
        .replace("__SCREENSHOT_PREFIX__", "../assets/screenshots/")
    )
    docs_out = os.path.join(base_dir, "docs", "index.html")
    with open(docs_out, "w", encoding="utf-8") as f:
        f.write(docs_html)
    print(f"[+] Wrote GitHub Pages catalog: {docs_out} ({len(active)} active visualizations)")

    if upload_gcs:
        # 2. Build GCS version pointing at ./screenshots/<id>.png and upload
        gcs_html = (
            HTML_TEMPLATE
            .replace("__CATALOG_JSON__", cat_json)
            .replace("__BOARD_CONFIG_JSON__", board_json)
            .replace("__SCREENSHOT_PREFIX__", "screenshots/")
        )
        tmp_html = "/tmp/looker_custom_viz_catalog_index.html"
        with open(tmp_html, "w", encoding="utf-8") as f:
            f.write(gcs_html)

        env = dict(os.environ)
        env["CLOUDSDK_METRICS_ENVIRONMENT"] = (
            (env.get("CLOUDSDK_METRICS_ENVIRONMENT", "") + " datacloud.ai-agent").strip()
        )
        # Sync active screenshots to GCS catalog/screenshots/
        ss_dir = os.path.join(base_dir, "assets", "screenshots")
        print("[*] Syncing active visualization screenshots to GCS catalog/screenshots/...")
        subprocess.run(
            [
                "gcloud", "storage", "rsync", ss_dir,
                f"gs://{GCS_BUCKET}/catalog/screenshots",
                "--delete-unmatched-destination-objects",
                f"--account={SA_ACCOUNT}",
            ],
            check=True,
            env=env,
        )
        print("[*] Uploading catalog/index.html to GCS...")
        subprocess.run(
            [
                "gcloud", "storage", "cp", tmp_html,
                f"gs://{GCS_BUCKET}/catalog/index.html",
                "--content-type=text/html; charset=utf-8",
                "--cache-control=no-cache, max-age=0",
                f"--account={SA_ACCOUNT}",
            ],
            check=True,
            env=env,
        )
        print(f"[+] Live Public Catalog URL: https://storage.googleapis.com/{GCS_BUCKET}/catalog/index.html")


def main():
    parser = argparse.ArgumentParser(description="Build Searchable Looker Custom Viz Catalog")
    parser.add_argument("--upload", action="store_true", help="Upload catalog HTML and screenshots to public GCS bucket")
    args = parser.parse_args()
    build_catalog(upload_gcs=args.upload)


if __name__ == "__main__":
    main()
