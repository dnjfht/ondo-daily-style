from __future__ import annotations

import csv
import re
from collections import defaultdict
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
IMPORT_PARENT = ROOT / "data" / "catalog-import"
IMPORT_ROOT = next(IMPORT_PARENT.iterdir())
PUBLIC_ROOT = ROOT / "public" / "catalog-v3"
SEED_PATH = ROOT / "supabase" / "migrations" / "0008_catalog_seed.sql"

SOURCES = [
    ("가방", "bags-colors-ko.csv", "bag"),
    ("하의", "pants-colors-ko.csv", "bottom"),
    ("아우터", "outerwear-colors-ko.csv", "outer"),
    ("상의", "clothe-colors-ko.csv", "top"),
    ("신발", "shoes-colors-ko.csv", "shoes"),
]

WARM = ("아이보리", "크림", "베이지", "카멜", "브라운", "코코아", "버터", "옐로우", "오트밀", "올리브", "카키", "골드", "피치", "코랄")
COOL = ("네이비", "블루", "스카이", "라벤더", "민트", "실버", "로즈", "마젠타")
BOTH = ("블랙", "화이트", "그레이", "차콜", "에크루", "데님")


def sql(value: str | int | float | None) -> str:
    if value is None:
        return "null"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + value.replace("'", "''") + "'"


def normalized(value: str) -> str:
    return re.sub(r"\s+", "", value).lower()


def color_match(color: str) -> str:
    if any(term in color for term in BOTH):
        return "both"
    if any(term in color for term in WARM):
        return "warm"
    if any(term in color for term in COOL):
        return "cool"
    return "both"


def includes(name: str, *terms: str) -> bool:
    return any(term in name for term in terms)


def product_attributes(name: str, category: str, raw_subtype: str) -> dict[str, str | int]:
    fit = "relaxed" if includes(name, "와이드", "루즈", "오버", "릴랙스", "박시") else "slim" if includes(name, "슬림", "스키니", "H라인") else "regular"
    length = "cropped" if includes(name, "크롭", "볼레로") else "long" if includes(name, "롱", "맥시") else "midi" if includes(name, "미디") else "short" if includes(name, "숏", "미니", "쇼츠") else "regular"
    neckline = "v" if includes(name, "브이넥", "V넥") else "square" if includes(name, "스퀘어") else "collar" if includes(name, "셔츠", "카라", "폴로") else "crew" if includes(name, "라운드", "크루") else "none" if category in ("bottom", "shoes", "bag") else "unknown"
    waist = "defined" if includes(name, "벨티드", "랩", "허리", "핀턱", "페플럼") else "subtle" if includes(name, "크롭", "셋업") else "none"
    material = "denim" if includes(name, "데님", "진") else "knit" if includes(name, "니트", "가디건") else "linen" if includes(name, "린넨") else "tweed" if includes(name, "트위드") else "cotton" if includes(name, "코튼", "저지") else "leather" if includes(name, "레더", "가죽") else "unknown"
    formal = "formal" if includes(name, "펌프스", "힐", "이브닝", "새틴") else "smart" if includes(name, "트위드", "테일러드", "블라우스", "셔츠", "슬랙스", "로퍼", "트렌치", "토트", "진주") else "casual"
    warmth, breathable, wind, water = 1, 2, 0, "none"
    if category == "outer":
        warmth, breathable, wind = 2, 2, 1
        if includes(name, "패딩", "파카", "야상"): warmth, wind = 4, 3
        elif includes(name, "코트"): warmth, wind = 3, 2
        elif includes(name, "트렌치", "아노락", "점퍼"): warmth, wind = 2, 2
        if includes(name, "바람막이", "아노락", "파카"): water = "light"
    elif category == "top":
        if includes(name, "나시", "슬리브리스"): warmth, breathable = 0, 4
        elif includes(name, "반팔", "티셔츠"): warmth, breathable = 1, 4
        elif includes(name, "니트", "맨투맨"): warmth, breathable = 2, 1
    elif category == "bottom":
        if includes(name, "쇼츠", "반바지"): warmth, breathable = 0, 4
        elif includes(name, "데님", "코듀로이", "니트"): warmth, breathable = 2, 1
    elif category == "shoes":
        if includes(name, "샌들", "슬리퍼", "뮬"): warmth, breathable = 0, 4
        elif includes(name, "겨울", "롱부츠", "앵클부츠", "부츠"): warmth, wind = 3, 2
        if includes(name, "레인"): water = "rain"
    return {"fit": fit, "length": length, "neckline": neckline, "waist": waist, "material": material, "formality": formal, "warmth": warmth, "breathable": breathable, "wind": wind, "water": water, "subtype": raw_subtype}


