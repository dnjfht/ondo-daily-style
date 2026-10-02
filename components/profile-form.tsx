"use client";

import { useActionState, useEffect, useState } from "react";
import { saveProfile, type ProfileActionState } from "@/app/profile/actions";
import { SkeletonAnalysis, type SkeletonSelection } from "@/components/skeleton-analysis";

const initialState: ProfileActionState = { success: false, message: "" };

type FaceAnalysisStatus = "idle" | "loading" | "success" | "fallback";

function FacePhotoIntake({
  onFileSelected,
  analysisStatus,
  analysisMessage,
}: {
  onFileSelected: (file: File) => void;
  analysisStatus: FaceAnalysisStatus;
  analysisMessage: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function selectFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("JPG, PNG, WEBP 형식의 10MB 이하 사진을 선택해 주세요."); return; }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file)); setError(""); onFileSelected(file);
  }
  return <div className={preview ? "photo-intake-row has-preview" : "photo-intake-row"}>
    <div className="photo-intake-copy"><span className="photo-tag">FACE · 퍼스널컬러</span><b>자연광 셀카 올리기 <em>(선택)</em></b><p className="photo-lead">AI가 웜·쿨을 분석해 컬러 결과에 자동 반영해요.</p><ul className="photo-chips"><li>필터·메이크업 없이</li><li>자연광에서</li><li>얼굴이 잘 보이게</li></ul><details className="photo-more"><summary>촬영 가이드 · 안내</summary><p>셀카를 선택하면 AI가 웜·쿨을 분석해 아래 결과에 자동으로 반영합니다. 사진이 없으면 아래 셀프 체크로 직접 골라 주세요.</p><ul><li>필터·메이크업 없이, 얼굴이 잘 보이게 찍어 주세요.</li><li>창가 자연광처럼 밝고 고른 빛이 좋아요.</li></ul><small>JPG · PNG · WEBP / 최대 10MB · 셀카는 일회성 분석에만 사용되며, 원본·경로는 저장하지 않습니다.</small></details>{error && <span className="photo-error">{error}</span>}{!error && analysisStatus !== "idle" && <span className={analysisStatus === "success" ? "photo-analysis success" : analysisStatus === "fallback" ? "photo-analysis fallback" : "photo-analysis"}>{analysisMessage}</span>}</div>
    <div className="photo-intake-side">{preview && <img className="photo-square face" src={preview} alt="선택한 셀카 미리보기" />}<label className="skeleton-photo-button"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectFile(event.target.files?.[0])} />{preview ? "사진 변경" : "사진 선택"}</label></div>
  </div>;
}

const colorTitle: Record<string, string> = { warm: "웜", cool: "쿨" };
const moodTitle: Record<string, string> = { minimal: "미니멀", casual: "캐주얼", classic: "클래식", street: "스트리트", unknown: "인기 룩 우선" };

function personalColorApiUrl() {
  const isLocal = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  return isLocal ? "http://127.0.0.1:8001/predict" : "https://ondo-personal-color-ai.onrender.com/predict";
}

function personalColorHealthUrl() {
  return personalColorApiUrl().replace("/predict", "/health");
}

