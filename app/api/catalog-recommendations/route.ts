import { NextResponse } from "next/server";
import { recommendCatalogProducts, type CatalogProductRow, type RecommendationSignals } from "@/lib/catalog-recommendation";
import { createClient, createPublicClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { Situation } from "@/lib/types";

const situations: Situation[] = ["daily", "work", "date"];

type ProfileRow = {
  personal_color: string | null;
  personal_color_ai_result: string | null;
  personal_color_source: string | null;
  body_type: string | null;
  body_type_ai_result: string | null;
  body_type_source: string | null;
  preferred_style: string | null;
  style_preferences: Record<string, string> | null;
};

function numeric(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dateKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

export async function GET(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "카탈로그 서비스를 준비 중입니다." }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const situation = params.get("situation") as Situation;
  if (!situations.includes(situation)) return NextResponse.json({ error: "추천 상황이 올바르지 않습니다." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let profile: ProfileRow | null = null;
  if (user) {
    // 프로필 설문 저장과 같은 profiles 테이블을 읽어야 최신 재진단 결과가 즉시 반영됩니다.
    const { data, error } = await supabase.from("profiles").select("personal_color, personal_color_ai_result, personal_color_source, body_type, body_type_ai_result, body_type_source, preferred_style, style_preferences").eq("id", user.id).maybeSingle();
    if (error) return NextResponse.json({ error: "스타일 프로필을 불러오지 못했습니다." }, { status: 500 });
    profile = data as ProfileRow | null;
  }
  const catalogSupabase = createPublicClient();
  const { data, error } = await catalogSupabase
    .from("catalog_products")
    .select("id, source_product_id, name, category, subtype, material, warmth_level, breathability_level, catalog_variants(id, color_name, image_path, personal_color_match), catalog_tags(dimension, value, score), catalog_weather_rules(apparent_temp_min, apparent_temp_max, humidity_max, wind_max_mps, precipitation, diurnal_range)")
    .eq("active", true);
  if (error) return NextResponse.json({ error: "상품 카탈로그를 불러오지 못했습니다." }, { status: 500 });

  const preferences = (profile?.style_preferences ?? {}) as Record<string, string>;
  const personalColor = profile?.personal_color_source === "ai" ? profile.personal_color_ai_result ?? profile.personal_color : profile?.personal_color;
  const bodyType = profile?.body_type_source === "ai" ? profile.body_type_ai_result ?? profile.body_type : profile?.body_type;
  const signals: RecommendationSignals = {
    personalColor: personalColor === "warm" || personalColor === "cool" ? personalColor : null,
    bodyType: bodyType === "straight" || bodyType === "wave" || bodyType === "natural" ? bodyType : null,
    mood: profile?.preferred_style ?? null,
    silhouette: preferences.silhouette ?? null,
    situation,
    apparent: numeric(params.get("apparent"), 24),
    humidity: numeric(params.get("humidity"), 55),
    wind: numeric(params.get("wind"), 2),
    precipitationMm: numeric(params.get("precipitation"), 0),
    precipitationProbability: numeric(params.get("precipitationProbability"), 0),
    dailyRange: numeric(params.get("dailyRange"), 7),
    dateKey: dateKey(),
  };

  return NextResponse.json({ groups: recommendCatalogProducts((data ?? []) as unknown as CatalogProductRow[], signals), signals: { apparent: signals.apparent, personalColor: signals.personalColor, bodyType: signals.bodyType } });
}
