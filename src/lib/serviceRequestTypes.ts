// 고객 의뢰 / 업무 프로세스 시스템의 상수·enum·라벨·타입 정의.
// 곳곳에서 숫자 step 을 직접 비교하지 말고 이 파일의 상수를 사용한다.
// 상태 전이 규칙은 serviceWorkflow.ts, 데이터 접근은 serviceRequestRepo.ts,
// 오케스트레이션은 requestWorkflowService.ts 참고.
// (CEC India 전용 상수/라벨은 cecTypes.ts. 공용 라벨 함수는 CEC 상태를 위임 처리한다.)

import { isCecStatus, cecStatusLabel, cecCustomerStatusLabel } from "@/src/lib/cecTypes";
import { isPiStatus, piStatusLabel, piCustomerStatusLabel } from "@/src/lib/productInspectionTypes";
import { isScrapStatus, scrapStatusLabel, scrapCustomerStatusLabel } from "@/src/lib/scrapIndiaTypes";

/* ------------------------------------------------------------------ */
/* 서비스 분류                                                          */
/* ------------------------------------------------------------------ */

// 대분류. 새 분류 추가 시 여기 + CATEGORY_LABELS + SERVICE_TYPES 만 수정.
export const CATEGORIES = ["CERTIFICATION", "INSPECTION", "CONSULTING", "LOGISTICS"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  CERTIFICATION: "인증",
  INSPECTION: "검사",
  CONSULTING: "컨설팅",
  LOGISTICS: "물류",
};

// 세부 서비스 종류.
export const SERVICE_TYPES = [
  "TRCU_GOST",
  "CEC_INDIA",
  "PRODUCT_INSPECTION",
  "SCRAP_INDIA",
] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  TRCU_GOST: "TRCU / GOST",
  CEC_INDIA: "CEC India",
  PRODUCT_INSPECTION: "제품검사",
  SCRAP_INDIA: "Scrap India",
};

// 어떤 대분류에 어떤 서비스가 속하는지.
export const CATEGORY_SERVICES: Record<Category, ServiceType[]> = {
  CERTIFICATION: ["TRCU_GOST", "CEC_INDIA"],
  INSPECTION: ["PRODUCT_INSPECTION", "SCRAP_INDIA"],
  // 세부 서비스 미정 → /requests 에서 "준비 중" 으로만 노출(클릭 불가).
  CONSULTING: [],
  LOGISTICS: [],
};

// URL 슬러그(소문자, 하이픈) ↔ ServiceType 매핑. 라우팅에 사용.
export const SERVICE_TYPE_SLUGS: Record<ServiceType, string> = {
  TRCU_GOST: "trcu-gost",
  CEC_INDIA: "cec-india",
  PRODUCT_INSPECTION: "product-inspection",
  SCRAP_INDIA: "scrap-india",
};

export const CATEGORY_SLUGS: Record<Category, string> = {
  CERTIFICATION: "certification",
  INSPECTION: "inspection",
  CONSULTING: "consulting",
  LOGISTICS: "logistics",
};

// 이번 범위에서 프로세스가 완전히 구현된 서비스. 나머지는 "준비 중" 처리.
export const IMPLEMENTED_SERVICE_TYPES: ServiceType[] = [
  "TRCU_GOST",
  "CEC_INDIA",
  "PRODUCT_INSPECTION",
  "SCRAP_INDIA",
];

export function isServiceType(v: unknown): v is ServiceType {
  return typeof v === "string" && (SERVICE_TYPES as readonly string[]).includes(v);
}
export function isCategory(v: unknown): v is Category {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}
export function serviceTypeFromSlug(slug: string): ServiceType | null {
  const entry = (Object.entries(SERVICE_TYPE_SLUGS) as [ServiceType, string][]).find(
    ([, s]) => s === slug,
  );
  return entry ? entry[0] : null;
}
export function categoryOfService(service: ServiceType): Category {
  return (Object.keys(CATEGORY_SERVICES) as Category[]).find((c) =>
    CATEGORY_SERVICES[c].includes(service),
  )!;
}

/* ------------------------------------------------------------------ */
/* 워크플로 상태 / step                                                 */
/* ------------------------------------------------------------------ */

