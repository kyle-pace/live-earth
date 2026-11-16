#!/usr/bin/env python3
"""Copies the views the Mac app can show from src/lib/views.ts into
mac/LiveEarth/Resources/views.json, so the web lab and the app share one list.

The Mac app shows NOAA's GOES pictures (every view) and EUMETSAT's flat-map Meteosat
regions. It leaves out Meteosat's whole-Earth views (they need the web viewer's
reprojection) and Himawari (CIRA's SLIDER terms are only settled for the web lab).

Run from the repo root after changing views.ts:  python3 scripts/export-mac-views.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
source = (ROOT / "src/lib/views.ts").read_text()

start = source.index("[", source.index("=", source.index("export const SATELLITES")))
depth = 0
for i in range(start, len(source)):
    if source[i] == "[":
        depth += 1
    elif source[i] == "]":
        depth -= 1
        if depth == 0:
            end = i + 1
            break
satellites = json.loads(source[start:end])

out = []
for sat in satellites:
    if sat["source"] == "cira":
        continue
    views = [v for v in sat["views"] if not (sat["source"] == "eumetsat" and v["shape"] == "disk")]
    if views:
        out.append({**sat, "views": views})

target = ROOT / "mac/LiveEarth/Resources/views.json"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(out, indent=1) + "\n")
print(f"{target.relative_to(ROOT)}: {len(out)} satellites, {sum(len(s['views']) for s in out)} views")
