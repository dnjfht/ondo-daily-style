import { OndoDashboard } from "@/components/ondo-dashboard";
import { getOutfits } from "@/lib/data/outfits";

export default async function Home() {
  const outfits = await getOutfits();
  return <OndoDashboard outfits={outfits} />;
}
