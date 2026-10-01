import type { CatalogProductCategory, CatalogProductRecommendation, Situation } from "@/lib/types";

type CatalogVariant = {
  id: string;
  color_name: string;
  image_path: string;
  personal_color_match: "warm" | "cool" | "both";
};

type CatalogTag = {
  dimension: "body_type" | "mood" | "silhouette" | "situation";
  value: string;
  score: number;
};

type WeatherRule = {
  apparent_temp_min: number;
  apparent_temp_max: number;
  humidity_max: number;
  wind_max_mps: number;
  precipitation: "none" | "light_ok" | "rain_ok";
  diurnal_range: "stable" | "layerable";
};

export type CatalogProductRow = {
  id: string;
  source_product_id: string;
  name: string;
  category: CatalogProductCategory;
  subtype: string | null;
  material: string | null;
  warmth_level: number;
  breathability_level: number;
  catalog_variants: CatalogVariant[] | null;
  catalog_tags: CatalogTag[] | null;
  // product_id is unique in this relation, so PostgREST returns an object rather than an array.
  catalog_weather_rules: WeatherRule | WeatherRule[] | null;
};

export type RecommendationSignals = {
  personalColor: "warm" | "cool" | null;
  bodyType: "straight" | "wave" | "natural" | null;
  mood: string | null;
  silhouette: string | null;
  situation: Situation;
  apparent: number;
  humidity: number;
  wind: number;
  precipitationMm: number;
  precipitationProbability: number;
  dailyRange: number;
  dateKey: string;
};

type ScoredVariant = CatalogProductRecommendation & { tieBreak: number };

const warmConstructionPattern = /니트|스웨터|맨투맨|스웨트|후드|풀오버|터틀넥|플리스|기모|퍼|울|가디건/i;
const winterFootwearPattern = /부츠|boot|윈터|방한|퍼/i;
const bootPattern = /부츠|boot/i;
const rainBootPattern = /레인|rain|waterproof|방수/i;
const heavyOuterPattern = /울|패딩|퍼|더플|케이프|판초|플리스|무스탕/i;
const lightOuterPattern = /트렌치|가디건|자켓|블레이저|라이더|봄버|나일론|항공|트랙|바람막이|셔츠/i;
// 이 다섯 상품은 현재 정적 이미지가 실제 부츠로 확인된 매핑 오류 묶음입니다.
// 이미지 메타데이터를 재정비하기 전까지 더운 날의 신발 후보에서 우선 제외합니다.
const hotWeatherFootwearImageMismatchIds = new Set([
  "espadrille-wedge-sandals",
  "cork-platform-sandals",
  "fisherman-chunky-sandals",
  "metallic-strap-party-sandals",
  "satin-bow-mules",
]);

const labels: Record<CatalogProductCategory, string> = {
  outer: "아우터",
  top: "상의",
  bottom: "하의",
  shoes: "신발",
  bag: "가방",
};

function tagScore(tags: CatalogTag[], dimension: CatalogTag["dimension"], value: string | null, max: number) {
  if (!value || value === "unknown") return 0;
  const score = tags.find((tag) => tag.dimension === dimension && tag.value === value)?.score ?? 0;
  return Math.max(-max, Math.min(max, (score / 3) * max));
}

function stableTieBreak(value: string) {
  let total = 0;
  for (const char of value) total = (total * 31 + char.charCodeAt(0)) % 997;
  return total / 997;
}

function weatherScore(rule: WeatherRule, signals: RecommendationSignals) {
  const temperatureDistance = signals.apparent < rule.apparent_temp_min
    ? rule.apparent_temp_min - signals.apparent
    : signals.apparent > rule.apparent_temp_max
      ? signals.apparent - rule.apparent_temp_max
      : 0;
  // 온도는 취향·퍼스널컬러보다 먼저 통과해야 하는 조건입니다.
  // ±2°C 이내의 경계값만 가벼운 레이어링 오차로 허용합니다.
  if (temperatureDistance > 2) {
    return { score: 0, hardExcluded: true, reason: `체감 ${rule.apparent_temp_min}~${rule.apparent_temp_max}° 권장` };
  }
  // 24°C 이상에는 아우터를 권하지 않는 화면 정책과 일치하도록, 아우터의
  // 온도 범위 자체는 호출부에서 별도로 제외합니다.
  const temperature = temperatureDistance === 0 ? 30 : 14;
  const humidity = signals.humidity <= rule.humidity_max ? 6 : signals.humidity <= rule.humidity_max + 10 ? 3 : 0;
  const wind = signals.wind <= rule.wind_max_mps ? 5 : signals.wind <= rule.wind_max_mps + 2 ? 2 : 0;
  // 일일 강수확률은 오늘 중 비가 올 가능성일 뿐, 현재 비가 내린다는 뜻은 아닙니다.
  // 현재 강수량이 0인데도 모든 일반 상품을 탈락시키거나 레인부츠만 남기지 않도록
  // 하드 제외와 방수 점수에는 실제 관측 강수량만 사용합니다.
  const rainy = signals.precipitationMm > 0.1;
  const unsuitableRain = rainy && rule.precipitation === "none" && signals.precipitationMm >= 2;
  if (unsuitableRain) return { score: 0, hardExcluded: true, reason: "강수에 부적합" };
  const precipitation = !rainy ? 6 : rule.precipitation === "rain_ok" ? 6 : rule.precipitation === "light_ok" ? 3 : 0;
  const layerable = signals.dailyRange >= 7;
  const diurnal = (layerable && rule.diurnal_range === "layerable") || (!layerable && rule.diurnal_range === "stable") ? 3 : 0;
  return { score: temperature + humidity + wind + precipitation + diurnal, hardExcluded: false, reason: `체감 ${signals.apparent}° 적합` };
}

