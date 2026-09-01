#!/usr/bin/env python3
# build_web_demo.py — build เว็บเดโมสำหรับ GitHub Pages
# เอา frontend ใน wwwroot/ แบบเดิมเป๊ะ แล้วแทรก 2 ไฟล์เฉพาะเดโม:
#   js/demo-data.js — ข้อมูลจาก backup JSON ใน demodata/ (seed localStorage)
#   js/demo-shim.js — mock bridge + ดัก fetch ภายนอก
# ใช้: python demodata/build_web_demo.py   →  ได้โฟลเดอร์ docs/ พร้อม publish
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WWWROOT = ROOT / "wwwroot"
DEM = ROOT / "demodata"
OUT = ROOT / "docs"
SEED_FILE = "boxbox_demodata_20260901.json"


def main() -> None:
    backup = json.loads((DEM / SEED_FILE).read_text(encoding="utf-8-sig"))

    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(WWWROOT, OUT)

    # demo-data.js — ข้อมูลแบบ compact เพื่อประหยัด localStorage
    (OUT / "js" / "demo-data.js").write_text(
        "window.__BOXBOX_DEMO_DATA="
        + json.dumps(backup["data"], ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    shutil.copy2(DEM / "demo-shim.js", OUT / "js" / "demo-shim.js")

    html = (WWWROOT / "index.html").read_text(encoding="utf-8")

    # meta สำหรับ iPad (Add to Home Screen แบบเต็มจอ) — ไม่กระทบ style/JS ที่แสดงผล
    html = html.replace(
        '<meta name="viewport" content="width=device-width,initial-scale=1"/>',
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>\n'
        '<meta name="apple-mobile-web-app-capable" content="yes"/>\n'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>\n'
        '<meta name="apple-mobile-web-app-title" content="BoxBox"/>',
        1,
    )

    # แทรก demo script ก่อนสคริปต์ของแอปทั้งหมด
    html = html.replace(
        '<script src="js/utils.js"></script>',
        '<script src="js/demo-data.js"></script>\n'
        '<script src="js/demo-shim.js"></script>\n'
        '<script src="js/utils.js"></script>',
        1,
    )
    (OUT / "index.html").write_text(html, encoding="utf-8")

    mb = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file()) / 1e6
    print(f"built {OUT} ({mb:.1f} MB) — publish เป็น GitHub Pages จากโฟลเดอร์ docs/")


if __name__ == "__main__":
    main()
