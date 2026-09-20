const cityCodes: Record<string, string> = { 서울: "seoul", 부산: "busan", 대구: "daegu", 제주: "jeju" };

export function seoulDateKey(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const valueFor = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value ?? "00";
  return `${valueFor("year")}-${valueFor("month")}-${valueFor("day")}`;
}

export function savedLookKey(outfitId: string, savedAt: Date | string, cityCode: string) {
  // 진단 값을 다시 저장해도 같은 날·상황·도시의 룩은 같은 저장 슬롯으로 봅니다.
  // 이전 버전의 상세한 outfit ID도 여기서 상황 단위로 정규화합니다.
  const situation = outfitId.match(/^personal-(daily|work|date)-/)?.[1];
  const stableLookId = situation ? `personal-${situation}` : outfitId;
  return `${stableLookId}:${seoulDateKey(savedAt)}:${cityCode}`;
}

export function cityCodeForName(city: string) {
  return cityCodes[city] ?? "seoul";
}
