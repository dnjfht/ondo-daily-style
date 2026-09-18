"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Outfit, Situation } from "@/lib/types";

const labels: Record<Situation, string> = { daily: "데일리", work: "출근", date: "데이트" };
const cities = ["seoul", "busan", "daegu", "jeju"] as const;
const cityNames: Record<(typeof cities)[number], string> = { seoul: "서울", busan: "부산", daegu: "대구", jeju: "제주" };
type Weather = { temperature: number; apparent: number; humidity: number; wind: number; city: string };

export function OndoDashboard({ outfits, signedIn }: { outfits: Outfit[]; signedIn: boolean }) {
  const [situation, setSituation] = useState<Situation>("daily");
  const [city, setCity] = useState<(typeof cities)[number]>("seoul");
  const [cityOpen, setCityOpen] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [weather, setWeather] = useState<Weather>({ temperature: 25, apparent: 26, humidity: 59, wind: 2.16, city: "서울" });
  const [weatherLoading, setWeatherLoading] = useState(false);
  const visibleOutfits = useMemo(() => {
    const matched = outfits.filter((outfit) => outfit.situation === situation);
    return matched.length ? matched : outfits;
  }, [outfits, situation]);
  const lead = visibleOutfits[0];

  async function refreshWeather() {
    setWeatherLoading(true);
    try {
      const response = await fetch(`/api/weather?city=${city}`);
      const payload = await response.json();
      if (payload.current) setWeather({ temperature: Math.round(payload.current.temperature_2m), apparent: Math.round(payload.current.apparent_temperature), humidity: payload.current.relative_humidity_2m, wind: payload.current.wind_speed_10m, city: payload.city });
    } finally { setWeatherLoading(false); }
  }

  useEffect(() => { void refreshWeather(); }, [city]);
  if (!lead) return null;
  const temperatureGap = 9;

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
        <button className="city-trigger" type="button" aria-haspopup="listbox" aria-expanded={cityOpen} onClick={() => setCityOpen((open) => !open)}>{cityNames[city]}<span aria-hidden="true">⌄</span></button>
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
          <div className="feature-image" style={{ backgroundImage: `url(${lead.imageUrl})` }}><p>STYLE INSPIRATION · 참고 이미지</p></div>
          <div className="feature-copy"><p>{lead.reason}</p><ol>{lead.items.map((item, index) => <li key={item}><span>0{index + 1}</span><div><b>{["OUTER", "TOP", "BOTTOM & SHOES"][index] ?? "ITEM"}</b><h3>{item}</h3><small>{index === 0 ? `체감 ${weather.apparent}° 기준 · 실내와 저녁에 걸쳐요` : index === 1 ? "오늘의 활동량에 맞춘 편안한 소재" : "걷기 좋은 균형 잡힌 조합"}</small></div></li>)}</ol>
            <div className="swatches">{lead.colors.map((color) => <i key={color} style={{ background: color }} />)}<span>기본 컬러 조합</span></div>
            <div className="product-links">{lead.products?.map((product) => <a key={product.label} href={product.url} target="_blank" rel="noreferrer">{product.merchant} · {product.label} ↗</a>)}</div>
          </div>
        </div>
      </article>
    </section>

    <section className="make-yours"><div><p className="eyebrow">MAKE IT YOURS</p><h2>오늘의 무드는?</h2><div className="situation-picker" role="group" aria-label="코디 상황">{(Object.keys(labels) as Situation[]).map((key) => <button className={situation === key ? "selected" : ""} key={key} onClick={() => setSituation(key)} type="button">{labels[key]}</button>)}</div></div><div className="profile-status"><span>퍼스널컬러 <b>아직 분석 전이에요</b></span><span>골격 스타일 유형 <b>나에게 맞는 핏 찾기</b></span></div><Link className="primary" href="/profile">내 스타일 분석하기 ↗</Link><p>분석 결과를 적용하면 추천 색상과 핏이 달라져요.</p></section>

    <section className="why-look"><p className="eyebrow">WHY THIS LOOK</p><h2>이렇게 입으면 좋아요.</h2><div><p><b>01</b> 체감온도 {weather.apparent}°에 맞춰 한 겹 가볍게 걸칠 아이템을 추천해요.</p><p><b>02</b> 습도 {weather.humidity}%. 땀과 습기에 편안한 소재를 비교해보세요.</p><p><b>03</b> 오늘의 일교차 {temperatureGap}°. 저녁까지 대응할 수 있는 조합이에요.</p></div></section>

    <section className="more-looks"><div className="section-heading"><div><p className="eyebrow">MORE FOR TODAY</p><h2>다른 상황의 코디</h2></div><span>TOP 3</span></div><div className="outfit-grid">{outfits.filter((outfit) => outfit.id !== lead.id).slice(0, 2).map((outfit) => <article className="outfit-card" key={outfit.id}><div className="outfit-image" style={{ backgroundImage: `url(${outfit.imageUrl})` }}><em>{outfit.styleTag}</em></div><div className="outfit-copy"><h3>{outfit.title}</h3><p>{outfit.reason}</p><button className={saved.includes(outfit.id) ? "saved" : ""} onClick={() => setSaved((items) => items.includes(outfit.id) ? items.filter((id) => id !== outfit.id) : [...items, outfit.id])} type="button">{saved.includes(outfit.id) ? "저장됨 ✓" : "저장하기 ♡"}</button></div></article>)}</div></section>
    <footer><Link className="brand" href="/">ondo<sup>°</sup></Link><span>당신의 하루에 어울리는 선택.</span><span>상품 정보는 제휴 또는 공식 카탈로그 연결 전의 MVP 예시입니다.</span></footer>
  </main>;
}
