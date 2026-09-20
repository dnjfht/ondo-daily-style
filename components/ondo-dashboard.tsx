"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Outfit, Situation } from "@/lib/types";
import { recommendOutfit, situationLookImages } from "@/lib/recommendation";

const labels: Record<Situation, string> = { daily: "데일리", work: "출근", date: "데이트" };
const cities = ["seoul", "busan", "daegu", "jeju"] as const;
const cityNames: Record<(typeof cities)[number], string> = { seoul: "서울", busan: "부산", daegu: "대구", jeju: "제주" };
const cityStorageKey = "ondo-selected-city";
type Weather = { temperature: number; apparent: number; humidity: number; wind: number; city: string };
type StyleProfile = {
  personalColor: string | null;
  bodyType: string | null;
  personalColorAiResult: string | null;
  bodyTypeAiResult: string | null;
  personalColorSource: string | null;
  bodyTypeSource: string | null;
  preferredStyle: string | null;
  stylePreferences: Record<string, string> | null;
  gender: string | null;
  ageRange: string | null;
  analysisCompletedAt: string | null;
};
const colorLabels: Record<string, string> = { warm: "웜", cool: "쿨", neutral: "뉴트럴" };
const bodyLabels: Record<string, string> = { straight: "스트레이트", wave: "웨이브", natural: "내추럴" };

