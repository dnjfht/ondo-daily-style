import { NextResponse } from "next/server";
import { createPublicClient, hasSupabaseEnv } from "@/lib/supabase/server";

const bodyTypes = ["straight", "wave", "natural"] as const;
const tones = ["warm", "cool"] as const;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CachedFittingRow = {
  image_url: string;
  generated_at: string;
  generator: string;
  model_version: string;
};

/**
 * This endpoint deliberately only reads pre-generated results. It never sends
 * a visitor image to a generator and remains usable while a demo GPU is off.
 */
export async function GET(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "피팅 캐시 서비스를 준비 중입니다." }, { status: 503 });
  }

  const params = new URL(request.url).searchParams;
  const body = params.get("body");
  const tone = params.get("tone");
  const variantId = params.get("variantId");

  if (!bodyTypes.includes(body as (typeof bodyTypes)[number]) || !tones.includes(tone as (typeof tones)[number]) || !variantId || !uuidPattern.test(variantId)) {
    return NextResponse.json({ error: "피팅 결과 조회 조건이 올바르지 않습니다." }, { status: 400 });
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("fitting_results")
    .select("image_url, generated_at, generator, model_version")
    .eq("body_type", body)
    .eq("tone", tone)
    .eq("variant_id", variantId)
    .eq("status", "ready")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "피팅 캐시를 불러오지 못했습니다." }, { status: 500 });
  }

  const result = data as CachedFittingRow | null;
  return NextResponse.json(
    { result: result ? { imageUrl: result.image_url, generatedAt: result.generated_at, generator: result.generator, modelVersion: result.model_version } : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
