import { ProfileForm } from "@/components/profile-form";

export default function ProfilePage() {
  return <main className="shell profile-page"><header className="topbar"><a className="brand" href="/">ondo<sup>°</sup></a><span>STYLING LAB / BETA</span></header><a className="back" href="/">← 오늘의 코디</a><section className="profile-intro"><p className="eyebrow">FIND YOUR BALANCE</p><h1>나를 위한 색과 실루엣</h1><p>지금은 직접 선택으로 시작하고, 사진 분석 기능은 충분히 검증된 뒤 추가합니다.</p></section><section className="profile-panel"><div><p className="eyebrow">YOUR STYLE PROFILE</p><h2>나의 스타일 프로필</h2><p>결과보다 실제 착용감과 취향을 우선해 주세요. 언제든 수정할 수 있습니다.</p></div><ProfileForm /></section><p className="privacy-note">사진 분석 기능을 추가하더라도 원본 사진은 기본적으로 저장하지 않고, 분석 결과와 사용자가 수정한 최종 선택만 보관합니다.</p></main>;
}
