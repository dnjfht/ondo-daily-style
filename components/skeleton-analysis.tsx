"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

type SurveyOption = { code: number; text: string };
type SurveyQuestion = { q: number; title: string; options: SurveyOption[] };
type SkeletonPersona = {
  id?: string;
  p1: number;
  axes: { center: number; waist?: number; frame?: number };
  bodyLevel?: string;
  photoReasons: string[];
  ratios?: Record<string, number>;
  quality?: { min_visibility?: number; ok?: boolean; tips?: string[] };
};

export type SkeletonResult = {
  type: "straight" | "wave" | "natural" | null;
  typeKor: string;
  conf: string;
  reasons: string[];
  note: string;
  fit: { keyword: string; material: string; silhouette: string; neck: string; length: string; avoid: string } | null;
  photoSupport?: string[];
  photoAgainst?: string[];
  percent?: { final: number | null };
};

export type SkeletonSelection = {
  personaId: "survey-only" | "uploaded-body-photo";
  answers: number[];
  result: SkeletonResult;
  source: "survey" | "ai";
  photoPersona?: SkeletonPersona;
};

type SkeletonApi = {
  SURVEY: SurveyQuestion[];
  diagnose: (persona: SkeletonPersona, answers: number[]) => SkeletonResult;
};

declare global {
  interface Window { ONDO_SKELETON?: SkeletonApi; }
}

function surveyOnlyPersona(): SkeletonPersona {
  // 사진이 없을 때에도 원본 모듈의 설문 가중치와 판정 규칙은 그대로 사용합니다.
  return { id: "survey-only", p1: 0, axes: { center: 0 }, photoReasons: [] };
}

const acceptedImageTypes = new Set(["image/jpeg", "image/png"]);

function skeletonApiUrl() {
  const isLocal = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  return isLocal
    ? "http://127.0.0.1:8000/api/skeleton/analyze"
    : "https://ondo-skeleton-ai.onrender.com/api/skeleton/analyze";
}

function skeletonHealthUrl() {
  return skeletonApiUrl().replace("/api/skeleton/analyze", "/api/skeleton/health");
}

function isPhotoPersona(value: unknown): value is SkeletonPersona {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SkeletonPersona>;
  return typeof candidate.p1 === "number"
    && typeof candidate.axes?.center === "number"
    && Array.isArray(candidate.photoReasons)
    && candidate.photoReasons.every((reason) => typeof reason === "string");
}

