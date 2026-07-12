// 회원 유형 / 권한 레벨 정의. 다른 파일(폼, API, admin 페이지 등)에서
// 이 파일만 수정하면 라벨/값을 일괄로 바꿀 수 있다.

export const ACCOUNT_TYPES = ["personal", "business"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  personal: "개인",
  business: "기업",
};

export function isAccountType(v: unknown): v is AccountType {
  return typeof v === "string" && (ACCOUNT_TYPES as readonly string[]).includes(v);
}

// 권한 레벨. 숫자가 클수록 권한이 높다.
//   1 = 일반 회원(개인 가입), 3 = 기업 회원(기업 가입),
//   7 = 직원(어드민이 승격), 9 = 관리자
// 새 레벨을 추가하려면 여기와 라벨만 수정.
export const USER_LEVELS = {
  user: 1,
  business: 3,
  staff: 7,
  admin: 9,
} as const;

export type UserLevelKey = keyof typeof USER_LEVELS;
export type UserLevel = (typeof USER_LEVELS)[UserLevelKey];

export const USER_LEVEL_LABELS: Record<UserLevelKey, string> = {
  user: "일반 회원",
  business: "기업 회원",
  staff: "직원",
  admin: "관리자",
};

export const DEFAULT_USER_LEVEL: UserLevel = USER_LEVELS.user;
export const ADMIN_USER_LEVEL: UserLevel = USER_LEVELS.admin;

// 회원가입 시 account_type 에 따라 초기 user_level 결정.
export function defaultLevelForAccountType(type: AccountType): UserLevel {
  return type === "business" ? USER_LEVELS.business : USER_LEVELS.user;
}

export function isUserLevel(v: unknown): v is UserLevel {
  return (
    typeof v === "number" &&
    (Object.values(USER_LEVELS) as number[]).includes(v)
  );
}

export function userLevelKey(level: number): UserLevelKey {
  // 정의된 레벨 중 입력값 이하인 가장 큰 값을 매칭. 정확히 일치하지 않는 임의 값(예: 5)도
  // 가장 가까운 하위 등급으로 표시되도록 한다.
  const entries = Object.entries(USER_LEVELS) as [UserLevelKey, UserLevel][];
  const sorted = [...entries].sort((a, b) => a[1] - b[1]);
  let best: UserLevelKey = sorted[0][0];
  for (const [key, value] of sorted) {
    if (level >= value) best = key;
  }
  return best;
}

export function userLevelLabel(level: number): string {
  return USER_LEVEL_LABELS[userLevelKey(level)];
}

export function isAdminLevel(level: number): boolean {
  return level >= ADMIN_USER_LEVEL;
}

// 직원 이상(직원 7 또는 관리자 9). 의뢰 처리 권한 판정에 사용.
export function isStaffLevel(level: number): boolean {
  return level >= USER_LEVELS.staff;
}

// 고객(일반/기업 회원). 의뢰 등록 주체.
export function isCustomerLevel(level: number): boolean {
  return level === USER_LEVELS.user || level === USER_LEVELS.business;
}
