"use client";

import { useActionState } from "react";
import { saveProfile, type ProfileActionState } from "@/app/profile/actions";

const initialState: ProfileActionState = { success: false, message: "" };

export function ProfileForm() {
  const [state, formAction, pending] = useActionState(saveProfile, initialState);
  return <form action={formAction} className="profile-form">
    <label>나의 퍼스널컬러<select name="personalColor" defaultValue=""><option value="">직접 선택</option><option value="warm">웜톤</option><option value="cool">쿨톤</option><option value="neutral">뉴트럴</option></select></label>
    <label>나의 골격 스타일 유형<select name="bodyType" defaultValue=""><option value="">직접 선택</option><option value="straight">스트레이트</option><option value="wave">웨이브</option><option value="natural">내추럴</option></select></label>
    <label>선호 스타일<select name="style" defaultValue=""><option value="">직접 선택</option><option value="minimal">미니멀</option><option value="casual">캐주얼</option><option value="cityboy">시티보이</option></select></label>
    <label>주요 지역<select name="city" defaultValue="seoul"><option value="seoul">서울</option><option value="busan">부산</option><option value="daegu">대구</option><option value="jeju">제주</option></select></label>
    <button className="primary" disabled={pending} type="submit">{pending ? "저장 중..." : "내 스타일 저장하기"} ↗</button>
    {state.message && <p className={state.success ? "notice success" : "notice"}>{state.message}</p>}
  </form>;
}