export function SkeletonAnalysis({ onChange }: { onChange: (selection: SkeletonSelection | null) => void }) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<SkeletonResult | null>(null);
  const [moduleReady, setModuleReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [photoStatus, setPhotoStatus] = useState<"idle" | "analyzing" | "success" | "fallback">("idle");
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoPersona, setPhotoPersona] = useState<SkeletonPersona | null>(null);
  const [photoFileName, setPhotoFileName] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const survey = typeof window !== "undefined" ? window.ONDO_SKELETON?.SURVEY ?? [] : [];

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  useEffect(() => {
    // Render의 유휴 인스턴스는 사진을 고른 뒤가 아니라 화면 진입 시 미리 기동한다.
    void fetch(skeletonHealthUrl(), { cache: "no-store" }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (moduleReady && answers.length === 0) setAnswers((window.ONDO_SKELETON?.SURVEY ?? []).map(() => 4));
  }, [moduleReady, answers.length]);

  function updateAnswer(index: number, code: number) {
    setAnswers((current) => current.map((answer, answerIndex) => answerIndex === index ? code : answer));
    setResult(null);
    onChange(null);
  }

  async function analyzePhoto(file: File | undefined) {
    setResult(null);
    onChange(null);
    setPhotoPersona(null);
    setPhotoMessage("");
    setPhotoError("");
    setPhotoFileName(file?.name ?? "");
    setPhotoPreview(null);
    if (!file) {
      setPhotoStatus("idle");
      return;
    }
    if (!acceptedImageTypes.has(file.type) || file.size > 10 * 1024 * 1024) {
      setPhotoStatus("fallback");
      setPhotoMessage("JPG 또는 PNG 형식의 10MB 이하 전신 사진을 선택해 주세요.");
      return;
    }

    setPhotoPreview(URL.createObjectURL(file));
    setPhotoStatus("analyzing");
    try {
      const body = new FormData();
      body.append("image", file);
      const response = await fetch(skeletonApiUrl(), { method: "POST", body });
      const payload: unknown = await response.json().catch(() => null);
      const responseData = payload && typeof payload === "object" ? payload as { ok?: unknown; error?: unknown; message?: unknown; persona?: unknown } : null;
      const message = typeof responseData?.message === "string" ? responseData.message : "사진 분석에 실패해 설문만으로 판정합니다.";
      const persona = responseData?.persona;
      if (response.ok && responseData?.ok === true && isPhotoPersona(persona)) {
        setPhotoPersona(persona);
        setPhotoStatus("success");
        setPhotoMessage("사진 분석을 반영해 설문과 함께 최종 판정합니다.");
        return;
      }
      setPhotoStatus("fallback");
      setPhotoError(typeof responseData?.error === "string" ? responseData.error : "");
      setPhotoMessage(message);
    } catch {
      setPhotoStatus("fallback");
      setPhotoMessage("사진 분석 서버가 꺼져 있어 설문만으로 판정합니다");
    }
  }

  function diagnose() {
    if (!window.ONDO_SKELETON || answers.length !== window.ONDO_SKELETON.SURVEY.length) return;
    const persona = photoPersona ?? surveyOnlyPersona();
    const source = photoPersona ? "ai" : "survey";
    const nextResult = window.ONDO_SKELETON.diagnose(persona, answers) as SkeletonResult;
    setResult(nextResult);
    onChange({ personaId: photoPersona ? "uploaded-body-photo" : "survey-only", answers, result: nextResult, source, photoPersona: photoPersona ?? undefined });
  }

  const canDiagnose = moduleReady && answers.length === survey.length && photoStatus !== "analyzing";

  return <section className="analysis-section skeleton-section">
    <Script src="/skeleton/skeleton.js" strategy="afterInteractive" onLoad={() => setModuleReady(Boolean(window.ONDO_SKELETON))} onError={() => setLoadError("골격 진단 모듈을 불러오지 못했습니다.")} />
    <div className="analysis-heading"><p className="eyebrow">02 / BODY BALANCE</p><h2>나에게 맞는 핏</h2><p>아래 11문항으로 골격을 확인합니다. 모든 문항은 처음에 ‘잘 모르겠다’로 선택되어 있으며, 사진 없이도 설문 결과를 볼 수 있습니다.</p></div>
    <div className={photoPreview ? "skeleton-photo-intake has-preview" : "skeleton-photo-intake"}>
      <div><b>전신 사진 올리기 <em>(선택)</em></b><div className="skeleton-shooting-guide"><strong>촬영 가이드</strong><p>정면으로 서서 머리부터 발끝까지 모두 나오게 촬영해 주세요.</p><ul><li>몸에 붙는 옷을 입고, 머리카락은 어깨선 밖으로 넘겨 주세요.</li><li>카메라는 허리 높이에 두고, 팔은 몸에서 살짝 떼어 주세요.</li><li>밝은 단색 배경에서 원본 화질 그대로 찍어 주세요.</li></ul></div><small>JPG · PNG / 최대 10MB · 사진 원본은 분석 후 저장하지 않습니다.</small></div>
      {photoPreview && <figure className="skeleton-photo-preview"><img src={photoPreview} alt="선택한 전신 사진 미리보기" /><figcaption>분석할 전신 사진</figcaption>{photoPersona?.quality?.tips?.length ? <div className="skeleton-quality-tips"><b>이렇게 다시 찍으면 더 정확해요</b><ul>{photoPersona.quality.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul></div> : null}</figure>}
      <label className="skeleton-photo-button"><input type="file" accept="image/jpeg,image/png" onChange={(event) => void analyzePhoto(event.target.files?.[0])} />사진 선택</label>
    </div>
    {photoFileName && <p className={photoStatus === "success" ? "notice success skeleton-photo-status" : "notice skeleton-photo-status"}>{photoStatus === "analyzing" ? "사진 분석 중… 정확도 측정을 위해 잠시만 기다려 주세요." : <>{photoMessage}{photoError === "not_full_body" ? <small> 설문만으로 결과를 계속 볼 수 있어요.</small> : null}</>}</p>}
    {!result && photoStatus === "success" && photoPersona?.photoReasons.length ? <div className="skeleton-photo-observation"><b>사진에서 보인 특징</b><ul>{photoPersona.photoReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div> : null}
    {loadError && <p className="notice">{loadError}</p>}
    {!moduleReady && !loadError && <p className="catalog-status">골격 진단 모듈을 불러오는 중이에요…</p>}
    <div className="skeleton-question-list">{survey.map((question, index) => <fieldset key={question.q}><legend><span>{String(question.q).padStart(2, "0")}</span>{question.title}</legend><div className="radio-row">{question.options.map((option) => <label key={option.code}><input type="radio" name={`skeleton-q-${question.q}`} checked={answers[index] === option.code} onChange={() => updateAnswer(index, option.code)} /><span>{option.text}</span></label>)}</div></fieldset>)}</div>
    <button className="primary skeleton-diagnose" type="button" disabled={!canDiagnose} onClick={diagnose}>결과 보기</button>
    {result && <section className="skeleton-result" aria-live="polite"><div><p className="eyebrow">SKELETON RESULT</p><h3>{result.typeKor}{typeof result.percent?.final === "number" ? <small> {result.percent.final}%</small> : null}</h3><span>신뢰도 {result.conf} · {photoPersona ? "사진 분석 + 설문 결과" : "설문 결과"}</span></div>{result.photoSupport?.length ? <div className="skeleton-result-photo-summary"><b>사진 분석 요약</b><ul>{result.photoSupport.map((reason) => <li key={reason}>{reason}</li>)}</ul></div> : null}<div className="skeleton-reason-list"><b>판정 근거</b><ul>{result.reasons.filter((reason) => !reason.startsWith("사진:")).map((reason) => <li key={reason}>{reason}</li>)}</ul>{result.photoAgainst?.length ? <p>참고: 사진에서 다른 유형의 특징도 보였어요 — {result.photoAgainst.join(" · ")}</p> : null}</div>{result.note && <p className="skeleton-note">{result.note}</p>}{result.fit && <dl><div><dt>키워드</dt><dd>{result.fit.keyword}</dd></div><div><dt>소재</dt><dd>{result.fit.material}</dd></div><div><dt>실루엣</dt><dd>{result.fit.silhouette}</dd></div><div><dt>넥라인</dt><dd>{result.fit.neck}</dd></div><div><dt>기장</dt><dd>{result.fit.length}</dd></div><div><dt>피할 것</dt><dd>{result.fit.avoid}</dd></div></dl>}</section>}
  </section>;
}
