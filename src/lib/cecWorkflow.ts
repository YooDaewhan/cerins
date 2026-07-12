// CEC India 워크플로 상태 전이 규칙(순수 함수). DB 의존성이 없어 단위 테스트가 쉽다.
// 실제 전이 실행(트랜잭션/이력/파일/메일)은 cecWorkflowService.ts 가 담당하며,
// 이 파일은 "이 행동이 현재 상태·역할에서 허용되는가"만 판단한다.
// 반드시 step + status 로 판단한다(step 만으로 판단 금지).
//
// 일부 전이는 목적지가 저장된 예외 상태(block_type / reject_type)에 따라 달라진다.
//   - CEC_RESUME_CERTIFICATION: step 8 → resume_step(7 또는 9)
//   - CEC_SUBMIT_BALANCE:       step 10(reject_type=BALANCE_REJECTED) → 11
//   - CEC_REWORK_FINAL_DRAFT:   step 10(reject_type=FINAL_DRAFT_REJECTED) → 9
// 이런 전이는 to=null 로 두고 서비스 계층에서 이력 metadata 를 읽어 목적지를 확정한다.

import { CEC_STATUS, type CecStatus } from "@/src/lib/cecTypes";
import { type WorkflowRole } from "@/src/lib/serviceWorkflow";

export const CEC_ACTIONS = [
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
] as const;
export type CecAction = (typeof CEC_ACTIONS)[number];

export interface CecTransitionRule {
  from: CecStatus[]; // 허용되는 시작 상태(들)
  to: CecStatus | null; // null = 목적지가 동적(서비스에서 확정)
  roles: WorkflowRole[]; // STAFF = 배정된 담당자(서비스에서 검증)
}

const S = CEC_STATUS;

