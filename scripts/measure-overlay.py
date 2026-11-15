# Measures how much of the bottom edge NOAA's logo and caption bar cover, for every view
# and size in src/lib/views.ts: it compares two pictures taken hours apart, and anything
# that's identical in both near the bottom-left corner is NOAA's overlay, not weather.
# Prints JSON: {"<sat>/<view>": {"<W>x<H>": [bar, logo_top, logo_right]}} as fractions of the
# picture's height (bar, logo_top) and width (logo_right). Used to set the trims in views.ts.
import io, json, re, sys, urllib.request
from datetime import datetime, timedelta, timezone
import numpy as np
from PIL import Image

B = "https://cdn.star.nesdis.noaa.gov"
src = open(sys.argv[1]).read()
sats = json.loads(src[src.index("= [") + 2: src.rindex("];") + 1])

def stamp(d): return d.strftime("%Y") + f"{d.timetuple().tm_yday:03d}" + d.strftime("%H%M")

def fetch(sat, view, when, size):
    folder = view["code"] if view["code"] in ("FD", "CONUS") else f"SECTOR/{view['code']}"
    url = f"{B}/{sat['code']}/ABI/{folder}/GEOCOLOR/{stamp(when)}_{sat['code']}-ABI-{view['code']}-GEOCOLOR-{size[0]}x{size[1]}.jpg"
    return np.asarray(Image.open(io.BytesIO(urllib.request.urlopen(url, timeout=60).read())).convert("RGB")).astype(int)

now = datetime.now(timezone.utc) - timedelta(minutes=40)
out = {}
for sat in sats:
    for view in sat["views"]:
        if view["shape"] == "disk": continue
        mins = int(now.timestamp() // 60)
        mins -= (mins - view["offset"]) % view["cadence"]
        t1 = datetime.fromtimestamp(mins * 60, timezone.utc)
        t2 = t1 - timedelta(hours=12)  # day vs night, so only the overlay matches
        res = {}
        for size in view["sizes"]:
            if size[0] > 2500: continue
            try: a, b = fetch(sat, view, t1, size), fetch(sat, view, t2, size)
            except Exception as e: res[f"{size[0]}x{size[1]}"] = None; continue
            H, W, _ = a.shape
            # The caption bar: rows at the very bottom that are mostly white.
            whiteRow = (a.min(axis=2) > 225).mean(axis=1)
            y = H - 1
            while y > H * 0.8 and whiteRow[y] > 0.35: y -= 1
            bar = (H - 1 - y) / H
            # NOAA's logo (navy and blue) or, on the smallest sizes, a white "NOAA" box, in the
            # bottom-left corner above the bar, identical in a day and a night picture.
            same = np.abs(a - b).max(axis=2) < 12
            bluish = (a[:, :, 2] > a[:, :, 0] + 50) & (a[:, :, 2] > 90)
            white = a.min(axis=2) > 235
            mark = same & (bluish | white)
            y0, y1 = int(H * 0.7), y + 1
            region = mark[y0:y1, : int(W * 0.25)]
            rows = np.where(region.sum(axis=1) >= 2)[0]
            cols = np.where(region.sum(axis=0) >= 2)[0]
            top = (H - (y0 + rows.min())) / H if len(rows) else 0
            right = (cols.max() + 1) / W if len(cols) else 0
            res[f"{size[0]}x{size[1]}"] = [round(bar, 4), round(top, 4), round(right, 4)]
        out[f"{sat['id']}/{view['id']}"] = res
        print(sat["id"], view["id"], res, file=sys.stderr)
print(json.dumps(out, indent=1))
