// 검사 → 스크랩(인도) (Scrap India) 프로세스의 상수·enum·라벨·타입 정의.
// TRCU/GOST(serviceRequestTypes.ts) · CEC India(cecTypes.ts) · 제품검사(productInspectionTypes.ts)
// 워크플로와 완전히 분리되어 있으며, 공통 테이블(service_requests, request_files,
// request_status_histories, payments, quotations/quotation_items, request_messages,
// request_number_seq)은 그대로 재사용한다.
//   category = 'INSPECTION', service_type = 'SCRAP_INDIA' 인 의뢰만 이 규칙을 따른다.
//
// 중요: 숫자 step 만으로 상태를 판단하지 말고 반드시 step + status 를 함께 사용한다.
//   step 3  : SCHEDULED / IN_PROGRESS
//   step 5  : CUSTOMER_DOCUMENTS_PENDING / CUSTOMER_DOCUMENTS_SUBMITTED
//   step 7  : REPORT_PREPARING / REPORT_COMPLETED (/ BILLING_PREPARING)
//   step 9  : PAYMENT_REQUESTED / PAYMENT_SUBMITTED
//   step 11 : PAYMENT_CONFIRMED / DGFT_DOCUMENT_PREPARING / DGFT_REGISTRATION_IN_PROGRESS (/ DGFT_REGISTERED)
// 모든 상태 문자열은 'SCRAP_' 로 시작해 다른 서비스 상태값과 충돌하지 않는다.

/* ------------------------------------------------------------------ */
/* 워크플로 상태 / step                                                 */
/* ------------------------------------------------------------------ */

// DB의 service_requests.status 에 실제로 저장되는 스크랩 India 상태 문자열.
export const SCRAP_STATUS = {
  // step 0~2
  REQUESTED: "SCRAP_REQUESTED",
  ASSIGNED: "SCRAP_ASSIGNED",
  SCHEDULE_REVISION_REQUIRED: "SCRAP_SCHEDULE_REVISION_REQUIRED",
  // step 3
  INSPECTION_SCHEDULED: "SCRAP_INSPECTION_SCHEDULED",
  INSPECTION_IN_PROGRESS: "SCRAP_INSPECTION_IN_PROGRESS",
  // step 4
  INSPECTION_BLOCKED: "SCRAP_INSPECTION_BLOCKED",
  // step 5
  CUSTOMER_DOCUMENTS_PENDING: "SCRAP_CUSTOMER_DOCUMENTS_PENDING",
  CUSTOMER_DOCUMENTS_SUBMITTED: "SCRAP_CUSTOMER_DOCUMENTS_SUBMITTED",
  // step 6
  DOCUMENTS_REVISION_REQUIRED: "SCRAP_DOCUMENTS_REVISION_REQUIRED",
  // step 7
  REPORT_PREPARING: "SCRAP_REPORT_PREPARING",
  REPORT_COMPLETED: "SCRAP_REPORT_COMPLETED",
  BILLING_PREPARING: "SCRAP_BILLING_PREPARING",
  // step 8
  REPORT_BLOCKED: "SCRAP_REPORT_BLOCKED",
  // step 9
  PAYMENT_REQUESTED: "SCRAP_PAYMENT_REQUESTED",
  PAYMENT_SUBMITTED: "SCRAP_PAYMENT_SUBMITTED",
  // step 10
  PAYMENT_REJECTED: "SCRAP_PAYMENT_REJECTED",
  // step 11
  PAYMENT_CONFIRMED: "SCRAP_PAYMENT_CONFIRMED",
  DGFT_DOCUMENT_PREPARING: "SCRAP_DGFT_DOCUMENT_PREPARING",
  DGFT_REGISTRATION_IN_PROGRESS: "SCRAP_DGFT_REGISTRATION_IN_PROGRESS",
  DGFT_REGISTERED: "SCRAP_DGFT_REGISTERED",
  // step 12
  DGFT_REGISTRATION_BLOCKED: "SCRAP_DGFT_REGISTRATION_BLOCKED",
  // step 13
  COMPLETED: "SCRAP_COMPLETED",
} as const;