function colorScore(variant: CatalogVariant, personalColor: RecommendationSignals["personalColor"]) {
  if (!personalColor) return { score: 8, reason: "기본 색상" };
  if (variant.personal_color_match === personalColor) return { score: 20, reason: `${personalColor === "warm" ? "웜" : "쿨"} 톤 색상` };
  if (variant.personal_color_match === "both") return { score: 12, reason: "웜·쿨 공용 색상" };
  return { score: 0, reason: "다른 톤 색상" };
}

function isTooWarmForHotWeather(product: CatalogProductRow, signals: RecommendationSignals) {
  if (product.category === "shoes") {
    const isWet = signals.precipitationMm > 0.1;
    const isRainBoot = rainBootPattern.test(product.name) || rainBootPattern.test(product.subtype ?? "");
    // 건조한 16°C 이상에는 부츠보다 스니커즈·로퍼·플랫을 우선합니다.
    // 비가 충분히 오는 날에만 레인부츠를 예외로 남겨 둡니다.
    if (bootPattern.test(product.name) || bootPattern.test(product.subtype ?? "")) {
      if (!(isWet && isRainBoot)) return signals.apparent >= 16;
    }
    if (signals.apparent >= 20) {
      return product.warmth_level >= 2
        || winterFootwearPattern.test(product.name)
        || winterFootwearPattern.test(product.subtype ?? "")
        || hotWeatherFootwearImageMismatchIds.has(product.source_product_id);
    }
    return false;
  }
  if (product.category === "outer" && signals.apparent >= 16) {
    // 16~19°C는 가벼운 재킷·가디건·얇은 트렌치의 구간입니다.
    // 두꺼운 울 코트·패딩·퍼류는 이 구간의 기본 추천에서 제외합니다.
    return (product.warmth_level >= 3 && !lightOuterPattern.test(product.name))
      || heavyOuterPattern.test(product.name);
  }
  if (signals.apparent < 25) return false;
  if (product.category === "outer") return true;
  // 체감 25°C 이상에는 여름용으로 잘못 넓게 등록된 온도 범위가 있더라도
  // 니트·맨투맨 등 보온 구조의 상의를 후보에서 완전히 제외합니다.
  if (product.category !== "top") return false;
  return product.warmth_level >= 2
    || product.breathability_level <= 1
    || product.material?.toLowerCase() === "knit"
    || warmConstructionPattern.test(product.name);
}

export function recommendCatalogProducts(products: CatalogProductRow[], signals: RecommendationSignals) {
  const recommendations = products.flatMap((product) => {
    const variants = product.catalog_variants ?? [];
    const tags = product.catalog_tags ?? [];
    const rule = Array.isArray(product.catalog_weather_rules)
      ? product.catalog_weather_rules[0]
      : product.catalog_weather_rules;
    if (!rule) return [];

    const weather = weatherScore(rule, signals);
    // 더운 날 아우터를 ‘TOP 3’로 보여 주지 않습니다. 20~23°C에는 규칙 범위에
    // 들어오는 가벼운 겉옷만 통과하고, 24°C 이상은 아우터 없이 추천합니다.
    if (weather.hardExcluded || (product.category === "outer" && signals.apparent >= 24) || isTooWarmForHotWeather(product, signals)) return [];
    const body = tagScore(tags, "body_type", signals.bodyType, 15);
    const silhouette = tagScore(tags, "silhouette", signals.silhouette, 10);
    const mood = tagScore(tags, "mood", signals.mood, 4);
    const situation = tagScore(tags, "situation", signals.situation, 6);

    return variants.map((variant) => {
      const color = colorScore(variant, signals.personalColor);
      const score = Math.round(weather.score + color.score + body + silhouette + mood + situation);
      const reasons = [color.reason, weather.reason];
      if (signals.bodyType && body > 0) reasons.push(`${signals.bodyType === "straight" ? "스트레이트" : signals.bodyType === "wave" ? "웨이브" : "내추럴"} 체형 가점`);
      return {
        productId: product.id,
        sourceProductId: product.source_product_id,
        variantId: variant.id,
        category: product.category,
        name: product.name,
        subtype: product.subtype ?? labels[product.category],
        colorName: variant.color_name,
        imagePath: variant.image_path,
        score,
        reasons,
        tieBreak: stableTieBreak(`${signals.dateKey}:${product.id}:${variant.id}`),
      } satisfies ScoredVariant;
    });
  });

  const groups = Object.fromEntries((Object.keys(labels) as CatalogProductCategory[]).map((category) => {
    const usedProducts = new Set<string>();
    const ranked = recommendations
      .filter((item) => item.category === category)
      .sort((left, right) => right.score - left.score || right.tieBreak - left.tieBreak)
      .filter((item) => {
        if (usedProducts.has(item.productId)) return false;
        usedProducts.add(item.productId);
        return true;
      })
      .slice(0, 3)
      .map(({ tieBreak: _tieBreak, ...item }) => item);
    return [category, ranked];
  })) as Record<CatalogProductCategory, CatalogProductRecommendation[]>;

  return groups;
}
