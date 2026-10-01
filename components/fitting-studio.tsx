"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogProductCategory, CatalogProductRecommendation, Situation } from "@/lib/types";

export type FittingDiagnosis = { body: "straight" | "wave" | "natural" | null; tone: "warm" | "cool" | null };
export type FittingSignals = { situation: Situation; apparent: number; humidity: number; wind: number; precipitation: number; precipitationProbability: number; dailyRange: number };
type FittingStudioProps = { diagnosis: FittingDiagnosis; signals: FittingSignals; initialProductId?: string; initialSourceProductId?: string; initialColorName?: string };

const categoryLabels: Record<CatalogProductCategory, string> = { outer: "아우터", top: "상의", bottom: "하의", shoes: "신발", bag: "가방" };
const bodyLabels: Record<NonNullable<FittingDiagnosis["body"]>, string> = { straight: "스트레이트", wave: "웨이브", natural: "내추럴" };
const toneLabels: Record<NonNullable<FittingDiagnosis["tone"]>, string> = { warm: "웜", cool: "쿨" };
const situationLabels: Record<Situation, string> = { daily: "데일리", work: "출근", date: "데이트" };

function queryForSignals(signals: FittingSignals) { return new URLSearchParams({ situation: signals.situation, apparent: String(signals.apparent), humidity: String(signals.humidity), wind: String(signals.wind), precipitation: String(signals.precipitation), precipitationProbability: String(signals.precipitationProbability), dailyRange: String(signals.dailyRange) }); }

