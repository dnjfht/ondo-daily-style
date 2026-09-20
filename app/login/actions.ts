"use server";

import { headers } from "next/headers";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export type LoginActionState = { message: string; success: boolean; next?: string };

function authErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("rate limit") || normalized.includes("rate_limit")) {
    return "확인 이메일 발송 횟수가 잠시 제한됐어요. Supabase 무료 프로젝트는 메일 발송 한도가 있으니 잠시 후 다시 시도해 주세요.";
  }
  if (normalized.includes("email not confirmed")) {
    return "아직 이메일 인증이 완료되지 않았어요. 받은편지함의 확인 링크를 먼저 열어 주세요.";
  }
  if (normalized.includes("signup is disabled") || normalized.includes("signups not allowed")) {
    return "현재 회원가입이 허용되지 않은 상태입니다. Supabase의 Email 로그인 설정을 확인해 주세요.";
  }
  return "회원가입을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

const genders = new Set(["female", "male", "nonbinary", "prefer_not"]);
const ageRanges = new Set(["10s", "20s", "30s", "40s", "50s", "60_plus", "prefer_not"]);

export async function authenticate(_: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const intent = String(formData.get("intent") ?? "login");
  const { email, password } = readCredentials(formData);
  if (!email || !email.includes("@")) return { success: false, message: "이메일 주소를 확인해 주세요." };
  if (!hasSupabaseEnv()) return { success: false, message: "데모 모드입니다. Supabase 환경변수를 연결하면 로그인 기능이 활성화됩니다." };

  const supabase = await createClient();
  if (intent === "reset") {
    const origin = (await headers()).get("origin") ?? "http://localhost:3000";
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/confirm?next=/account/password` });
    if (error) return { success: false, message: "비밀번호 설정 링크를 보내지 못했습니다. 잠시 후 다시 시도해 주세요." };
    return { success: true, message: "비밀번호 설정 링크를 이메일로 보냈어요. 메일함에서 링크를 열어 주세요." };
  }
  if (intent === "magic") {
    const origin = (await headers()).get("origin") ?? "http://localhost:3000";
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/confirm` } });
    if (error) return { success: false, message: "로그인 링크를 보내지 못했습니다. 잠시 후 다시 시도해 주세요." };
    return { success: true, message: "로그인 링크를 이메일로 보냈어요. 메일함에서 링크를 열어 주세요." };
  }

  if (password.length < 8) return { success: false, message: "비밀번호는 8자 이상으로 만들어 주세요." };
  if (intent === "signup") {
    const gender = String(formData.get("gender") ?? "");
    const ageRange = String(formData.get("ageRange") ?? "");
    if (!genders.has(gender) || !ageRanges.has(ageRange)) return { success: false, message: "추천을 위한 성별과 연령대를 선택해 주세요." };
    const origin = (await headers()).get("origin") ?? "http://localhost:3000";
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/confirm`, data: { gender, age_range: ageRange } } });
    if (error) {
      console.error("Supabase sign-up failed", { code: error.code, message: error.message });
      if (error.message.toLowerCase().includes("already")) return { success: false, message: "이미 가입된 이메일입니다. 로그인하거나 비밀번호 설정 링크를 이용해 주세요." };
      return { success: false, message: authErrorMessage(error.message) };
    }
    if (data.session) return { success: true, message: "회원가입이 완료됐어요.", next: "/profile" };
    return { success: true, message: "확인 이메일을 보냈어요. 메일의 링크를 연 뒤 로그인해 주세요." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false, message: "이메일 또는 비밀번호가 올바르지 않습니다." };
  return { success: true, message: "로그인했어요.", next: "/mypage" };
}
