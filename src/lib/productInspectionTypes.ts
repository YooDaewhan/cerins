// 제품검사(Product Inspection) 프로세스의 상수·enum·라벨·타입 정의.
// TRCU/GOST(serviceRequestTypes.ts) 및 CEC India(cecTypes.ts) 워크플로와 완전히 분리되어 있으며,
// 공통 테이블(service_requests, request_files, request_status_histories, payments,
// request_messages, request_number_seq)은 그대로 재사용한다.
//   category = 'INSPECTION', service_type = 'PRODUCT_INSPECTION' 인 의뢰만 이 규칙을 따른다.
//
// 중요: 숫자 step 만으로 상태를 판단하지 말고 반드시 step + status 를 함께 사용한다.
//       (step 3 은 SCHEDULED / IN_PROGRESS 두 sub-status 를 공유한다.)
//       일부 status 문자열(REQUEST_REJECTED, BLOCKED 등)은 TRCU/CEC 상태값과 이름이 겹칠 수 있으나,
//       항상 service_type 로 분기해 제품검사 전용 맵(PI_STATUS_STEP 등)으로 해석하므로 충돌하지 않는다.

/* ------------------------------------------------------------------ */
/* 워크플로 상태 / step                                                 */
/* ------------------------------------------------------------------ */

// DB의 service_requests.status 에 실제로 저장되는 제품검사 상태 문자열.
export const PI_STATUS = {
  REQUESTED: "PRODUCT_INSPECTION_REQUESTED",
  ASSIGNED: "PRODUCT_INSPECTION_ASSIGNED",
  REQUEST_REJECTED: "PRODUCT_INSPECTION_REQUEST_REJECTED",
  // step 3 (검사 일정 확정) sub-status
  SCHEDULED: "PRODUCT_INSPECTION_SCHEDULED",
  IN_PROGRESS: "PRODUCT_INSPECTION_IN_PROGRESS",
  // step 4
  BLOCKED: "PRODUCT_INSPECTION_BLOCKED",
  // step 5
  COMPLETED: "PRODUCT_INSPECTION_COMPLETED",
  // step 6
  REPORT_BLOCKED: "PRODUCT_INSPECTION_REPORT_BLOCKED",
  // step 7
  REPORT_SUBMITTED: "PRODUCT_INSPECTION_REPORT_SUBMITTED",
  // step 8
  PAYMENT_BLOCKED: "PRODUCT_INSPECTION_PAYMENT_BLOCKED",
  // step 9
  FINISHED: "PRODUCT_INSPECTION_FINISHED",
} as const;

export type PiStatus = (typeof PI_STATUS)[keyof typeof PI_STATUS];

// 상태 → step 번호. (step 3 은 SCHEDULED/IN_PROGRESS 가 공유)
export const PI_STATUS_STEP: Record<PiStatus, number> = {
  PRODUCT_INSPECTION_REQUESTED: 0,
  PRODUCT_INSPECTION_ASSIGNED: 1,
  PRODUCT_INSPECTION_REQUEST_REJECTED: 2,
  PRODUCT_INSPECTION_SCHEDULED: 3,
  PRODUCT_INSPECTION_IN_PROGRESS: 3,
  PRODUCT_INSPECTION_BLOCKED: 4,
  PRODUCT_INSPECTION_COMPLETED: 5,
  PRODUCT_INSPECTION_REPORT_BLOCKED: 6,
  PRODUCT_INSPECTION_REPORT_SUBMITTED: 7,
  PRODUCT_INSPECTION_PAYMENT_BLOCKED: 8,
  PRODUCT_INSPECTION_FINISHED: 9,
};

export function isPiStatus(v: unknown): v is PiStatus {
  return typeof v === "string" && v in PI_STATUS_STEP;
}

export function piStepForStatus(status: string): number {
  return PI_STATUS_STEP[status as PiStatus] ?? 0;
}

// 관리자/직원용 상태 라벨(한글). 목록에서 숫자만 노출하지 않는다.
export const PI_STATUS_LABELS: Record<PiStatus, string> = {
  PRODUCT_INSPECTION_REQUESTED: "제품검사 의뢰",
  PRODUCT_INSPECTION_ASSIGNED: "담당자 배정 및 검토",
  PRODUCT_INSPECTION_REQUEST_REJECTED: "고객 보완 요청",
  PRODUCT_INSPECTION_SCHEDULED: "검사 일정 확정",
  PRODUCT_INSPECTION_IN_PROGRESS: "검사 진행 중",
  PRODUCT_INSPECTION_BLOCKED: "검사 진행 보류",
  PRODUCT_INSPECTION_COMPLETED: "검사 완료 / 리포트 작성 중",
  PRODUCT_INSPECTION_REPORT_BLOCKED: "리포트 처리 보류",
  PRODUCT_INSPECTION_REPORT_SUBMITTED: "외부기관 리포트 제출 완료",
  PRODUCT_INSPECTION_PAYMENT_BLOCKED: "외부기관 정산 확인 중",
  PRODUCT_INSPECTION_FINISHED: "제품검사 최종 완료",
};

