import Link from "next/link";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { signOut } from "./actions";
import "./mypage.css";

const colorLabel: Record<string, string> = { warm: "웜", cool: "쿨", neutral: "뉴트럴" };
const bodyLabel: Record<string, string> = { straight: "스트레이트", wave: "웨이브", natural: "내추럴" };

export default async function MyPage() {
  let profile: { personal_color: string | null; body_type: string | null; preferred_style: string | null; analysis_completed_at: string | null } | null = null;
  let signedIn = false;
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      signedIn = true;
      const { data } = await supabase.from("profiles").select("personal_color,body_type,preferred_style,analysis_completed_at").eq("id", user.id).maybeSingle();
      profile = data;
    }
  }
  return <main className="shell mypage">
    <header className="topbar"><a className="brand" href="/">ondo<sup>°</sup></a><div className="header-actions"><Link href="/">오늘의 코디</Link><Link href="/profile">스타일 분석</Link>{signedIn && <form action={signOut}><button className="logout-button" type="submit">로그아웃</button></form>}</div></header>
    <section className="profile-intro"><p className="eyebrow">MY ONDO</p><h1>나의 스타일 기록</h1><p>저장한 결과는 날씨와 상황에 맞춘 다음 추천에 반영됩니다.</p></section>
    {!signedIn ? <section className="empty-state"><h2>로그인 후 나만의 결과를 확인하세요.</h2><p>간편 로그인으로 저장한 퍼스널컬러, 골격 유형, 취향을 이곳에서 다시 확인할 수 있어요.</p><Link className="primary" href="/login">로그인하기 ↗</Link></section> : !profile ? <section className="empty-state"><h2>아직 저장된 스타일 분석이 없어요.</h2><p>간단한 셀프 체크를 마치면 오늘의 추천에 색과 핏을 적용합니다.</p><Link className="primary" href="/profile">스타일 분석 시작하기 ↗</Link></section> : <section className="my-style-card"><p className="eyebrow">SAVED STYLE PROFILE</p><h2>{colorLabel[profile.personal_color ?? ""] ?? "미설정"} 톤 · {bodyLabel[profile.body_type ?? ""] ?? "미설정"}</h2><div><span><b>무드</b>{profile.preferred_style ?? "미설정"}</span><span><b>저장일</b>{profile.analysis_completed_at ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(profile.analysis_completed_at)) : "미설정"}</span></div><Link className="primary" href="/profile">결과 수정하기 ↗</Link></section>}
  </main>;
}
