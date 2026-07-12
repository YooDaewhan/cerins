// 스크랩 India 워크플로 상태 전이 규칙(순수 함수). DB 의존성이 없어 단위 테스트가 쉽다.
// 실제 전이 실행(트랜잭션/이력/파일/메일)은 scrapIndiaWorkflowService.ts 가 담당하며,
// 이 파일은 "이 행동이 현재 상태·역할에서 허용되는가"만 판단한다.
// 반드시 step + status 로 판단한다(step 만으로 판단 금지).
//
// 일부 전이는 목적지가 저장된 예외 상태(resume_status)에 따라 달라지므로 to=null 로 두고
// 서비스 계층에서 이력 metadata 를 읽어 목적지를 확정한다.
//   - SCRAP_RESUME_INSPECTION: step 4 → 이전 상태(SCHEDULED 또는 IN_PROGRESS)
//   - SCRAP_RESUME_REPORT:     step 8 → 이전 상태(REPORT_PREPARING 또는 REPORT_COMPLETED)
//   - SCRAP_RESUME_DGFT:       step 12 → 이전 상태(DGFT_DOCUMENT_PREPARING 또는 DGFT_REGISTRATION_IN_PROGRESS)

import { SCRAP_STATUS, type ScrapStatus } from "@/src/lib/scrapIndiaTypes";
import { type WorkflowRole } from "@/src/lib/serviceWorkflow";

export const SCRAP_ACTIONS = [
  // Step 0→1
  "SCRAP_ASSIGN_STAFF",
  // Step 1→3 / 1→2 / 2→1
  "SCRAP_CONFIRM_SCHEDULE",
  "SCRAP_REQUEST_SCHEDULE_REVISION",
  "SCRAP_RESUBMIT_SCHEDULE",
  // Step 3 / 3→4 / 4→3 / 3→5
  "SCRAP_START_INSPECTION",
  "SCRAP_BLOCK_INSPECTION",
  "SCRAP_RESUME_INSPECTION",
  "SCRAP_COMPLETE_INSPECTION",
  // Step 5 / 5→6 / 6→5 / 5→7
  "SCRAP_SUBMIT_DOCUMENTS",
  "SCRAP_REQUEST_DOCUMENT_REVISION",
  "SCRAP_RESUBMIT_DOCUMENTS",
  "SCRAP_APPROVE_DOCUMENTS",
  // Step 7 / 7→8 / 8→7 / 7→9
  "SCRAP_COMPLETE_REPORT",
  "SCRAP_BLOCK_REPORT",
  "SCRAP_RESUME_REPORT",
  "SCRAP_ISSUE_BILLING",
  // Step 9 / 9→11 / 9→10 / 10→9
  "SCRAP_SUBMIT_PAYMENT",
  "SCRAP_CONFIRM_PAYMENT",
  "SCRAP_REJECT_PAYMENT",
  "SCRAP_RESUBMIT_PAYMENT",
  // Step 11 / 11→12 / 12→11 / 11→13
  "SCRAP_START_DGFT_DOCUMENT",
  "SCRAP_START_DGFT_REGISTRATION",
  "SCRAP_BLOCK_DGFT",
  "SCRAP_RESUME_DGFT",
  "SCRAP_COMPLETE_DGFT",
] as const;
export type ScrapAction = (typeof SCRAP_ACTIONS)[number];

export interface ScrapTransitionRule {
  from: ScrapStatus[]; // 허용되는 시작 상태(들)
  to: ScrapStatus | null; // null = 목적지가 동적(서비스에서 확정)
  roles: WorkflowRole[]; // STAFF = 배정된 담당자(서비스에서 검증)
}

const S = SCRAP_STATUS;