// 상태 코드가 워크플로의 1차 키다. 각 상태는 고정된 step 번호를 가진다.
// 명세대로 step 10 은 사용하지 않으며, step 11 은 두 상태(최종서류 대기/완료)를 공유한다.
export const STATUS = {
  REQUESTED: "REQUESTED",
  ASSIGNED: "ASSIGNED",
  REQUEST_REJECTED: "REQUEST_REJECTED",
  QUOTATION: "QUOTATION",
  DEPOSIT_REQUESTED: "DEPOSIT_REQUESTED",
  DEPOSIT_SUBMITTED: "DEPOSIT_SUBMITTED",
  DEPOSIT_REJECTED: "DEPOSIT_REJECTED",
  CERTIFICATION_IN_PROGRESS: "CERTIFICATION_IN_PROGRESS",
  CERTIFICATION_BLOCKED: "CERTIFICATION_BLOCKED",
  BALANCE_REQUESTED: "BALANCE_REQUESTED",
  BALANCE_SUBMITTED: "BALANCE_SUBMITTED",
  FINAL_DOCUMENT_PENDING: "FINAL_DOCUMENT_PENDING",
  COMPLETED: "COMPLETED",
} as const;

export type RequestStatus = (typeof STATUS)[keyof typeof STATUS];

// 상태 → step 번호. (10 = 잔금 확인 중, 11 은 두 상태가 공유)
export const STATUS_STEP: Record<RequestStatus, number> = {
  REQUESTED: 0,
  ASSIGNED: 1,
  REQUEST_REJECTED: 2,
  QUOTATION: 3,
  DEPOSIT_REQUESTED: 4,
  DEPOSIT_SUBMITTED: 5,
  DEPOSIT_REJECTED: 6,
  CERTIFICATION_IN_PROGRESS: 7,
  CERTIFICATION_BLOCKED: 8,
  BALANCE_REQUESTED: 9,
  BALANCE_SUBMITTED: 10,
  FINAL_DOCUMENT_PENDING: 11,
  COMPLETED: 11,
};

// 관리자/직원용 상태 라벨(한글). 목록에서 숫자만 노출하지 않는다.
export const STATUS_LABELS: Record<RequestStatus, string> = {
  REQUESTED: "의뢰 접수",
  ASSIGNED: "담당자 배정",
  REQUEST_REJECTED: "서류 보완 요청",
  QUOTATION: "견적 작성",
  DEPOSIT_REQUESTED: "선금 입금 대기",
  DEPOSIT_SUBMITTED: "선금 확인 중",
  DEPOSIT_REJECTED: "선금 확인 불가",
  CERTIFICATION_IN_PROGRESS: "인증 진행 중",
  CERTIFICATION_BLOCKED: "인증 보완 필요",
  BALANCE_REQUESTED: "인증 완료 / 잔금 대기",
  BALANCE_SUBMITTED: "잔금 확인 중",
  FINAL_DOCUMENT_PENDING: "최종 인증서 등록 대기",
  COMPLETED: "최종 완료",
};

// 고객에게 노출하는 상태 라벨. 내부 뉘앙스를 순화한다.
export const CUSTOMER_STATUS_LABELS: Record<RequestStatus, string> = {
  REQUESTED: "접수 완료 (검토 대기)",
  ASSIGNED: "담당자 검토 중",
  REQUEST_REJECTED: "서류 보완 요청",
  QUOTATION: "견적 준비 중",
  DEPOSIT_REQUESTED: "견적 완료 / 선금 입금 요청",
  DEPOSIT_SUBMITTED: "선금 입금 확인 중",
  DEPOSIT_REJECTED: "선금 확인 불가 (재확인 필요)",
  CERTIFICATION_IN_PROGRESS: "인증 업무 진행 중",
  CERTIFICATION_BLOCKED: "인증 보완 필요",
  BALANCE_REQUESTED: "인증 완료 / 잔금 입금 요청",
  BALANCE_SUBMITTED: "잔금 입금 확인 중",
  FINAL_DOCUMENT_PENDING: "최종 인증서 발행 대기",
  COMPLETED: "최종 완료",
};

export function statusLabel(status: string): string {
  if (status in STATUS_LABELS) return STATUS_LABELS[status as RequestStatus];
  // CEC / 제품검사 / 스크랩 India 상태는 별도 라벨 맵을 사용(목록 등 공용 화면에서 올바르게 표시).
  if (isCecStatus(status)) return cecStatusLabel(status);
  if (isPiStatus(status)) return piStatusLabel(status);
  if (isScrapStatus(status)) return scrapStatusLabel(status);
  return status;
}
export function customerStatusLabel(status: string): string {
  if (status in CUSTOMER_STATUS_LABELS) return CUSTOMER_STATUS_LABELS[status as RequestStatus];
  if (isCecStatus(status)) return cecCustomerStatusLabel(status);
  if (isPiStatus(status)) return piCustomerStatusLabel(status);
  if (isScrapStatus(status)) return scrapCustomerStatusLabel(status);
  return status;
}
export function stepForStatus(status: RequestStatus): number {
  return STATUS_STEP[status];
}

/* ------------------------------------------------------------------ */
/* 첨부파일 종류                                                        */
/* ------------------------------------------------------------------ */