export type ScrapStatus = (typeof SCRAP_STATUS)[keyof typeof SCRAP_STATUS];

// 상태 → step 번호. (여러 상태가 같은 step 을 공유하는 경우가 있으므로 step+status 로 판단)
export const SCRAP_STATUS_STEP: Record<ScrapStatus, number> = {
  SCRAP_REQUESTED: 0,
  SCRAP_ASSIGNED: 1,
  SCRAP_SCHEDULE_REVISION_REQUIRED: 2,
  SCRAP_INSPECTION_SCHEDULED: 3,
  SCRAP_INSPECTION_IN_PROGRESS: 3,
  SCRAP_INSPECTION_BLOCKED: 4,
  SCRAP_CUSTOMER_DOCUMENTS_PENDING: 5,
  SCRAP_CUSTOMER_DOCUMENTS_SUBMITTED: 5,
  SCRAP_DOCUMENTS_REVISION_REQUIRED: 6,
  SCRAP_REPORT_PREPARING: 7,
  SCRAP_REPORT_COMPLETED: 7,
  SCRAP_BILLING_PREPARING: 7,
  SCRAP_REPORT_BLOCKED: 8,
  SCRAP_PAYMENT_REQUESTED: 9,
  SCRAP_PAYMENT_SUBMITTED: 9,
  SCRAP_PAYMENT_REJECTED: 10,
  SCRAP_PAYMENT_CONFIRMED: 11,
  SCRAP_DGFT_DOCUMENT_PREPARING: 11,
  SCRAP_DGFT_REGISTRATION_IN_PROGRESS: 11,
  SCRAP_DGFT_REGISTERED: 11,
  SCRAP_DGFT_REGISTRATION_BLOCKED: 12,
  SCRAP_COMPLETED: 13,
};

export function isScrapStatus(v: unknown): v is ScrapStatus {
  return typeof v === "string" && v in SCRAP_STATUS_STEP;
}

export function scrapStepForStatus(status: string): number {
  return SCRAP_STATUS_STEP[status as ScrapStatus] ?? 0;
}

// 관리자/직원용 상태 라벨(한글). 목록에서 숫자만 노출하지 않는다.
export const SCRAP_STATUS_LABELS: Record<ScrapStatus, string> = {
  SCRAP_REQUESTED: "스크랩 검사 의뢰",
  SCRAP_ASSIGNED: "담당자 배정 및 일정 검토",
  SCRAP_SCHEDULE_REVISION_REQUIRED: "검사 일정 조정 요청",
  SCRAP_INSPECTION_SCHEDULED: "검사 일정 확정",
  SCRAP_INSPECTION_IN_PROGRESS: "현장검사 진행 중",
  SCRAP_INSPECTION_BLOCKED: "검사 진행 보류",
  SCRAP_CUSTOMER_DOCUMENTS_PENDING: "검사 완료 / 고객 서류 대기",
  SCRAP_CUSTOMER_DOCUMENTS_SUBMITTED: "고객 서류 검토 중",
  SCRAP_DOCUMENTS_REVISION_REQUIRED: "고객 서류 보완 요청",
  SCRAP_REPORT_PREPARING: "내부 리포트 작성 중",
  SCRAP_REPORT_COMPLETED: "내부 리포트 완료 / 청구 준비",
  SCRAP_BILLING_PREPARING: "청구 준비 중",
  SCRAP_REPORT_BLOCKED: "리포트 처리 보류",
  SCRAP_PAYMENT_REQUESTED: "고객 입금 대기",
  SCRAP_PAYMENT_SUBMITTED: "입금 확인 중",
  SCRAP_PAYMENT_REJECTED: "입금 확인 불가",
  SCRAP_PAYMENT_CONFIRMED: "입금 확인 완료",
  SCRAP_DGFT_DOCUMENT_PREPARING: "DGFT 등록문서 작성 중",
  SCRAP_DGFT_REGISTRATION_IN_PROGRESS: "DGFT 등록 진행 중",
  SCRAP_DGFT_REGISTERED: "DGFT 등록 완료",
  SCRAP_DGFT_REGISTRATION_BLOCKED: "DGFT 등록 보류",
  SCRAP_COMPLETED: "스크랩 India 완료",
};