export const SCRAP_TRANSITIONS: Record<ScrapAction, ScrapTransitionRule> = {
  // Step 1: 담당자 지정(접수번호 발급). 관리자 전용.
  SCRAP_ASSIGN_STAFF: { from: [S.REQUESTED], to: S.ASSIGNED, roles: ["ADMIN"] },

  // Step 1→3 / 1→2 / 2→1: 일정 검토.
  SCRAP_CONFIRM_SCHEDULE: { from: [S.ASSIGNED], to: S.INSPECTION_SCHEDULED, roles: ["STAFF", "ADMIN"] },
  SCRAP_REQUEST_SCHEDULE_REVISION: {
    from: [S.ASSIGNED],
    to: S.SCHEDULE_REVISION_REQUIRED,
    roles: ["STAFF", "ADMIN"],
  },
  SCRAP_RESUBMIT_SCHEDULE: { from: [S.SCHEDULE_REVISION_REQUIRED], to: S.ASSIGNED, roles: ["CUSTOMER"] },

  // Step 3: 검사 시작 / 진행 불가 / 재개 / 완료.
  SCRAP_START_INSPECTION: {
    from: [S.INSPECTION_SCHEDULED],
    to: S.INSPECTION_IN_PROGRESS,
    roles: ["STAFF", "ADMIN"],
  },
  SCRAP_BLOCK_INSPECTION: {
    from: [S.INSPECTION_SCHEDULED, S.INSPECTION_IN_PROGRESS],
    to: S.INSPECTION_BLOCKED,
    roles: ["STAFF", "ADMIN"],
  },
  SCRAP_RESUME_INSPECTION: { from: [S.INSPECTION_BLOCKED], to: null, roles: ["STAFF", "ADMIN"] },
  SCRAP_COMPLETE_INSPECTION: {
    from: [S.INSPECTION_SCHEDULED, S.INSPECTION_IN_PROGRESS],
    to: S.CUSTOMER_DOCUMENTS_PENDING,
    roles: ["STAFF", "ADMIN"],
  },

  // Step 5→5 / 5→6 / 6→5 / 5→7: 고객 서류.
  SCRAP_SUBMIT_DOCUMENTS: {
    from: [S.CUSTOMER_DOCUMENTS_PENDING],
    to: S.CUSTOMER_DOCUMENTS_SUBMITTED,
    roles: ["CUSTOMER"],
  },
  SCRAP_REQUEST_DOCUMENT_REVISION: {
    from: [S.CUSTOMER_DOCUMENTS_SUBMITTED],
    to: S.DOCUMENTS_REVISION_REQUIRED,
    roles: ["STAFF", "ADMIN"],
  },
  SCRAP_RESUBMIT_DOCUMENTS: {
    from: [S.DOCUMENTS_REVISION_REQUIRED],
    to: S.CUSTOMER_DOCUMENTS_SUBMITTED,
    roles: ["CUSTOMER"],
  },
  SCRAP_APPROVE_DOCUMENTS: {
    from: [S.CUSTOMER_DOCUMENTS_SUBMITTED],
    to: S.REPORT_PREPARING,
    roles: ["STAFF", "ADMIN"],
  },

  // Step 7→7 / 7→8 / 8→7 / 7→9: 내부 리포트 + 청구.
  SCRAP_COMPLETE_REPORT: { from: [S.REPORT_PREPARING], to: S.REPORT_COMPLETED, roles: ["STAFF", "ADMIN"] },
  SCRAP_BLOCK_REPORT: {
    from: [S.REPORT_PREPARING, S.REPORT_COMPLETED],
    to: S.REPORT_BLOCKED,
    roles: ["STAFF", "ADMIN"],
  },
  SCRAP_RESUME_REPORT: { from: [S.REPORT_BLOCKED], to: null, roles: ["STAFF", "ADMIN"] },
  SCRAP_ISSUE_BILLING: { from: [S.REPORT_COMPLETED], to: S.PAYMENT_REQUESTED, roles: ["STAFF", "ADMIN"] },

  // Step 9→9 / 9→11 / 9→10 / 10→9: 고객 입금.
  SCRAP_SUBMIT_PAYMENT: { from: [S.PAYMENT_REQUESTED], to: S.PAYMENT_SUBMITTED, roles: ["CUSTOMER"] },
  SCRAP_CONFIRM_PAYMENT: { from: [S.PAYMENT_SUBMITTED], to: S.PAYMENT_CONFIRMED, roles: ["STAFF", "ADMIN"] },
  SCRAP_REJECT_PAYMENT: { from: [S.PAYMENT_SUBMITTED], to: S.PAYMENT_REJECTED, roles: ["STAFF", "ADMIN"] },
  SCRAP_RESUBMIT_PAYMENT: { from: [S.PAYMENT_REJECTED], to: S.PAYMENT_SUBMITTED, roles: ["CUSTOMER"] },

  // Step 11→11 / 11→12 / 12→11 / 11→13: DGFT 등록.
  SCRAP_START_DGFT_DOCUMENT: {
    from: [S.PAYMENT_CONFIRMED],
    to: S.DGFT_DOCUMENT_PREPARING,
    roles: ["STAFF", "ADMIN"],
  },
  SCRAP_START_DGFT_REGISTRATION: {
    from: [S.DGFT_DOCUMENT_PREPARING],
    to: S.DGFT_REGISTRATION_IN_PROGRESS,
    roles: ["STAFF", "ADMIN"],
  },
  SCRAP_BLOCK_DGFT: {
    from: [S.DGFT_DOCUMENT_PREPARING, S.DGFT_REGISTRATION_IN_PROGRESS],
    to: S.DGFT_REGISTRATION_BLOCKED,
    roles: ["STAFF", "ADMIN"],
  },
  SCRAP_RESUME_DGFT: { from: [S.DGFT_REGISTRATION_BLOCKED], to: null, roles: ["STAFF", "ADMIN"] },
  SCRAP_COMPLETE_DGFT: {
    from: [S.DGFT_REGISTRATION_IN_PROGRESS],
    to: S.COMPLETED,
    roles: ["STAFF", "ADMIN"],
  },
};

export function getScrapTransition(action: ScrapAction): ScrapTransitionRule {
  return SCRAP_TRANSITIONS[action];
}

export function isScrapAction(v: unknown): v is ScrapAction {
  return typeof v === "string" && (SCRAP_ACTIONS as readonly string[]).includes(v);
}

// 현재 상태·역할에서 해당 행동이 허용되는지(1차 판단). 목적지가 동적이거나 필수 입력/파일
// 조건이 있는 경우 서비스 계층에서 추가 검증한다.
export function canScrapTransition(
  action: ScrapAction,
  currentStatus: string,
  role: WorkflowRole,
): boolean {
  const rule = SCRAP_TRANSITIONS[action];
  if (!rule) return false;
  if (!rule.from.includes(currentStatus as ScrapStatus)) return false;
  if (!rule.roles.includes(role)) return false;
  return true;
}

// 특정 상태에서 특정 역할이 취할 수 있는 행동 목록(버튼 노출 판단 등에 사용).
export function availableScrapActions(currentStatus: string, role: WorkflowRole): ScrapAction[] {
  return (SCRAP_ACTIONS as readonly ScrapAction[]).filter((a) =>
    canScrapTransition(a, currentStatus, role),
  );
}
