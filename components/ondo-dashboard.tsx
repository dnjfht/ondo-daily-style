"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogProductCategory, CatalogProductRecommendation, Outfit, SavedLookSnapshot, Situation } from "@/lib/types";
import { recommendOutfit, situationLookImages } from "@/lib/recommendation";
import { savedLookKey, seoulDateKey } from "@/lib/saved-look";
import type { SavedLookKeyEntry } from "@/lib/types";
import { MainVisualSlider } from "@/components/main-visual-slider";

const labels: Record<Situation, string> = { daily: "데일리", work: "출근", date: "데이트" };
const cities = ["seoul", "busan", "daegu", "jeju"] as const;
const cityNames: Record<(typeof cities)[number], string> = { seoul: "서울", busan: "부산", daegu: "대구", jeju: "제주" };
const cityStorageKey = "ondo-selected-city";
type Weather = { temperature: number; apparent: number; humidity: number; wind: number; precipitation: number; precipitationProbability: number; min: number; max: number; city: string };
type StyleProfile = {
  personalColor: string | null;
  bodyType: string | null;
  personalColorAiResult: string | null;
  bodyTypeAiResult: string | null;
  personalColorSource: string | null;
  bodyTypeSource: string | null;
  preferredStyle: string | null;
  stylePreferences: Record<string, string> | null;
  analysisCompletedAt: string | null;
};
const colorLabels: Record<string, string> = { warm: "웜", cool: "쿨" };
const bodyLabels: Record<string, string> = { straight: "스트레이트", wave: "웨이브", natural: "내추럴" };
const catalogLabels: Record<CatalogProductCategory, string> = { outer: "아우터", top: "상의", bottom: "하의", shoes: "신발", bag: "가방" };
const catalogOrder: CatalogProductCategory[] = ["outer", "top", "bottom", "shoes", "bag"];

