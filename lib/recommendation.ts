import type { Outfit, ProductCategory, Situation } from "@/lib/types";

export type StyleSignals = {
  personalColor: string | null;
  bodyType: string | null;
  preferredStyle: string | null;
  stylePreferences: Record<string, string> | null;
  gender: string | null;
  ageRange: string | null;
};

const colorNames: Record<string, string> = { warm: "아이보리·카멜", cool: "네이비·쿨 그레이", neutral: "오프화이트·차콜" };
const searchColors: Record<string, string> = { warm: "아이보리", cool: "네이비", neutral: "차콜" };
const ageLabels: Record<string, string> = { "10s": "10대", "20s": "20대", "30s": "30대", "40s": "40대", "50s": "50대", "60_plus": "60대 이상" };
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

function musinsaSearchUrl(query: string) { return `https://www.musinsa.com/search/goods?keyword=${encodeURIComponent(query)}&keywordType=keyword&gf=A`; }
function naverShoppingUrl(query: string) { return `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`; }
function cmSearchUrl(query: string) { return `https://www.29cm.co.kr/store/search?keyword=${encodeURIComponent(query)}`; }
function wConceptSearchUrl(query: string) { return `https://display.wconcept.co.kr/search?keyword=${encodeURIComponent(query)}`; }
function eqlSearchUrl(query: string) { return `https://www.eqlstore.com/public/search/view?searchWord=${encodeURIComponent(query)}&tabContent0=`; }
function ssfSearchUrl(query: string) { return `https://www.ssfshop.com/search/result?keyword=${encodeURIComponent(query)}`; }

export function recommendOutfit(situation: Situation, temperature: number, profile: StyleSignals | null): Outfit {
  const mood = profile?.preferredStyle && imageByMood[profile.preferredStyle] ? profile.preferredStyle : "minimal";
  const body = profile?.bodyType ?? "balanced";
  const color = profile?.personalColor ?? "neutral";
  const silhouette = profile?.stylePreferences?.silhouette ?? "balanced";
  const genderQuery = profile?.gender === "female" ? "여성" : profile?.gender === "male" ? "남성" : "유니섹스";
  const ageQuery = profile?.ageRange ? ageLabels[profile.ageRange] ?? "" : "";
  const hasOuter = temperature < 20;
  const climateAdvice = temperature < 12 ? "보온 아우터를 더해" : temperature < 20 ? "가벼운 아우터로 일교차에 대비해" : "아우터 없이 통기성 좋은 상의 중심으로";
  const shape = body === "wave" ? "허리선을 살린" : body === "natural" ? "여유 있는" : body === "straight" ? "정돈된 정핏" : silhouette === "relaxed" ? "여유 있는" : "균형 잡힌";
  const details = copy[situation];
  // 긴 문장은 검색 결과가 비기 쉬워, 외부 쇼핑몰에는 색상과 실제 상품군만 전달합니다.
  // 성별·연령대·상황은 상품군 선정과 네이버 쇼핑의 상세 검색어에 함께 반영합니다.
  const topCategory = profile?.gender === "female" ? (temperature >= 23 ? "반팔 블라우스" : "블라우스") : (temperature >= 23 ? "반팔 셔츠" : "셔츠");
  const outerCategory = temperature < 12 ? "코트" : temperature < 17 ? "재킷" : "가디건";
  const colorTerm = searchColors[color] ?? searchColors.neutral;
  const bottomCategory = situation === "work" ? "슬랙스" : situation === "date" && profile?.gender === "female" ? "롱 스커트" : "데님 팬츠";
  const shoesCategory = situation === "work" ? "로퍼" : situation === "date" && profile?.gender === "female" ? "플랫슈즈" : "스니커즈";
  const accessoryCategory = situation === "work" ? "토트백" : situation === "date" ? (profile?.gender === "female" ? "미니 숄더백" : "미니 크로스백") : mood === "street" || mood === "casual" ? "볼캡" : (profile?.gender === "female" ? "숄더백" : "크로스백");
  const searchItems: { category: ProductCategory; label: string; term: string }[] = [
    ...(hasOuter ? [{ category: "outer" as const, label: "아우터", term: outerCategory }] : []),
    { category: "top", label: "상의", term: topCategory },
    { category: "bottom", label: "하의", term: bottomCategory },
    { category: "shoes", label: "신발", term: shoesCategory },
    { category: "accessory", label: "가방·캡", term: accessoryCategory },
  ];
  const naverQuery = (term: string) => `${genderQuery} ${ageQuery} ${colorTerm} ${term}`.trim();
  const simpleQuery = (term: string) => `${colorTerm} ${term}`;
  const merchants = [
    { merchant: "네이버 쇼핑", createUrl: naverShoppingUrl, query: naverQuery },
    { merchant: "무신사", createUrl: musinsaSearchUrl, query: simpleQuery },
    { merchant: "29CM", createUrl: cmSearchUrl, query: simpleQuery },
    { merchant: "W컨셉", createUrl: wConceptSearchUrl, query: simpleQuery },
    { merchant: "EQL", createUrl: eqlSearchUrl, query: simpleQuery },
    { merchant: "SSF샵", createUrl: ssfSearchUrl, query: simpleQuery },
  ];
  return {
    id: `personal-${situation}-${mood}-${color}-${body}-${temperature < 20 ? "cool" : "warm"}`,
    title: `${colorNames[color] ?? colorNames.neutral} ${details.title}`,
    subtitle: `${mood} · ${shape} 핏`, styleTag: situation === "daily" ? "데일리" : situation === "work" ? "출근" : "데이트",
    situation, minTemp: temperature - 4, maxTemp: temperature + 4, imageUrl: situationLookImages[situation],
    colors: color === "warm" ? ["#F1E9DC", "#C79D76", "#62554B", "#314536"] : color === "cool" ? ["#EDF0F2", "#9EAFBE", "#34465E", "#2D3340"] : ["#F0F0EB", "#A1AAA5", "#454C49", "#2F3E38"],
    reason: `${details.base}이에요. ${genderQuery}${ageQuery ? ` ${ageQuery}` : ""} 기준과 현재 ${temperature}°에는 ${climateAdvice} 조절해 보세요.`,
    items: [hasOuter ? `${outerCategory} · ${shape} 핏` : "아우터 없이 가볍게", `${topCategory} · ${colorNames[color] ?? colorNames.neutral}`, `${bottomCategory} · ${shape} 실루엣`, shoesCategory, accessoryCategory],
    products: merchants.flatMap(({ merchant, createUrl, query }) => searchItems.map(({ category, label, term }) => ({
      merchant,
      category,
      label: `${label} · ${term} 검색 결과`,
      url: createUrl(query(term)),
    }))),
  };
}
