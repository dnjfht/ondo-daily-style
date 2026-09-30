"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export type ProfileActionState = { message: string; success: boolean };

const allowedColors = new Set(["warm", "cool"]);
const allowedBodyTypes = new Set(["straight", "wave", "natural"]);
const allowedMoods = new Set(["minimal", "casual", "classic", "street", "unknown"]);
const allowedSilhouettes = new Set(["balanced", "relaxed", "defined", "unknown"]);
const allowedColorDepths = new Set(["neutral", "soft", "bold", "unknown"]);
const allowedActivity = new Set(["low", "medium", "high"]);
const allowedCities = new Set(["seoul", "busan", "daegu", "jeju"]);

function value(formData: FormData, name: string) {
  const candidate = formData.get(name);
  return typeof candidate === "string" ? candidate : "";
}

type StoredSkeletonSelection = {
  personaId: string;
  answers: number[];
  source: "survey" | "ai";
  photoPersona?: {
    p1: number;
    axes: { center: number; waist?: number; frame?: number };
    bodyLevel?: string;
    photoReasons: string[];
  };
  result: {
    type: "straight" | "wave" | "natural" | null;
    typeKor: string;
    conf: string;
    reasons: string[];
    note: string;
    fit: Record<string, string> | null;
  };
};

function skeletonSelection(formData: FormData): StoredSkeletonSelection | null {
  try {
    const parsed = JSON.parse(value(formData, "skeletonSelection")) as Partial<StoredSkeletonSelection>;
    const result = parsed.result;
    const answers = parsed.answers;
    const validType = result?.type === null || allowedBodyTypes.has(String(result?.type));
    const source = parsed.source === "ai" ? "ai" : parsed.source === "survey" ? "survey" : null;
    const photo = parsed.photoPersona;
    const validPhoto = !photo || (typeof photo === "object" && typeof photo.p1 === "number" && typeof photo.axes?.center === "number" && Array.isArray(photo.photoReasons) && photo.photoReasons.every((reason) => typeof reason === "string"));
    if (!result || typeof parsed.personaId !== "string" || !source || (source === "ai" && !photo) || !validPhoto || !Array.isArray(answers) || answers.length !== 11 || !answers.every((answer) => Number.isInteger(answer) && answer >= 1 && answer <= 4) || !validType || typeof result.typeKor !== "string" || typeof result.conf !== "string" || !Array.isArray(result.reasons) || !result.reasons.every((reason) => typeof reason === "string") || typeof result.note !== "string" || (result.fit !== null && (typeof result.fit !== "object" || Array.isArray(result.fit)))) return null;
    return { personaId: parsed.personaId, answers, source, photoPersona: photo as StoredSkeletonSelection["photoPersona"], result: { type: result.type as StoredSkeletonSelection["result"]["type"], typeKor: result.typeKor, conf: result.conf, reasons: result.reasons, note: result.note, fit: result.fit as Record<string, string> | null } };
  } catch { return null; }
}

export async function saveProfile(_: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  if (!hasSupabaseEnv()) return { success: false, message: "데모 모드입니다. .env.local에 Supabase 값을 추가하면 저장 기능이 활성화됩니다." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "프로필을 저장하려면 먼저 로그인해야 합니다." };

  const personalColor = value(formData, "personalColor");
  const personalColorSourceValue = value(formData, "personalColorSource");
  const personalColorAiResult = value(formData, "personalColorAiResult");
  const personalColorSource = personalColorSourceValue === "ai" && personalColorAiResult === personalColor ? "ai" : "survey";
  const skeleton = skeletonSelection(formData);
  const mood = value(formData, "mood");
  const silhouette = value(formData, "silhouette");
  const colorDepth = value(formData, "colorDepth");
  const activity = value(formData, "activity");
  const city = value(formData, "city");
  if (!allowedColors.has(personalColor) || !skeleton || !allowedMoods.has(mood) || !allowedSilhouettes.has(silhouette) || !allowedColorDepths.has(colorDepth) || !allowedActivity.has(activity) || !allowedCities.has(city)) {
    return { success: false, message: "골격 인물을 고르고 11개 문항의 결과를 확인한 뒤, 다른 설문 항목도 모두 선택해 주세요." };
  }

  const profile = {
    id: user.id,
    personal_color: personalColor,
    // 판정 보류(null)면 추천기가 골격 가점 없이 동작합니다.
    body_type: skeleton.result.type,
    body_survey_answers: {
      module: "ondo-skeleton-v3",
      persona_id: skeleton.personaId,
      answers: skeleton.answers,
      result: skeleton.result,
      source: skeleton.source,
      photo_signal: skeleton.source === "ai" ? skeleton.photoPersona : null,
    },
    preferred_style: mood,
    preferred_city: city,
    style_preferences: {
      mood,
      silhouette,
      color_depth: colorDepth,
      activity,
    },
    analysis_completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    personal_color_ai_result: personalColorSource === "ai" ? personalColor : null,
    // 사진 원본·경로는 저장하지 않고, 사진+설문의 최종 골격 결과만 보관합니다.
    body_type_ai_result: skeleton.source === "ai" ? skeleton.result.type : null,
    personal_color_source: personalColorSource,
    body_type_source: skeleton.source,
  };
  let { error } = await supabase.from("profiles").upsert(profile);
  // 원격 DB 마이그레이션 전에는 설문 원문 열이 없을 수 있습니다.
  // 그 경우에도 계산된 골격 결과와 취향은 기존 프로필에 안전하게 저장합니다.
  if (error && (error.code === "PGRST204" || error.message.includes("body_survey_answers"))) {
    const { body_survey_answers: _, ...legacyProfile } = profile;
    ({ error } = await supabase.from("profiles").upsert(legacyProfile));
  }
  if (error) return { success: false, message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  revalidatePath("/");
  revalidatePath("/mypage");
  redirect("/");
}
