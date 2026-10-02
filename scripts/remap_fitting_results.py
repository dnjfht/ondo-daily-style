"""카탈로그 이미지 수정(신발 사진 재배치)에 맞춰 생성된 착용 결과를 올바른 상품 variant로 옮긴다.
usage: python3 remap_results.py <results_dir> <orig_jobs.csv> <catalog_fix.json> <out_dir>"""
import csv, json, os, shutil, sys
res, jobs_csv, fix_json, out = sys.argv[1:5]
fix = json.load(open(fix_json)); remap = fix["remap_shoes"]
hide = set(fix["hide_no_image"]["shoes"] + fix["hide_no_image"]["bag"]) | set(fix.get("regenerated_drop_old_results", []))
jobs = list(csv.DictReader(open(jobs_csv, encoding="utf-8")))
slug = lambda r: r["image_path"].split("/")[2]
vinfo = {r["variant_id"]: r for r in jobs}
by_pc = {}
for r in jobs: by_pc.setdefault((slug(r), r["color"]), r)
targets = {}
for p, s in remap.items(): targets.setdefault(s, []).append(p)
rows = list(csv.DictReader(open(os.path.join(res, "manifest.csv"), encoding="utf-8")))
outrows = []; stats = {"kept": 0, "moved": 0, "dropped": 0}
for r in rows:
    j = vinfo[r["variant_id"]]; s = slug(j)
    dests = []
    if s not in remap and s not in hide: dests.append(s)          # 원래 맞던 상품
    dests += [p for p in targets.get(s, []) if p not in hide]      # 이 사진이 실제로 속한 상품
    if not dests: stats["dropped"] += 1; continue
    for p in dests:
        tj = by_pc.get((p, j["color"]))
        if not tj: stats["dropped"] += 1; continue
        src = os.path.join(res, r["file"]); rel = f"{r['body']}_{r['tone']}/{tj['variant_id']}.png"
        os.makedirs(os.path.join(out, os.path.dirname(rel)), exist_ok=True); shutil.copyfile(src, os.path.join(out, rel))
        nr = dict(r); nr.update(variant_id=tj["variant_id"], product_id=tj["product_id"], name=tj["name"], subtype=tj["subtype"], file=rel)
        outrows.append(nr); stats["kept" if p == s else "moved"] += 1
with open(os.path.join(out, "manifest.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(outrows)
print(stats, "→", len(outrows), "rows")
