export const bodyTypes = ["straight", "wave", "natural"] as const;
export type BodyType = (typeof bodyTypes)[number];
export type BodySurveyAnswer = BodyType | "unknown";

type BodyQuestion = {
  name: string;
  label: string;
  choices: readonly [BodySurveyAnswer, string][];
};

// 참여자 설문 원문을 바탕으로, 자가 응답을 골격 스타일 참고 신호로 사용합니다.
export const bodyQuestions: readonly BodyQuestion[] = [
  { name: "wrist", label: "Q1. 손목을 보거나 만져 보면 어떤가요?", choices: [["natural", "뼈가 크고 튀어나와 눈에 띈다"], ["wave", "작고 동글며 뼈가 잘 안 보인다"], ["straight", "가늘고 납작하며 뼈가 살짝 보인다"], ["unknown", "잘 모르겠다"]] },
  { name: "hands", label: "Q2. 손등과 손가락은 어떤가요?", choices: [["wave", "손이 얇고 부드러우며 손가락이 가늘다"], ["natural", "손이 크고 손가락 마디·손등 뼈가 도드라진다"], ["straight", "손바닥이 도톰하고 몸에 비해 손이 작다"], ["unknown", "잘 모르겠다"]] },
  { name: "collarbone", label: "Q3. 거울로 봤을 때 쇄골은 어떤가요?", choices: [["straight", "잘 안 보인다 (살에 묻힌 편)"], ["natural", "크고 뚜렷하게 튀어나와 있다"], ["wave", "가늘게 보인다"], ["unknown", "잘 모르겠다"]] },
  { name: "upperBody", label: "Q4. 옆에서 본 상체는 어떤가요?", choices: [["wave", "앞쪽이 납작해 보인다"], ["straight", "가슴 볼륨이 두껍고 입체적이다"], ["natural", "두께보다 어깨 쪽 뼈대가 넓은 느낌이다"], ["unknown", "잘 모르겠다"]] },
  { name: "waist", label: "Q5. 허리 모양은 어떤가요?", choices: [["straight", "일자에 가깝고 골반과 별개로 반듯하다"], ["wave", "허리가 잘록하고 골반이 뚜렷하다"], ["natural", "허리 위치가 높고 굴곡이 적다"], ["unknown", "잘 모르겠다"]] },
  { name: "weightGain", label: "Q6. 살이 찌면 어디부터 붙나요?", choices: [["wave", "하체 (엉덩이·허벅지)"], ["natural", "전체적으로 고르게, 살보다 뼈대가 먼저 보인다"], ["straight", "상체 (가슴·팔 윗부분)"], ["unknown", "잘 모르겠다"]] },
  { name: "upperArm", label: "Q7. 팔뚝이나 허벅지를 잡아 보면?", choices: [["straight", "탄력 있고 단단하다"], ["natural", "살이 적고 근육·힘줄이 드러난다"], ["wave", "부드럽고 말랑하다"], ["unknown", "잘 모르겠다"]] },
  { name: "shapeChange", label: "Q8. 살이 찌면 몸이 어느 방향으로 두꺼워지나요?", choices: [["wave", "옆으로 퍼진다 (골반·엉덩이·허벅지 바깥쪽이 넓어진다)"], ["straight", "앞뒤로 두꺼워진다 (배·가슴이 앞으로 나오고 몸통이 넓어진다)"], ["natural", "전체적으로 고르게 찌고, 살이 뼈대·어깨를 감싼다"], ["unknown", "잘 모르겠다"]] },
  { name: "sideProfile", label: "Q9. 옆에서 본 모습에서 가슴과 엉덩이는 어떤가요?", choices: [["natural", "엉덩이가 평평하고 길쭉한 편이다"], ["straight", "가슴과 엉덩이가 작아도 옆에서 볼 때 입체적이다"], ["wave", "가슴은 납작한 편이고, 엉덩이는 아래쪽에 볼륨이 있다"], ["unknown", "잘 모르겠다"]] },
  { name: "legs", label: "Q10. 다리는 어떤 편인가요?", choices: [["straight", "허벅지까지 탄탄하게 살이 있고, 무릎 아래는 가늘다"], ["wave", "무릎 위·허벅지에 살이 많고 하체에 볼륨이 있다"], ["natural", "무릎뼈·발목뼈가 크고 도드라진다"], ["unknown", "잘 모르겠다"]] },
  { name: "neckShoulders", label: "Q11. 목과 어깨는 어떤가요?", choices: [["wave", "목이 길고 가늘며 어깨가 처진 편이다"], ["natural", "어깨가 넓고 각져 있으며 목의 힘줄이나 뼈가 보인다"], ["straight", "목이 짧은 편이고 가슴 위치가 높다"], ["unknown", "잘 모르겠다"]] },
];

export function isBodyType(value: unknown): value is BodyType {
  return typeof value === "string" && (bodyTypes as readonly string[]).includes(value);
}

export function isBodySurveyAnswer(value: unknown): value is BodySurveyAnswer {
  return value === "unknown" || isBodyType(value);
}

export function hasCompletedBodySurvey(answers: Record<string, BodySurveyAnswer>) {
  return bodyQuestions.every((question) => isBodySurveyAnswer(answers[question.name]));
}

export function deriveBodyType(answers: Record<string, BodySurveyAnswer>, professionalDiagnosis: BodySurveyAnswer, selfDiagnosis: BodySurveyAnswer): BodyType {
  const score: Record<BodyType, number> = { straight: 0, wave: 0, natural: 0 };
  for (const question of bodyQuestions) {
    const answer = answers[question.name];
    if (isBodyType(answer)) score[answer] += 1;
  }
  if (isBodyType(professionalDiagnosis)) score[professionalDiagnosis] += 4;
  if (isBodyType(selfDiagnosis)) score[selfDiagnosis] += 2;
  return bodyTypes.reduce((winner, candidate) => score[candidate] > score[winner] ? candidate : winner, "straight");
}
