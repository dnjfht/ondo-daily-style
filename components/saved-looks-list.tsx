"use client";

import { useState } from "react";
import type { ProductCategory, ProductLink, SavedLookRecord } from "@/lib/types";

const situationLabel = { daily: "데일리", work: "출근", date: "데이트" } as const;
const categories: { key: ProductCategory; label: string; section: string }[] = [
  { key: "outer", label: "아우터", section: "OUTER" },
  { key: "top", label: "상의", section: "TOP" },
  { key: "bottom", label: "하의", section: "BOTTOM" },
  { key: "shoes", label: "신발", section: "SHOES" },
  { key: "accessory", label: "가방 · 캡", section: "BAG & CAP" },
];
const preferenceLabel = {
  mood: { minimal: "미니멀", casual: "캐주얼", classic: "클래식", street: "스트리트", unknown: "트렌드 미니멀 베이직" },
  silhouette: { balanced: "균형 잡힌 기본 핏", relaxed: "여유 있는 실루엣", defined: "라인을 살린 실루엣", unknown: "트렌드 균형 핏" },
  colorDepth: { neutral: "뉴트럴 기본 컬러", soft: "부드러운 저채도 컬러", bold: "선명한 포인트 컬러", unknown: "트렌드 뉴트럴 컬러" },
  activity: { low: "낮은 활동량 · 편안함 중심", medium: "보통 활동량 · 균형 중심", high: "높은 활동량 · 활동성 중심", unknown: "트렌드 데일리 활동량" },
} as const;

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 16 16" width="14"><path d={expanded ? "m4 10 4-4 4 4" : "m4 6 4 4 4-4"} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

function CloseIcon() {
  return <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 16 16" width="14"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>;
}

function fallbackLinks(look: SavedLookRecord): ProductLink[] {
  return look.items.map((item, index) => ({
    merchant: "네이버 쇼핑",
    category: categories[index]?.key ?? "accessory",
    label: `${categories[index]?.label ?? "아이템"} · ${item} 검색 결과`,
    url: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(item)}`,
  }));
}

export function SavedLooksList({ initialLooks }: { initialLooks: SavedLookRecord[] }) {
  const [looks, setLooks] = useState(initialLooks);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deleteLook = async (look: SavedLookRecord) => {
    setDeletingKey(look.databaseKey);
    setError(null);
    try {
      const response = await fetch("/api/saved-looks", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ lookKey: look.databaseKey }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "룩 삭제에 실패했습니다.");
      setLooks((current) => current.filter((item) => item.databaseKey !== look.databaseKey));
      if (expandedKey === look.databaseKey) setExpandedKey(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "룩 삭제에 실패했습니다.");
    } finally {
      setDeletingKey(null);
    }
  };

  if (!looks.length) return <p className="saved-looks-empty">아직 저장한 룩이 없어요. 마음에 드는 오늘의 코디를 저장해 보세요.</p>;

  return <><div className="saved-looks-grid">{looks.map((look) => {
    const expanded = expandedKey === look.databaseKey;
    const products = look.products?.length ? look.products : fallbackLinks(look);
    const byCategory = (category: ProductCategory) => products.filter((product) => product.category === category);
    const merchantGroups = [...new Set(products.filter((product) => product.merchant !== "네이버 쇼핑").map((product) => product.merchant))].map((merchant) => [merchant, products.filter((product) => product.merchant === merchant)] as const);
    const preferences = look.stylePreferences ?? { mood: "unknown", silhouette: "unknown", colorDepth: "unknown", activity: "unknown" };
    return <article className={`saved-look ${expanded ? "expanded" : ""}`} key={look.databaseKey}>
      <div className="saved-look-image" style={{ backgroundImage: `url(${look.imageUrl})` }}><span>{situationLabel[look.situation]}</span><div className="saved-look-controls"><button aria-label={expanded ? "룩 접기" : "룩 자세히 보기"} className="saved-look-control" onClick={() => setExpandedKey(expanded ? null : look.databaseKey)} type="button"><ChevronIcon expanded={expanded} /></button><button aria-label="저장한 룩 삭제" className="saved-look-control delete" disabled={deletingKey === look.databaseKey} onClick={() => void deleteLook(look)} type="button">{deletingKey === look.databaseKey ? "…" : <CloseIcon />}</button></div></div>
      <div className="saved-look-content"><p className="saved-look-date">{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(look.savedAt))}</p><h3>{look.title}</h3><p className="saved-look-weather">{look.weather.city} · {look.weather.temperature}° · 체감 {look.weather.apparent}°</p><p className="saved-look-reason">{look.reason}</p>{expanded && <div className="saved-look-details"><div className="saved-style-signals"><span><b>무드</b>{preferenceLabel.mood[preferences.mood as keyof typeof preferenceLabel.mood] ?? preferenceLabel.mood.unknown}</span><span><b>실루엣</b>{preferenceLabel.silhouette[preferences.silhouette as keyof typeof preferenceLabel.silhouette] ?? preferenceLabel.silhouette.unknown}</span><span><b>색감</b>{preferenceLabel.colorDepth[preferences.colorDepth as keyof typeof preferenceLabel.colorDepth] ?? preferenceLabel.colorDepth.unknown}</span><span><b>활동량</b>{preferenceLabel.activity[preferences.activity as keyof typeof preferenceLabel.activity] ?? preferenceLabel.activity.unknown}</span></div><ol>{look.items.map((item, index) => { const category = categories[index] ?? categories[4]; const links = byCategory(category.key); return <li key={`${category.key}-${item}`}><span>0{index + 1}</span><div><b>{category.section}</b><h4>{item}</h4>{links.length ? <div className="saved-item-links">{links.filter((product) => product.merchant === "네이버 쇼핑").map((product) => <a href={product.url} key={`${product.merchant}-${product.label}`} rel="noreferrer" target="_blank">네이버 쇼핑에서 검색 결과로 이동 ↗</a>)}</div> : <small>관련 상품을 다시 찾아보세요.</small>}</div></li>; })}</ol><div className="saved-swatches">{look.colors.map((color) => <i key={color} style={{ background: color }} />)}<span>저장한 컬러 조합</span></div><div className="saved-merchant-groups">{merchantGroups.map(([merchant, merchantProducts]) => <section key={merchant}><p>{merchant}</p><div>{merchantProducts.map((product) => <a href={product.url} key={product.label} rel="noreferrer" target="_blank">{product.label} ↗</a>)}</div></section>)}</div></div>}</div>
    </article>;
  })}</div>{error && <p className="saved-looks-error" role="status">{error}</p>}</>;
}
