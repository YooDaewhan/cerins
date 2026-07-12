// CEC India 인증 프로세스의 상수·enum·라벨·타입 정의.
// TRCU/GOST 워크플로(serviceRequestTypes.ts / serviceWorkflow.ts)와 완전히 분리되어 있으며,
// 공통 테이블(service_requests, request_files, quotations, payments, request_messages,
// request_status_histories)은 그대로 재사용한다. service_type = 'CEC_INDIA' 인 의뢰만 이 규칙을 따른다.
//
// 중요: 숫자 step 만으로 상태를 판단하지 말고 반드시 step + status 를 함께 사용한다.
//       (step 3 과 step 11 은 하나의 step 아래 여러 sub-status 를 가진다. step 12 는 미사용.)
//       DEPOSIT_* / BALANCE_* / INSPECTION_* 등 일부 status 문자열은 TRCU 상태값과 이름이 겹치지만,
//       항상 service_type 로 분기해 CEC 전용 맵(CEC_STATUS_STEP 등)으로 해석하므로 충돌하지 않는다.

/* ------------------------------------------------------------------ */
/* 워크플로 상태 / step                                                 */
/* ------------------------------------------------------------------ */

// DB의 service_requests.status 에 실제로 저장되는 CEC 상태 문자열.
export const CEC_STATUS = {
  REQUESTED: "CEC_REQUESTED",
  ASSIGNED: "CEC_ASSIGNED",
  DOCUMENT_REJECTED: "CEC_DOCUMENT_REJECTED",
  // step 3 (CEC_DEPOSIT_AND_INSPECTION) sub-status
  DEPOSIT_REQUESTED: "DEPOSIT_REQUESTED",
  DEPOSIT_SUBMITTED: "DEPOSIT_SUBMITTED",
  DEPOSIT_REJECTED: "DEPOSIT_REJECTED",
  DEPOSIT_CONFIRMED: "DEPOSIT_CONFIRMED",
  INSPECTION_SCHEDULED: "INSPECTION_SCHEDULED",
  INSPECTION_IN_PROGRESS: "INSPECTION_IN_PROGRESS",
  // step 4
  INSPECTION_BLOCKED: "CEC_INSPECTION_BLOCKED",
  // step 5 / 6
  VALUATION_REVIEW: "CEC_VALUATION_REVIEW",
  VALUATION_REJECTED: "CEC_VALUATION_REJECTED",
  // step 7 / 8
  CERTIFICATE_DRAFT: "CEC_CERTIFICATE_DRAFT",
  CERTIFICATION_BLOCKED: "CEC_CERTIFICATION_BLOCKED",
  // step 9 / 10
  FINAL_DRAFT_PREPARATION: "CEC_FINAL_DRAFT_PREPARATION",
  FINAL_OR_PAYMENT_REJECTED: "CEC_FINAL_OR_PAYMENT_REJECTED",
  // step 11 (CEC_BALANCE_AND_FINAL_REVIEW) sub-status
  BALANCE_REQUESTED: "BALANCE_REQUESTED",
  BALANCE_SUBMITTED: "BALANCE_SUBMITTED",
  BALANCE_CONFIRMED: "BALANCE_CONFIRMED",
  // step 13
  COMPLETED: "CEC_COMPLETED",
} as const;

export type CecStatus = (typeof CEC_STATUS)[keyof typeof CEC_STATUS];

