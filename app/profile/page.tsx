import Link from "next/link";
import { ProfileForm } from "@/components/profile-form";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export default async function ProfilePage() {
  let signedIn = false;
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }
  return <main className="shell profile-page">
    <header className="topbar"><a className="brand" href="/">ondo<sup>°</sup></a><div className="header-actions"><Link href="/">오늘의 코디</Link>{signedIn ? <><Link href="/mypage">마이페이지</Link><span className="signed-in">로그인됨</span></> : <Link href="/login">로그인</Link>}</div></header>
    <section className="profile-intro"><p className="eyebrow">FIND YOUR BALANCE</p><h1>나의 스타일 분석</h1><p>퍼스널컬러, 골격 스타일, 취향을 바탕으로 오늘의 날씨에 어울리는 색과 핏을 추천합니다.</p></section>
    <ProfileForm />
    <p className="privacy-note">저장 범위: 최종 퍼스널컬러·골격 유형·취향 선택값. 등록한 사진은 본인만 접근 가능한 비공개 보관함에 저장되며, 향후 AI 진단에만 사용합니다. 신체 치수와 문항별 세부 응답은 저장하지 않습니다.</p>
  </main>;
}
