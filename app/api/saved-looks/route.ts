import { NextResponse } from "next/server";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { SavedLookSnapshot, Situation } from "@/lib/types";

const situations: Situation[] = ["daily", "work", "date"];

function parseLook(value: unknown): SavedLookSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const look = value as Partial<SavedLookSnapshot>;
  const strings = (input: unknown) => Array.isArray(input) && input.every((item) => typeof item === "string");
  const products = look.products;
  const weather = look.weather;

  if (
    typeof look.id !== "string" || typeof look.lookKey !== "string" || typeof look.title !== "string" || typeof look.subtitle !== "string" ||
    typeof look.styleTag !== "string" || !situations.includes(look.situation as Situation) ||
    typeof look.imageUrl !== "string" || typeof look.reason !== "string" || typeof look.savedAt !== "string" ||
    !strings(look.colors) || !strings(look.items) || !Array.isArray(products) || !products.every((product) => product && typeof product === "object" && typeof product.label === "string" && typeof product.merchant === "string" && typeof product.url === "string") || !weather || typeof weather !== "object" ||
    typeof weather.city !== "string" || typeof weather.temperature !== "number" ||
    typeof weather.apparent !== "number" || typeof weather.humidity !== "number" || typeof weather.wind !== "number"
  ) return null;

  return look as SavedLookSnapshot;
}

export async function DELETE(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "저장 서비스를 준비 중입니다." }, { status: 503 });
  const body = await request.json().catch(() => null) as { lookKey?: unknown } | null;
  if (!body || typeof body.lookKey !== "string") return NextResponse.json({ error: "삭제할 룩 정보가 올바르지 않습니다." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "룩을 삭제하려면 먼저 로그인해 주세요." }, { status: 401 });
  const { error } = await supabase.from("saved_looks").delete().eq("user_id", user.id).eq("look_key", body.lookKey);
  if (error) return NextResponse.json({ error: "룩 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  return NextResponse.json({ deleted: true });
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "저장 서비스를 준비 중입니다." }, { status: 503 });

  const body = await request.json().catch(() => null) as { intent?: string; look?: unknown } | null;
  const look = parseLook(body?.look);
  if (!look || !["save", "remove"].includes(body?.intent ?? "")) {
    return NextResponse.json({ error: "저장할 룩 정보가 올바르지 않습니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "룩을 저장하려면 먼저 로그인해 주세요." }, { status: 401 });

  if (body?.intent === "remove") {
    const { error } = await supabase.from("saved_looks").delete().eq("user_id", user.id).eq("look_key", look.lookKey);
    if (error) return NextResponse.json({ error: "저장 취소에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
    return NextResponse.json({ saved: false });
  }

  const { error } = await supabase.from("saved_looks").upsert({
    user_id: user.id,
    look_key: look.lookKey,
    look,
    saved_at: look.savedAt,
  }, { onConflict: "user_id,look_key" });
  if (error) {
    const message = error.code === "42P01" ? "저장 테이블을 준비 중입니다. 관리자에게 문의해 주세요." : "룩 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({ saved: true });
}