// 상태 → step 번호. (step 12 미사용, step 3·11 은 여러 상태가 공유)
export const CEC_STATUS_STEP: Record<CecStatus, number> = {
  CEC_REQUESTED: 0,
  CEC_ASSIGNED: 1,
  CEC_DOCUMENT_REJECTED: 2,
  DEPOSIT_REQUESTED: 3,
  DEPOSIT_SUBMITTED: 3,
  DEPOSIT_REJECTED: 3,
  DEPOSIT_CONFIRMED: 3,
  INSPECTION_SCHEDULED: 3,
  INSPECTION_IN_PROGRESS: 3,
  CEC_INSPECTION_BLOCKED: 4,
  CEC_VALUATION_REVIEW: 5,
  CEC_VALUATION_REJECTED: 6,
  CEC_CERTIFICATE_DRAFT: 7,
  CEC_CERTIFICATION_BLOCKED: 8,
  CEC_FINAL_DRAFT_PREPARATION: 9,
  CEC_FINAL_OR_PAYMENT_REJECTED: 10,
  BALANCE_REQUESTED: 11,
  BALANCE_SUBMITTED: 11,
  BALANCE_CONFIRMED: 11,
  CEC_COMPLETED: 13,
};

export function isCecStatus(v: unknown): v is CecStatus {
  return typeof v === "string" && v in CEC_STATUS_STEP;
}

export function cecStepForStatus(status: string): number {
  return CEC_STATUS_STEP[status as CecStatus] ?? 0;
}

// 관리자/직원용 상태 라벨(한글).
export const CEC_STATUS_LABELS: Record<CecStatus, string> = {
  CEC_REQUESTED: "의뢰 접수 (검토 대기)",
  CEC_ASSIGNED: "담당자 배정 / 서류 검토",
  CEC_DOCUMENT_REJECTED: "서류 보완 요청",
  DEPOSIT_REQUESTED: "선금 입금 대기",
  DEPOSIT_SUBMITTED: "선금 확인 중",
  DEPOSIT_REJECTED: "선금 확인 불가",
  DEPOSIT_CONFIRMED: "선금 확인 완료",
  INSPECTION_SCHEDULED: "검사 예정",
  INSPECTION_IN_PROGRESS: "검사 진행 중",
  CEC_INSPECTION_BLOCKED: "검사 진행 불가",
  CEC_VALUATION_REVIEW: "가격평가 고객 확인 대기",
  CEC_VALUATION_REJECTED: "가격평가 거절 (재검토)",
  CEC_CERTIFICATE_DRAFT: "인증서 초안 단계",
  CEC_CERTIFICATION_BLOCKED: "인증 진행 보완 필요",
  CEC_FINAL_DRAFT_PREPARATION: "최종 확인증서 초안 작성",
  CEC_FINAL_OR_PAYMENT_REJECTED: "최종 초안/잔금 보완",
  BALANCE_REQUESTED: "최종 초안 확인 / 잔금 대기",
  BALANCE_SUBMITTED: "잔금 확인 중",
  BALANCE_CONFIRMED: "잔금 확인 완료 (최종 인증서 대기)",
  CEC_COMPLETED: "최종 인증 완료",
};

// 고객에게 노출하는 상태 라벨(내부 뉘앙스 순화).
export const CEC_CUSTOMER_STATUS_LABELS: Record<CecStatus, string> = {
  CEC_REQUESTED: "접수 완료 (검토 대기)",
  CEC_ASSIGNED: "담당자 검토 중",
  CEC_DOCUMENT_REJECTED: "서류 보완 요청",
  DEPOSIT_REQUESTED: "접수 완료 / 선금 입금 요청",
  DEPOSIT_SUBMITTED: "선금 입금 확인 중",
  DEPOSIT_REJECTED: "선금 확인 불가 (재확인 필요)",
  DEPOSIT_CONFIRMED: "선금 확인 완료",
  INSPECTION_SCHEDULED: "검사 예정",
  INSPECTION_IN_PROGRESS: "검사 진행 중",
  CEC_INSPECTION_BLOCKED: "검사 보완 필요",
  CEC_VALUATION_REVIEW: "가격평가 확인 요청",
  CEC_VALUATION_REJECTED: "가격평가 재검토 중",
  CEC_CERTIFICATE_DRAFT: "인증서 초안 확인",
  CEC_CERTIFICATION_BLOCKED: "인증 보완 필요",
  CEC_FINAL_DRAFT_PREPARATION: "최종 인증서 초안 준비 중",
  CEC_FINAL_OR_PAYMENT_REJECTED: "최종 초안/잔금 재확인 필요",
  BALANCE_REQUESTED: "최종 초안 확인 / 잔금 입금 요청",
  BALANCE_SUBMITTED: "잔금 입금 확인 중",
  BALANCE_CONFIRMED: "잔금 확인 완료 / 최종 인증서 발행 대기",
  CEC_COMPLETED: "최종 인증 완료",
};