// Step 0 의뢰서 첨부파일. required=true 이면 최소 1개 제출 필수.
export const REQUEST_FILE_TYPES = [
  "MANUAL",
  "DRAWING",
  "EXISTING_CERTIFICATE",
  "OTHER",
] as const;
export type RequestFileType = (typeof REQUEST_FILE_TYPES)[number];

export const REQUEST_FILE_META: Record<
  RequestFileType,
  { label: string; required: boolean }
> = {
  MANUAL: { label: "매뉴얼", required: false },
  DRAWING: { label: "도면 또는 사진", required: false },
  EXISTING_CERTIFICATE: { label: "기 발급 인증서 (ex: CE, KC 등)", required: false },
  OTHER: { label: "기타", required: false },
};

// 더 이상 접수받지 않지만 과거 의뢰에 남아 있는 파일 종류(라벨 표시·조회용).
const LEGACY_REQUEST_FILE_LABELS: Record<string, string> = {
  TEST_REPORT: "테스트 리포트",
  AUTHORIZATION: "권한위임계약서",
  JOS: "JOS",
};

// Step 0 제출 시 반드시 있어야 하는 파일 종류.
export const REQUIRED_REQUEST_FILE_TYPES: RequestFileType[] = (
  REQUEST_FILE_TYPES as readonly RequestFileType[]
).filter((t) => REQUEST_FILE_META[t].required);

// Step 3 견적 단계 자료.
export const QUOTATION_FILE_TYPES = [
  "PASSPORT",
  "STRENGTH_CALCULATION",
  "CERTIFICATE_DRAFT",
  "QUOTATION_OTHER",
] as const;
export type QuotationFileType = (typeof QUOTATION_FILE_TYPES)[number];

export const QUOTATION_FILE_LABELS: Record<QuotationFileType, string> = {
  PASSPORT: "패스포트",
  STRENGTH_CALCULATION: "강도계산서",
  CERTIFICATE_DRAFT: "인증서",
  QUOTATION_OTHER: "기타 견적 관련 자료",
};

// 최종 인증서.
export const FINAL_FILE_TYPE = "FINAL_CERTIFICATE" as const;

// 전체 file_type 유니온. request_files.file_type 컬럼에 저장.
export type FileType =
  | RequestFileType
  | QuotationFileType
  | typeof FINAL_FILE_TYPE
  | "CUSTOMER_SUPPLEMENT" // 보완 단계에서 고객이 올리는 추가 자료
  | "STAFF_ATTACHMENT"; // 인증 진행 중 담당자가 올리는 자료

export const ALL_FILE_TYPES: string[] = [
  ...REQUEST_FILE_TYPES,
  ...Object.keys(LEGACY_REQUEST_FILE_LABELS),
  ...QUOTATION_FILE_TYPES,
  FINAL_FILE_TYPE,
  "CUSTOMER_SUPPLEMENT",
  "STAFF_ATTACHMENT",
];

export const FILE_TYPE_LABELS: Record<string, string> = {
  ...LEGACY_REQUEST_FILE_LABELS,
  ...Object.fromEntries(
    (Object.keys(REQUEST_FILE_META) as RequestFileType[]).map((t) => [
      t,
      REQUEST_FILE_META[t].label,
    ]),
  ),
  ...QUOTATION_FILE_LABELS,
  FINAL_CERTIFICATE: "최종 인증서",
  CUSTOMER_SUPPLEMENT: "고객 보완 자료",
  STAFF_ATTACHMENT: "담당자 첨부 자료",
};

export function fileTypeLabel(t: string): string {
  return FILE_TYPE_LABELS[t] ?? t;
}

/* ------------------------------------------------------------------ */
/* 결제(payments)                                                       */
/* ------------------------------------------------------------------ */

export const PAYMENT_TYPES = ["DEPOSIT", "BALANCE"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];
export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  DEPOSIT: "선금",
  BALANCE: "잔금",
};

// payment_status 는 워크플로 status 와 별개로 관리(향후 잔금 확인 단계 확장 대비).
export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  REJECTED: "REJECTED",
  SUBMITTED: "SUBMITTED",
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "확인 대기",
  CONFIRMED: "확인 완료",
  REJECTED: "확인 불가",
  SUBMITTED: "제출됨",
};

/* ------------------------------------------------------------------ */
/* 메모 / 메시지                                                        */
/* ------------------------------------------------------------------ */