// 고객에게 노출하는 상태 라벨. 내부 리포트/정산 뉘앙스를 순화한다.
export const SCRAP_CUSTOMER_STATUS_LABELS: Record<ScrapStatus, string> = {
  SCRAP_REQUESTED: "접수 완료 (검토 대기)",
  SCRAP_ASSIGNED: "담당자 검토 중",
  SCRAP_SCHEDULE_REVISION_REQUIRED: "검사 일정 조정 요청",
  SCRAP_INSPECTION_SCHEDULED: "검사 일정 확정",
  SCRAP_INSPECTION_IN_PROGRESS: "현장검사 진행 중",
  SCRAP_INSPECTION_BLOCKED: "검사 보류 (확인 필요)",
  SCRAP_CUSTOMER_DOCUMENTS_PENDING: "현장검사 완료 / 서류 제출 요청",
  SCRAP_CUSTOMER_DOCUMENTS_SUBMITTED: "제출 서류 검토 중",
  SCRAP_DOCUMENTS_REVISION_REQUIRED: "서류 보완 요청",
  SCRAP_REPORT_PREPARING: "리포트 작성 중",
  SCRAP_REPORT_COMPLETED: "리포트 작성 중",
  SCRAP_BILLING_PREPARING: "청구 준비 중",
  SCRAP_REPORT_BLOCKED: "처리 중",
  SCRAP_PAYMENT_REQUESTED: "비용 청구 / 입금 요청",
  SCRAP_PAYMENT_SUBMITTED: "입금 확인 중",
  SCRAP_PAYMENT_REJECTED: "입금 확인 불가 (재확인 필요)",
  SCRAP_PAYMENT_CONFIRMED: "입금 확인 완료 / DGFT 등록 준비",
  SCRAP_DGFT_DOCUMENT_PREPARING: "DGFT 등록 준비 중",
  SCRAP_DGFT_REGISTRATION_IN_PROGRESS: "DGFT 등록 진행 중",
  SCRAP_DGFT_REGISTERED: "DGFT 등록 완료",
  SCRAP_DGFT_REGISTRATION_BLOCKED: "DGFT 등록 처리 중",
  SCRAP_COMPLETED: "스크랩 India 완료",
};

export function scrapStatusLabel(status: string): string {
  return SCRAP_STATUS_LABELS[status as ScrapStatus] ?? status;
}
export function scrapCustomerStatusLabel(status: string): string {
  return SCRAP_CUSTOMER_STATUS_LABELS[status as ScrapStatus] ?? status;
}

/* ------------------------------------------------------------------ */
/* 진행 단계 마일스톤 (고객 화면)                                        */
/* ------------------------------------------------------------------ */

export const SCRAP_MILESTONES: { statuses: ScrapStatus[]; label: string }[] = [
  {
    statuses: ["SCRAP_REQUESTED", "SCRAP_ASSIGNED", "SCRAP_SCHEDULE_REVISION_REQUIRED"],
    label: "접수/일정",
  },
  {
    statuses: ["SCRAP_INSPECTION_SCHEDULED", "SCRAP_INSPECTION_IN_PROGRESS", "SCRAP_INSPECTION_BLOCKED"],
    label: "현장검사",
  },
  {
    statuses: [
      "SCRAP_CUSTOMER_DOCUMENTS_PENDING",
      "SCRAP_CUSTOMER_DOCUMENTS_SUBMITTED",
      "SCRAP_DOCUMENTS_REVISION_REQUIRED",
    ],
    label: "고객 서류",
  },
  {
    statuses: ["SCRAP_REPORT_PREPARING", "SCRAP_REPORT_COMPLETED", "SCRAP_BILLING_PREPARING", "SCRAP_REPORT_BLOCKED"],
    label: "리포트/청구",
  },
  {
    statuses: ["SCRAP_PAYMENT_REQUESTED", "SCRAP_PAYMENT_SUBMITTED", "SCRAP_PAYMENT_REJECTED"],
    label: "입금",
  },
  {
    statuses: [
      "SCRAP_PAYMENT_CONFIRMED",
      "SCRAP_DGFT_DOCUMENT_PREPARING",
      "SCRAP_DGFT_REGISTRATION_IN_PROGRESS",
      "SCRAP_DGFT_REGISTERED",
      "SCRAP_DGFT_REGISTRATION_BLOCKED",
    ],
    label: "DGFT 등록",
  },
  { statuses: ["SCRAP_COMPLETED"], label: "완료" },
];

