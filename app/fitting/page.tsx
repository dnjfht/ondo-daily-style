import { FittingStudio, type FittingDiagnosis, type FittingSignals } from "@/components/fitting-studio";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { Situation } from "@/lib/types";

type ProfileRow = { personal_color: string | null; personal_color_ai_result: string | null; personal_color_source: string | null; body_type: string | null; body_type_ai_result: string | null; body_type_source: string | null; };
type FittingPageProps = { searchParams: Promise<Record<string, string | undefined>> };

const situations: Situation[] = ["daily", "work", "date"];
const bodyTypes = ["straight", "wave", "natural"] as const;
const tones = ["warm", "cool"] as const;

function numberParam(value: string | undefined, fallback: number) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function normalizeBody(value: string | null) { if (value === "스트레이트") return "straight"; if (value === "웨이브") return "wave"; if (value === "내추럴") return "natural"; return bodyTypes.includes(value as (typeof bodyTypes)[number]) ? value as (typeof bodyTypes)[number] : null; }
function normalizeTone(value: string | null) { if (!value) return null; if (/봄웜|가을웜|웜/.test(value)) return "warm"; if (/여름쿨|겨울쿨|쿨/.test(value)) return "cool"; return tones.includes(value as (typeof tones)[number]) ? value as (typeof tones)[number] : null; }

export default async function FittingPage(props: FittingPageProps) {
  const params = await props.searchParams;
  const situation = situations.includes(params.situation as Situation) ? params.situation as Situation : "daily";
  const signals: FittingSignals = { situation, apparent: numberParam(params.apparent, 21), humidity: numberParam(params.humidity, 55), wind: numberParam(params.wind, 2), precipitation: numberParam(params.precipitation, 0), precipitationProbability: numberParam(params.precipitationProbability, 0), dailyRange: numberParam(params.dailyRange, 7) };
  let diagnosis: FittingDiagnosis = { body: null, tone: null };
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("personal_color, personal_color_ai_result, personal_color_source, body_type, body_type_ai_result, body_type_source").eq("id", user.id).maybeSingle();
      const profile = data as ProfileRow | null;
      if (profile) {
        const storedBody = profile.body_type_source === "ai" ? profile.body_type_ai_result ?? profile.body_type : profile.body_type;
        const storedTone = profile.personal_color_source === "ai" ? profile.personal_color_ai_result ?? profile.personal_color : profile.personal_color;
        diagnosis = { body: normalizeBody(storedBody), tone: normalizeTone(storedTone) };
      }
    }
  }
  // 로컬 테스트 전용입니다. 실제 사용자 선택 UI에는 노출하지 않습니다.
  if (process.env.NODE_ENV !== "production" && typeof params.preview === "string") {
    const [body, tone] = params.preview.split("-");
    if (bodyTypes.includes(body as (typeof bodyTypes)[number]) && tones.includes(tone as (typeof tones)[number])) diagnosis = { body: body as FittingDiagnosis["body"], tone: tone as FittingDiagnosis["tone"] };
  }
  return <FittingStudio diagnosis={diagnosis} signals={signals} initialProductId={params.product} initialSourceProductId={params.source} initialColorName={params.color} />;
}