export const CEC_TRANSITIONS: Record<CecAction, CecTransitionRule> = {
  CEC_ASSIGN_STAFF: { from: [S.REQUESTED], to: S.ASSIGNED, roles: ["ADMIN"] },
  CEC_REJECT_DOCUMENTS: { from: [S.ASSIGNED], to: S.DOCUMENT_REJECTED, roles: ["STAFF", "ADMIN"] },
  CEC_RESUBMIT_DOCUMENTS: { from: [S.DOCUMENT_REJECTED], to: S.ASSIGNED, roles: ["CUSTOMER"] },
  CEC_ACCEPT_REQUEST: { from: [S.ASSIGNED], to: S.DEPOSIT_REQUESTED, roles: ["STAFF", "ADMIN"] },

  // 선금: 최초 제출과 확인불가 후 재제출을 한 액션으로 처리(from 배열).
  CEC_SUBMIT_DEPOSIT: { from: [S.DEPOSIT_REQUESTED, S.DEPOSIT_REJECTED], to: S.DEPOSIT_SUBMITTED, roles: ["CUSTOMER"] },
  CEC_CONFIRM_DEPOSIT: { from: [S.DEPOSIT_SUBMITTED], to: S.DEPOSIT_CONFIRMED, roles: ["STAFF", "ADMIN"] },
  CEC_REJECT_DEPOSIT: { from: [S.DEPOSIT_SUBMITTED], to: S.DEPOSIT_REJECTED, roles: ["STAFF", "ADMIN"] },

  CEC_SCHEDULE_INSPECTION: { from: [S.DEPOSIT_CONFIRMED], to: S.INSPECTION_SCHEDULED, roles: ["STAFF", "ADMIN"] },
  CEC_START_INSPECTION: { from: [S.INSPECTION_SCHEDULED], to: S.INSPECTION_IN_PROGRESS, roles: ["STAFF", "ADMIN"] },
  CEC_BLOCK_INSPECTION: { from: [S.INSPECTION_IN_PROGRESS], to: S.INSPECTION_BLOCKED, roles: ["STAFF", "ADMIN"] },
  CEC_RESUME_INSPECTION: { from: [S.INSPECTION_BLOCKED], to: S.INSPECTION_IN_PROGRESS, roles: ["STAFF", "ADMIN"] },
  CEC_COMPLETE_VALUATION: { from: [S.INSPECTION_IN_PROGRESS], to: S.VALUATION_REVIEW, roles: ["STAFF", "ADMIN"] },

  CEC_APPROVE_VALUATION: { from: [S.VALUATION_REVIEW], to: S.CERTIFICATE_DRAFT, roles: ["CUSTOMER"] },
  CEC_REJECT_VALUATION: { from: [S.VALUATION_REVIEW], to: S.VALUATION_REJECTED, roles: ["CUSTOMER"] },
  CEC_RESUBMIT_VALUATION: { from: [S.VALUATION_REJECTED], to: S.VALUATION_REVIEW, roles: ["STAFF", "ADMIN"] },

  // 인증서 초안 업로드: CERTIFICATE_DRAFT 유지(상태 변화 없음). blocked 에서의 복귀는 CEC_RESUME_CERTIFICATION 이 담당.
  CEC_UPLOAD_CERTIFICATE_DRAFT: { from: [S.CERTIFICATE_DRAFT], to: S.CERTIFICATE_DRAFT, roles: ["STAFF", "ADMIN"] },
  CEC_APPROVE_DRAFT_SUBMIT_SHIPPING: { from: [S.CERTIFICATE_DRAFT], to: S.FINAL_DRAFT_PREPARATION, roles: ["CUSTOMER"] },
  CEC_REJECT_CERTIFICATE_DRAFT: { from: [S.CERTIFICATE_DRAFT], to: S.CERTIFICATION_BLOCKED, roles: ["CUSTOMER"] },

  CEC_PREPARE_FINAL_DRAFT: { from: [S.FINAL_DRAFT_PREPARATION], to: S.BALANCE_REQUESTED, roles: ["STAFF", "ADMIN"] },
  CEC_BLOCK_CERTIFICATE_ISSUANCE: { from: [S.FINAL_DRAFT_PREPARATION], to: S.CERTIFICATION_BLOCKED, roles: ["STAFF", "ADMIN"] },
  // 목적지는 저장된 block 의 resume_step(7 또는 9)에 따라 서비스에서 확정.
  CEC_RESUME_CERTIFICATION: { from: [S.CERTIFICATION_BLOCKED], to: null, roles: ["STAFF", "ADMIN"] },

  // 잔금: 최초 제출과 확인불가 후 재제출(reject_type=BALANCE_REJECTED)을 한 액션으로 처리.
  CEC_SUBMIT_BALANCE: { from: [S.BALANCE_REQUESTED, S.FINAL_OR_PAYMENT_REJECTED], to: S.BALANCE_SUBMITTED, roles: ["CUSTOMER"] },
  CEC_REJECT_FINAL_DRAFT: { from: [S.BALANCE_REQUESTED], to: S.FINAL_OR_PAYMENT_REJECTED, roles: ["CUSTOMER"] },
  // reject_type=FINAL_DRAFT_REJECTED 인 경우에만 서비스에서 허용, → step 9.
  CEC_REWORK_FINAL_DRAFT: { from: [S.FINAL_OR_PAYMENT_REJECTED], to: S.FINAL_DRAFT_PREPARATION, roles: ["STAFF", "ADMIN"] },
  CEC_CONFIRM_BALANCE: { from: [S.BALANCE_SUBMITTED], to: S.BALANCE_CONFIRMED, roles: ["STAFF", "ADMIN"] },
  CEC_REJECT_BALANCE: { from: [S.BALANCE_SUBMITTED], to: S.FINAL_OR_PAYMENT_REJECTED, roles: ["STAFF", "ADMIN"] },

  CEC_COMPLETE_CERTIFICATION: { from: [S.BALANCE_CONFIRMED], to: S.COMPLETED, roles: ["STAFF", "ADMIN"] },
};

export function getCecTransition(action: CecAction): CecTransitionRule {
  return CEC_TRANSITIONS[action];
}

export function isCecAction(v: unknown): v is CecAction {
  return typeof v === "string" && (CEC_ACTIONS as readonly string[]).includes(v);
}

// 현재 상태·역할에서 해당 행동이 허용되는지(1차 판단). 목적지가 동적이거나 예외 상태에
// 세부 조건(reject_type 등)이 있는 경우 서비스 계층에서 추가 검증한다.
export function canCecTransition(action: CecAction, currentStatus: string, role: WorkflowRole): boolean {
  const rule = CEC_TRANSITIONS[action];
  if (!rule) return false;
  if (!rule.from.includes(currentStatus as CecStatus)) return false;
  if (!rule.roles.includes(role)) return false;
  return true;
}

// 특정 상태에서 특정 역할이 취할 수 있는 행동 목록(버튼 노출 판단 등에 사용).
export function availableCecActions(currentStatus: string, role: WorkflowRole): CecAction[] {
  return (CEC_ACTIONS as readonly CecAction[]).filter((a) => canCecTransition(a, currentStatus, role));
}
