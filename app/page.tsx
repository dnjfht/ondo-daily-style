import { OndoDashboard } from "@/components/ondo-dashboard";
import { getOutfits } from "@/lib/data/outfits";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export default async function Home() {
  const outfits = await getOutfits();
  let signedIn = false;
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }
  return <OndoDashboard outfits={outfits} signedIn={signedIn} />;
}
