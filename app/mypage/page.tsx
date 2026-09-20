import Link from "next/link";
import { SavedLooksList } from "@/components/saved-looks-list";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { SavedLookRecord, SavedLookSnapshot } from "@/lib/types";
import { saveDemographics, signOut } from "./actions";
import "./mypage.css";

const colorLabel: Record<string, string> = { warm: "웜", cool: "쿨", neutral: "뉴트럴" };
const bodyLabel: Record<string, string> = { straight: "스트레이트", wave: "웨이브", natural: "내추럴" };
const genderLabel: Record<string, string> = { female: "여성", male: "남성", nonbinary: "논바이너리 / 유니섹스", prefer_not: "응답하지 않음" };
const ageLabel: Record<string, string> = { "10s": "10대", "20s": "20대", "30s": "30대", "40s": "40대", "50s": "50대", "60_plus": "60대 이상", prefer_not: "응답하지 않음" };
const styleLabel: Record<string, string> = { minimal: "미니멀", casual: "캐주얼", classic: "클래식", street: "스트리트", unknown: "트렌드 미니멀 베이직" };
const preferenceLabels: Record<string, Record<string, string>> = {
  mood: styleLabel,
  silhouette: { balanced: "균형 잡힌 기본 핏", relaxed: "여유 있는 실루엣", defined: "라인을 살린 실루엣", unknown: "트렌드 균형 핏" },
  color_depth: { neutral: "뉴트럴 기본 컬러", soft: "부드러운 저채도 컬러", bold: "선명한 포인트 컬러", unknown: "트렌드 뉴트럴 컬러" },
  activity: { low: "낮은 활동량 · 편안함 중심", medium: "보통 활동량 · 균형 중심", high: "높은 활동량 · 활동성 중심", unknown: "트렌드 데일리 활동량" },
};

type Profile = { personal_color: string | null; body_type: string | null; preferred_style: string | null; analysis_completed_at: string | null; gender: string | null; age_range: string | null; style_preferences: Record<string, string> | null };

function preferenceValue(profile: Profile, key: keyof typeof preferenceLabels) {
  const value = profile.style_preferences?.[key] ?? (key === "mood" ? profile.preferred_style : "unknown");
  return preferenceLabels[key][value ?? "unknown"] ?? preferenceLabels[key].unknown;
}

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
        supabase.from("profiles").select("personal_color,body_type,preferred_style,analysis_completed_at,gender,age_range,style_preferences").eq("id", user.id).maybeSingle(),
        supabase.from("saved_looks").select("look_key,look,saved_at").eq("user_id", user.id).order("saved_at", { ascending: false }),
      ]);
      profile = profileData ? { ...profileData, style_preferences: profileData.style_preferences as Record<string, string> | null } : null;
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
      <section className="demographics-card"><p className="eyebrow">RECOMMENDATION BASIS</p><h2>추천 기준</h2><p>성별과 연령대는 원하는 상품의 핏·카테고리를 정하는 참고값입니다. 응답하지 않으면 유니섹스·기본 룩을 우선 보여줍니다.</p><form action={saveDemographics}><label>추천용 성별<select name="gender" defaultValue={profile?.gender ?? "prefer_not"}><option value="female">여성</option><option value="male">남성</option><option value="nonbinary">논바이너리 / 유니섹스</option><option value="prefer_not">응답하지 않음</option></select></label><label>연령대<select name="ageRange" defaultValue={profile?.age_range ?? "prefer_not"}><option value="10s">10대</option><option value="20s">20대</option><option value="30s">30대</option><option value="40s">40대</option><option value="50s">50대</option><option value="60_plus">60대 이상</option><option value="prefer_not">응답하지 않음</option></select></label><button type="submit">추천 기준 저장</button></form></section>
      {!profile || !profile.analysis_completed_at ? <section className="empty-state"><h2>아직 저장된 스타일 분석이 없어요.</h2><p>간단한 셀프 체크를 마치면 성별·연령대·날씨·상황을 함께 반영해 다음 추천을 조정합니다.</p><Link className="primary" href="/profile">스타일 분석 시작하기 ↗</Link></section> : <section className="my-style-card"><p className="eyebrow">SAVED STYLE PROFILE</p><h2>{colorLabel[profile.personal_color ?? ""] ?? "미설정"} 톤 · {bodyLabel[profile.body_type ?? ""] ?? "미설정"}</h2><div><span><b>무드</b>{styleLabel[profile.preferred_style ?? "unknown"] ?? "트렌드 미니멀 베이직"}</span><span><b>성별</b>{genderLabel[profile.gender ?? ""] ?? "응답하지 않음"}</span><span><b>연령대</b>{ageLabel[profile.age_range ?? ""] ?? "응답하지 않음"}</span><span><b>저장일</b>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(profile.analysis_completed_at))}</span></div><div className="style-preferences"><span><b>가장 자주 입는 무드</b>{preferenceValue(profile, "mood")}</span><span><b>선호 실루엣</b>{preferenceValue(profile, "silhouette")}</span><span><b>선호 색감</b>{preferenceValue(profile, "color_depth")}</span><span><b>평소 활동량</b>{preferenceValue(profile, "activity")}</span></div><Link className="primary" href="/profile">결과 수정하기 ↗</Link></section>}
      <section className="saved-looks-card"><p className="eyebrow">SAVED LOOKS</p><h2>저장한 룩</h2><p className="saved-looks-intro">저장 당시의 상황, 도시, 기온과 체감온도를 함께 기록합니다.</p><SavedLooksList initialLooks={savedLooks} /></section>
    </>}
  </main>;
}