// 고객에게 노출하는 상태 라벨. 내부 정산/리포트 뉘앙스를 순화한다.
// 외부기관 정산 관련 상태(제출 완료/정산 확인 중)는 고객에게 "외부기관 처리 중" 으로 통일.
export const PI_CUSTOMER_STATUS_LABELS: Record<PiStatus, string> = {
  PRODUCT_INSPECTION_REQUESTED: "접수 완료 (검토 대기)",
  PRODUCT_INSPECTION_ASSIGNED: "담당자 검토 중",
  PRODUCT_INSPECTION_REQUEST_REJECTED: "보완 요청",
  PRODUCT_INSPECTION_SCHEDULED: "검사 예정",
  PRODUCT_INSPECTION_IN_PROGRESS: "검사 진행 중",
  PRODUCT_INSPECTION_BLOCKED: "검사 보류 (확인 필요)",
  PRODUCT_INSPECTION_COMPLETED: "검사 완료 / 리포트 작성 중",
  PRODUCT_INSPECTION_REPORT_BLOCKED: "리포트 처리 중",
  PRODUCT_INSPECTION_REPORT_SUBMITTED: "인증기관 리포트 제출 완료",
  PRODUCT_INSPECTION_PAYMENT_BLOCKED: "외부기관 처리 중",
  PRODUCT_INSPECTION_FINISHED: "제품검사 완료",
};

export function piStatusLabel(status: string): string {
  return PI_STATUS_LABELS[status as PiStatus] ?? status;
}
export function piCustomerStatusLabel(status: string): string {
  return PI_CUSTOMER_STATUS_LABELS[status as PiStatus] ?? status;
}

/* ------------------------------------------------------------------ */
/* 진행 단계 마일스톤 (고객 화면)                                        */
/* ------------------------------------------------------------------ */

export const PI_MILESTONES: { statuses: PiStatus[]; label: string }[] = [
  { statuses: ["PRODUCT_INSPECTION_REQUESTED", "PRODUCT_INSPECTION_ASSIGNED", "PRODUCT_INSPECTION_REQUEST_REJECTED"], label: "접수/검토" },
  { statuses: ["PRODUCT_INSPECTION_SCHEDULED", "PRODUCT_INSPECTION_IN_PROGRESS", "PRODUCT_INSPECTION_BLOCKED"], label: "검사 일정/진행" },
  { statuses: ["PRODUCT_INSPECTION_COMPLETED", "PRODUCT_INSPECTION_REPORT_BLOCKED"], label: "검사 완료/리포트" },
  { statuses: ["PRODUCT_INSPECTION_REPORT_SUBMITTED", "PRODUCT_INSPECTION_PAYMENT_BLOCKED"], label: "외부기관 제출" },
  { statuses: ["PRODUCT_INSPECTION_FINISHED"], label: "완료" },
];

/* ------------------------------------------------------------------ */
/* 첨부파일 종류                                                        */
/* ------------------------------------------------------------------ */

// required=true 는 의뢰서(step 0) 제출 필수. customerVisible=false 는 내부 전용.
// imageOnly=true 는 이미지 형식만 허용(제품사진).
export const PI_FILE_TYPES = [
  "PRODUCT_INSPECTION_PHOTO",
  "PRODUCT_INSPECTION_REPORT",
  "PRODUCT_INSPECTION_REPORT_ATTACHMENT",
  "PRODUCT_INSPECTION_PAYMENT_PROOF",
  "PRODUCT_INSPECTION_OTHER",
] as const;
export type PiFileType = (typeof PI_FILE_TYPES)[number];

export interface PiFileMeta {
  label: string;
  required: boolean; // 의뢰서(step 0) 제출 필수 여부
  customerVisible: boolean; // 업로드 시 기본 고객 공개 여부
  imageOnly?: boolean; // true 면 이미지 형식만 허용
}

