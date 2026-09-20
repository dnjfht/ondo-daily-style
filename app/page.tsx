import { OndoDashboard } from "@/components/ondo-dashboard";
import { getOutfits } from "@/lib/data/outfits";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export default async function Home() {
  const outfits = await getOutfits();
  let signedIn = false;
  let styleProfile: {
    personalColor: string | null;
    bodyType: string | null;
    personalColorAiResult: string | null;
    bodyTypeAiResult: string | null;
    personalColorSource: string | null;
    bodyTypeSource: string | null;
    preferredStyle: string | null;
    stylePreferences: Record<string, string> | null;
    gender: string | null;
    ageRange: string | null;
    analysisCompletedAt: string | null;
  } | null = null;
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);
    if (user) {
      const { data } = await supabase.from("profiles").select("personal_color,body_type,personal_color_ai_result,body_type_ai_result,personal_color_source,body_type_source,preferred_style,style_preferences,gender,age_range,analysis_completed_at").eq("id", user.id).maybeSingle();
      if (data) styleProfile = {
        personalColor: data.personal_color,
        bodyType: data.body_type,
        personalColorAiResult: data.personal_color_ai_result,
        bodyTypeAiResult: data.body_type_ai_result,
        personalColorSource: data.personal_color_source,
        bodyTypeSource: data.body_type_source,
        preferredStyle: data.preferred_style,
        stylePreferences: data.style_preferences as Record<string, string> | null,
        gender: data.gender,
        ageRange: data.age_range,
        analysisCompletedAt: data.analysis_completed_at,
      };
    }
  }
  return <OndoDashboard outfits={outfits} signedIn={signedIn} styleProfile={styleProfile} />;
}