/* ------------------------------------------------------------------ */
/* 첨부파일 종류                                                        */
/* ------------------------------------------------------------------ */

// 고객 제출서류(step 5)는 파일 종류를 코드에 고정하지 않고 service_document_requirements 로
// 동적 관리한다. 아래 SCRAP_CUSTOMER_DOCUMENT 하나로 저장하되 각 파일은 서류 항목과 연결한다.
// 나머지(내부 리포트/청구서/세금계산서/입금증빙/DGFT 자료)는 고정 종류로 관리한다.
export const SCRAP_FILE_TYPES = [
  "SCRAP_CUSTOMER_DOCUMENT", // 고객 제출서류(동적 항목과 연결). 고객 공개.
  "SCRAP_INSPECTION_REPORT", // 내부 검사 리포트. 내부 전용.
  "SCRAP_BILLING_DOCUMENT", // 청구서. 고객 공개.
  "SCRAP_TAX_INVOICE", // 세금계산서 / 인보이스. 고객 공개.
  "SCRAP_PAYMENT_PROOF", // 고객 입금 증빙. 고객 공개(본인 업로드).
  "SCRAP_DGFT_SUBMISSION_DOCUMENT", // DGFT 제출용 내부문서. 내부 전용.
  "SCRAP_DGFT_REGISTRATION_PROOF", // DGFT 등록 증빙. 내부 전용.
  "SCRAP_DGFT_OTHER", // DGFT 기타 자료. 내부 전용.
] as const;
export type ScrapFileType = (typeof SCRAP_FILE_TYPES)[number];

export interface ScrapFileMeta {
  label: string;
  customerVisible: boolean; // 업로드 시 기본 고객 공개 여부
  uploader: "CUSTOMER" | "STAFF"; // 주 업로드 주체(권한 검증에 사용)
}

export const SCRAP_FILE_META: Record<ScrapFileType, ScrapFileMeta> = {
  SCRAP_CUSTOMER_DOCUMENT: { label: "고객 제출서류", customerVisible: true, uploader: "CUSTOMER" },
  SCRAP_INSPECTION_REPORT: { label: "검사 리포트(내부)", customerVisible: false, uploader: "STAFF" },
  SCRAP_BILLING_DOCUMENT: { label: "청구서", customerVisible: true, uploader: "STAFF" },
  SCRAP_TAX_INVOICE: { label: "세금계산서 / 인보이스", customerVisible: true, uploader: "STAFF" },
  SCRAP_PAYMENT_PROOF: { label: "입금 증빙", customerVisible: true, uploader: "CUSTOMER" },
  SCRAP_DGFT_SUBMISSION_DOCUMENT: { label: "DGFT 제출문서(내부)", customerVisible: false, uploader: "STAFF" },
  SCRAP_DGFT_REGISTRATION_PROOF: { label: "DGFT 등록 증빙(내부)", customerVisible: false, uploader: "STAFF" },
  SCRAP_DGFT_OTHER: { label: "DGFT 기타 자료(내부)", customerVisible: false, uploader: "STAFF" },
};

export function isScrapFileType(v: unknown): v is ScrapFileType {
  return typeof v === "string" && (SCRAP_FILE_TYPES as readonly string[]).includes(v);
}
export function scrapFileTypeLabel(t: string): string {
  return SCRAP_FILE_META[t as ScrapFileType]?.label ?? t;
}

/* ------------------------------------------------------------------ */
/* 결제(고객 청구 입금)                                                 */
/* ------------------------------------------------------------------ */

// payments.payment_type 에 저장. TRCU 선금/잔금(DEPOSIT/BALANCE), 제품검사 외부정산과 구분.
export const SCRAP_PAYMENT_TYPE = "SCRAP_INSPECTION_PAYMENT" as const;

