"use client";

import { useState } from "react";

type RagStyleLabProps = {
  city: string;
  apparent: number;
  humidity: number;
  wind: number;
  situation: string;
  personalColor: string | null | undefined;
  bodyType: string | null | undefined;
};

const colorLabels: Record<string, string> = { warm: "웜", cool: "쿨" };
const bodyLabels: Record<string, string> = { straight: "스트레이트", wave: "웨이브", natural: "내추럴" };

type QuestionKey = "why" | "outer" | "fit";

export function RagStyleLab({ city, apparent, humidity, wind, situation, personalColor, bodyType }: RagStyleLabProps) {
  const [question, setQuestion] = useState<QuestionKey>("why");
  const color = personalColor ? colorLabels[personalColor] ?? "선택한 색상" : "색상 미설정";
  const body = bodyType ? bodyLabels[bodyType] ?? "선택한 골격" : "골격 미설정";
  const needsOuter = apparent < 20 || wind >= 6;

  const answers: Record<QuestionKey, { title: string; answer: string; sources: string[] }> = {
    why: {
      title: "현재 추천의 근거",
      answer: `${city} 체감 ${apparent}° · ${situation} 조건을 먼저 확인했습니다. ${needsOuter ? `바람 ${wind.toFixed(1)}m/s를 고려해 가볍게 걸칠 수 있는 아이템에 가점을 줬습니다.` : "아우터보다 통기성 좋은 상의 중심으로 후보를 좁혔습니다."} ${bodyType ? `${body} 골격 태그와 ${color} 색상 태그가 높은 상품을 우선 비교했습니다.` : "프로필 진단을 완료하면 골격과 색상 근거도 함께 반영됩니다."}`,
      sources: ["오늘의 날씨 조건", "ONDO 상품 태그", "골격·색상 규칙표"],
    },
    outer: {
      title: "아우터 판단 근거",
      answer: needsOuter ? `체감 ${apparent}°와 바람 ${wind.toFixed(1)}m/s 조건이라 실내외 이동 시 체감이 낮아질 수 있습니다. 두꺼운 겨울 코트보다 셔츠 재킷·가벼운 재킷처럼 벗기 쉬운 아우터를 우선 제안합니다.` : `체감 ${apparent}°에서는 아우터를 기본값으로 권하지 않습니다. 습도 ${humidity}%를 고려해 반소매, 얇은 셔츠, 통기성 소재 상의를 우선 비교합니다.`,
      sources: ["체감온도 착용 가이드", "바람·습도 조건", "ONDO 날씨 규칙"],
    },
    fit: {
      title: "핏 판단 근거",
      answer: bodyType ? `${body} 유형에 연결된 상품 태그를 검색해 소재·실루엣·넥라인·기장 조건을 함께 확인합니다. 최종 상품 순위는 골격 적합 점수만으로 정하지 않고 날씨, 색상, ${situation} 상황 점수와 합산합니다.` : "골격 진단 결과가 아직 없어 기본 실루엣 상품을 우선 보여 드리고 있습니다. 나의 스타일 분석에서 골격 결과를 저장하면 해당 유형의 적합 태그를 추천에 반영합니다.",
      sources: ["골격 유형별 핏 가이드", "상품 소재·실루엣 태그", "추천 점수 규칙"],
    },
  };

  const current = answers[question];
  return <section className="rag-style-lab" aria-labelledby="rag-style-lab-title">
    <div className="rag-lab-heading"><div><p className="eyebrow">ONDO STYLE LAB</p><h2 id="rag-style-lab-title">추천의 이유를 물어보세요.</h2><p>RAG는 근거 문서와 상품 태그를 찾아 설명합니다. 상품 선택은 기존 추천 엔진이 계속 담당합니다.</p></div><span>RAG PREVIEW</span></div>
    <div className="rag-context" aria-label="현재 추천 조건"><b>현재 조건</b><span>{city} · 체감 {apparent}° · {situation}</span><span>{color} · {body}</span></div>
    <div className="rag-lab-grid">
      <div className="rag-prompts"><p>이렇게 질문해 보세요</p><button className={question === "why" ? "selected" : ""} onClick={() => setQuestion("why")} type="button">왜 이 코디를 추천했나요? <span>↗</span></button><button className={question === "outer" ? "selected" : ""} onClick={() => setQuestion("outer")} type="button">오늘 아우터가 필요한가요? <span>↗</span></button><button className={question === "fit" ? "selected" : ""} onClick={() => setQuestion("fit")} type="button">내 골격에 맞는 핏은 뭔가요? <span>↗</span></button></div>
      <article className="rag-answer" aria-live="polite"><p className="eyebrow">SEARCHED EXPLANATION</p><h3>{current.title}</h3><p>{current.answer}</p><div><b>검색된 근거</b>{current.sources.map((source) => <span key={source}>{source}</span>)}</div><small>현재는 홈 화면 시안입니다. 다음 단계에서 근거 문서를 벡터 검색해 실제 답변으로 연결합니다.</small></article>
    </div>
  </section>;
}