export function FittingStudio({ diagnosis, signals, initialProductId, initialSourceProductId, initialColorName }: FittingStudioProps) {
  const [products, setProducts] = useState<CatalogProductRecommendation[]>([]); const [selectedId, setSelectedId] = useState(initialProductId ?? ""); const [activeCategory, setActiveCategory] = useState<CatalogProductCategory | "all">("all"); const [status, setStatus] = useState<"loading" | "ready" | "error">("loading"); const [scanStep, setScanStep] = useState<"idle" | "scanning" | "done">("idle"); const [notice, setNotice] = useState(""); const [fittedImageUrl, setFittedImageUrl] = useState<string | null>(null); const scanRequest = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/catalog-recommendations?${queryForSignals(signals)}`, { signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error("추천 상품을 불러오지 못했습니다."); return response.json() as Promise<{ groups: Record<CatalogProductCategory, CatalogProductRecommendation[]> }>; }).then((catalog) => { if (controller.signal.aborted) return; const nextProducts = Object.values(catalog.groups).flat(); setProducts(nextProducts); const initial = nextProducts.find((product) => product.productId === initialProductId) ?? nextProducts.find((product) => product.sourceProductId === initialSourceProductId && product.colorName === initialColorName) ?? nextProducts[0]; if (initial) setSelectedId(initial.productId); setStatus("ready"); }).catch((error: unknown) => { if (controller.signal.aborted || error instanceof DOMException && error.name === "AbortError") return; setStatus("error"); setNotice("추천 상품을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."); });
    return () => controller.abort();
  }, [signals, initialColorName, initialProductId, initialSourceProductId]);
  const selected = products.find((product) => product.productId === selectedId) ?? null;
  const filteredProducts = useMemo(() => activeCategory === "all" ? products : products.filter((product) => product.category === activeCategory), [activeCategory, products]);
  const avatarPath = diagnosis.body && diagnosis.tone ? `/fitting/avatars/${diagnosis.body}_${diagnosis.tone}_lower_base.png` : null;
  async function chooseProduct(product: CatalogProductRecommendation) {
    const requestId = scanRequest.current + 1;
    scanRequest.current = requestId;
    setSelectedId(product.productId);
    setFittedImageUrl(null);
    setNotice("");
    if (!diagnosis.body || !diagnosis.tone) return;
    setScanStep("scanning");
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    try {
      const params = new URLSearchParams({ body: diagnosis.body, tone: diagnosis.tone, variantId: product.variantId });
      const response = await fetch(`/api/fitting-results?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("cache lookup failed");
      const payload = await response.json() as { result: { imageUrl: string } | null };
      if (scanRequest.current !== requestId) return;
      setScanStep("done");
      if (payload.result?.imageUrl) {
        setFittedImageUrl(payload.result.imageUrl);
        setNotice(`${product.name}의 생성형 피팅 결과를 불러왔습니다.`);
      } else {
        setNotice(`${product.name}은 아직 시연용 생성 캐시에 없습니다. 기본 아바타로 상품 정보를 확인할 수 있습니다.`);
      }
    } catch {
      if (scanRequest.current !== requestId) return;
      setScanStep("done");
      setNotice("피팅 캐시를 확인하지 못했습니다. 기본 아바타와 상품 정보를 계속 보여드립니다.");
    }
  }
  if (!diagnosis.body || !diagnosis.tone || !avatarPath) return <main className="fitting-page"><header className="fitting-topbar"><Link className="brand" href="/">ondo<sup>°</sup></Link><Link href="/">오늘의 코디로 돌아가기</Link></header><section className="fitting-empty"><p className="eyebrow">AI VIRTUAL FITTING</p><h1>스타일 분석을 먼저<br />완료해 주세요.</h1><p>가상 피팅은 저장된 골격 유형과 퍼스널컬러 결과를 바탕으로 아바타를 자동 선택합니다.</p><Link className="primary" href="/profile">나의 스타일 분석하기 ↗</Link></section></main>;
  const displayedImage = fittedImageUrl ?? avatarPath;
  return <main className="fitting-page"><header className="fitting-topbar"><Link className="brand" href="/">ondo<sup>°</sup></Link><span>AI VIRTUAL FITTING</span><Link href="/">오늘의 코디로 돌아가기</Link></header><section className="fitting-app" aria-label="ONDO AI 가상 피팅"><aside className="fitting-detail"><p className="eyebrow">SELECTED ITEM</p>{selected ? <><img src={selected.imagePath} alt={`${selected.name} ${selected.colorName}`} /><span>{categoryLabels[selected.category]} · {selected.colorName}</span><h1>{selected.name}</h1><p>{selected.reasons.join(" · ")}</p><dl><div><dt>피팅 모델</dt><dd>{bodyLabels[diagnosis.body]} · {toneLabels[diagnosis.tone]} 톤</dd></div><div><dt>추천 근거</dt><dd>오늘의 날씨와 저장된 진단 결과를 반영했습니다.</dd></div></dl><button className="fitting-action" onClick={() => chooseProduct(selected)} type="button">이 상품 스캔하기</button></> : <p className="fitting-loading">{status === "loading" ? "추천 상품을 불러오는 중입니다…" : "추천 상품이 없습니다."}</p>}</aside><section className="fitting-stage"><div className="fitting-diagnosis"><b>{bodyLabels[diagnosis.body]} · {toneLabels[diagnosis.tone]}</b><span>{situationLabels[signals.situation]} · 체감 {signals.apparent}°</span></div><div className="fitting-model"><img className={fittedImageUrl ? "fitted" : undefined} src={displayedImage} alt={fittedImageUrl ? `${selected?.name ?? "선택 상품"} 피팅 결과` : `${bodyLabels[diagnosis.body]} ${toneLabels[diagnosis.tone]} 모델`} />{scanStep === "scanning" && <div className="fitting-scan" aria-live="polite"><i /><div><b>AI 피팅 스캔 중</b><span>시연용 결과 캐시를 확인하고 있습니다.</span></div></div>}{scanStep === "done" && selected && <div className="fitting-selected-chip"><img src={selected.imagePath} alt="" /><span>{fittedImageUrl ? "피팅 완료" : "선택 완료"}<br /><b>{selected.name}</b></span></div>}</div><p className="fitting-stage-note">로즈 카페 배경의 생성형 아바타입니다. 결과가 캐시에 있을 때만 실제 피팅 이미지로 바뀝니다.</p>{notice && <p className="fitting-notice" role="status">{notice}</p>}</section><aside className="fitting-rack"><div><p className="eyebrow">ONDO CATALOG</p><h2>오늘 추천 상품</h2><span>{products.length ? `${products.length}개 상품` : "상품 불러오는 중"}</span></div><nav className="fitting-categories" aria-label="상품 카테고리"><button className={activeCategory === "all" ? "selected" : ""} onClick={() => setActiveCategory("all")} type="button">전체</button>{(Object.keys(categoryLabels) as CatalogProductCategory[]).map((category) => <button className={activeCategory === category ? "selected" : ""} key={category} onClick={() => setActiveCategory(category)} type="button">{categoryLabels[category]}</button>)}</nav><div className="fitting-product-list">{filteredProducts.map((product) => <button className={selected?.productId === product.productId ? "selected" : ""} key={product.variantId} onClick={() => chooseProduct(product)} type="button"><img src={product.imagePath} alt="" /><span>{product.name}</span><small>{product.colorName}</small></button>)}{status === "error" && <p className="fitting-notice">{notice}</p>}</div></aside></section></main>;
}
