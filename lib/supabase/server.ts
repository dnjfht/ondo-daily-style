import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export async function createClient() {
  if (!hasSupabaseEnv()) throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(values) {
          try {
            values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component에서 세션을 갱신하는 경우 쿠키 쓰기는 무시됩니다.
          }
        },
      },
    },
  );
}

// 카탈로그는 RLS상 공개 읽기 데이터입니다. 로그인 세션의 관계 조인 결과에
// 영향을 받지 않도록 추천 API에서는 이 익명 클라이언트만 사용합니다.
export function createPublicClient() {
  if (!hasSupabaseEnv()) throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
