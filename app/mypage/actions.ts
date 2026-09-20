"use server";

import { redirect } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export async function signOut() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

const genders = new Set(["female", "male", "nonbinary", "prefer_not"]);
const ageRanges = new Set(["10s", "20s", "30s", "40s", "50s", "60_plus", "prefer_not"]);

export async function saveDemographics(formData: FormData) {
  if (!hasSupabaseEnv()) return;
  const gender = String(formData.get("gender") ?? "");
  const ageRange = String(formData.get("ageRange") ?? "");
  if (!genders.has(gender) || !ageRanges.has(ageRange)) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.auth.updateUser({ data: { gender, age_range: ageRange } });
  await supabase.from("profiles").upsert({ id: user.id, gender, age_range: ageRange, updated_at: new Date().toISOString() });
  redirect("/mypage");
}
