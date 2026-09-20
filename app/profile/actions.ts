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
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function value(formData: FormData, name: string) {
  const candidate = formData.get(name);
  return typeof candidate === "string" ? candidate : "";
}

function photo(formData: FormData, name: string) {
  const candidate = formData.get(name);
  return candidate instanceof File && candidate.size > 0 ? candidate : null;
}

async function uploadPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: File,
  kind: "personal-color" | "body-type",
) {
  if (!allowedImageTypes.has(file.type) || file.size > 12 * 1024 * 1024) {
    throw new Error("사진은 JPG, PNG, WEBP 형식의 12MB 이하 파일만 등록할 수 있어요.");
  }
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${kind}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("style-photos").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error("사진을 비공개 보관함에 저장하지 못했어요. Supabase의 0003 마이그레이션 실행 여부를 확인해 주세요.");
  return path;
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

  const personalColorPhoto = photo(formData, "personalColorPhoto");
  const bodyPhoto = photo(formData, "bodyPhoto");
  let personalColorPhotoPath: string | undefined;
  let bodyPhotoPath: string | undefined;
  try {
    if (personalColorPhoto) personalColorPhotoPath = await uploadPhoto(supabase, user.id, personalColorPhoto, "personal-color");
    if (bodyPhoto) bodyPhotoPath = await uploadPhoto(supabase, user.id, bodyPhoto, "body-type");
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "사진을 저장하지 못했습니다." };
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
    ...(personalColorPhotoPath ? { personal_color_photo_path: personalColorPhotoPath, personal_color_source: "photo_pending", personal_color_ai_result: null } : {}),
    ...(bodyPhotoPath ? { body_photo_path: bodyPhotoPath, body_type_source: "photo_pending", body_type_ai_result: null } : {}),
  };
  const { error } = await supabase.from("profiles").upsert(profile);
  if (error) return { success: false, message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  revalidatePath("/");
  revalidatePath("/mypage");
  redirect("/");
}
