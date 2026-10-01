"use client";

import { useActionState, useEffect, useState } from "react";
import { saveProfile, type ProfileActionState } from "@/app/profile/actions";
import { SkeletonAnalysis, type SkeletonSelection } from "@/components/skeleton-analysis";

const initialState: ProfileActionState = { success: false, message: "" };

type FaceAnalysisStatus = "idle" | "loading" | "success" | "fallback";

function PhotoSlot({
  type,
  title,
  description,
  onFileSelected,
  analysisStatus,
  analysisMessage,
}: {
  type: "face";
  title: string;
  description: string;
  onFileSelected: (file: File) => void;
  analysisStatus: FaceAnalysisStatus;
  analysisMessage: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function selectFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("JPG, PNG, WEBP 형식의 10MB 이하 사진을 선택해 주세요."); return; }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file)); setFileName(file.name); setError(""); onFileSelected(file);
  }
  return <label className={preview ? "photo-slot has-preview" : "photo-slot"}>
    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectFile(event.target.files?.[0])} />
    {preview ? <img src={preview} alt={`${title} 미리보기`} /> : <span className="photo-placeholder" aria-hidden="true">{type === "face" ? "◌" : "⌑"}</span>}
    <span className="photo-copy"><b>{title}</b><small>{fileName || description}</small></span><span className="photo-action">{preview ? "사진 변경" : "사진 선택"}</span>{error && <span className="photo-error">{error}</span>}
    {!error && analysisStatus !== "idle" && <span className={analysisStatus === "success" ? "photo-analysis success" : analysisStatus === "fallback" ? "photo-analysis fallback" : "photo-analysis"}>{analysisMessage}</span>}
  </label>;
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
  const [faceAnalysisStatus, setFaceAnalysisStatus] = useState<FaceAnalysisStatus>("idle");
  const [faceAnalysisMessage, setFaceAnalysisMessage] = useState("");
  const hasAnsweredAll = Boolean(color && skeletonSelection && mood && silhouette && colorDepth && activity && city);
  const clearWarning = () => setValidationMessage("");
  useEffect(() => {
    // 사진 선택 전에 유휴 상태의 배포 모델을 미리 준비해 체감 대기 시간을 줄인다.
    void fetch(personalColorHealthUrl(), { cache: "no-store" }).catch(() => undefined);
  }, []);
  async function analyzeFacePhoto(file: File) {
    setFaceAnalysisStatus("loading");
    setFaceAnalysisMessage("사진을 AI 분석 서비스에서 확인하고 있어요...");
    if (personalColorSource === "ai") setColor("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(personalColorApiUrl(), { method: "POST", body: formData });
      const payload = await response.json() as { prediction?: string; probabilities?: Record<string, number>; detail?: string };
      if (!response.ok || (payload.prediction !== "warm" && payload.prediction !== "cool")) throw new Error(payload.detail || "사진 분석 결과를 확인하지 못했습니다.");
      const prediction = payload.prediction;
      const confidence = Math.round((payload.probabilities?.[prediction] ?? 0) * 100);
      setColor(prediction);
      setPersonalColorSource("ai");
      setFaceAnalysisStatus("success");
      setFaceAnalysisMessage(`사진 분석 결과: ${colorTitle[prediction]}${confidence ? ` ${confidence}%` : ""}`);
      clearWarning();
    } catch (error) {
      if (personalColorSource === "ai") setColor("");
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
      <aside className="save-result profile-summary"><div><p className="eyebrow">YOUR STYLE PROFILE</p><h2>{colorTitle[color] ?? "색 선택"} · {skeletonSelection?.result.typeKor ?? "골격 진단"} · {moodTitle[mood] ?? "취향 선택"}</h2><p>선택 내용은 즉시 여기에 반영됩니다. 모두 고른 뒤 저장해 오늘의 코디에 적용하세요.</p></div><button className="primary" disabled={pending} type="submit">{pending ? "저장 중..." : "내 결과 저장하기"} ↗</button></aside>
      <div className="profile-form-content">
    <section className="analysis-section photo-intake"><div className="analysis-heading"><p className="eyebrow">00 / PHOTO OPTIONAL</p><h2>사진으로 시작하는 나의 스타일</h2><p>자연광 셀카를 선택하면 AI가 웜·쿨을 분석합니다. 사진을 선택하지 않으면 아래 셀프 체크만으로 결과를 정할 수 있어요. 전신 사진 분석은 아래 골격 설문에서 별도로 진행합니다.</p></div><div className="photo-grid"><PhotoSlot type="face" title="자연광 셀카" description="필터·메이크업 없이, 얼굴이 잘 보이게" onFileSelected={analyzeFacePhoto} analysisStatus={faceAnalysisStatus} analysisMessage={faceAnalysisMessage} /></div><p className="fine-print">JPG · PNG · WEBP / 최대 10MB / 셀카는 일회성 분석에만 사용되며, 원본·경로는 저장하지 않습니다.</p></section>
    <section className="analysis-section"><div className="analysis-heading"><p className="eyebrow">01 / COLOR</p><h2>나에게 어울리는 색</h2><p>퍼스널컬러 결과는 웜과 쿨 두 가지로만 안내합니다. 사진 분석 결과가 있으면 자동 반영되며, 사진이 없거나 직접 선택하려면 아래 셀프 체크를 사용해 주세요.</p></div><div className="choice-grid two">{[["warm", "웜", "골드 주얼리와 아이보리에서 얼굴이 편안해 보여요."], ["cool", "쿨", "실버 주얼리와 퓨어 화이트가 더 선명해 보여요."]].map(([value, title, copy]) => <button key={value} className={color === value ? "choice selected" : "choice"} onClick={() => { setColor(value); setPersonalColorSource("survey"); clearWarning(); }} type="button"><b>{title}</b><span>{copy}</span></button>)}</div>{personalColorSource === "ai" && <p className="analysis-source">사진 분석 결과가 선택되어 있습니다. 직접 고르면 셀프 체크 결과로 저장됩니다.</p>}</section>
    <SkeletonAnalysis onChange={(selection) => { setSkeletonSelection(selection); clearWarning(); }} />
    <section className="analysis-section"><div className="analysis-heading"><p className="eyebrow">03 / TASTE</p><h2>오늘의 취향을 알려주세요</h2><p>패션 취향을 잘 모르겠다면 ‘잘 모르겠음’을 선택해 주세요. 이 항목은 인기 있는 기본 룩을 먼저 추천합니다.</p></div><div className="taste-fields">
      <label>가장 자주 입는 무드<select name="mood" value={mood} onChange={(event) => { setMood(event.target.value); clearWarning(); }}><option value="" disabled>선택해 주세요</option><option value="minimal">미니멀</option><option value="casual">캐주얼</option><option value="classic">클래식</option><option value="street">스트리트</option><option value="unknown">잘 모르겠음</option></select></label>
      <label>선호 실루엣<select name="silhouette" value={silhouette} onChange={(event) => { setSilhouette(event.target.value); clearWarning(); }}><option value="" disabled>선택해 주세요</option><option value="balanced">균형 잡힌 핏</option><option value="relaxed">여유 있는 핏</option><option value="defined">라인이 드러나는 핏</option><option value="unknown">잘 모르겠음</option></select></label>
      <label>선호 색감<select name="colorDepth" value={colorDepth} onChange={(event) => { setColorDepth(event.target.value); clearWarning(); }}><option value="" disabled>선택해 주세요</option><option value="neutral">뉴트럴 중심</option><option value="soft">부드러운 저채도</option><option value="bold">선명한 포인트</option><option value="unknown">잘 모르겠음</option></select></label>
      <label>평소 활동량<select name="activity" value={activity} onChange={(event) => { setActivity(event.target.value); clearWarning(); }}><option value="" disabled>선택해 주세요</option><option value="low">낮음</option><option value="medium">보통</option><option value="high">높음</option></select></label>
      <label>주요 지역<select name="city" value={city} onChange={(event) => { setCity(event.target.value); clearWarning(); }}><option value="" disabled>선택해 주세요</option><option value="seoul">서울</option><option value="busan">부산</option><option value="daegu">대구</option><option value="jeju">제주</option></select></label>
    </div></section>
      </div>
    </div>
    {(validationMessage || state.message) && <p className={state.success ? "notice success" : "notice"}>{validationMessage || state.message}</p>}
  </form>;
}
