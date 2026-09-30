/**
 * ONDO 골격진단 v3.3 — 사이트용 판정 로직 (step7_twostage.py와 같은 계산)
 *
 * 사용법
 *   const persona = personas.find(p => p.id === "s2_wave_01");   // personas.json에서 고른 인물
 *   const answers = [1,1,4,1,1,2,1,1,1,1,1];                       // 설문 11문항 (7문항도 가능)
 *   const result  = ONDO_SKELETON.diagnose(persona, answers);
 *   // result.typeKor, result.conf, result.reasons, result.fit ...
 *   // result.photoSupport : 결과 유형을 뒷받침하는 사진 특징
 *   // result.photoAgainst : 결과와 반대되는 사진 특징 (신뢰도가 낮은 이유 설명용)
 *   // result.percent      : 판단 근거를 퍼센트로 (사진 / 설문 / 종합 구분, 화면 표시용) — 아래 percentOf() 설명 참고
 *
 * 설문 답 코드: 1=스트레이트 보기, 2=웨이브 보기, 3=내추럴 보기, 4=잘 모르겠다
 * 화면에 보기를 보여줄 때는 SURVEY[i].options 의 text 를 쓰고, 고른 보기의 code 를 answers 에 넣는다.
 */
(function (global) {
  "use strict";

  const KOR = { straight: "스트레이트", wave: "웨이브", natural: "내추럴" };
  const MARGIN = 0.10;       // 이보다 0에 가까우면 경계
  const CONFLICT = 1.0;      // 사진 무게중심이 1σ 이상일 때만 설문과의 모순을 보류로 처리

  // 1단계(웨이브 여부) · 2단계(스트레이트 vs 내추럴) 설문 가중치
  const W1 = { 1: 4, 2: 6, 3: 4, 4: 6, 5: 8, 6: 12, 7: 6, 8: 12, 9: 6, 10: 6, 11: 6 };
  const W2 = { 1: 12, 2: 8, 3: 10, 4: 8, 5: 4, 6: 6, 7: 10, 8: 10, 9: 8, 10: 6, 11: 6 };
  // 무게중심 문항 (사진과의 모순 검사용): Q5 5, Q6 10, Q8 10
  const CENTER_Q = { 5: 5, 6: 10, 8: 10 };

  // ---- 설문 11문항 (보기 순서는 화면에서 섞어도 됨) ----
  const SURVEY = [
    { q: 1, title: "손목을 보거나 만져 보면 어떤가요?", options: [
      { code: 1, text: "작고 둥글며 뼈가 잘 안 보인다" },
      { code: 2, text: "가늘고 납작하며 뼈가 살짝 보인다" },
      { code: 3, text: "뼈가 크고 튀어나와 눈에 띈다" }] },
    { q: 2, title: "손등과 손가락은 어떤가요?", options: [
      { code: 1, text: "손바닥이 두툼하고 몸에 비해 손이 작다" },
      { code: 2, text: "손이 얇고 부드러우며 손가락이 가늘다" },
      { code: 3, text: "손이 크고 손가락 마디·손등 뼈가 도드라진다" }] },
    { q: 3, title: "거울로 봤을 때 쇄골은 어떤가요?", options: [
      { code: 1, text: "잘 안 보인다 (살에 묻힌 편)" },
      { code: 2, text: "가늘게 보인다" },
      { code: 3, text: "굵고 뚜렷하게 튀어나와 있다" }] },
    { q: 4, title: "옆에서 본 상체는 어떤가요?", options: [
      { code: 1, text: "가슴·몸통이 두껍고 입체적이다" },
      { code: 2, text: "얇고 납작한 편이다" },
      { code: 3, text: "두께보다 어깨 폭·뼈대가 넓은 느낌이다" }] },
    { q: 5, title: "허리 모양은 어떤가요?", options: [
      { code: 1, text: "허리 위치가 높고 굴곡이 적다" },
      { code: 2, text: "허리가 잘록하고 굴곡이 뚜렷하다" },
      { code: 3, text: "일자에 가깝고 골반 뼈가 만져진다" }] },
    { q: 6, title: "살이 찌면 어디부터 붙나요?", options: [
      { code: 1, text: "상체 (가슴·팔 윗부분·배)" },
      { code: 2, text: "하체 (엉덩이·허벅지)" },
      { code: 3, text: "전체적으로 고르게, 살보다 뼈대가 먼저 보인다" }] },
    { q: 7, title: "팔뚝이나 허벅지를 잡아 보면?", options: [
      { code: 1, text: "탄력 있고 단단하다" },
      { code: 2, text: "부드럽고 말랑하다" },
      { code: 3, text: "살이 적고 근육·힘줄이 드러난다" }] },
    { q: 8, title: "살이 찌면 몸이 어느 방향으로 두꺼워지나요?", options: [
      { code: 1, text: "앞뒤로 두꺼워진다 (배·가슴이 앞으로 나오고 몸통이 둥글어진다)" },
      { code: 2, text: "옆으로 퍼진다 (골반·엉덩이·허벅지 바깥쪽이 넓어진다)" },
      { code: 3, text: "전체적으로 고르게 커지고, 살이 쪄도 뼈대·어깨 윤곽이 남는다" }] },
    { q: 9, title: "옆에서 본 모습에서 가슴과 엉덩이는 어떤가요?", options: [
      { code: 1, text: "가슴과 엉덩이가 둘 다 앞뒤로 도드라져 입체적이다" },
      { code: 2, text: "가슴은 납작한 편이고, 엉덩이는 아래쪽에 볼륨이 있다" },
      { code: 3, text: "엉덩이가 평평하고 길쭉한 편이다" }] },
    { q: 10, title: "다리는 어떤 편인가요?", options: [
      { code: 1, text: "허벅지까지 탄탄하게 살이 있고, 무릎 아래는 가늘다" },
      { code: 2, text: "무릎 위·허벅지 안쪽에 살이 붙기 쉽고, 하체에 볼륨이 있다" },
      { code: 3, text: "무릎뼈·발목뼈가 크고 도드라진다" }] },
    { q: 11, title: "목과 어깨는 어떤가요?", options: [
      { code: 1, text: "목이 짧은 편이고, 가슴 위치가 높다" },
      { code: 2, text: "목이 긴 편이고, 어깨가 좁거나 처진 편이다" },
      { code: 3, text: "어깨가 넓고 각져 있으며, 목의 힘줄이나 뼈가 보인다" }] },
  ];
  SURVEY.forEach(s => s.options.push({ code: 4, text: "잘 모르겠다" }));
  const Q_SHORT = { 1: "손목", 2: "손", 3: "쇄골", 4: "상체 두께", 5: "허리", 6: "살 붙는 곳",
                    7: "살의 탄력", 8: "살 찌는 방향", 9: "옆모습", 10: "다리", 11: "목·어깨" };

  // ---- 골격별 추천 핏 (ONDO 추천 규칙표 3절) ----
  const FIT = {
    straight: { keyword: "심플 · 정핏 · I라인", material: "면 100%, 울, 캐시미어, 레더처럼 탄력 있고 결이 고운 소재",
      silhouette: "타이트 스커트, 스트레이트 팬츠, 정핏(I라인)", neck: "세로로 파인 V넥", length: "정상 허리선",
      avoid: "과한 장식, 작은 도트·잔꽃 무늬, 오버사이즈" },
    wave: { keyword: "부드러움 · 허리 강조 · X라인", material: "시폰, 니트, 트위드, 레이스처럼 부드럽고 얇은 소재",
      silhouette: "플레어 스커트, 허리를 잡는 X라인", neck: "보트넥 등 옆으로 넓은 넥", length: "하이웨이스트, 미니 기장",
      avoid: "크고 무거운 아이템, 오버사이즈" },
    natural: { keyword: "러프 · 루즈핏 · A·Y라인", material: "린넨, 데님, 코듀로이, 저게이지 니트처럼 건조한 질감",
      silhouette: "여유 있는 사이즈, A·Y라인", neck: "크게 파이지 않은 넥", length: "롱 기장",
      avoid: "몸에 붙는 핏" },
  };

  const r3 = x => Math.round(x * 1000) / 1000;

  // 사진 근거 문장이 어느 유형을 뒷받침하는지 (판정 계산에는 쓰지 않음, 화면 표시용)
  const PHOTO_SUPPORTS = {
    "골반 대비 어깨가 넓은 상체 중심 체형": "straight",
    "골반 대비 어깨가 좁은 하체 중심 체형": "wave",
    "허리가 잘록한 곡선형": "wave",
    "키 대비 어깨 프레임이 가녀린 편": "wave",
    "허리 굴곡이 적은 일자형": "natural",
    "키 대비 어깨 프레임이 큰 편": "natural",
  };
  function splitPhoto(photoReasons, type) {
    const support = [], against = [], neutral = [];
    (photoReasons || []).forEach(t => {
      const s = PHOTO_SUPPORTS[t];
      if (!s || !type) neutral.push(t);
      else if (s === type) support.push(t);
      else against.push(t + " (" + KOR[s] + " 쪽 특징)");
    });
    return { support, against, neutral };
  }

  function stage1Survey(ans) {
    let num = 0, den = 0;
    ans.forEach((a, i) => { const q = i + 1; if (a === 4) return; num += W1[q] * (a === 2 ? 1 : -1); den += W1[q]; });
    return den ? num / den : 0;
  }
  function stage2Survey(ans) {
    let num = 0, den = 0;
    ans.forEach((a, i) => { const q = i + 1; if (a === 1 || a === 3) { num += W2[q] * (a === 1 ? 1 : -1); den += W2[q]; } });
    return [den ? num / den : 0, den];
  }
  function surveyCenter(ans) {
    let num = 0, den = 0;
    ans.forEach((a, i) => { const q = i + 1; if (!(q in CENTER_Q) || a === 4) return;
      num += ({ 1: 1, 2: -1, 3: 0 })[a] * CENTER_Q[q]; den += CENTER_Q[q]; });
    return den ? r3(num / den) : 0;
  }
  function supporting(ans, type) {             // 결과 유형을 고른 문항 이름
    const code = { straight: 1, wave: 2, natural: 3 }[type];
    return ans.map((a, i) => (a === code ? Q_SHORT[i + 1] : null)).filter(Boolean);
  }

  // ---- 판단 근거 퍼센트 (판정 계산은 바꾸지 않고, 이미 계산된 점수 -1~+1 을 0~100%로 바꿔 보여 주기만 함) ----
  //  1단계 "웨이브인가?" : 사진 % 와 설문 % 를 50:50 으로 평균한 것이 종합 %. 종합 55% 이상이면 웨이브.
  //  2단계 "스트레이트 vs 내추럴" : 정면 사진으로는 몸 두께를 알 수 없어 설문 100%. 55% 이상 쪽으로 판정 (45~55%는 보류).
  //  최종 확신도 : 판정에 쓰인 단계들 중 가장 약한 단계의 % (신뢰도 높음/보통/낮음과 같은 기준: 70%↑ 높음, 62.5%↑ 보통)
  const pct = x => Math.round((Math.max(-1, Math.min(1, x)) + 1) * 50);
  function side(p, yes, no) { return p >= 55 ? yes : (p <= 45 ? no : "중립"); }
  function percentOf(r, persona, answers) {
    const photoUsed = !!persona.ratios;                       // API/인물 사진 분석 결과가 있을 때만
    const spread = persona.quality && persona.quality.p1_spread != null ? Math.round(persona.quality.p1_spread * 50) : null;
    const s1 = {
      question: "웨이브인가?",
      weights: { photo: 50, survey: 50 },
      photo: pct(r.p1),
      photoRange: spread,                                     // 사진 % 의 ± 흔들림 (6번 잰 값의 표준편차)
      photoUsed,
      photoSide: photoUsed ? side(pct(r.p1), "웨이브 쪽", "웨이브 아님 쪽") : "사진 없음",
      survey: r.q1 != null ? pct(r.q1) : null,
      surveySide: r.q1 != null ? side(pct(r.q1), "웨이브 쪽", "웨이브 아님 쪽") : "설문 없음",
      total: pct(r.w1),
      cut: 55,
    };
    s1.result = r.type === "wave" ? "웨이브" : (r.w1 > -MARGIN ? "경계(웨이브 아님 쪽)" : "웨이브 아님");
    let s2 = null;
    if (r.sn != null) {
      const st = pct(r.sn);
      s2 = { question: "스트레이트인가, 내추럴인가?", weights: { photo: 0, survey: 100 },
             photoNote: "정면 사진으로는 몸의 두께·질감을 알 수 없어 설문만 반영",
             straight: st, natural: 100 - st, cut: 55,
             result: r.type ? KOR[r.type] : "보류(중간)" };
    }
    let final = null;
    if (r.type === "wave") final = s1.total;
    else if (r.type) final = Math.min(100 - s1.total, r.type === "straight" ? s2.straight : s2.natural);
    return { stage1: s1, stage2: s2, final: final, finalLabel: r.type ? KOR[r.type] + " " + final + "%" : "판정 보류" };
  }

  function diagnose(persona, answers) {
    const p1 = persona.p1, center = persona.axes.center;
    const r = { p1, note: "", reasons: [] };
    const finish = () => {
      r.typeKor = r.type ? KOR[r.type] : "판정 보류";
      // 사진 근거를 결과 기준으로 나눔: 뒷받침(photoSupport) / 반대 특징(photoAgainst)
      const sp = splitPhoto(persona.photoReasons, r.type);
      r.photoSupport = sp.support;
      r.photoAgainst = sp.against;
      r.photoNeutral = sp.neutral;
      const extra = r.reasons;                       // 판정 과정에서 붙은 안내성 근거
      r.reasons = sp.support.map(t => "사진: " + t).concat(r.type ? [] : sp.neutral.map(t => "사진: " + t));
      if (r.type && answers) {
        const s = supporting(answers, r.type);
        if (s.length) r.reasons.push("설문: " + s.join("·") + " 답변이 " + KOR[r.type] + " 쪽");
      }
      r.reasons = r.reasons.concat(extra);
      if (r.conflict && r.type) { r.conf = "낮음"; r.note = (r.note ? r.note + " " : "") + r.conflictNote; }
      r.fit = r.type ? FIT[r.type] : null;
      r.percent = percentOf(r, persona, answers);
      return r;
    };
    let w1;
    if (answers && answers.length) {
      if (!(answers.length === 7 || answers.length === 11)) throw new Error("설문 답은 7개 또는 11개");
      const q1 = stage1Survey(answers), sC = surveyCenter(answers);
      w1 = 0.5 * p1 + 0.5 * q1;
      Object.assign(r, { q1: r3(q1), w1: r3(w1), sCenter: sC });
      // v3.3: 사진(정면 폭)과 설문의 무게중심이 반대여도 보류하지 않고 신뢰도만 낮춤
      //  (정면 사진은 몸 두께를 못 봐서, 스트레이트를 '하체 중심'으로 잘못 읽는 경우가 있음)
      if (Math.abs(center) >= CONFLICT && Math.abs(sC) >= 0.5 && center * sC < 0) {
        r.conflict = true;
        r.conflictNote = "사진(정면 폭)은 " + (center > 0 ? "상체" : "하체") + " 중심, 설문은 " +
                 (sC > 0 ? "상체" : "하체") + " 중심으로 서로 달라요. 정면 사진은 몸 두께를 볼 수 없어 설문을 더 믿었어요.";
      }
    } else {
      answers = null; w1 = p1; r.w1 = r3(w1);
    }
    // ---- 1단계: 웨이브인가? ----
    if (w1 >= MARGIN) {
      r.type = "wave"; r.conf = w1 >= 0.4 ? "높음" : (w1 >= 0.25 ? "보통" : "낮음");
      if (answers && r.p1 <= -0.3 && r.q1 >= 0.3) { r.conf = "낮음"; r.note += "설문은 웨이브인데 사진은 웨이브 특징(하체 중심·잘록 허리)이 약합니다."; }
      return finish();
    }
    if (w1 > -MARGIN) r.note = "1단계(웨이브 여부)가 경계입니다. ";
    if (!answers) {
      r.type = w1 > 0 ? "wave" : null; r.conf = "낮음";
      if (w1 <= 0) r.note += "웨이브는 아닙니다. 스트레이트/내추럴 구분은 설문이 필요합니다.";
      return finish();
    }
    // ---- 2단계: 스트레이트 vs 내추럴 (설문만) ----
    const [sn, den] = stage2Survey(answers);
    r.sn = r3(sn);
    if (den === 0 || Math.abs(sn) < MARGIN) {
      r.type = null; r.conf = "판정 보류";
      r.note += "스트레이트와 내추럴의 중간입니다. 손목·쇄골·두께 문항을 다시 확인해 주세요.";
      return finish();
    }
    r.type = sn > 0 ? "straight" : "natural";
    const m = Math.min(Math.abs(w1), Math.abs(sn));
    r.conf = (r.note || m < 0.25) ? "낮음" : (m >= 0.4 ? "높음" : "보통");
    if (r.p1 >= 0.3 && r.q1 <= -0.3) {
      r.conf = "낮음";
      r.note += "사진은 하체 중심·잘록한 허리(웨이브 쪽)인데 설문은 웨이브가 아닙니다. 살 찌는 방향·옆모습 문항을 다시 확인해 주세요.";
    }
    if (Math.abs(r.p1) < MARGIN) r.reasons.push("사진상 특징이 뚜렷하지 않아 두께·탄력 문항 중심으로 판정");
    return finish();
  }

  const api = { SURVEY, FIT, KOR, diagnose, percentOf };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.ONDO_SKELETON = api;
})(typeof window !== "undefined" ? window : globalThis);
