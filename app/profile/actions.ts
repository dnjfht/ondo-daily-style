"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export type ProfileActionState = { message: string; success: boolean };

const allowedColors = new Set(["warm", "cool", "neutral"]);
const allowedBodies = new Set(["straight", "wave", "natural"]);
const allowedMoods = new Set(["minimal", "casual", "classic", "street", "unknown"]);
const allowedSilhouettes = new Set(["balanced", "relaxed", "defined", "unknown"]);
const allowedColorDepths = new Set(["neutral", "soft", "bold", "unknown"]);
const allowedActivity = new Set(["low", "medium", "high"]);
const allowedCities = new Set(["seoul", "busan", "daegu", "jeju"]);

function value(formData: FormData, name: string) {
  const candidate = formData.get(name);
  return typeof candidate === "string" ? candidate : "";
}


export async function saveProfile(_: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  if (!hasSupabaseEnv()) return { success: false, message: "데모 모드입니다. .env.local에 Supabase 값을 추가하면 저장 기능이 활성화됩니다." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "프로필을 저장하려면 먼저 로그인해야 합니다." };

  const personalColor = value(formData, "personalColor");
  const bodyType = value(formData, "bodyType");
  const mood = value(formData, "mood");
  const silhouette = value(formData, "silhouette");
  const colorDepth = value(formData, "colorDepth");
  const activity = value(formData, "activity");
  const city = value(formData, "city");
  if (!allowedColors.has(personalColor) || !allowedBodies.has(bodyType) || !allowedMoods.has(mood) || !allowedSilhouettes.has(silhouette) || !allowedColorDepths.has(colorDepth) || !allowedActivity.has(activity) || !allowedCities.has(city)) {
    return { success: false, message: "사진은 선택 사항이에요. 사진 외의 모든 설문 문항에 답한 뒤 결과를 저장해 주세요." };
  }

  const profile = {
    id: user.id,
    personal_color: personalColor,
    body_type: bodyType,
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
    // AI 기능이 아직 없으므로 업로드 사진은 서버로 전송하거나 보관하지 않습니다.
    // AI 연결 후에는 일회성 분석 API가 결과만 반환하도록 연결합니다.
    personal_color_source: "survey",
    body_type_source: "survey",
  };
  const { error } = await supabase.from("profiles").upsert(profile);
  if (error) return { success: false, message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  revalidatePath("/");
  revalidatePath("/mypage");
  redirect("/");
}
