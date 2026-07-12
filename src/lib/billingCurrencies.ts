// 청구/입금/평가 금액 입력 시 공통으로 쓰는 통화 선택지.
// 여러 서비스(CEC / 스크랩 인도 / 제품검사)에서 동일한 목록을 공유한다.
// "OTHER" 선택 시 UI(CurrencyPicker)에서 임의 통화 코드를 직접 입력할 수 있다.
// db 의존이 없는 순수 상수 모듈이므로 클라이언트 컴포넌트에서 값(value) import 가능.
export const BILLING_CURRENCIES = ["KRW", "RUB", "USD", "CNY", "OTHER"] as const;
export type BillingCurrency = (typeof BILLING_CURRENCIES)[number];
