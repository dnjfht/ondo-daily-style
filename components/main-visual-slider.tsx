"use client";

import { useCallback, useEffect, useState } from "react";

/*
 * 메인 비주얼 슬라이드 (베니토 메인 화면 스타일)
 * 이미지 넣는 법: public/main-slides/ 폴더에 slide-1.png ~ slide-4.png를 넣으면 자동으로 표시됩니다.
 * 권장 비율: 19:6. 인물은 오른쪽에 배치해 왼쪽의 문구 영역을 확보합니다.
 * 슬라이드를 늘리거나 문구를 바꾸려면 아래 slides 배열만 수정하세요.
 */
const slides = [
  { image: "/main-slides/slide-1.png", eyebrow: "ONDO EDIT", title: "오늘을 위한\n정제된 데일리 룩", copy: "날씨와 나의 스타일을 함께 읽고 골라드려요.", fallback: "linear-gradient(120deg,#e9dfd6 0%,#d9c7b9 55%,#c9b4a3 100%)" },
  { image: "/main-slides/slide-2.png", eyebrow: "SOFT DATE LOOK", title: "가볍게 설레는\n오늘의 무드", copy: "나에게 어울리는 색과 실루엣을 한 번에 제안해요.", fallback: "linear-gradient(120deg,#e8eef1 0%,#d4e1e6 55%,#bfd0d9 100%)" },
  { image: "/main-slides/slide-3.png", eyebrow: "EVERYDAY REFINED", title: "편안하지만\n분명한 취향", copy: "나만의 균형을 찾아 일상의 룩을 완성해요.", fallback: "linear-gradient(120deg,#f0e6d9 0%,#dfcdb7 55%,#c3aa8f 100%)" },
  { image: "/main-slides/slide-4.png", eyebrow: "MODERN OCCASION", title: "특별한 날에도\n나답게", copy: "취향과 TPO에 맞는 세련된 조합을 만나보세요.", fallback: "linear-gradient(120deg,#f3e5df 0%,#e3c9bd 55%,#cfaa9c 100%)" },
];

const INTERVAL = 5000;

export function MainVisualSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const go = useCallback((next: number) => setIndex((next + slides.length) % slides.length), []);

  useEffect(() => {
    // 이미지가 있는지 미리 확인해서, 없으면 그라데이션 배경을 대신 보여준다.
    slides.forEach((slide, i) => { const img = new Image(); img.onload = () => setLoaded((prev) => ({ ...prev, [i]: true })); img.src = slide.image; });
  }, []);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    // 움직임 줄이기 설정이어도 자동 넘김은 유지하고, 확대·페이드 효과만 CSS에서 끈다.
    const timer = window.setTimeout(() => go(index + 1), INTERVAL);
    return () => window.clearTimeout(timer);
  }, [index, paused, go]);

  return <section className="main-visual" aria-roledescription="carousel" aria-label="ONDO 메인 비주얼" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    <div className="main-visual-track">
      {slides.map((slide, i) => <article key={slide.image} className={i === index ? "main-visual-slide active" : "main-visual-slide"} aria-hidden={i !== index} style={{ backgroundImage: loaded[i] ? `url("${slide.image}")` : slide.fallback }}>
        <div className="main-visual-copy"><p>{slide.eyebrow}</p><h2>{slide.title.split("\n").map((line, n) => <span key={n}>{line}</span>)}</h2><span>{slide.copy}</span></div>
      </article>)}
    </div>
    {slides.length > 1 && <>
      <button className="main-visual-arrow prev" type="button" aria-label="이전 슬라이드" onClick={() => go(index - 1)}>‹</button>
      <button className="main-visual-arrow next" type="button" aria-label="다음 슬라이드" onClick={() => go(index + 1)}>›</button>
      <div className="main-visual-nav"><span className="main-visual-count">{String(index + 1).padStart(2, "0")} <i>/</i> {String(slides.length).padStart(2, "0")}</span><div className="main-visual-dots">{slides.map((slide, i) => <button key={slide.image} type="button" className={i === index ? "active" : ""} aria-label={`${i + 1}번 슬라이드`} onClick={() => go(i)} />)}</div><span className={paused ? "main-visual-progress paused" : "main-visual-progress"} key={index}><i style={{ animationDuration: `${INTERVAL}ms` }} /></span></div>
    </>}
  </section>;
}