export function cecStatusLabel(status: string): string {
  return CEC_STATUS_LABELS[status as CecStatus] ?? status;
}
export function cecCustomerStatusLabel(status: string): string {
  return CEC_CUSTOMER_STATUS_LABELS[status as CecStatus] ?? status;
}

/* ------------------------------------------------------------------ */
/* 첨부파일 종류                                                        */
/* ------------------------------------------------------------------ */

// CEC 파일 종류. required=true 는 해당 단계 제출 필수. customerVisible=false 는 내부 전용.
// previewOnly=true 는 일반 다운로드 금지(보안 미리보기 엔드포인트만). pdfOnly=true 는 PDF 만 허용.
export const CEC_FILE_TYPES = [
  "CEC_PURCHASE_RECEIPT",
  "CEC_NAMEPLATE",
  "CEC_PRODUCT_PHOTO",
  "CEC_REQUEST_OTHER",
  "CEC_INSPECTION_REPORT",
  "CEC_CERTIFICATE_DRAFT",
  "CEC_SHIPPING_INVOICE",
  "CEC_BILL_OF_LADING",
  "CEC_SHIPPING_OTHER",
  "CEC_FINAL_CERTIFICATE_PREVIEW",
  "CEC_TAX_INVOICE",
  "CEC_FINAL_CERTIFICATE",
] as const;
export type CecFileType = (typeof CEC_FILE_TYPES)[number];

export interface CecFileMeta {
  label: string;
  required: boolean; // 의뢰서(step 0) 제출 필수 여부
  customerVisible: boolean; // 업로드 시 기본 고객 공개 여부
  previewOnly?: boolean; // true 면 다운로드 금지, 미리보기 엔드포인트만
  pdfOnly?: boolean; // true 면 PDF 만 허용
}

export const CEC_FILE_META: Record<CecFileType, CecFileMeta> = {
  CEC_PURCHASE_RECEIPT: { label: "최초 구매가 영수증", required: true, customerVisible: true },
  CEC_NAMEPLATE: { label: "명판", required: true, customerVisible: true },
  CEC_PRODUCT_PHOTO: { label: "제품사진", required: true, customerVisible: true },
  CEC_REQUEST_OTHER: { label: "기타 자료", required: false, customerVisible: true },
  CEC_INSPECTION_REPORT: { label: "검사 리포트(내부)", required: false, customerVisible: false },
  CEC_CERTIFICATE_DRAFT: { label: "인증서 초안", required: false, customerVisible: true },
  CEC_SHIPPING_INVOICE: { label: "선적 인보이스", required: false, customerVisible: true },
  CEC_BILL_OF_LADING: { label: "B/L", required: false, customerVisible: true },
  CEC_SHIPPING_OTHER: { label: "기타 선적서류", required: false, customerVisible: true },
  CEC_FINAL_CERTIFICATE_PREVIEW: { label: "최종 인증서 초안", required: false, customerVisible: false, previewOnly: true },
  CEC_TAX_INVOICE: { label: "세금계산서/청구서", required: false, customerVisible: true },
  CEC_FINAL_CERTIFICATE: { label: "최종 인증서", required: false, customerVisible: false, pdfOnly: true },
};

