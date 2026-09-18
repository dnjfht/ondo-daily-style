"use client";

import { useActionState, useMemo, useState } from "react";
import { saveProfile, type ProfileActionState } from "@/app/profile/actions";

const initialState: ProfileActionState = { success: false, message: "" };
type BodyType = "straight" | "wave" | "natural";

const bodyQuestions = [
  { name: "volume", label: "옆모습에서 상체의 느낌은?", choices: [["straight", "두께와 입체감이 있는 편"], ["wave", "비교적 얇고 완만한 편"], ["natural", "볼륨보다 어깨·뼈대의 선이 눈에 띄는 편"]] },
  { name: "texture", label: "팔과 몸의 질감은 어떤 편인가요?", choices: [["straight", "탱탱하고 탄력이 느껴지는 편"], ["wave", "말랑하고 부드러운 편"], ["natural", "살의 질감보다 뼈와 힘줄의 선이 느껴지는 편"]] },
  { name: "joints", label: "손목·손가락 관절은 어떻게 보이나요?", choices: [["straight", "관절 돌출이 적고 윤곽이 둥근 편"], ["wave", "관절이 작고 가느다란 편"], ["natural", "관절이 도드라지고 마디가 눈에 띄는 편"]] },
  { name: "collar", label: "쇄골과 어깨 주변은 어떤가요?", choices: [["straight", "쇄골보다 상체의 볼륨이 먼저 보이는 편"], ["wave", "쇄골이 가늘게 드러나는 편"], ["natural", "쇄골과 어깨의 프레임이 뚜렷한 편"]] },
] as const;

const bodyDescription: Record<BodyType, { title: string; fit: string; material: string }> = {
  straight: { title: "스트레이트", fit: "과한 장식 없이 깔끔한 정핏과 세로 라인", material: "매끈하고 형태가 잡히는 소재" },
  wave: { title: "웨이브", fit: "허리선을 살린 핏과 짧은 상의", material: "부드럽고 유연한 소재" },
  natural: { title: "내추럴", fit: "여유 있는 핏과 편안한 레이어드", material: "표면의 결이 느껴지는 소재" },
};

export function ProfileForm() {
  const [state, formAction, pending] = useActionState(saveProfile, initialState);
  const [color, setColor] = useState("neutral");
  const [answers, setAnswers] = useState<Record<string, BodyType>>({});
  const [mood, setMood] = useState("minimal");
  const bodyType = useMemo<BodyType>(() => {
    const score: Record<BodyType, number> = { straight: 0, wave: 0, natural: 0 };
    Object.values(answers).forEach((answer) => { score[answer] += 1; });
    return (Object.keys(score) as BodyType[]).reduce((winner, item) => score[item] > score[winner] ? item : winner, "straight");
  }, [answers]);
  const result = bodyDescription[bodyType];

  return <form action={formAction} className="analysis-form">
    <input type="hidden" name="personalColor" value={color} />
    <input type="hidden" name="bodyType" value={bodyType} />
    <input type="hidden" name="style" value={mood} />
    <section className="analysis-section">
      <div className="analysis-heading"><p className="eyebrow">01 / COLOR</p><h2>나에게 어울리는 색</h2><p>AI 사진 분석은 다음 단계에서 추가합니다. 지금은 조명에 흔들리지 않는 셀프 체크 결과를 먼저 저장하세요.</p></div>
      <div className="choice-grid three">
        {[["warm", "웜", "골드 주얼리와 아이보리에서 얼굴이 편안해 보여요."], ["cool", "쿨", "실버 주얼리와 퓨어 화이트가 더 선명해 보여요."], ["neutral", "뉴트럴", "두 계열을 모두 자연스럽게 소화해요."]].map(([value, title, copy]) => <button key={value} className={color === value ? "choice selected" : "choice"} onClick={() => setColor(value)} type="button"><b>{title}</b><span>{copy}</span></button>)}
      </div>
      <p className="fine-print">퍼스널컬러는 스타일링 참고용입니다. 전문 드레이핑 진단을 대체하지 않습니다.</p>
    </section>

    <section className="analysis-section body-section">
      <div className="analysis-heading"><p className="eyebrow">02 / BODY BALANCE</p><h2>나의 골격 스타일 찾기</h2><p>사진 없이도 답할 수 있는 4개 문항입니다. 신체 치수와 사진 원본은 저장하지 않습니다.</p></div>
      <div className="question-list">
        {bodyQuestions.map((question, index) => <fieldset key={question.name}><legend><span>0{index + 1}</span>{question.label}</legend><div className="radio-row">{question.choices.map(([value, label]) => <label key={value}><input type="radio" name={question.name} checked={answers[question.name] === value} onChange={() => setAnswers((current) => ({ ...current, [question.name]: value as BodyType }))} /><span>{label}</span></label>)}</div></fieldset>)}
      </div>
      <div className="body-result"><p className="eyebrow">CURRENT RESULT</p><h3>{result.title}</h3><dl><div><dt>핏</dt><dd>{result.fit}</dd></div><div><dt>소재</dt><dd>{result.material}</dd></div></dl></div>
    </section>

    <section className="analysis-section">
      <div className="analysis-heading"><p className="eyebrow">03 / TASTE</p><h2>오늘의 취향을 알려주세요</h2><p>추천 룩의 무드와 쇼핑 결과를 정교하게 만드는 최소 문답입니다.</p></div>
      <div className="taste-fields">
        <label>가장 자주 입는 무드<select name="mood" value={mood} onChange={(event) => setMood(event.target.value)}><option value="minimal">미니멀</option><option value="casual">캐주얼</option><option value="classic">클래식</option><option value="street">스트리트</option></select></label>
        <label>선호 실루엣<select name="silhouette" defaultValue="balanced"><option value="balanced">균형 잡힌 핏</option><option value="relaxed">여유 있는 핏</option><option value="defined">라인이 드러나는 핏</option></select></label>
        <label>선호 색감<select name="colorDepth" defaultValue="neutral"><option value="neutral">뉴트럴 중심</option><option value="soft">부드러운 저채도</option><option value="bold">선명한 포인트</option></select></label>
        <label>평소 활동량<select name="activity" defaultValue="medium"><option value="low">낮음</option><option value="medium">보통</option><option value="high">높음</option></select></label>
        <label>주요 지역<select name="city" defaultValue="seoul"><option value="seoul">서울</option><option value="busan">부산</option><option value="daegu">대구</option><option value="jeju">제주</option></select></label>
      </div>
    </section>

    <div className="save-result"><div><p className="eyebrow">YOUR STYLE PROFILE</p><h2>{color === "warm" ? "웜" : color === "cool" ? "쿨" : "뉴트럴"} 톤 · {result.title} · {mood === "minimal" ? "미니멀" : mood}</h2><p>저장 후 계절·온도·상황에 맞는 룩과 연결 가능한 상품을 추천합니다.</p></div><button className="primary" disabled={pending} type="submit">{pending ? "저장 중..." : "내 결과 저장하기"} ↗</button></div>
    {state.message && <p className={state.success ? "notice success" : "notice"}>{state.message}</p>}
  </form>;
}
