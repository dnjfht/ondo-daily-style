import { NextResponse } from "next/server";

const cities: Record<string, { latitude: number; longitude: number; label: string }> = {
  seoul: { latitude: 37.5665, longitude: 126.978, label: "서울" },
  busan: { latitude: 35.1796, longitude: 129.0756, label: "부산" },
  daegu: { latitude: 35.8714, longitude: 128.6014, label: "대구" },
  jeju: { latitude: 33.4996, longitude: 126.5312, label: "제주" },
};

export async function GET(request: Request) {
  const cityKey = new URL(request.url).searchParams.get("city") ?? "seoul";
  const city = cities[cityKey] ?? cities.seoul;
  const params = new URLSearchParams({ latitude: String(city.latitude), longitude: String(city.longitude), current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code", timezone: "Asia/Seoul" });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 900 } });
    if (!response.ok) throw new Error("weather request failed");
    const data = await response.json();
    return NextResponse.json({ city: city.label, current: data.current, fetchedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ city: city.label, current: null, message: "날씨를 불러오지 못했습니다." }, { status: 503 });
  }
}