export function OndoDashboard({ outfits, signedIn, styleProfile, savedLookEntries }: { outfits: Outfit[]; signedIn: boolean; styleProfile: StyleProfile | null; savedLookEntries: SavedLookKeyEntry[] }) {
  const [situation, setSituation] = useState<Situation>("daily");
  const [city, setCity] = useState<(typeof cities)[number]>("seoul");
  const [cityOpen, setCityOpen] = useState(false);
  const [cityReady, setCityReady] = useState(false);
  const cityRef = useRef<(typeof cities)[number]>("seoul");
  const [savedLooks, setSavedLooks] = useState<SavedLookKeyEntry[]>(savedLookEntries);
  const [savingLookId, setSavingLookId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [weather, setWeather] = useState<Weather>({ temperature: 25, apparent: 26, humidity: 59, wind: 2.16, precipitation: 0, precipitationProbability: 0, min: 19, max: 28, city: "서울" });
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [catalogGroups, setCatalogGroups] = useState<Record<CatalogProductCategory, CatalogProductRecommendation[]>>({ outer: [], top: [], bottom: [], shoes: [], bag: [] });
  const [catalogTab, setCatalogTab] = useState<CatalogProductCategory>("outer"); // 화면 구성 전용: 한 번에 한 카테고리만 보여준다
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const catalogRequestId = useRef(0);
  const [dailyVariation] = useState(() => Number(seoulDateKey(new Date()).replaceAll("-", "")));
  const recommendationProfile = styleProfile ? {
    personalColor: styleProfile.personalColorSource === "ai" ? styleProfile.personalColorAiResult ?? styleProfile.personalColor : styleProfile.personalColor,
    bodyType: styleProfile.bodyTypeSource === "ai" ? styleProfile.bodyTypeAiResult ?? styleProfile.bodyType : styleProfile.bodyType,
    preferredStyle: styleProfile.preferredStyle,
    stylePreferences: styleProfile.stylePreferences,
  } : null;
  const lead = useMemo(() => recommendOutfit(situation, weather.apparent, recommendationProfile, dailyVariation), [situation, weather.apparent, recommendationProfile, dailyVariation]);
  const liveOutfits = useMemo(() => (Object.keys(labels) as Situation[]).map((key, index) => recommendOutfit(key, weather.apparent, recommendationProfile, dailyVariation + index)), [weather.apparent, recommendationProfile, dailyVariation]);

  async function refreshWeather(requestedCity = city) {
    setWeatherLoading(true);
    try {
      const response = await fetch(`/api/weather?city=${requestedCity}`);
      const payload = await response.json();
      if (payload.current && cityRef.current === requestedCity) setWeather({
        temperature: Math.round(payload.current.temperature_2m),
        apparent: Math.round(payload.current.apparent_temperature),
        humidity: payload.current.relative_humidity_2m,
        wind: payload.current.wind_speed_10m,
        precipitation: payload.current.precipitation ?? 0,
        precipitationProbability: payload.daily?.precipitation_probability_max?.[0] ?? 0,
        min: Math.round(payload.daily?.temperature_2m_min?.[0] ?? payload.current.temperature_2m - 4),
        max: Math.round(payload.daily?.temperature_2m_max?.[0] ?? payload.current.temperature_2m + 4),
        city: payload.city,
      });
    } finally { setWeatherLoading(false); }
  }

  useEffect(() => {
    const storedCity = window.localStorage.getItem(cityStorageKey);
    if (storedCity && cities.includes(storedCity as (typeof cities)[number])) setCity(storedCity as (typeof cities)[number]);
    setCityReady(true);
  }, []);
  useEffect(() => { cityRef.current = city; }, [city]);
  useEffect(() => {
    if (cityReady) window.localStorage.setItem(cityStorageKey, city);
  }, [city, cityReady]);
  useEffect(() => {
    if (!cityReady) return;
    setWeather((current) => ({ ...current, city: cityNames[city] }));
    void refreshWeather(city);
  }, [city, cityReady]);
  const temperatureGap = weather.max - weather.min;
  const personalColor = styleProfile?.personalColorSource === "ai" ? styleProfile.personalColorAiResult ?? styleProfile.personalColor : styleProfile?.personalColor;
  const bodyType = styleProfile?.bodyTypeSource === "ai" ? styleProfile.bodyTypeAiResult ?? styleProfile.bodyType : styleProfile?.bodyType;
  const colorExpertResult = Boolean(styleProfile?.personalColorAiResult && styleProfile?.personalColorSource === "ai");
  const bodyExpertResult = Boolean(styleProfile?.bodyTypeAiResult && styleProfile?.bodyTypeSource === "ai");
  const hasAnalysis = Boolean(styleProfile?.analysisCompletedAt);
  const popularFallback = Boolean(styleProfile?.preferredStyle === "unknown" || ["silhouette", "color_depth"].some((key) => styleProfile?.stylePreferences?.[key] === "unknown"));
  const needsOuter = weather.apparent < 20;
  const outerWeatherNote = weather.apparent >= 24
    ? "따뜻한 날이에요. 통기성 좋은 상의로 가볍게 입어요."
    : weather.apparent >= 16
      ? "가벼운 재킷이나 가디건이 좋아요. 바람이 강하면 얇은 트렌치까지 고려하고, 두꺼운 겨울 코트와 부츠는 제외해요."
      : "쌀쌀한 날이에요. 한 겹 더 걸칠 아우터와 보온감 있는 신발을 함께 살펴보세요.";
  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++catalogRequestId.current;
    const query = new URLSearchParams({
      situation,
      apparent: String(weather.apparent),
      humidity: String(weather.humidity),
      wind: String(weather.wind),
      precipitation: String(weather.precipitation),
      precipitationProbability: String(weather.precipitationProbability),
      dailyRange: String(temperatureGap),
    });
    setCatalogLoading(true);
    setCatalogError(null);
    void fetch(`/api/catalog-recommendations?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as { groups?: Record<CatalogProductCategory, CatalogProductRecommendation[]>; error?: string };
        if (!response.ok || !payload.groups) throw new Error(payload.error ?? "상품 카탈로그를 불러오지 못했습니다.");
        // 도시·날씨가 연달아 바뀔 때 이전 요청이 늦게 도착해 최신 결과를
        // 빈 배열로 덮어쓰지 못하도록, 가장 마지막 요청만 반영합니다.
        if (controller.signal.aborted || requestId !== catalogRequestId.current) return;
        setCatalogGroups(Object.fromEntries(catalogOrder.map((category) => [category, Array.isArray(payload.groups?.[category]) ? payload.groups[category] : []])) as Record<CatalogProductCategory, CatalogProductRecommendation[]>);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (controller.signal.aborted || requestId !== catalogRequestId.current) return;
        setCatalogError(error instanceof Error ? error.message : "상품 카탈로그를 불러오지 못했습니다.");
      })
      .finally(() => { if (!controller.signal.aborted && requestId === catalogRequestId.current) setCatalogLoading(false); });
    return () => controller.abort();
  }, [situation, weather.apparent, weather.humidity, weather.wind, weather.precipitation, weather.precipitationProbability, temperatureGap]);
  const lookKeyFor = (outfit: Outfit) => savedLookKey(outfit.id, new Date(), city);
  const savedEntryFor = (outfit: Outfit) => savedLooks.find((entry) => entry.canonicalKey === lookKeyFor(outfit));
  const isSaved = (outfit: Outfit) => Boolean(savedEntryFor(outfit));
  const toggleSavedLook = async (outfit: Outfit) => {
    if (!signedIn) {
      setSaveError("룩을 저장하려면 먼저 로그인해 주세요.");
      return;
    }

    const canonicalKey = lookKeyFor(outfit);
    const existingEntry = savedEntryFor(outfit);
    const lookKey = existingEntry?.storedKey ?? canonicalKey;
    const wasSaved = Boolean(existingEntry);
    const snapshot: SavedLookSnapshot = {
      id: outfit.id,
      lookKey,
      title: outfit.title,
      subtitle: outfit.subtitle,
      styleTag: outfit.styleTag,
      situation: outfit.situation,
      imageUrl: situationLookImages[outfit.situation] ?? outfit.imageUrl,
      colors: outfit.colors,
      reason: outfit.reason,
      items: outfit.items,
      // 외부 쇼핑몰 검색 링크는 더 이상 저장하지 않습니다. 상품 선택은 ONDO 내부 카탈로그에서 이뤄집니다.
      products: [],
      stylePreferences: {
        mood: styleProfile?.preferredStyle ?? "unknown",
        silhouette: styleProfile?.stylePreferences?.silhouette ?? "unknown",
        colorDepth: styleProfile?.stylePreferences?.color_depth ?? "unknown",
        activity: styleProfile?.stylePreferences?.activity ?? "unknown",
      },
      savedAt: new Date().toISOString(),
      weather: { city: cityNames[city], temperature: weather.temperature, apparent: weather.apparent, humidity: weather.humidity, wind: weather.wind },
    };

    setSaveError(null);
    setSavingLookId(lookKey);
    setSavedLooks((current) => wasSaved ? current.filter((entry) => entry.canonicalKey !== canonicalKey) : [...current, { canonicalKey, storedKey: canonicalKey }]);
    try {
      const response = await fetch("/api/saved-looks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent: wasSaved ? "remove" : "save", look: snapshot }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "룩 저장에 실패했습니다.");
    } catch (error) {
      setSavedLooks((current) => wasSaved ? [...current, { canonicalKey, storedKey: lookKey }] : current.filter((entry) => entry.canonicalKey !== canonicalKey));
      setSaveError(error instanceof Error ? error.message : "룩 저장에 실패했습니다.");
    } finally {
      setSavingLookId(null);
    }
  };

  return <main className="shell">
    <header className="topbar">
      <Link className="brand" href="/">ondo<sup>°</sup></Link>
      <span className="brand-copy">오늘의 온도, 나의 스타일</span>
      <div className="header-actions"><Link href="/profile">나의 스타일 분석</Link><Link href="/mypage">마이페이지</Link>{signedIn ? <span className="signed-in">로그인됨</span> : <Link className="login-link" href="/login">로그인</Link>}</div>
    </header>

    <MainVisualSlider />

    <div className="today-intro">
    <section className="hero">
      <div><p className="eyebrow">YOUR EVERYDAY, WELL DRESSED</p><h1>오늘, 어떤 무드로 입을까?</h1><p className="intro">날씨에 맞게, 나답게. 오늘의 코디를 만나보세요.</p></div>
      <div className={`city ${cityOpen ? "is-open" : ""}`}>
        <span aria-hidden="true">⌖</span>
        <button className="city-trigger" type="button" aria-haspopup="listbox" aria-expanded={cityOpen} onClick={() => setCityOpen((open) => !open)}>{cityNames[city]}<span className="city-chevron" aria-hidden="true" /></button>
        {cityOpen && <div className="city-menu" role="listbox" aria-label="날씨 지역 선택">{cities.map((item) => <button className={item === city ? "selected" : ""} key={item} type="button" role="option" aria-selected={item === city} onClick={() => { setCity(item); setCityOpen(false); }}>{cityNames[item]}<span aria-hidden="true">{item === city ? "✓" : ""}</span></button>)}</div>}
      </div>
    </section>

    <section className="make-yours"><div><p className="mood-label">오늘의 무드 선택</p><div className="situation-picker" role="group" aria-label="코디 상황">{(Object.keys(labels) as Situation[]).map((key) => <button className={situation === key ? "selected" : ""} key={key} onClick={() => setSituation(key)} type="button">{labels[key]}</button>)}</div></div><div className="profile-status"><span>퍼스널컬러 유형 <b>{hasAnalysis ? `${colorLabels[personalColor ?? ""] ?? "미설정"} 톤 · ${colorExpertResult ? "전문 진단" : "셀프 체크"}` : "아직 분석 전이에요"}</b></span><span>골격 유형 <b>{hasAnalysis ? `${bodyLabels[bodyType ?? ""] ?? "미설정"} · ${bodyExpertResult ? "전문 진단" : "셀프 체크"}` : "나에게 맞는 핏 찾기"}</b></span></div><Link className="primary" href="/profile">{hasAnalysis ? "내 스타일 재분석하기" : "내 스타일 분석하기"} ↗</Link><p>{popularFallback ? "취향이 ‘잘 모르겠음’인 항목은 인기 있는 기본 룩을 우선 추천해요." : hasAnalysis ? "저장한 셀프 체크 결과를 바탕으로 추천 색상과 핏을 조정해요." : "분석 결과를 적용하면 추천 색상과 핏이 달라져요."}</p></section>
    </div>

    <section id="today" className="today-layout">
      <aside className="weather-card" aria-label="오늘의 날씨">
        <div className="weather-top"><p>오늘의 날씨</p><button onClick={() => void refreshWeather()} type="button" aria-label="날씨 새로고침">{weatherLoading ? "…" : "↻"}</button></div>
        <div className="weather-main"><strong>{weather.temperature}°</strong><span>{cityNames[city]} · 가볍게 나서기 좋은 날</span><i aria-hidden="true">☼</i></div>
        <div className="weather-stats"><span><b>{weather.humidity}%</b>습도</span><span><b>{weather.wind} m/s</b>바람</span><span><b>{weather.apparent}°</b>체감온도</span></div>
        <div className="temperature-line"><span>최저 {weather.min}°</span><i /><span>최고 {weather.max}°</span></div>
        <div className="weather-note" title={outerWeatherNote}><b>오늘의 옷 제안</b><strong>{weather.apparent >= 24 ? "통기성 좋은 상의" : weather.apparent >= 16 ? "가벼운 재킷 · 가디건" : "아우터 한 겹 더"}</strong><dl><div><dt>체감</dt><dd>{weather.apparent}° · {needsOuter ? "한 겹 걸치기" : "아우터 없이"}</dd></div><div><dt>습도</dt><dd>{weather.humidity}% · 편한 소재</dd></div><div><dt>일교차</dt><dd>{temperatureGap}° · 저녁까지 대응</dd></div></dl></div>
      </aside>

      <article className="feature-edit">
        <div className="feature-heading"><p className="eyebrow">TODAY&apos;S EDIT</p><h2>오늘의 {labels[situation]} 상품 추천</h2><div className="feature-save-row"><button className={isSaved(lead) ? "save-look-button saved" : "save-look-button"} disabled={savingLookId === (savedEntryFor(lead)?.storedKey ?? lookKeyFor(lead))} onClick={() => void toggleSavedLook(lead)} type="button">{savingLookId === (savedEntryFor(lead)?.storedKey ?? lookKeyFor(lead)) ? "저장 중…" : isSaved(lead) ? "저장됨 ✓" : "저장하기 ♡"}</button></div></div>
        {saveError && <p className="save-error" role="status">{saveError}</p>}
        <div className="feature-body">
          <div className="feature-image" style={{ backgroundImage: `url(${lead.imageUrl})` }}><p>EDITORIAL IMAGE · 실제 추천 상품은 아래 목록에서 확인하세요</p></div>
          <div className="feature-copy"><p>아래 목록은 현재 날씨, 퍼스널컬러, 골격 및 취향 점수를 반영한 실제 카탈로그 상품입니다.</p>
            <section className="catalog-recommendations" aria-live="polite">
              <div className="catalog-heading"><p>ONDO CATALOG</p><span>진단·날씨 기반 추천</span></div>
              <div className="swatches catalog-swatches">{lead.colors.map((color) => <i key={color} style={{ background: color }} />)}<span>기본 컬러 조합</span></div>
              {catalogLoading && <p className="catalog-status">상품을 고르고 있어요…</p>}
              {catalogError && <p className="catalog-status error">{catalogError}</p>}
              {!catalogLoading && !catalogError && <div className="catalog-tabs" role="tablist" aria-label="상품 카테고리">{catalogOrder.map((category) => <button key={category} type="button" role="tab" aria-selected={catalogTab === category} className={catalogTab === category ? "active" : ""} onClick={() => setCatalogTab(category)}>{catalogLabels[category]}<i>{(catalogGroups[category] ?? []).length}</i></button>)}</div>}
              {!catalogLoading && !catalogError && catalogOrder.map((category) => {
                const products = catalogGroups[category] ?? [];
                const isWarmOuterFree = category === "outer" && weather.apparent >= 24;
                return <section className={category === catalogTab ? "catalog-category" : "catalog-category is-off"} key={category}><h3>{catalogLabels[category]} <span>{products.length ? "TOP 3" : isWarmOuterFree ? "OUTER FREE" : "조건 확인"}</span></h3>{products.length ? <div className="catalog-products">{products.map((product) => <article className="catalog-product" key={product.variantId}><img src={product.imagePath} alt={`${product.name} ${product.colorName}`} /><div><strong>{product.name}</strong><span>{product.colorName}</span><small>{product.reasons.slice(0, 2).join(" · ")}</small><Link className="catalog-fit-button" href={`/fitting?product=${encodeURIComponent(product.productId)}&source=${encodeURIComponent(product.sourceProductId)}&color=${encodeURIComponent(product.colorName)}&situation=${situation}&apparent=${weather.apparent}&humidity=${weather.humidity}&wind=${weather.wind}&precipitation=${weather.precipitation}&precipitationProbability=${weather.precipitationProbability}&dailyRange=${temperatureGap}`}>AI 피팅 ↗</Link></div></article>)}</div> : <p className="catalog-empty">{isWarmOuterFree ? `체감 ${weather.apparent}°에는 아우터 없이 상의 중심으로 추천해요.` : `현재 날씨 조건에 맞는 ${catalogLabels[category]}를 다시 고르고 있어요.`}</p>}</section>;
              })}
            </section>
          </div>
        </div>
      </article>
    </section>

    <div className="home-extra">
    <section className="more-looks"><div className="section-heading"><div><p className="eyebrow">MORE FOR TODAY</p><h2>다른 상황의 코디</h2></div></div><div className="outfit-grid">{liveOutfits.filter((outfit) => outfit.situation !== situation).slice(0, 2).map((outfit) => { const storedKey = savedEntryFor(outfit)?.storedKey ?? lookKeyFor(outfit); return <article className="outfit-card" key={outfit.id}><div className="outfit-image" style={{ backgroundImage: `url(${situationLookImages[outfit.situation] ?? outfit.imageUrl})` }}><em>{outfit.styleTag}</em></div><div className="outfit-copy"><h3>{outfit.title}</h3><p>{outfit.reason}</p><button className={`${isSaved(outfit) ? "save-look-button saved" : "save-look-button"}`} disabled={savingLookId === storedKey} onClick={() => void toggleSavedLook(outfit)} type="button">{savingLookId === storedKey ? "저장 중…" : isSaved(outfit) ? "저장됨 ✓" : "저장하기 ♡"}</button></div></article>; })}</div></section>
    </div>
    <footer><Link className="brand" href="/">ondo<sup>°</sup></Link><span>당신의 하루에 어울리는 선택.</span><span>ONDO 내부 카탈로그의 색상·착용 조건을 바탕으로 추천합니다.</span></footer>
  </main>;
}
