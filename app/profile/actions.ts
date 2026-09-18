"use server";

import { revalidatePath } from "next/cache";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export type ProfileActionState = { message: string; success: boolean };

export async function saveProfile(_: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  if (!hasSupabaseEnv()) return { success: false, message: "데모 모드입니다. .env.local에 Supabase 값을 추가하면 저장 기능이 활성화됩니다." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "프로필을 저장하려면 먼저 로그인해야 합니다." };

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    personal_color: formData.get("personalColor"),
    body_type: formData.get("bodyType"),
    preferred_style: formData.get("style"),
    preferred_city: formData.get("city"),
    style_preferences: {
      mood: formData.get("mood"),
      silhouette: formData.get("silhouette"),
      color_depth: formData.get("colorDepth"),
      activity: formData.get("activity"),
    },
    analysis_completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) return { success: false, message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  revalidatePath("/");
  return { success: true, message: "나의 스타일 프로필을 저장했어요." };
}