export function OndoDashboard({ outfits, signedIn, styleProfile }: { outfits: Outfit[]; signedIn: boolean; styleProfile: StyleProfile | null }) {
  const [situation, setSituation] = useState<Situation>("daily");
  const [city, setCity] = useState<(typeof cities)[number]>("seoul");
  const [cityOpen, setCityOpen] = useState(false);
  const [cityReady, setCityReady] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [weather, setWeather] = useState<Weather>({ temperature: 25, apparent: 26, humidity: 59, wind: 2.16, city: "서울" });
  const [weatherLoading, setWeatherLoading] = useState(false);
  const recommendationProfile = styleProfile ? { personalColor: styleProfile.personalColorAiResult ?? styleProfile.personalColor, bodyType: styleProfile.bodyTypeAiResult ?? styleProfile.bodyType, preferredStyle: styleProfile.preferredStyle, stylePreferences: styleProfile.stylePreferences, gender: styleProfile.gender, ageRange: styleProfile.ageRange } : null;
  const lead = useMemo(() => recommendOutfit(situation, weather.apparent, recommendationProfile), [situation, weather.apparent, styleProfile]);

  async function refreshWeather() {
    setWeatherLoading(true);
    try {
      const response = await fetch(`/api/weather?city=${city}`);
      const payload = await response.json();
      if (payload.current) setWeather({ temperature: Math.round(payload.current.temperature_2m), apparent: Math.round(payload.current.apparent_temperature), humidity: payload.current.relative_humidity_2m, wind: payload.current.wind_speed_10m, city: payload.city });
    } finally { setWeatherLoading(false); }
  }

  useEffect(() => {
    const storedCity = window.localStorage.getItem(cityStorageKey);
    if (storedCity && cities.includes(storedCity as (typeof cities)[number])) setCity(storedCity as (typeof cities)[number]);
    setCityReady(true);
  }, []);
  useEffect(() => {
    if (cityReady) window.localStorage.setItem(cityStorageKey, city);
  }, [city, cityReady]);
  useEffect(() => { void refreshWeather(); }, [city]);
  const temperatureGap = 9;
  const personalColor = styleProfile?.personalColorAiResult ?? styleProfile?.personalColor;
  const bodyType = styleProfile?.bodyTypeAiResult ?? styleProfile?.bodyType;
  const colorExpertResult = Boolean(styleProfile?.personalColorAiResult && styleProfile?.personalColorSource === "ai");
  const bodyExpertResult = Boolean(styleProfile?.bodyTypeAiResult && styleProfile?.bodyTypeSource === "ai");
  const hasAnalysis = Boolean(styleProfile?.analysisCompletedAt);
  const popularFallback = Boolean(styleProfile?.preferredStyle === "unknown" || ["silhouette", "color_depth"].some((key) => styleProfile?.stylePreferences?.[key] === "unknown"));
  const naverProductLinks = useMemo(() => (lead.products ?? []).filter((product) => product.merchant === "네이버 쇼핑"), [lead.products]);
  const productGroups = useMemo(() => {
    const groups = new Map<string, NonNullable<Outfit["products"]>>();
    for (const product of lead.products ?? []) {
      if (product.merchant === "네이버 쇼핑") continue;
      groups.set(product.merchant, [...(groups.get(product.merchant) ?? []), product]);
    }
    return [...groups.entries()];
  }, [lead.products]);

  return <main className="shell">
    <header className="topbar">
      <Link className="brand" href="/">ondo<sup>°</sup></Link>
      <span className="brand-copy">오늘의 온도, 나의 스타일</span>
      <div className="header-actions"><Link href="/profile">나의 스타일 분석</Link><Link href="/mypage">마이페이지</Link>{signedIn ? <span className="signed-in">로그인됨</span> : <Link className="login-link" href="/login">로그인</Link>}</div>
    </header>

    <section className="hero">
      <div><p className="eyebrow">YOUR EVERYDAY, WELL DRESSED</p><h1>오늘, 뭐 입을까?</h1><p className="intro">날씨에 맞게, 나답게. 오늘의 코디를 만나보세요.</p></div>
      <div className={`city ${cityOpen ? "is-open" : ""}`}>
        <span aria-hidden="true">⌖</span>
        <button className="city-trigger" type="button" aria-haspopup="listbox" aria-expanded={cityOpen} onClick={() => setCityOpen((open) => !open)}>{cityNames[city]}<span className="city-chevron" aria-hidden="true" /></button>
        {cityOpen && <div className="city-menu" role="listbox" aria-label="날씨 지역 선택">{cities.map((item) => <button className={item === city ? "selected" : ""} key={item} type="button" role="option" aria-selected={item === city} onClick={() => { setCity(item); setCityOpen(false); }}>{cityNames[item]}<span aria-hidden="true">{item === city ? "✓" : ""}</span></button>)}</div>}
      </div>
    </section>

    <nav className="tabs" aria-label="ONDO 메뉴"><a className="active" href="#today">☼ 오늘의 코디</a><Link href="/profile">⌁ 나의 스타일 분석</Link></nav>

    <section id="today" className="today-layout">
      <aside className="weather-card" aria-label="오늘의 날씨">
        <div className="weather-top"><p>오늘의 날씨</p><button onClick={() => void refreshWeather()} type="button" aria-label="날씨 새로고침">{weatherLoading ? "…" : "↻"}</button></div>
        <div className="weather-main"><strong>{weather.temperature}°</strong><span>{weather.city} · 가볍게 나서기 좋은 날</span><i aria-hidden="true">☼</i></div>
        <div className="weather-stats"><span><b>{weather.humidity}%</b>습도</span><span><b>{weather.wind} m/s</b>바람</span><span><b>{weather.apparent}°</b>체감온도</span></div>
        <div className="temperature-line"><span>최저 {weather.temperature - 7}°</span><i /><span>최고 {weather.temperature + 2}°</span></div>
        <p className="weather-note"><b>WEATHER NOTE</b>일교차가 커요. 벗어서 들기 쉬운 겉옷을 챙겨요.</p>
      </aside>

      <article className="feature-edit">
        <div className="feature-heading"><div><p className="eyebrow">TODAY&apos;S EDIT</p><h2>{lead.title}</h2></div><span>{labels[situation]}</span></div>
        <div className="feature-body">
          <div className="feature-image" style={{ backgroundImage: `url(${lead.imageUrl})` }}><p>PERSONALIZED STYLE GUIDE</p></div>
          <div className="feature-copy"><p>{lead.reason}</p><ol>{lead.items.map((item, index) => <li key={item}><span>0{index + 1}</span><div><b>{["OUTER", "TOP", "BOTTOM", "SHOES", "BAG & CAP"][index] ?? "ITEM"}</b><h3>{item}</h3><small>{index === 0 ? `체감 ${weather.apparent}°와 ${styleProfile ? "저장한 스타일 결과" : "기본 인기 룩"}을 함께 반영했어요` : index === 1 ? "상의·하의·신발·가방을 각각 고를 수 있어요" : "다른 쇼핑몰의 유사 상품도 함께 비교해 보세요"}{naverProductLinks[index] && <><br /><a className="search-result-link" href={naverProductLinks[index].url} target="_blank" rel="noreferrer">네이버 쇼핑에서 검색 결과로 이동 ↗</a></>}</small></div></li>)}</ol>
            <div className="swatches">{lead.colors.map((color) => <i key={color} style={{ background: color }} />)}<span>기본 컬러 조합</span></div>
            <div className="product-groups">{productGroups.map(([merchant, products]) => <section className="merchant-search-group" key={merchant}><p>{merchant}</p><div className="merchant-search-links">{products.map((product) => <a key={product.label} href={product.url} target="_blank" rel="noreferrer">{product.label} ↗</a>)}</div></section>)}</div>
          </div>
        </div>
      </article>
    </section>

    <section className="make-yours"><div><p className="eyebrow">MAKE IT YOURS</p><h2>오늘의 무드는?</h2><div className="situation-picker" role="group" aria-label="코디 상황">{(Object.keys(labels) as Situation[]).map((key) => <button className={situation === key ? "selected" : ""} key={key} onClick={() => setSituation(key)} type="button">{labels[key]}</button>)}</div></div><div className="profile-status"><span>퍼스널컬러 <b>{hasAnalysis ? `${colorLabels[personalColor ?? ""] ?? "미설정"} 톤 · ${colorExpertResult ? "전문 진단" : "셀프 체크"}` : "아직 분석 전이에요"}</b></span><span>골격 스타일 유형 <b>{hasAnalysis ? `${bodyLabels[bodyType ?? ""] ?? "미설정"} · ${bodyExpertResult ? "전문 진단" : "셀프 체크"}` : "나에게 맞는 핏 찾기"}</b></span></div><Link className="primary" href="/profile">{hasAnalysis ? "내 스타일 재분석하기" : "내 스타일 분석하기"} ↗</Link><p>{popularFallback ? "취향이 ‘잘 모르겠음’인 항목은 인기 있는 기본 룩을 우선 추천해요." : hasAnalysis ? "저장한 셀프 체크 결과를 바탕으로 추천 색상과 핏을 조정해요." : "분석 결과를 적용하면 추천 색상과 핏이 달라져요."}</p></section>

    <section className="why-look"><p className="eyebrow">WHY THIS LOOK</p><h2>이렇게 입으면 좋아요.</h2><div><p><b>01</b> 체감온도 {weather.apparent}°에 맞춰 한 겹 가볍게 걸칠 아이템을 추천해요.</p><p><b>02</b> 습도 {weather.humidity}%. 땀과 습기에 편안한 소재를 비교해보세요.</p><p><b>03</b> 오늘의 일교차 {temperatureGap}°. 저녁까지 대응할 수 있는 조합이에요.</p></div></section>

    <section className="more-looks"><div className="section-heading"><div><p className="eyebrow">MORE FOR TODAY</p><h2>다른 상황의 코디</h2></div><span>TOP 3</span></div><div className="outfit-grid">{outfits.filter((outfit) => outfit.id !== lead.id).slice(0, 2).map((outfit) => <article className="outfit-card" key={outfit.id}><div className="outfit-image" style={{ backgroundImage: `url(${situationLookImages[outfit.situation] ?? outfit.imageUrl})` }}><em>{outfit.styleTag}</em></div><div className="outfit-copy"><h3>{outfit.title}</h3><p>{outfit.reason}</p><button className={saved.includes(outfit.id) ? "saved" : ""} onClick={() => setSaved((items) => items.includes(outfit.id) ? items.filter((id) => id !== outfit.id) : [...items, outfit.id])} type="button">{saved.includes(outfit.id) ? "저장됨 ✓" : "저장하기 ♡"}</button></div></article>)}</div></section>
    <footer><Link className="brand" href="/">ondo<sup>°</sup></Link><span>당신의 하루에 어울리는 선택.</span><span>상품 정보는 제휴 또는 공식 카탈로그 연결 전의 MVP 예시입니다.</span></footer>
  </main>;
}