// 청구 통화 기본 선택지(자유 입력도 허용). 전 서비스 공통 목록을 공유한다.
export { BILLING_CURRENCIES as SCRAP_CURRENCIES } from "@/src/lib/billingCurrencies";

/* ------------------------------------------------------------------ */
/* 이력(actions)                                                        */
/* ------------------------------------------------------------------ */

export const SCRAP_HISTORY_ACTIONS = [
  "SCRAP_ASSIGN_STAFF",
  "SCRAP_REASSIGN_STAFF",
  "SCRAP_CONFIRM_SCHEDULE",
  "SCRAP_REQUEST_SCHEDULE_REVISION",
  "SCRAP_RESUBMIT_SCHEDULE",
  "SCRAP_START_INSPECTION",
  "SCRAP_BLOCK_INSPECTION",
  "SCRAP_RESUME_INSPECTION",
  "SCRAP_COMPLETE_INSPECTION",
  "SCRAP_SUBMIT_DOCUMENTS",
  "SCRAP_REQUEST_DOCUMENT_REVISION",
  "SCRAP_RESUBMIT_DOCUMENTS",
  "SCRAP_APPROVE_DOCUMENTS",
  "SCRAP_COMPLETE_REPORT",
  "SCRAP_BLOCK_REPORT",
  "SCRAP_RESUME_REPORT",
  "SCRAP_ISSUE_BILLING",
  "SCRAP_SUBMIT_PAYMENT",
  "SCRAP_CONFIRM_PAYMENT",
  "SCRAP_REJECT_PAYMENT",
  "SCRAP_RESUBMIT_PAYMENT",
  "SCRAP_START_DGFT_DOCUMENT",
  "SCRAP_START_DGFT_REGISTRATION",
  "SCRAP_BLOCK_DGFT",
  "SCRAP_RESUME_DGFT",
  "SCRAP_COMPLETE_DGFT",
  "SCRAP_UPLOAD_FILE",
] as const;
export type ScrapHistoryAction = (typeof SCRAP_HISTORY_ACTIONS)[number];

/* ------------------------------------------------------------------ */
/* 상세 테이블 엔티티 타입 (dateStrings: DATE/DATETIME/TIME 은 string)     */
/* ------------------------------------------------------------------ */

export interface ScrapInspection {
  id: number;
  service_request_id: number;
  requested_start_date: string | null;
  requested_end_date: string | null;
  requested_start_time: string | null;
  requested_end_time: string | null;
  requested_location: string | null;
  requested_location_detail: string | null;
  confirmed_start_date: string | null;
  confirmed_end_date: string | null;
  confirmed_start_time: string | null;
  confirmed_end_time: string | null;
  confirmed_location: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  site_contact_name: string | null;
  site_contact_phone: string | null;
  schedule_confirmed_at: string | null;
  schedule_confirmed_by: number | null;
  inspection_started_at: string | null;
  inspection_started_by: number | null;
  inspection_completed_at: string | null;
  inspection_completed_by: number | null;
  customer_documents_submitted_at: string | null;
  customer_documents_confirmed_at: string | null;
  customer_documents_confirmed_by: number | null;
  customer_visible_memo: string | null;
  internal_memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScrapDgftRegistration {
  id: number;
  service_request_id: number;
  document_prepared_at: string | null;
  registration_submitted_at: string | null;
  registration_confirmed_at: string | null;
  registration_number: string | null;
  external_reference_number: string | null;
  registered_by: number | null;
  registration_status: string;
  customer_visible_memo: string | null;
  internal_memo: string | null;
  created_at: string;
  updated_at: string;
}

// 동적 제출서류 항목(service_document_requirements). 여러 서비스가 공유하는 공통 구조.
export interface ServiceDocumentRequirement {
  id: number;
  service_type: string;
  workflow_step: number;
  document_code: string;
  display_name: string;
  description: string | null;
  is_required: boolean;
  allows_multiple: boolean;
  allowed_extensions: string | null;
  max_file_size: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
