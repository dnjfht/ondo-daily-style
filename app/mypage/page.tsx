import Link from "next/link";
import { SavedLooksList } from "@/components/saved-looks-list";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { SavedLookRecord, SavedLookSnapshot } from "@/lib/types";
import { signOut } from "./actions";
import "./mypage.css";

const colorLabel: Record<string, string> = { warm: "웜", cool: "쿨" };
const bodyLabel: Record<string, string> = { straight: "스트레이트", wave: "웨이브", natural: "내추럴" };
const moodLabel: Record<string, string> = { minimal: "미니멀", casual: "캐주얼", classic: "클래식", street: "스트리트", unknown: "트렌드 미니멀 베이직" };
const silhouetteLabel: Record<string, string> = { balanced: "균형 잡힌 기본 핏", relaxed: "여유 있는 실루엣", defined: "라인을 살린 실루엣", unknown: "트렌드 균형 핏" };
const colorDepthLabel: Record<string, string> = { neutral: "뉴트럴 기본 컬러", soft: "부드러운 저채도 컬러", bold: "선명한 포인트 컬러", unknown: "트렌드 뉴트럴 컬러" };
const activityLabel: Record<string, string> = { low: "낮은 활동량 · 편안함 중심", medium: "보통 활동량 · 균형 중심", high: "높은 활동량 · 활동성 중심", unknown: "트렌드 데일리 활동량" };
type Profile = { personal_color: string | null; body_type: string | null; analysis_completed_at: string | null; preferred_style: string | null; style_preferences: Record<string, string> | null; personal_color_source: string | null; body_type_source: string | null };

function savedLookFromRow(value: unknown, savedAt: string, databaseKey: string): SavedLookRecord | null {
  if (!value || typeof value !== "object") return null;
  const look = value as Partial<SavedLookSnapshot>;
  if (!look.id || !look.title || !look.imageUrl || !look.weather || !look.situation) return null;
  return { ...look, lookKey: look.lookKey ?? databaseKey, products: look.products ?? [], savedAt, databaseKey } as SavedLookRecord;
}

export default async function MyPage() {
  let profile: Profile | null = null;
  let savedLooks: SavedLookRecord[] = [];
  let signedIn = false;

  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      signedIn = true;
      const [{ data: profileData }, { data: savedLookRows }] = await Promise.all([
        supabase.from("profiles").select("personal_color,body_type,analysis_completed_at,preferred_style,style_preferences,personal_color_source,body_type_source").eq("id", user.id).maybeSingle(),
        supabase.from("saved_looks").select("look_key,look,saved_at").eq("user_id", user.id).order("saved_at", { ascending: false }),
      ]);
      profile = profileData;
      savedLooks = (savedLookRows ?? []).flatMap((row) => {
        const look = savedLookFromRow(row.look, row.saved_at, row.look_key);
        return look ? [look] : [];
      });
    }
  }

  return <main className="shell mypage">
    <header className="topbar"><a className="brand" href="/">ondo<sup>°</sup></a><div className="header-actions"><Link href="/">오늘의 코디</Link><Link href="/profile">스타일 분석</Link>{signedIn && <form action={signOut}><button className="logout-button" type="submit">로그아웃</button></form>}</div></header>
    <section className="profile-intro"><p className="eyebrow">MY ONDO</p><h1>나의 스타일 기록</h1><p>저장한 룩과 그날의 도시·날씨를 다시 확인할 수 있어요.</p></section>
    {!signedIn ? <section className="empty-state"><h2>로그인 후 나만의 결과를 확인하세요.</h2><p>간편 로그인으로 저장한 퍼스널컬러, 골격 유형, 취향, 룩을 이곳에서 다시 확인할 수 있어요.</p><Link className="primary" href="/login">로그인하기 ↗</Link></section> : <>
      {!profile || !profile.analysis_completed_at ? <section className="empty-state"><h2>아직 저장된 스타일 분석이 없어요.</h2><p>간단한 셀프 체크를 마치면 체형·퍼스널컬러·날씨·상황을 함께 반영해 다음 추천을 조정합니다.</p><Link className="primary" href="/profile">스타일 분석 시작하기 ↗</Link></section> : <section className="my-style-card"><p className="eyebrow">SAVED STYLE PROFILE</p><h2>{colorLabel[profile.personal_color ?? ""] ?? "웜"} 톤 · {bodyLabel[profile.body_type ?? ""] ?? "미설정"}</h2><div><span><b>고객 기준</b>20대 여성</span><span><b>퍼스널컬러 진단</b>{profile.personal_color_source === "ai" ? "AI + 설문" : "설문"}</span><span><b>체형 설문 결과</b>{profile.body_type_source === "ai" ? "AI + 13문항" : "설문 결과"}</span><span><b>저장일</b>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(profile.analysis_completed_at))}</span></div><div className="style-preferences"><span><b>가장 자주 입는 무드</b>{moodLabel[profile.preferred_style ?? "unknown"] ?? moodLabel.unknown}</span><span><b>선호 실루엣</b>{silhouetteLabel[profile.style_preferences?.silhouette ?? "unknown"] ?? silhouetteLabel.unknown}</span><span><b>선호 색감</b>{colorDepthLabel[profile.style_preferences?.color_depth ?? "unknown"] ?? colorDepthLabel.unknown}</span><span><b>평소 활동량</b>{activityLabel[profile.style_preferences?.activity ?? "unknown"] ?? activityLabel.unknown}</span></div><Link className="primary" href="/profile">결과 수정하기 ↗</Link></section>}
      <section className="saved-looks-card"><p className="eyebrow">SAVED LOOKS</p><h2>저장한 룩</h2><p className="saved-looks-intro">저장 당시의 상황, 도시, 기온과 체감온도를 함께 기록합니다.</p><SavedLooksList initialLooks={savedLooks} /></section>
    </>}
  </main>;
}
