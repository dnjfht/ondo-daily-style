import type { Outfit, Situation } from "@/lib/types";

export type StyleSignals = {
  personalColor: string | null;
  bodyType: string | null;
  preferredStyle: string | null;
  stylePreferences: Record<string, string> | null;
};

const colorNames: Record<string, string> = { warm: "아이보리·카멜", cool: "네이비·쿨 그레이" };
const imageByMood: Record<string, Record<Situation, string>> = {
  minimal: { daily: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85", work: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1200&q=85", date: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1200&q=85" },
  casual: { daily: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85", work: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1200&q=85", date: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1200&q=85" },
  classic: { daily: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=85", work: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85", date: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1200&q=85" },
  street: { daily: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=85", work: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=85", date: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=85" },
};
export const situationLookImages: Record<Situation, string> = {
  daily: "/outfits/daily-look.png",
  work: "/outfits/work-look.png",
  date: "/outfits/date-look.png",
};

const copy: Record<Situation, { title: string; base: string; top: string; bottom: string; shoes: string; accessory: string }> = {
  daily: { title: "가볍고 균형 잡힌 데일리 룩", base: "움직임이 편안하면서도 색과 핏의 중심이 잡히는 조합", top: "레이어드 가능한 상의", bottom: "편안한 하의", shoes: "많이 걷기 좋은 신발", accessory: "가벼운 가방 또는 캡" },
  work: { title: "차분한 균형, 출근 룩", base: "실내외 온도 차에도 단정한 인상을 유지하는 조합", top: "정돈된 상의", bottom: "실루엣이 깔끔한 하의", shoes: "단정한 로퍼 또는 스니커즈", accessory: "수납이 좋은 가방" },
  date: { title: "여유 있는 무드, 약속 룩", base: "부드러운 인상과 활동성을 함께 고려한 조합", top: "얼굴빛을 살리는 상의", bottom: "움직임이 자연스러운 하의", shoes: "편안한 포인트 슈즈", accessory: "작은 숄더백 또는 액세서리" },
};

export function recommendOutfit(situation: Situation, temperature: number, profile: StyleSignals | null, variationSeed = 0): Outfit {
  // 날짜를 시드로 삼아 하루 동안에는 같은 결과를 유지하면서, 다음 날에는
  // 날씨 조건을 벗어나지 않는 다른 상품군을 제안합니다.
  const variation = Math.abs(variationSeed) % 3;
  const pick = <T,>(options: readonly T[]) => options[variation % options.length];
  const mood = profile?.preferredStyle && imageByMood[profile.preferredStyle] ? profile.preferredStyle : "minimal";
  const body = profile?.bodyType ?? "balanced";
  const color = profile?.personalColor === "cool" ? "cool" : "warm";
  const silhouette = profile?.stylePreferences?.silhouette ?? "balanced";
  const hasOuter = temperature < 20;
  const climateAdvice = temperature < 12 ? "보온 아우터를 더해" : temperature < 20 ? "가벼운 아우터로 일교차에 대비해" : "아우터 없이 통기성 좋은 상의 중심으로";
  const shape = body === "wave" ? "허리선을 살린" : body === "natural" ? "여유 있는" : body === "straight" ? "정돈된 정핏" : silhouette === "relaxed" ? "여유 있는" : "균형 잡힌";
  const details = copy[situation];
  // ONDO의 현재 추천 대상은 20대 여성으로 고정합니다.
  const topCategory = temperature >= 23
    ? pick(["반팔 블라우스", "린넨 셔츠", "니트 반팔"])
    : pick(["블라우스", "긴팔 셔츠", "가디건 세트"]);
  const outerCategory = temperature < 12
    ? pick(["코트", "패딩 재킷", "울 재킷"])
    : temperature < 17
      ? pick(["재킷", "트렌치코트", "가죽 재킷"])
      : pick(["가디건", "데님 재킷", "얇은 셔츠 재킷"]);
  const bottomCategory = situation === "work"
    ? pick(["슬랙스", "세미 와이드 팬츠", "테이퍼드 팬츠"])
    : situation === "date"
      ? pick(["롱 스커트", "미디 스커트", "와이드 데님"])
      : pick(["데님 팬츠", "코튼 팬츠", "와이드 팬츠"]);
  const shoesCategory = situation === "work"
    ? pick(["로퍼", "플랫슈즈", "단정한 스니커즈"])
    : situation === "date"
      ? pick(["플랫슈즈", "메리제인", "로우힐"])
      : pick(["스니커즈", "캔버스화", "러닝화"]);
  const accessoryCategory = situation === "work"
    ? pick(["토트백", "숄더백", "백팩"])
    : situation === "date"
      ? pick(["미니 숄더백", "미니 토트백", "클러치백"])
      : mood === "street" || mood === "casual"
        ? pick(["볼캡", "나일론 백팩", "크로스백"])
        : pick(["숄더백", "토트백", "버킷백"]);
  return {
    // 저장 키에는 날짜와 도시도 포함되므로, 룩 ID는 기존 저장 항목과 호환되게 유지합니다.
    id: `personal-${situation}-${mood}-${color}-${body}-${temperature < 20 ? "cool" : "warm"}`,
    title: `${colorNames[color] ?? colorNames.warm} ${details.title}`,
    subtitle: `${mood} · ${shape} 핏`, styleTag: situation === "daily" ? "데일리" : situation === "work" ? "출근" : "데이트",
    situation, minTemp: temperature - 4, maxTemp: temperature + 4, imageUrl: situationLookImages[situation],
    colors: color === "warm" ? ["#F1E9DC", "#C79D76", "#62554B", "#314536"] : ["#EDF0F2", "#9EAFBE", "#34465E", "#2D3340"],
    reason: `${details.base}이에요. 20대 여성 기준과 현재 ${temperature}°에는 ${climateAdvice} 조절해 보세요.`,
    items: [hasOuter ? `${outerCategory} · ${shape} 핏` : "아우터 없이 가볍게", `${topCategory} · ${colorNames[color] ?? colorNames.warm}`, `${bottomCategory} · ${shape} 실루엣`, shoesCategory, accessoryCategory],
    // 실제 상품 선택은 catalog-recommendations API의 내부 카탈로그 점수로 처리합니다.
    // 이 객체는 룩의 설명과 저장 키를 유지하기 위한 프레젠테이션 메타데이터만 담습니다.
    products: [],
  };
}
