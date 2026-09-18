"use client";

import Link from "next/link";
import { useActionState } from "react";
import { sendMagicLink, type LoginActionState } from "./actions";

const initialState: LoginActionState = { success: false, message: "" };

export default function LoginPage() {
  const [state, action, pending] = useActionState(sendMagicLink, initialState);
  return (
    <main className="shell login-page">
      <header className="topbar"><Link className="brand" href="/">ondo<sup>°</sup></Link><span>STYLING LAB / BETA</span></header>
      <section className="login-card">
        <p className="eyebrow">WELCOME TO ONDO</p>
        <h1>나만의 스타일을<br />저장해 보세요.</h1>
        <p>한 번의 간편 로그인으로 퍼스널컬러, 골격 유형, 취향 문답 결과와 저장한 코디를 내 계정에 보관합니다.</p>
        <form action={action}>
          <label>이메일<input required name="email" type="email" placeholder="you@example.com" autoComplete="email" /></label>
          <button className="primary" type="submit" disabled={pending}>{pending ? "보내는 중..." : "이메일로 계속하기"} ↗</button>
          {state.message && <p className={state.success ? "notice success" : "notice"}>{state.message}</p>}
        </form>
        <p className="fine-print">비밀번호를 따로 만들지 않는 매직 링크 방식입니다. 분석 결과만 저장하며 사진 원본은 기본 저장하지 않습니다.</p>
      </section>
    </main>
  );
}