// 의뢰서(step 0)에서 사용하는 첨부 종류.
export const CEC_REQUEST_FILE_TYPES: CecFileType[] = [
  "CEC_PURCHASE_RECEIPT",
  "CEC_NAMEPLATE",
  "CEC_PRODUCT_PHOTO",
  "CEC_REQUEST_OTHER",
];
// step 0 제출 시 최소 1개 필요한 종류.
export const CEC_REQUIRED_REQUEST_FILE_TYPES: CecFileType[] = CEC_REQUEST_FILE_TYPES.filter(
  (t) => CEC_FILE_META[t].required,
);
// 선적서류 제출 시 필수 종류(인보이스).
export const CEC_REQUIRED_SHIPPING_FILE_TYPES: CecFileType[] = ["CEC_SHIPPING_INVOICE"];

export function isCecFileType(v: unknown): v is CecFileType {
  return typeof v === "string" && (CEC_FILE_TYPES as readonly string[]).includes(v);
}
export function cecFileTypeLabel(t: string): string {
  return CEC_FILE_META[t as CecFileType]?.label ?? t;
}

/* ------------------------------------------------------------------ */
/* 결제 / 견적 항목                                                     */
/* ------------------------------------------------------------------ */

// payments.payment_type 에 저장. TRCU 의 DEPOSIT/BALANCE 와 구분.
export const CEC_PAYMENT_TYPE = {
  DEPOSIT: "CEC_DEPOSIT",
  BALANCE: "CEC_BALANCE",
} as const;
export type CecPaymentType = (typeof CEC_PAYMENT_TYPE)[keyof typeof CEC_PAYMENT_TYPE];
export const CEC_PAYMENT_TYPE_LABELS: Record<CecPaymentType, string> = {
  CEC_DEPOSIT: "선금",
  CEC_BALANCE: "잔금",
};

// quotation_items.item_type 에 저장.
export const CEC_QUOTATION_ITEM_TYPES = {
  BASE_FEE: "CEC_BASE_FEE",
  INSPECTION_FEE: "CEC_INSPECTION_FEE",
  VALUE_SURCHARGE: "CEC_VALUE_SURCHARGE",
} as const;
export const CEC_QUOTATION_ITEM_LABELS: Record<string, string> = {
  CEC_BASE_FEE: "기본 인증비",
  CEC_INSPECTION_FEE: "검사비",
  CEC_VALUE_SURCHARGE: "물건가액 추가 수수료",
};

/* ------------------------------------------------------------------ */
/* 예외 라우팅 (step 8 / step 10)                                       */
/* ------------------------------------------------------------------ */

// step 8(CEC_CERTIFICATION_BLOCKED) 의 block_type. 해결 후 resume_step 으로 복귀.
export const CEC_BLOCK_TYPE = {
  CERTIFICATE_DRAFT_REJECTED: "CERTIFICATE_DRAFT_REJECTED", // resume_step 7
  CERTIFICATE_ISSUANCE_BLOCKED: "CERTIFICATE_ISSUANCE_BLOCKED", // resume_step 9
  ADDITIONAL_DOCUMENT_REQUIRED: "ADDITIONAL_DOCUMENT_REQUIRED",
} as const;
export type CecBlockType = (typeof CEC_BLOCK_TYPE)[keyof typeof CEC_BLOCK_TYPE];

// step 10(CEC_FINAL_OR_PAYMENT_REJECTED) 의 reject_type. 복귀 단계가 달라진다.
export const CEC_REJECT_TYPE = {
  FINAL_DRAFT_REJECTED: "FINAL_DRAFT_REJECTED", // → step 9
  BALANCE_REJECTED: "BALANCE_REJECTED", // → step 11
} as const;
export type CecRejectType = (typeof CEC_REJECT_TYPE)[keyof typeof CEC_REJECT_TYPE];

/* ------------------------------------------------------------------ */
/* 이력(actions)                                                        */
/* ------------------------------------------------------------------ */

