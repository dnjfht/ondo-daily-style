"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticate, type LoginActionState } from "./actions";

const initialState: LoginActionState = { success: false, message: "" };
type LoginMode = "login" | "signup" | "magic" | "reset";

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>("login");
  const [state, action, pending] = useActionState(authenticate, initialState);
  const router = useRouter();
  useEffect(() => { if (state.next) router.push(state.next); }, [router, state.next]);
  const passwordMode = mode === "login" || mode === "signup";

  return <main className="shell login-page">
    <header className="topbar"><a className="brand" href="/">ondo<sup>°</sup></a><span>STYLING LAB / BETA</span></header>
    <section className="login-card">
      <p className="eyebrow">WELCOME TO ONDO</p>
      <h1>{mode === "signup" ? <>ONDO 계정을<br />만들어 보세요.</> : mode === "reset" ? <>비밀번호를<br />새로 설정하세요.</> : <>나만의 스타일을<br />저장해 보세요.</>}</h1>
      <p>로그인하면 퍼스널컬러, 골격 유형, 취향 문답 결과와 저장한 코디를 내 계정에 보관합니다.</p>
      <div className="login-modes" role="tablist" aria-label="로그인 방식"><button className={mode === "login" ? "selected" : ""} onClick={() => setMode("login")} type="button">로그인</button><button className={mode === "signup" ? "selected" : ""} onClick={() => setMode("signup")} type="button">회원가입</button></div>
      <form action={action}>
        <input type="hidden" name="intent" value={mode} />
        <label>이메일<input required name="email" type="email" placeholder="you@example.com" autoComplete="email" /></label>
        {passwordMode && <label>비밀번호<input required name="password" type="password" minLength={8} placeholder="8자 이상" autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>}
        {mode === "signup" && <div className="signup-demographics"><label>추천용 성별<select name="gender" required defaultValue=""><option value="" disabled>선택해 주세요</option><option value="female">여성</option><option value="male">남성</option><option value="nonbinary">논바이너리 / 유니섹스</option><option value="prefer_not">응답하지 않음</option></select></label><label>연령대<select name="ageRange" required defaultValue=""><option value="" disabled>선택해 주세요</option><option value="10s">10대</option><option value="20s">20대</option><option value="30s">30대</option><option value="40s">40대</option><option value="50s">50대</option><option value="60_plus">60대 이상</option><option value="prefer_not">응답하지 않음</option></select></label></div>}
        <button className="primary" type="submit" disabled={pending}>{pending ? "처리 중..." : mode === "signup" ? "이메일로 회원가입" : mode === "magic" ? "로그인 링크 보내기" : mode === "reset" ? "비밀번호 설정 링크 보내기" : "로그인"} ↗</button>
        {state.message && <p className={state.success ? "notice success" : "notice"}>{state.message}</p>}
      </form>
      {mode === "login" && <button className="magic-toggle" type="button" onClick={() => setMode("reset")}>비밀번호를 잊었거나 기존 매직 링크 계정인가요?</button>}
      {mode === "reset" ? <button className="magic-toggle" onClick={() => setMode("login")} type="button">비밀번호 로그인으로 돌아가기</button> : <button className="magic-toggle" onClick={() => setMode((current) => current === "magic" ? "login" : "magic")} type="button">{mode === "magic" ? "비밀번호 로그인으로 돌아가기" : "비밀번호 없이 이메일 링크로 로그인"}</button>}
      <p className="fine-print">SNS 로그인은 Google 또는 Kakao 개발자 콘솔의 OAuth 키가 준비되면 추가할 수 있습니다. 사진 원본은 계정에 저장하지 않습니다.</p>
    </section>
  </main>;
}
