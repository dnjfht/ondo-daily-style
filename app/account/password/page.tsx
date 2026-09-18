"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updatePassword, type PasswordActionState } from "./actions";

const initialState: PasswordActionState = { success: false, message: "" };

export default function PasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, initialState);
  return <main className="shell login-page"><header className="topbar"><Link className="brand" href="/">ondo<sup>°</sup></Link><span>STYLING LAB / BETA</span></header><section className="login-card"><p className="eyebrow">SET PASSWORD</p><h1>새 비밀번호를<br />설정하세요.</h1><p>이메일에서 연 링크로 인증된 계정에만 적용됩니다.</p><form action={action}><label>새 비밀번호<input required name="password" type="password" minLength={8} autoComplete="new-password" placeholder="8자 이상" /></label><label>비밀번호 확인<input required name="confirmation" type="password" minLength={8} autoComplete="new-password" /></label><button className="primary" type="submit" disabled={pending}>{pending ? "설정 중..." : "비밀번호 설정하기"} ↗</button>{state.message && <p className={state.success ? "notice success" : "notice"}>{state.message}</p>}</form></section></main>;
}