export const CEC_HISTORY_ACTIONS = [
  "CEC_ASSIGN_STAFF",
  "CEC_REJECT_DOCUMENTS",
  "CEC_RESUBMIT_DOCUMENTS",
  "CEC_ACCEPT_REQUEST",
  "CEC_SUBMIT_DEPOSIT",
  "CEC_CONFIRM_DEPOSIT",
  "CEC_REJECT_DEPOSIT",
  "CEC_SCHEDULE_INSPECTION",
  "CEC_START_INSPECTION",
  "CEC_BLOCK_INSPECTION",
  "CEC_RESUME_INSPECTION",
  "CEC_COMPLETE_VALUATION",
  "CEC_APPROVE_VALUATION",
  "CEC_REJECT_VALUATION",
  "CEC_RESUBMIT_VALUATION",
  "CEC_UPLOAD_CERTIFICATE_DRAFT",
  "CEC_APPROVE_DRAFT_SUBMIT_SHIPPING",
  "CEC_REJECT_CERTIFICATE_DRAFT",
  "CEC_PREPARE_FINAL_DRAFT",
  "CEC_BLOCK_CERTIFICATE_ISSUANCE",
  "CEC_RESUME_CERTIFICATION",
  "CEC_SUBMIT_BALANCE",
  "CEC_REJECT_FINAL_DRAFT",
  "CEC_REWORK_FINAL_DRAFT",
  "CEC_CONFIRM_BALANCE",
  "CEC_REJECT_BALANCE",
  "CEC_COMPLETE_CERTIFICATION",
  "CEC_UPLOAD_FILE",
] as const;
export type CecHistoryAction = (typeof CEC_HISTORY_ACTIONS)[number];

/* ------------------------------------------------------------------ */
/* 진행 단계 마일스톤 (고객 화면)                                        */
/* ------------------------------------------------------------------ */

export const CEC_MILESTONES: { statuses: CecStatus[]; label: string }[] = [
  { statuses: ["CEC_REQUESTED", "CEC_ASSIGNED", "CEC_DOCUMENT_REJECTED"], label: "접수/검토" },
  {
    statuses: [
      "DEPOSIT_REQUESTED", "DEPOSIT_SUBMITTED", "DEPOSIT_REJECTED", "DEPOSIT_CONFIRMED",
      "INSPECTION_SCHEDULED", "INSPECTION_IN_PROGRESS", "CEC_INSPECTION_BLOCKED",
    ],
    label: "선금/검사",
  },
  { statuses: ["CEC_VALUATION_REVIEW", "CEC_VALUATION_REJECTED"], label: "가격평가" },
  { statuses: ["CEC_CERTIFICATE_DRAFT", "CEC_CERTIFICATION_BLOCKED"], label: "인증서 초안" },
  {
    statuses: ["CEC_FINAL_DRAFT_PREPARATION", "CEC_FINAL_OR_PAYMENT_REJECTED", "BALANCE_REQUESTED", "BALANCE_SUBMITTED", "BALANCE_CONFIRMED"],
    label: "최종 초안/잔금",
  },
  { statuses: ["CEC_COMPLETED"], label: "발급 완료" },
];

/* ------------------------------------------------------------------ */
/* CEC 상세 테이블 엔티티 타입 (dateStrings: DATE/DATETIME 는 string)      */
/* ------------------------------------------------------------------ */

export interface CecInspection {
  id: number;
  service_request_id: number;
  // 고객이 의뢰(step 0) 시 입력한 검사 요청 일정(가능일)/현장 담당자. 시간 미정이면 시간은 null.
  requested_start_date: string | null;
  requested_end_date: string | null;
  requested_start_time: string | null;
  requested_end_time: string | null;
  site_contact_name: string | null;
  site_contact_phone: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  planned_days: number | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  actual_days: number | null;
  inspection_location: string | null;
  inspection_memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface CecValuation {
  id: number;
  service_request_id: number;
  valuation_amount: string;
  valuation_currency: string;
  valuation_description: string | null;
  surcharge_applied: boolean;
  surcharge_rate: string;
  surcharge_amount: string;
  notes: string | null;
  created_by: number | null;
  customer_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}
