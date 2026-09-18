"use server";

import { headers } from "next/headers";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export type LoginActionState = { message: string; success: boolean };

export async function sendMagicLink(_: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !email.includes("@")) return { success: false, message: "이메일 주소를 확인해 주세요." };
  if (!hasSupabaseEnv()) return { success: false, message: "데모 모드입니다. Supabase 환경변수를 연결하면 로그인 링크를 보낼 수 있어요." };

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/profile` },
  });
  if (error) return { success: false, message: "로그인 링크를 보내지 못했습니다. 잠시 후 다시 시도해 주세요." };
  return { success: true, message: "입력한 이메일로 로그인 링크를 보냈어요. 메일함을 확인해 주세요." };
}