export const MESSAGE_TYPES = [
  "REJECTION",
  "PAYMENT_REJECTION",
  "CERTIFICATION_BLOCKED",
  "CUSTOMER_MEMO",
  "INTERNAL_MEMO",
  "PROGRESS_MEMO",
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  REJECTION: "반려 사유",
  PAYMENT_REJECTION: "입금 확인 불가 사유",
  CERTIFICATION_BLOCKED: "인증 보완 사유",
  CUSTOMER_MEMO: "고객 공개 메모",
  INTERNAL_MEMO: "내부 메모",
  PROGRESS_MEMO: "진행 메모",
};

// 내부 메모는 고객에게 노출하지 않는다.
export const INTERNAL_MESSAGE_TYPES: MessageType[] = ["INTERNAL_MEMO"];

/* ------------------------------------------------------------------ */
/* 이력(actions)                                                        */
/* ------------------------------------------------------------------ */

// request_status_histories.action 에 저장하는 행동 코드.
export const HISTORY_ACTIONS = [
  "SUBMIT_REQUEST",
  "ASSIGN_STAFF",
  "REASSIGN_STAFF",
  "ACCEPT_REQUEST",
  "REJECT_REQUEST",
  "RESUBMIT_REQUEST",
  "COMPLETE_QUOTATION",
  "SUBMIT_DEPOSIT",
  "CONFIRM_DEPOSIT",
  "REJECT_DEPOSIT",
  "RESUME_AFTER_DEPOSIT_REJECTION",
  "COMPLETE_CERTIFICATION",
  "BLOCK_CERTIFICATION",
  "RESUME_CERTIFICATION",
  "SUBMIT_BALANCE",
  "CONFIRM_BALANCE",
  "COMPLETE_FINAL_DOCUMENT",
  "UPLOAD_FILE",
  "ADD_MESSAGE",
] as const;
export type HistoryAction = (typeof HISTORY_ACTIONS)[number];

/* ------------------------------------------------------------------ */
/* DB 엔티티 타입 (mysql2 dateStrings: DATE/DATETIME 는 string)            */
/* ------------------------------------------------------------------ */

export interface ServiceRequest {
  id: number;
  request_number: string | null;
  customer_user_id: number | null;
  assignee_user_id: number | null;
  category: Category;
  service_type: ServiceType;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  title: string;
  // 제품 정보: TRCU/GOST 접수 시 필수, 타 서비스·과거 접수분은 null.
  product_name: string | null;
  hs_code: string | null;
  product_use: string | null;
  description: string;
  workflow_step: number;
  status: RequestStatus;
  submitted_at: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// 유저 간략 정보(담당자/고객 표시용). 고객에게도 담당자 안내로 공개된다.
export interface UserBrief {
  id: number;
  login_id: string;
  email: string;
  job_title: string | null;
  company: string | null;
}

export interface RequestFile {
  id: number;
  service_request_id: number;
  file_type: string;
  // 동적 제출서류(service_document_requirements) 연결값. 스크랩 India 고객 서류에서만 채워지며
  // 그 외 서비스/파일에서는 null. display_name_snapshot 은 제출 당시의 서류명(관리자 변경 후에도 불변).
  service_document_requirement_id: number | null;
  display_name_snapshot: string | null;
  original_name: string;
  stored_name: string;
  storage_path: string;
  mime_type: string;
  extension: string;
  file_size: number;
  uploaded_by: number | null;
  is_customer_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface RequestStatusHistory {
  id: number;
  service_request_id: number;
  actor_user_id: number | null;
  action: string;
  from_step: number | null;
  to_step: number | null;
  from_status: string | null;
  to_status: string | null;
  message: string | null;
  metadata_json: string | null;
  created_at: string;
}

export interface Quotation {
  id: number;
  service_request_id: number;
  currency: string;
  total_amount: string;
  deposit_amount: string;
  balance_amount: string;
  notes: string | null;
  created_by: number | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id: number;
  quotation_id: number;
  item_type: string | null;
  item_name: string;
  quantity: string;
  unit_price: string;
  amount: string;
  memo: string | null;
  sort_order: number;
}

export interface Payment {
  id: number;
  service_request_id: number;
  payment_type: PaymentType;
  expected_amount: string | null;
  // 제품검사 외부 인증기관 정산 입금(payment_type='EXTERNAL_AGENCY_PAYMENT') 전용 컬럼(그 외에는 null).
  currency: string | null;
  paid_amount: string | null;
  payer_organization_name: string | null;
  external_reference_number: string | null;
  received_account: string | null;
  depositor_name: string;
  sender_account: string | null;
  payment_date: string | null;
  memo: string | null;
  status: PaymentStatus;
  submitted_by: number | null;
  submitted_at: string | null;
  confirmed_by: number | null;
  confirmed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestMessage {
  id: number;
  service_request_id: number;
  author_user_id: number | null;
  message_type: MessageType;
  message: string;
  is_customer_visible: boolean;
  created_at: string;
  updated_at: string;
}
