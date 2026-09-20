import type { Outfit, Situation } from "@/lib/types";

export type StyleSignals = {
  personalColor: string | null;
  bodyType: string | null;
  preferredStyle: string | null;
  stylePreferences: Record<string, string> | null;
};

const colorNames: Record<string, string> = { warm: "아이보리·카멜", cool: "네이비·쿨 그레이", neutral: "오프화이트·차콜" };
const imageByMood: Record<string, Record<Situation, string>> = {
  minimal: { daily: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85", work: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1200&q=85", date: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1200&q=85" },
  casual: { daily: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85", work: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1200&q=85", date: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1200&q=85" },
  classic: { daily: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=85", work: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85", date: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1200&q=85" },
  street: { daily: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=85", work: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=85", date: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=85" },
};

const copy: Record<Situation, { title: string; base: string; top: string; bottom: string; shoes: string; accessory: string }> = {
  daily: { title: "가볍고 균형 잡힌 데일리 룩", base: "움직임이 편안하면서도 색과 핏의 중심이 잡히는 조합", top: "레이어드 가능한 상의", bottom: "편안한 하의", shoes: "많이 걷기 좋은 신발", accessory: "가벼운 가방 또는 캡" },
  work: { title: "차분한 균형, 출근 룩", base: "실내외 온도 차에도 단정한 인상을 유지하는 조합", top: "정돈된 상의", bottom: "실루엣이 깔끔한 하의", shoes: "단정한 로퍼 또는 스니커즈", accessory: "수납이 좋은 가방" },
  date: { title: "여유 있는 무드, 약속 룩", base: "부드러운 인상과 활동성을 함께 고려한 조합", top: "얼굴빛을 살리는 상의", bottom: "움직임이 자연스러운 하의", shoes: "편안한 포인트 슈즈", accessory: "작은 숄더백 또는 액세서리" },
};

function searchUrl(query: string) { return `https://www.musinsa.com/search/musinsa/goods?q=${encodeURIComponent(query)}`; }

export function recommendOutfit(situation: Situation, temperature: number, profile: StyleSignals | null): Outfit {
  const mood = profile?.preferredStyle && imageByMood[profile.preferredStyle] ? profile.preferredStyle : "minimal";
  const body = profile?.bodyType ?? "balanced";
  const color = profile?.personalColor ?? "neutral";
  const silhouette = profile?.stylePreferences?.silhouette ?? "balanced";
  const climateLayer = temperature < 12 ? "보온 레이어" : temperature < 20 ? "가벼운 아우터" : "통기성 레이어";
  const shape = body === "wave" ? "허리선을 살린" : body === "natural" ? "여유 있는" : body === "straight" ? "정돈된 정핏" : silhouette === "relaxed" ? "여유 있는" : "균형 잡힌";
  const details = copy[situation];
  const query = `${colorNames[color] ?? colorNames.neutral} ${mood} ${details.top}`;
  return {
    id: `personal-${situation}-${mood}-${color}-${body}-${temperature < 20 ? "cool" : "warm"}`,
    title: `${colorNames[color] ?? colorNames.neutral} ${details.title}`,
    subtitle: `${mood} · ${shape} 핏`, styleTag: situation === "daily" ? "데일리" : situation === "work" ? "출근" : "데이트",
    situation, minTemp: temperature - 4, maxTemp: temperature + 4, imageUrl: imageByMood[mood][situation],
    colors: color === "warm" ? ["#F1E9DC", "#C79D76", "#62554B", "#314536"] : color === "cool" ? ["#EDF0F2", "#9EAFBE", "#34465E", "#2D3340"] : ["#F0F0EB", "#A1AAA5", "#454C49", "#2F3E38"],
    reason: `${details.base}이에요. 현재 ${temperature}°에는 ${climateLayer}를 더해 조절해 보세요.`,
    items: [`${climateLayer} · ${shape} 핏`, `${details.top} · ${colorNames[color] ?? colorNames.neutral}`, `${details.bottom} · ${shape} 실루엣`, details.shoes, details.accessory],
    products: [
      { merchant: "무신사", label: `추천 상의 · ${details.top}`, url: searchUrl(`${query} 상의`) },
      { merchant: "29CM", label: `추천 하의 · ${details.bottom}`, url: "https://www.29cm.co.kr/" },
      { merchant: "W컨셉", label: `추천 신발 · ${details.shoes}`, url: "https://www.wconcept.co.kr/" },
      { merchant: "EQL", label: `가방·모자 · ${details.accessory}`, url: "https://www.eqlstore.com/" },
      { merchant: "SSF샵", label: "같은 무드 전체 보기", url: "https://www.ssfshop.com/" },
    ],
  };
}