export function ProfileForm() {
  const [state, formAction, pending] = useActionState(saveProfile, initialState);
  const [color, setColor] = useState(""); const [skeletonSelection, setSkeletonSelection] = useState<SkeletonSelection | null>(null);
  const [mood, setMood] = useState(""); const [silhouette, setSilhouette] = useState(""); const [colorDepth, setColorDepth] = useState(""); const [activity, setActivity] = useState(""); const [city, setCity] = useState(""); const [validationMessage, setValidationMessage] = useState("");
  const [personalColorSource, setPersonalColorSource] = useState<"survey" | "ai">("survey");
  const [personalColorProbs, setPersonalColorProbs] = useState<Record<string, number> | null>(null); // 표시 전용: 사진 분석 웜/쿨 확률
  const [faceAnalysisStatus, setFaceAnalysisStatus] = useState<FaceAnalysisStatus>("idle");
  const [faceAnalysisMessage, setFaceAnalysisMessage] = useState("");
  const hasAnsweredAll = Boolean(color && skeletonSelection && mood && silhouette && colorDepth && activity && city);
  // 화면 전환형 단계(레이아웃 전용 상태): 모든 섹션은 계속 마운트되어 있어 입력값·저장 로직은 그대로 유지된다.
  const [step, setStep] = useState(0);
  const [tastePage, setTastePage] = useState(0); // 화면 구성 전용: 현재 보고 있는 취향 문항(0부터)
  const [photoSlot, setPhotoSlot] = useState<HTMLElement | null>(null); // 골격 사진 UI를 맨 위 사진 영역에 띄우기 위한 자리
  const stepDone = [Boolean(mood && silhouette && colorDepth && activity && city), Boolean(color), Boolean(skeletonSelection)];
  const stepLabels = ["취향", "컬러", "골격"];
  const tasteQuestions: { name: string; title: string; value: string; set: (value: string) => void; options: [string, string][] }[] = [
    { name: "mood", title: "가장 자주 입는 무드", value: mood, set: setMood, options: [["minimal", "미니멀"], ["casual", "캐주얼"], ["classic", "클래식"], ["street", "스트리트"], ["unknown", "잘 모르겠음"]] },
    { name: "silhouette", title: "선호 실루엣", value: silhouette, set: setSilhouette, options: [["balanced", "균형 잡힌 핏"], ["relaxed", "여유 있는 핏"], ["defined", "라인이 드러나는 핏"], ["unknown", "잘 모르겠음"]] },
    { name: "colorDepth", title: "선호 색감", value: colorDepth, set: setColorDepth, options: [["neutral", "뉴트럴 중심"], ["soft", "부드러운 저채도"], ["bold", "선명한 포인트"], ["unknown", "잘 모르겠음"]] },
    { name: "activity", title: "평소 활동량", value: activity, set: setActivity, options: [["low", "낮음"], ["medium", "보통"], ["high", "높음"]] },
    { name: "city", title: "주요 지역", value: city, set: setCity, options: [["seoul", "서울"], ["busan", "부산"], ["daegu", "대구"], ["jeju", "제주"]] },
  ];
  const colorPercent = personalColorSource === "ai" && color && personalColorProbs ? Math.round((personalColorProbs[color] ?? 0) * 100) : null;
  const colorSplit = personalColorSource === "ai" && color && personalColorProbs ? `웜 ${Math.round((personalColorProbs.warm ?? 0) * 100)}% · 쿨 ${Math.round((personalColorProbs.cool ?? 0) * 100)}%` : "";
  const goStep = (next: number) => { setStep(Math.max(0, Math.min(2, next))); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); };
  const clearWarning = () => setValidationMessage("");
  useEffect(() => {
    // 사진 선택 전에 유휴 상태의 배포 모델을 미리 준비해 체감 대기 시간을 줄인다.
    void fetch(personalColorHealthUrl(), { cache: "no-store" }).catch(() => undefined);
  }, []);
  async function analyzeFacePhoto(file: File) {
    setFaceAnalysisStatus("loading");
    setFaceAnalysisMessage("사진을 AI 분석 서비스에서 확인하고 있어요...");
    if (personalColorSource === "ai") setColor("");
    setPersonalColorProbs(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(personalColorApiUrl(), { method: "POST", body: formData });
      const payload = await response.json() as { prediction?: string; probabilities?: Record<string, number>; detail?: string };
      if (!response.ok || (payload.prediction !== "warm" && payload.prediction !== "cool")) throw new Error(payload.detail || "사진 분석 결과를 확인하지 못했습니다.");
      const prediction = payload.prediction;
      const confidence = Math.round((payload.probabilities?.[prediction] ?? 0) * 100);
      setColor(prediction);
      setPersonalColorProbs(payload.probabilities ?? null);
      setPersonalColorSource("ai");
      setFaceAnalysisStatus("success");
      setFaceAnalysisMessage(`사진 분석 결과: ${colorTitle[prediction]}${confidence ? ` ${confidence}%` : ""}`);
      clearWarning();
    } catch (error) {
      if (personalColorSource === "ai") setColor("");
      setPersonalColorProbs(null);
      setPersonalColorSource("survey");
      setFaceAnalysisStatus("fallback");
      const message = error instanceof TypeError
        ? "사진 분석 서버가 꺼져 있어 설문으로 결과를 선택해 주세요."
        : `${error instanceof Error ? error.message : "사진 분석을 완료하지 못했습니다."} 설문으로 결과를 선택해 주세요.`;
      setFaceAnalysisMessage(message);
    }
  }
  return <form action={formAction} className="analysis-form" onSubmit={(event) => { if (!hasAnsweredAll) { event.preventDefault(); setValidationMessage("색상·골격 진단 결과·취향·지역을 모두 선택한 뒤 저장해 주세요."); return; } clearWarning(); }}>
    <input type="hidden" name="personalColor" value={color} /><input type="hidden" name="personalColorSource" value={personalColorSource} /><input type="hidden" name="personalColorAiResult" value={personalColorSource === "ai" ? color : ""} /><input type="hidden" name="skeletonSelection" value={JSON.stringify(skeletonSelection)} />
    <div className="profile-form-layout">
      <aside className="save-result profile-summary">
        <div className="summary-head">
          <p className="eyebrow">YOUR STYLE PROFILE</p>
          <div className="summary-box"><small>01 · 취향</small><strong>{moodTitle[mood] ?? "미선택"}</strong><span>{tasteQuestions.filter((question) => question.value).length} / {tasteQuestions.length} 항목 선택</span></div>
          <div className="summary-box"><small>02 · 퍼스널컬러</small><strong>{colorTitle[color] ?? "미진단"}{colorPercent ? <em>{colorPercent}%</em> : null}</strong><span>{color ? (personalColorSource === "ai" ? `사진 분석${colorSplit ? ` · ${colorSplit}` : ""}` : "문답 결과") : "컬러 단계에서 선택해 주세요."}</span></div>
          <div className="summary-box"><small>03 · 골격진단</small><strong>{skeletonSelection ? skeletonSelection.result.typeKor : "미진단"}{typeof skeletonSelection?.result.percent?.final === "number" ? <em>{skeletonSelection.result.percent.final}%</em> : null}</strong>{skeletonSelection ? <span>신뢰도 {skeletonSelection.result.conf} · {skeletonSelection.source === "ai" ? "사진 분석 + 설문" : "설문 결과"}</span> : <span>골격 문항에 답하면 자동으로 판정돼요.</span>}</div>
        </div>
        {skeletonSelection && <div className="summary-detail">
          {skeletonSelection.result.photoSupport?.length ? <section><b>사진 분석 요약</b><ul>{skeletonSelection.result.photoSupport.map((reason) => <li key={reason}>{reason}</li>)}</ul></section> : null}
          <section><b>판정 근거</b><ul>{skeletonSelection.result.reasons.filter((reason) => !reason.startsWith("사진:")).map((reason) => <li key={reason}>{reason}</li>)}</ul>{skeletonSelection.result.photoAgainst?.length ? <p>참고: 사진에서 다른 유형의 특징도 보였어요 — {skeletonSelection.result.photoAgainst.join(" · ")}</p> : null}</section>
          {skeletonSelection.result.note && <p className="summary-note">{skeletonSelection.result.note}</p>}
          {skeletonSelection.result.fit && <dl className="summary-fit"><div><dt>키워드</dt><dd>{skeletonSelection.result.fit.keyword}</dd></div><div><dt>소재</dt><dd>{skeletonSelection.result.fit.material}</dd></div><div><dt>실루엣</dt><dd>{skeletonSelection.result.fit.silhouette}</dd></div><div><dt>넥라인</dt><dd>{skeletonSelection.result.fit.neck}</dd></div><div><dt>기장</dt><dd>{skeletonSelection.result.fit.length}</dd></div><div><dt>피할 것</dt><dd>{skeletonSelection.result.fit.avoid}</dd></div></dl>}
        </div>}
        <button className="primary" disabled={pending} type="submit">{pending ? "저장 중..." : "내 결과 저장하기"} ↗</button>
      </aside>
      <div className="profile-form-content">
    <section className="profile-photos" aria-label="사진으로 분석하기 (선택)"><p className="profile-photos-head"><b>사진으로 분석하기</b> </p><div className="profile-photos-grid"><FacePhotoIntake onFileSelected={analyzeFacePhoto} analysisStatus={faceAnalysisStatus} analysisMessage={faceAnalysisMessage} /><div ref={setPhotoSlot} className="skeleton-photo-slot" /></div></section>
    <ol className="profile-stepper">{stepLabels.map((label, index) => <li key={label}><button type="button" className={[index === step ? "active" : "", stepDone[index] ? "done" : ""].join(" ").trim()} aria-current={index === step ? "step" : undefined} onClick={() => goStep(index)}><i>{stepDone[index] ? "✓" : index + 1}</i>{label}</button></li>)}</ol>
    <div className={step === 0 ? "profile-step is-active" : "profile-step"}><section className="analysis-section skeleton-section taste-section"><div className="analysis-heading is-compact"><p className="eyebrow">01 / TASTE</p><h2>오늘의 취향을 알려주세요</h2><p>패션 취향을 잘 모르겠다면 ‘잘 모르겠음’을 선택해 주세요. 이 항목은 인기 있는 기본 룩을 먼저 추천합니다.</p></div><nav className="skeleton-subnav" aria-label="취향 문항">
      <button type="button" className="subnav-arrow" aria-label="이전" disabled={tastePage === 0} onClick={() => setTastePage(tastePage - 1)}>←</button>
      <ol>{tasteQuestions.map((question, i) => <li key={question.name}><button type="button" className={[i === tastePage ? "active" : "", question.value ? "answered" : ""].join(" ").trim()} aria-current={i === tastePage ? "step" : undefined} onClick={() => setTastePage(i)}>{i + 1}</button></li>)}</ol>
      <span className="subnav-count">{tastePage + 1} / {tasteQuestions.length}</span>
      <button type="button" className="subnav-arrow" aria-label="다음" disabled={tastePage === tasteQuestions.length - 1} onClick={() => setTastePage(tastePage + 1)}>→</button>
    </nav>
    <div className="skeleton-question-list">{tasteQuestions.map((question, i) => <fieldset key={question.name} className={i === tastePage ? undefined : "is-off"}><legend><span>{String(i + 1).padStart(2, "0")}</span>{question.title}</legend><div className="radio-row">{question.options.map(([value, label]) => <label key={value}><input type="radio" name={question.name} value={value} checked={question.value === value} onChange={() => { question.set(value); clearWarning(); if (i < tasteQuestions.length - 1) window.setTimeout(() => setTastePage((current) => (current === i ? i + 1 : current)), 220); }} /><span>{label}</span></label>)}</div></fieldset>)}</div></section></div>
    <div className={step === 1 ? "profile-step is-active" : "profile-step"}><section className="analysis-section"><div className="analysis-heading"><p className="eyebrow">02 / COLOR</p><h2>나에게 어울리는 색</h2><p>퍼스널컬러 결과는 웜과 쿨 두 가지로만 안내합니다. 사진 분석 결과가 있으면 자동 반영되며, 사진이 없거나 직접 선택하려면 아래 셀프 체크를 사용해 주세요.</p></div><div className="choice-grid two">{[["warm", "웜", "골드 주얼리와 아이보리에서 얼굴이 편안해 보여요."], ["cool", "쿨", "실버 주얼리와 퓨어 화이트가 더 선명해 보여요."]].map(([value, title, copy]) => <button key={value} className={color === value ? "choice selected" : "choice"} onClick={() => { setColor(value); setPersonalColorSource("survey"); setPersonalColorProbs(null); clearWarning(); }} type="button"><b>{title}</b><span>{copy}</span></button>)}</div>{personalColorSource === "ai" && <p className="analysis-source">사진 분석 결과가 선택되어 있습니다. 직접 고르면 셀프 체크 결과로 저장됩니다.</p>}</section></div>
    <div className={step === 2 ? "profile-step is-active" : "profile-step"}><SkeletonAnalysis photoSlot={photoSlot} onChange={(selection) => { setSkeletonSelection(selection); clearWarning(); }} /></div>
    <nav className="profile-step-actions" aria-label="단계 이동">
      <button type="button" className="step-prev" disabled={step === 0} onClick={() => goStep(step - 1)}>← 이전</button>
      <span>{step + 1} / 3</span>
      {step < 2 ? <button type="button" className="step-next" onClick={() => goStep(step + 1)}>다음 · {stepLabels[step + 1]} →</button> : <span className="step-last">{hasAnsweredAll ? "모두 완료! 오른쪽에서 저장하세요" : "마지막 단계입니다"}</span>}
    </nav>
      </div>
    </div>
    {(validationMessage || state.message) && <p className={state.success ? "notice success" : "notice"}>{validationMessage || state.message}</p>}
  </form>;
}
