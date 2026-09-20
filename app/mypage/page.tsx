import Link from "next/link";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { saveDemographics, signOut } from "./actions";
import "./mypage.css";

const colorLabel: Record<string, string> = { warm: "웜", cool: "쿨", neutral: "뉴트럴" };
const bodyLabel: Record<string, string> = { straight: "스트레이트", wave: "웨이브", natural: "내추럴" };
const genderLabel: Record<string, string> = { female: "여성", male: "남성", nonbinary: "논바이너리 / 유니섹스", prefer_not: "응답하지 않음" };
const ageLabel: Record<string, string> = { "10s": "10대", "20s": "20대", "30s": "30대", "40s": "40대", "50s": "50대", "60_plus": "60대 이상", prefer_not: "응답하지 않음" };
const styleLabel: Record<string, string> = { minimal: "미니멀", casual: "캐주얼", classic: "클래식", street: "스트리트", unknown: "잘 모르겠음" };

export default async function MyPage() {
  let profile: { personal_color: string | null; body_type: string | null; preferred_style: string | null; analysis_completed_at: string | null; gender: string | null; age_range: string | null } | null = null;
  let signedIn = false;
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      signedIn = true;
      const { data } = await supabase.from("profiles").select("personal_color,body_type,preferred_style,analysis_completed_at,gender,age_range").eq("id", user.id).maybeSingle();
      profile = data;
    }
  }
  return <main className="shell mypage">
    <header className="topbar"><a className="brand" href="/">ondo<sup>°</sup></a><div className="header-actions"><Link href="/">오늘의 코디</Link><Link href="/profile">스타일 분석</Link>{signedIn && <form action={signOut}><button className="logout-button" type="submit">로그아웃</button></form>}</div></header>
    <section className="profile-intro"><p className="eyebrow">MY ONDO</p><h1>나의 스타일 기록</h1><p>저장한 결과는 날씨와 상황에 맞춘 다음 추천에 반영됩니다.</p></section>
    {!signedIn ? <section className="empty-state"><h2>로그인 후 나만의 결과를 확인하세요.</h2><p>간편 로그인으로 저장한 퍼스널컬러, 골격 유형, 취향을 이곳에서 다시 확인할 수 있어요.</p><Link className="primary" href="/login">로그인하기 ↗</Link></section> : <><section className="demographics-card"><p className="eyebrow">RECOMMENDATION BASIS</p><h2>추천 기준</h2><p>성별과 연령대는 원하는 상품의 핏·카테고리를 정하는 참고값입니다. 응답하지 않으면 유니섹스·기본 룩을 우선 보여줍니다.</p><form action={saveDemographics}><label>추천용 성별<select name="gender" defaultValue={profile?.gender ?? "prefer_not"}><option value="female">여성</option><option value="male">남성</option><option value="nonbinary">논바이너리 / 유니섹스</option><option value="prefer_not">응답하지 않음</option></select></label><label>연령대<select name="ageRange" defaultValue={profile?.age_range ?? "prefer_not"}><option value="10s">10대</option><option value="20s">20대</option><option value="30s">30대</option><option value="40s">40대</option><option value="50s">50대</option><option value="60_plus">60대 이상</option><option value="prefer_not">응답하지 않음</option></select></label><button type="submit">추천 기준 저장</button></form></section>{!profile || !profile.analysis_completed_at ? <section className="empty-state"><h2>아직 저장된 스타일 분석이 없어요.</h2><p>간단한 셀프 체크를 마치면 성별·연령대·날씨·상황을 함께 반영해 다음 추천을 조정합니다.</p><Link className="primary" href="/profile">스타일 분석 시작하기 ↗</Link></section> : <section className="my-style-card"><p className="eyebrow">SAVED STYLE PROFILE</p><h2>{colorLabel[profile.personal_color ?? ""] ?? "미설정"} 톤 · {bodyLabel[profile.body_type ?? ""] ?? "미설정"}</h2><div><span><b>무드</b>{styleLabel[profile.preferred_style ?? ""] ?? "미설정"}</span><span><b>성별</b>{genderLabel[profile.gender ?? ""] ?? "응답하지 않음"}</span><span><b>연령대</b>{ageLabel[profile.age_range ?? ""] ?? "응답하지 않음"}</span><span><b>저장일</b>{profile.analysis_completed_at ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(profile.analysis_completed_at)) : "미설정"}</span></div><Link className="primary" href="/profile">결과 수정하기 ↗</Link></section>}</>}
  </main>;
}
