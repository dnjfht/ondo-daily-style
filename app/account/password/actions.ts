"use server";

import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export type PasswordActionState = { message: string; success: boolean };

export async function updatePassword(_: PasswordActionState, formData: FormData): Promise<PasswordActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (password.length < 8) return { success: false, message: "비밀번호는 8자 이상으로 만들어 주세요." };
  if (password !== confirmation) return { success: false, message: "비밀번호 확인 값이 일치하지 않습니다." };
  if (!hasSupabaseEnv()) return { success: false, message: "Supabase 연결이 필요합니다." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { success: false, message: "비밀번호를 변경하지 못했습니다. 이메일의 링크를 다시 열어 주세요." };
  return { success: true, message: "비밀번호를 설정했습니다. 이제 이메일과 비밀번호로 로그인할 수 있어요." };
}
