const cityCodes: Record<string, string> = { 서울: "seoul", 부산: "busan", 대구: "daegu", 제주: "jeju" };

export function seoulDateKey(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const valueFor = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value ?? "00";
  return `${valueFor("year")}-${valueFor("month")}-${valueFor("day")}`;
}

export function savedLookKey(outfitId: string, savedAt: Date | string, cityCode: string) {
  return `${outfitId}:${seoulDateKey(savedAt)}:${cityCode}`;
}

export function cityCodeForName(city: string) {
  return cityCodes[city] ?? "seoul";
}