def weather_profile(name: str, category: str, attributes: dict[str, str | int]) -> tuple[int, int, int, int, str, str]:
    if category == "bag":
        return (0, 35, 100, 20, "rain_ok", "stable")
    if category == "outer":
        if attributes["warmth"] == 4:
            return (-8, 12, 85, 12, "light_ok", "layerable")
        if attributes["warmth"] == 3:
            return (0, 17, 80, 10, "light_ok", "layerable")
        return (10, 23, 75, 7, "light_ok" if attributes["water"] != "none" else "none", "layerable")
    if category == "top":
        if attributes["warmth"] == 0:
            return (22, 35, 85, 5, "none", "stable")
        if attributes["warmth"] == 1:
            return (18, 30, 80, 6, "none", "stable")
        return (10, 23, 75, 6, "none", "layerable")
    if category == "bottom":
        if includes(name, "쇼츠", "반바지"):
            return (22, 35, 85, 6, "none", "stable")
        if includes(name, "스커트"):
            return (14, 28, 80, 7, "none", "stable")
        return (8, 26, 80, 8, "none", "stable")
    if includes(name, "레인"):
        return (5, 27, 100, 14, "rain_ok", "stable")
    if attributes["warmth"] == 0:
        return (20, 35, 85, 6, "none", "stable")
    if attributes["warmth"] >= 3:
        return (-8, 16, 80, 10, "light_ok", "stable")
    return (8, 28, 80, 8, "none", "stable")


def tags_for(name: str, category: str, attributes: dict[str, str | int]) -> list[tuple[str, str, int, str]]:
    structured = attributes["formality"] in ("smart", "formal") or includes(name, "테일러드", "트위드", "슬랙스", "로퍼")
    relaxed = attributes["fit"] in ("relaxed", "oversized") or includes(name, "데님", "스니커즈", "백팩")
    soft = attributes["waist"] in ("defined", "subtle") or includes(name, "드레이프", "새틴", "플리츠", "메리제인")
    body = [("body_type", "straight", 2 if structured else 1, "body-fit-editorial"), ("body_type", "wave", 2 if soft else 1, "body-fit-editorial"), ("body_type", "natural", 2 if relaxed else 1, "body-fit-editorial")]
    mood = [("mood", "minimal", 2 if attributes["formality"] != "casual" or includes(name, "미니멀", "심플") else 1, "style-editorial"), ("mood", "casual", 3 if relaxed or category in ("shoes", "bag") else 1, "style-editorial"), ("mood", "classic", 3 if structured else 1, "style-editorial"), ("mood", "street", 3 if includes(name, "데님", "스니커즈", "카고", "볼캡", "백팩") else 0, "style-editorial")]
    silhouette = [("silhouette", "balanced", 2, "body-fit-editorial"), ("silhouette", "relaxed", 3 if relaxed else 1, "body-fit-editorial"), ("silhouette", "defined", 3 if soft or attributes["fit"] == "slim" else 1, "body-fit-editorial")]
    situation = [("situation", "daily", 3, "style-editorial"), ("situation", "work", 3 if structured else 1, "style-editorial"), ("situation", "date", 3 if soft or attributes["formality"] == "formal" else 1, "style-editorial")]
    return body + mood + silhouette + situation


