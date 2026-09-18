"use client";

import { useMemo, useState } from "react";
import type { Outfit, Situation } from "@/lib/types";

const labels: Record<Situation, string> = { daily: "데일리", work: "출근", date: "데이트" };

export function OndoDashboard({ outfits }: { outfits: Outfit[] }) {
  const [situation, setSituation] = useState<Situation>("daily");
  const [saved, setSaved] = useState<string[]>([]);
  const visibleOutfits = useMemo(() => {
    const matched = outfits.filter((outfit) => outfit.situation === situation);
    return matched.length ? matched : outfits;
  }, [outfits, situation]);

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/">ondo<sup>°</sup></a>
        <span>STYLING LAB / BETA</span>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">YOUR EVERYDAY, WELL DRESSED</p>
          <h1>오늘, 뭐 입을까?</h1>
          <p className="intro">날씨에 맞게, 나답게. 오늘의 코디를 만나보세요.</p>
        </div>
        <button className="city" type="button" aria-label="날씨 지역">서울 <span>⌄</span></button>
      </section>

      <nav className="tabs" aria-label="ONDO 메뉴">
        <a className="active" href="#today">☼ 오늘의 코디</a>
        <a href="/profile">⌁ 나의 스타일 분석</a>
      </nav>

      <section className="weather-card" aria-label="오늘의 날씨">
        <div><p>오늘의 날씨</p><strong>27°</strong><span>서울 · 가볍게 나서기 좋은 날</span></div>
        <div className="weather-icon" aria-hidden="true">☼</div>
        <div className="weather-stats"><span><b>55%</b>습도</span><span><b>1.61 m/s</b>바람</span><span><b>28°</b>체감온도</span></div>
        <div className="temperature-line"><span>최저 18°</span><i /><span>최고 27°</span></div>
        <p className="weather-note"><b>WEATHER NOTE</b> 일교차가 커서, 벗어서 들기 쉬운 겉옷을 챙겨요.</p>
      </section>

      <section id="today" className="recommendation">
        <div className="section-heading"><div><p className="eyebrow">TODAY&apos;S EDIT</p><h2>나에게 맞는 오늘의 조합</h2></div><span>TOP 3</span></div>
        <div className="situation-picker" role="group" aria-label="코디 상황">
          {(Object.keys(labels) as Situation[]).map((key) => <button className={situation === key ? "selected" : ""} key={key} onClick={() => setSituation(key)} type="button">{labels[key]}</button>)}
        </div>
        <div className="outfit-grid">
          {visibleOutfits.map((outfit, index) => <article className="outfit-card" key={outfit.id}>
            <div className="outfit-image" style={{ backgroundImage: `linear-gradient(0deg, rgba(25, 35, 31, .38), transparent 55%), url(${outfit.imageUrl})` }}>
              <span>{String(index + 1).padStart(2, "0")}</span><em>{outfit.styleTag}</em>
            </div>
            <div className="outfit-copy"><p className="eyebrow">STYLE INSPIRATION</p><h3>{outfit.title}</h3><p>{outfit.reason}</p>
              <ol>{outfit.items.map((item) => <li key={item}>{item}</li>)}</ol>
              <div className="card-footer"><div className="swatches">{outfit.colors.map((color) => <i key={color} style={{ background: color }} />)}</div><button className={saved.includes(outfit.id) ? "saved" : ""} onClick={() => setSaved((items) => items.includes(outfit.id) ? items.filter((id) => id !== outfit.id) : [...items, outfit.id])} type="button">{saved.includes(outfit.id) ? "저장됨 ✓" : "저장하기 ♡"}</button></div>
            </div>
          </article>)}
        </div>
      </section>

      <section className="profile-callout"><div><p className="eyebrow">MAKE IT YOURS</p><h2>오늘의 추천을 더 나답게</h2><p>퍼스널컬러와 골격 유형을 설정하면 추천 색상과 핏이 달라져요.</p></div><a href="/profile">내 스타일 분석하기 ↗</a></section>

      <footer><a className="brand" href="/">ondo<sup>°</sup></a><span>당신의 하루에 어울리는 선택.</span></footer>
    </main>
  );
}