export const PI_FILE_META: Record<PiFileType, PiFileMeta> = {
  PRODUCT_INSPECTION_PHOTO: { label: "제품사진", required: true, customerVisible: true, imageOnly: true },
  PRODUCT_INSPECTION_REPORT: { label: "검사 리포트(내부)", required: false, customerVisible: false },
  PRODUCT_INSPECTION_REPORT_ATTACHMENT: { label: "리포트 추가자료(내부)", required: false, customerVisible: false },
  PRODUCT_INSPECTION_PAYMENT_PROOF: { label: "외부기관 입금 증빙(내부)", required: false, customerVisible: false },
  PRODUCT_INSPECTION_OTHER: { label: "기타 자료(내부)", required: false, customerVisible: false },
};

// 의뢰서(step 0)에서 사용하는 첨부 종류.
export const PI_REQUEST_FILE_TYPES: PiFileType[] = ["PRODUCT_INSPECTION_PHOTO"];
// step 0 제출 시 최소 1개 필요한 종류.
export const PI_REQUIRED_REQUEST_FILE_TYPES: PiFileType[] = PI_REQUEST_FILE_TYPES.filter(
  (t) => PI_FILE_META[t].required,
);

export function isPiFileType(v: unknown): v is PiFileType {
  return typeof v === "string" && (PI_FILE_TYPES as readonly string[]).includes(v);
}
export function piFileTypeLabel(t: string): string {
  return PI_FILE_META[t as PiFileType]?.label ?? t;
}

/* ------------------------------------------------------------------ */
/* 외부 인증기관 정산 입금                                              */
/* ------------------------------------------------------------------ */

// payments.payment_type 에 저장. 고객 선금/잔금(DEPOSIT/BALANCE)과 구분.
export const PI_PAYMENT_TYPE = "EXTERNAL_AGENCY_PAYMENT" as const;

// 리포트 제출 방법.
export const PI_SUBMISSION_METHODS = ["EMAIL", "PORTAL", "OFFLINE", "OTHER"] as const;
export type PiSubmissionMethod = (typeof PI_SUBMISSION_METHODS)[number];
export const PI_SUBMISSION_METHOD_LABELS: Record<PiSubmissionMethod, string> = {
  EMAIL: "이메일",
  PORTAL: "포털",
  OFFLINE: "오프라인",
  OTHER: "기타",
};

// 정산 통화. 자유 입력도 허용하되 전 서비스 공통 목록을 기본 선택지로 제공.
export { BILLING_CURRENCIES as PI_CURRENCIES } from "@/src/lib/billingCurrencies";

/* ------------------------------------------------------------------ */
/* 이력(actions)                                                        */
/* ------------------------------------------------------------------ */

export const PI_HISTORY_ACTIONS = [
  "PI_ASSIGN_STAFF",
  "PI_REASSIGN_STAFF",
  "PI_REJECT_REQUEST",
  "PI_RESUBMIT_REQUEST",
  "PI_CONFIRM_SCHEDULE",
  "PI_UPDATE_SCHEDULE",
  "PI_START_INSPECTION",
  "PI_BLOCK_INSPECTION",
  "PI_RESUME_INSPECTION",
  "PI_COMPLETE_INSPECTION",
  "PI_SUBMIT_REPORT",
  "PI_BLOCK_REPORT",
  "PI_RESUME_REPORT",
  "PI_RECORD_PAYMENT",
  "PI_BLOCK_PAYMENT",
  "PI_RESUME_PAYMENT",
  "PI_COMPLETE",
  "PI_UPLOAD_FILE",
] as const;
export type PiHistoryAction = (typeof PI_HISTORY_ACTIONS)[number];

/* ------------------------------------------------------------------ */
/* 상세 테이블 엔티티 타입 (dateStrings: DATE/DATETIME/TIME 은 string)     */
/* ------------------------------------------------------------------ */

export interface ProductInspection {
  id: number;
  service_request_id: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
  planned_start_time: string | null;
  planned_end_time: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  inspection_location: string | null;
  schedule_confirmed_at: string | null;
  schedule_confirmed_by: number | null;
  inspection_started_at: string | null;
  inspection_started_by: number | null;
  inspection_completed_at: string | null;
  inspection_completed_by: number | null;
  report_submitted_at: string | null;
  report_submitted_by: number | null;
  external_agency_name: string | null;
  external_agency_department: string | null;
  external_agency_contact_name: string | null;
  external_agency_contact_email: string | null;
  external_agency_contact_phone: string | null;
  external_reference_number: string | null;
  report_submission_method: string | null;
  customer_visible_memo: string | null;
  internal_memo: string | null;
  created_at: string;
  updated_at: string;
}
