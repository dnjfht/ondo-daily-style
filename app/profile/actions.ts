"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { deriveBodyType, hasCompletedBodySurvey, isBodySurveyAnswer, isBodyType, type BodySurveyAnswer } from "@/lib/body-survey";

export type ProfileActionState = { message: string; success: boolean };

const allowedColors = new Set(["warm", "cool"]);
const allowedMoods = new Set(["minimal", "casual", "classic", "street", "unknown"]);
const allowedSilhouettes = new Set(["balanced", "relaxed", "defined", "unknown"]);
const allowedColorDepths = new Set(["neutral", "soft", "bold", "unknown"]);
const allowedActivity = new Set(["low", "medium", "high"]);
const allowedCities = new Set(["seoul", "busan", "daegu", "jeju"]);

function value(formData: FormData, name: string) {
  const candidate = formData.get(name);
  return typeof candidate === "string" ? candidate : "";
}

function bodyAnswers(formData: FormData) {
  try {
    const parsed = JSON.parse(value(formData, "bodySurveyAnswers")) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).filter(([, answer]) => isBodySurveyAnswer(answer))) as Record<string, BodySurveyAnswer>;
  } catch { return {}; }
}

export async function saveProfile(_: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  if (!hasSupabaseEnv()) return { success: false, message: "데모 모드입니다. .env.local에 Supabase 값을 추가하면 저장 기능이 활성화됩니다." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "프로필을 저장하려면 먼저 로그인해야 합니다." };

  const personalColor = value(formData, "personalColor");
  const suppliedBodyType = value(formData, "bodyType");
  const surveyAnswers = bodyAnswers(formData);
  const professionalDiagnosis = value(formData, "professionalDiagnosis");
  const selfDiagnosis = value(formData, "selfDiagnosis");
  const mood = value(formData, "mood");
  const silhouette = value(formData, "silhouette");
  const colorDepth = value(formData, "colorDepth");
  const activity = value(formData, "activity");
  const city = value(formData, "city");
  if (!allowedColors.has(personalColor) || !hasCompletedBodySurvey(surveyAnswers) || !isBodySurveyAnswer(professionalDiagnosis) || !isBodySurveyAnswer(selfDiagnosis) || !allowedMoods.has(mood) || !allowedSilhouettes.has(silhouette) || !allowedColorDepths.has(colorDepth) || !allowedActivity.has(activity) || !allowedCities.has(city)) {
    return { success: false, message: "사진은 선택 사항이에요. 사진 외의 모든 설문 문항에 답한 뒤 결과를 저장해 주세요." };
  }
  const bodyType = deriveBodyType(surveyAnswers, professionalDiagnosis, selfDiagnosis);
  if (!isBodyType(suppliedBodyType) || suppliedBodyType !== bodyType) return { success: false, message: "체형 설문 결과를 다시 계산해 주세요." };

  const profile = {
    id: user.id,
    personal_color: personalColor,
    body_type: bodyType,
    body_survey_answers: {
      answers: surveyAnswers,
      professional_diagnosis: professionalDiagnosis,
      self_diagnosis: selfDiagnosis,
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
    // Python AI 모델이 연결되기 전에는 사진을 전송·보관하지 않고 설문 결과만 사용합니다.
    personal_color_source: "survey",
    body_type_source: "survey",
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
