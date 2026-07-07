// 고객 만족도 / 직원 평가의 별점 항목 정의.
// 여기(항목 배열)만 수정하면 폼·저장·관리자 표시가 일괄로 바뀐다.
// 점수는 ratings(JSON) 컬럼에 { [key]: 1~5 } 로 저장되므로 항목을 추가/삭제해도
// DB 스키마 변경이 필요 없다.

export interface RatingItem {
  key: string;
  label: string;
}

// 별점 척도 (1~5)
export const RATING_MIN = 1;
export const RATING_MAX = 5;

// 고객 만족도 항목 (일반회원=1 / 기업회원=3)
export const SATISFACTION_ITEMS: RatingItem[] = [
  { key: "overall", label: "Overall Satisfaction" },
  { key: "quality", label: "Service Quality" },
  { key: "response", label: "Responsiveness" },
  { key: "speed", label: "Processing Speed" },
  { key: "price", label: "Price Satisfaction" },
];

// 직원 평가 항목 (직원=7)
export const STAFF_EVAL_ITEMS: RatingItem[] = [
  { key: "workload", label: "Workload Balance" },
  { key: "environment", label: "Work Environment" },
  { key: "collaboration", label: "Collaboration & Communication" },
  { key: "growth", label: "Growth Opportunity" },
  { key: "welfare", label: "Benefits & Welfare" },
];

export type ReviewKind = "satisfaction" | "staff";

export function itemsFor(kind: ReviewKind): RatingItem[] {
  return kind === "staff" ? STAFF_EVAL_ITEMS : SATISFACTION_ITEMS;
}

// 서버측 검증: ratings 객체가 정의된 항목 키만 담고, 각 값이 1~5 정수인지 확인.
// 반환: 정규화된 { key: score } (정의되지 않은 키는 버림). 유효하지 않으면 null.
export function normalizeRatings(
  kind: ReviewKind,
  raw: unknown,
): Record<string, number> | null {
  if (typeof raw !== "object" || raw === null) return null;
  const source = raw as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const item of itemsFor(kind)) {
    const v = source[item.key];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const score = Math.trunc(v);
    if (score < RATING_MIN || score > RATING_MAX) return null;
    out[item.key] = score;
  }
  // 최소 한 개 항목은 평가되어야 함.
  return Object.keys(out).length > 0 ? out : null;
}