def find_source_image(category_dir: Path, row: dict[str, str], image_index: dict[str, list[Path]]) -> Path:
    declared = category_dir / row["image"]
    if declared.exists():
        return declared
    filename = Path(row["image"]).name
    candidates = image_index.get(filename, [])
    name = normalized(row["product_name"])
    named = [path for path in candidates if name in normalized(str(path))]
    if named:
        return named[0]
    if candidates:
        return candidates[0]
    raise FileNotFoundError(f"Image not found for {row['product_id']} / {row['image']}")


def copy_webp(source: Path, target: Path) -> bool:
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        with Image.open(source) as image:
            image.thumbnail((384, 384))
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGBA" if "transparency" in image.info else "RGB")
            image.save(target, "WEBP", quality=65, method=0)
        return True
    except OSError:
        target.unlink(missing_ok=True)
        return False


def main() -> None:
    generate_assets = not PUBLIC_ROOT.exists()
    if generate_assets:
        PUBLIC_ROOT.mkdir(parents=True)
    product_rows: dict[str, dict[str, object]] = {}
    variant_rows: list[dict[str, str]] = []
    for folder, filename, category in SOURCES:
        category_dir = IMPORT_ROOT / folder
        with (category_dir / filename).open(encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
        image_index: dict[str, list[Path]] = defaultdict(list)
        for image in category_dir.rglob("*.png"):
            image_index[image.name].append(image)
        for index, row in enumerate(rows):
            raw_subtype = row.get("category") or row.get("product_type") or category
            source_id = row["product_id"]
            if source_id not in product_rows:
                attributes = product_attributes(row["product_name"], category, raw_subtype)
                product_rows[source_id] = {"source_id": source_id, "name": row["product_name"], "category": category, "attributes": attributes}
            source_image = find_source_image(category_dir, row, image_index)
            output_relative = Path(category) / source_id / f"{index:03d}.webp"
            output_path = PUBLIC_ROOT / output_relative
            if (generate_assets and copy_webp(source_image, output_path)) or (not generate_assets and output_path.exists()):
                variant_rows.append({"source_id": source_id, "color": row["color"], "path": "/catalog-v3/" + output_relative.as_posix(), "match": color_match(row["color"])})

    lines = ["-- Generated from the user-provided 20대 여성 쇼핑몰 제품 데이터 archive.", "begin;", ""]
    lines += [
        "insert into public.recommendation_rationales (rule_code, evidence_type, source_url, explanation) values",
        "('weather-nws', 'official', 'https://www.weather.gov/safety/heat-index', '체감온도·습도·바람·강수 조건을 의류 착용 맥락에 반영하는 운영 규칙.'),",
        "('body-fit-editorial', 'research', 'https://pubmed.ncbi.nlm.nih.gov/33719914/', '체형은 절대적 제외 기준이 아닌 착용 비율과 선호 실루엣을 위한 가점 태그로만 사용한다.'),",
        "('style-editorial', 'editorial', null, '상품명·세부 유형·구조를 바탕으로 운영자가 검토 가능한 무드·상황 태그를 부여한다.')",
        "on conflict (rule_code) do update set evidence_type = excluded.evidence_type, source_url = excluded.source_url, explanation = excluded.explanation, reviewed_at = now();",
        "",
    ]
    def batches(rows: list[tuple[object, ...]], size: int = 150):
        for offset in range(0, len(rows), size):
            yield rows[offset:offset + size]

    products: list[tuple[object, ...]] = []
    weather_rows: list[tuple[object, ...]] = []
    tag_rows: list[tuple[object, ...]] = []
    for product in product_rows.values():
        attributes = product["attributes"]
        assert isinstance(attributes, dict)
        source_id = str(product["source_id"])
        products.append((source_id, product["name"], product["category"], attributes["subtype"], attributes["fit"], attributes["length"], attributes["neckline"], attributes["waist"], attributes["material"], attributes["formality"], attributes["warmth"], attributes["breathable"], attributes["wind"], attributes["water"]))
        temp_min, temp_max, humidity, wind, precipitation, diurnal = weather_profile(str(product["name"]), str(product["category"]), attributes)
        weather_rows.append((source_id, temp_min, temp_max, humidity, wind, precipitation, diurnal))
        tag_rows.extend((source_id, dimension, value, score, rationale) for dimension, value, score, rationale in tags_for(str(product["name"]), str(product["category"]), attributes))

    columns = "source_product_id, name, category, subtype, fit, length, neckline, waist_definition, material, formality, warmth_level, breathability_level, wind_block_level, water_resistance"
    for batch in batches(products):
        values = ",\n".join(f"({', '.join(sql(value) for value in row)})" for row in batch)
        lines.append(f"insert into public.catalog_products ({columns}) values\n{values}\non conflict (source_product_id) do update set name = excluded.name, category = excluded.category, subtype = excluded.subtype, fit = excluded.fit, length = excluded.length, neckline = excluded.neckline, waist_definition = excluded.waist_definition, material = excluded.material, formality = excluded.formality, warmth_level = excluded.warmth_level, breathability_level = excluded.breathability_level, wind_block_level = excluded.wind_block_level, water_resistance = excluded.water_resistance, updated_at = now();")
    lines.append("")
    for batch in batches([(row["source_id"], row["color"], row["path"], row["match"]) for row in variant_rows]):
        values = ",\n".join(f"({', '.join(sql(value) for value in row)})" for row in batch)
        lines.append(f"with seed(source_product_id, color_name, image_path, personal_color_match) as (values\n{values}\n) insert into public.catalog_variants (product_id, color_name, image_path, personal_color_match) select p.id, seed.color_name, seed.image_path, seed.personal_color_match from seed join public.catalog_products p on p.source_product_id = seed.source_product_id on conflict (product_id, color_name) do update set image_path = excluded.image_path, personal_color_match = excluded.personal_color_match;")
    lines.append("")
    for batch in batches(weather_rows):
        values = ",\n".join(f"({', '.join(sql(value) for value in row)})" for row in batch)
        lines.append(f"with seed(source_product_id, apparent_temp_min, apparent_temp_max, humidity_max, wind_max_mps, precipitation, diurnal_range) as (values\n{values}\n) insert into public.catalog_weather_rules (product_id, apparent_temp_min, apparent_temp_max, humidity_max, wind_max_mps, precipitation, diurnal_range, score, rationale_id) select p.id, seed.apparent_temp_min, seed.apparent_temp_max, seed.humidity_max, seed.wind_max_mps, seed.precipitation, seed.diurnal_range, 3, r.id from seed join public.catalog_products p on p.source_product_id = seed.source_product_id cross join public.recommendation_rationales r where r.rule_code = 'weather-nws' on conflict (product_id) do update set apparent_temp_min = excluded.apparent_temp_min, apparent_temp_max = excluded.apparent_temp_max, humidity_max = excluded.humidity_max, wind_max_mps = excluded.wind_max_mps, precipitation = excluded.precipitation, diurnal_range = excluded.diurnal_range, score = excluded.score, rationale_id = excluded.rationale_id;")
    lines.append("")
    for batch in batches(tag_rows):
        values = ",\n".join(f"({', '.join(sql(value) for value in row)})" for row in batch)
        lines.append(f"with seed(source_product_id, dimension, value, score, rationale_code) as (values\n{values}\n) insert into public.catalog_tags (product_id, dimension, value, score, rationale_id) select p.id, seed.dimension, seed.value, seed.score, r.id from seed join public.catalog_products p on p.source_product_id = seed.source_product_id join public.recommendation_rationales r on r.rule_code = seed.rationale_code on conflict (product_id, dimension, value) do update set score = excluded.score, rationale_id = excluded.rationale_id;")
    lines += ["", "commit;", ""]
    SEED_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"products={len(product_rows)} variants={len(variant_rows)}")
    print(f"assets={len(list(PUBLIC_ROOT.rglob('*.webp')))} seed={SEED_PATH}")


if __name__ == "__main__":
    main()
