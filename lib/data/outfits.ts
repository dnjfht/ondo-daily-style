import { sampleOutfits } from "@/lib/sample-data";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { Outfit, Situation } from "@/lib/types";

export async function getOutfits(situation?: Situation): Promise<Outfit[]> {
  if (!hasSupabaseEnv()) return situation ? sampleOutfits.filter((outfit) => outfit.situation === situation) : sampleOutfits;

  const supabase = await createClient();
  const query = supabase.from("outfits").select("id,title,subtitle,style_tag,situation,min_temp,max_temp,image_url,colors,reason,product_links,outfit_items(name,position)").eq("is_published", true).order("created_at", { ascending: false }).limit(3);
  const { data, error } = situation ? await query.eq("situation", situation) : await query;
  if (error || !data?.length) return situation ? sampleOutfits.filter((outfit) => outfit.situation === situation) : sampleOutfits;

  return data.map((outfit: any) => ({
    id: outfit.id,
    title: outfit.title,
    subtitle: outfit.subtitle,
    styleTag: outfit.style_tag,
    situation: outfit.situation,
    minTemp: outfit.min_temp,
    maxTemp: outfit.max_temp,
    imageUrl: outfit.image_url,
    colors: outfit.colors ?? [],
    reason: outfit.reason,
    products: outfit.product_links ?? [],
    items: (outfit.outfit_items ?? []).sort((a: any, b: any) => a.position - b.position).map((item: any) => item.name),
  }));
}
