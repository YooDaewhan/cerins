// 제품검사 워크플로 상태 전이 규칙(순수 함수). DB 의존성이 없어 단위 테스트가 쉽다.
// 실제 전이 실행(트랜잭션/이력/파일/메일)은 productInspectionWorkflowService.ts 가 담당하며,
// 이 파일은 "이 행동이 현재 상태·역할에서 허용되는가"만 판단한다.
// 반드시 step + status 로 판단한다(step 만으로 판단 금지).
//
// 일부 전이는 목적지가 저장된 예외 상태(resume_status)에 따라 달라지므로 to=null 로 두고
// 서비스 계층에서 이력 metadata 를 읽어 목적지를 확정한다.
//   - PI_RESUME_INSPECTION: step 4 → 이전 상태(SCHEDULED 또는 IN_PROGRESS)
//   - PI_RESUME_REPORT:     step 6 → 이전 상태(COMPLETED 또는 REPORT_SUBMITTED)

import { PI_STATUS, type PiStatus } from "@/src/lib/productInspectionTypes";
import { type WorkflowRole } from "@/src/lib/serviceWorkflow";

export const PI_ACTIONS = [
  "PI_ASSIGN_STAFF",
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
] as const;
export type PiAction = (typeof PI_ACTIONS)[number];

export interface PiTransitionRule {
  from: PiStatus[]; // 허용되는 시작 상태(들)
  to: PiStatus | null; // null = 목적지가 동적(서비스에서 확정)
  roles: WorkflowRole[]; // STAFF = 배정된 담당자(서비스에서 검증)
}

const S = PI_STATUS;

export const PI_TRANSITIONS: Record<PiAction, PiTransitionRule> = {
  // Step 1: 담당자 지정(접수번호 발급). 관리자 전용.
  PI_ASSIGN_STAFF: { from: [S.REQUESTED], to: S.ASSIGNED, roles: ["ADMIN"] },

  // Step 2: 보완 요청 / 고객 재제출.
  PI_REJECT_REQUEST: { from: [S.ASSIGNED], to: S.REQUEST_REJECTED, roles: ["STAFF", "ADMIN"] },
  PI_RESUBMIT_REQUEST: { from: [S.REQUEST_REJECTED], to: S.ASSIGNED, roles: ["CUSTOMER"] },

  // Step 3: 검사 일정 확정 / 변경(상태 유지) / 검사 시작.
  PI_CONFIRM_SCHEDULE: { from: [S.ASSIGNED], to: S.SCHEDULED, roles: ["STAFF", "ADMIN"] },
  PI_UPDATE_SCHEDULE: { from: [S.SCHEDULED], to: S.SCHEDULED, roles: ["STAFF", "ADMIN"] },
  PI_START_INSPECTION: { from: [S.SCHEDULED], to: S.IN_PROGRESS, roles: ["STAFF", "ADMIN"] },

  // Step 4: 검사 진행 불가 / 재개(이전 상태로 복귀, 서비스에서 확정).
  PI_BLOCK_INSPECTION: { from: [S.SCHEDULED, S.IN_PROGRESS], to: S.BLOCKED, roles: ["STAFF", "ADMIN"] },
  PI_RESUME_INSPECTION: { from: [S.BLOCKED], to: null, roles: ["STAFF", "ADMIN"] },

  // Step 5: 검사 완료(시작 버튼을 누르지 않았어도 실제 일정 입력 시 완료 가능).
  PI_COMPLETE_INSPECTION: { from: [S.SCHEDULED, S.IN_PROGRESS], to: S.COMPLETED, roles: ["STAFF", "ADMIN"] },

  // Step 7: 다른 인증기관 리포트 제출 완료.
  PI_SUBMIT_REPORT: { from: [S.COMPLETED], to: S.REPORT_SUBMITTED, roles: ["STAFF", "ADMIN"] },

  // Step 6: 리포트 작성/제출 문제 / 해결(이전 상태로 복귀, 서비스에서 확정).
  PI_BLOCK_REPORT: { from: [S.COMPLETED, S.REPORT_SUBMITTED], to: S.REPORT_BLOCKED, roles: ["STAFF", "ADMIN"] },
  PI_RESUME_REPORT: { from: [S.REPORT_BLOCKED], to: null, roles: ["STAFF", "ADMIN"] },

  // Step 7: 외부 인증기관 입금 정보 입력(상태 유지).
  PI_RECORD_PAYMENT: { from: [S.REPORT_SUBMITTED], to: S.REPORT_SUBMITTED, roles: ["STAFF", "ADMIN"] },

  // Step 8: 외부 입금 확인 문제 / 해결.
  PI_BLOCK_PAYMENT: { from: [S.REPORT_SUBMITTED], to: S.PAYMENT_BLOCKED, roles: ["STAFF", "ADMIN"] },
  PI_RESUME_PAYMENT: { from: [S.PAYMENT_BLOCKED], to: S.REPORT_SUBMITTED, roles: ["STAFF", "ADMIN"] },

  // Step 9: 최종 완료.
  PI_COMPLETE: { from: [S.REPORT_SUBMITTED], to: S.FINISHED, roles: ["STAFF", "ADMIN"] },
};

export function getPiTransition(action: PiAction): PiTransitionRule {
  return PI_TRANSITIONS[action];
}

export function isPiAction(v: unknown): v is PiAction {
  return typeof v === "string" && (PI_ACTIONS as readonly string[]).includes(v);
}

// 현재 상태·역할에서 해당 행동이 허용되는지(1차 판단). 목적지가 동적이거나 필수 입력/파일
// 조건이 있는 경우 서비스 계층에서 추가 검증한다.
export function canPiTransition(action: PiAction, currentStatus: string, role: WorkflowRole): boolean {
  const rule = PI_TRANSITIONS[action];
  if (!rule) return false;
  if (!rule.from.includes(currentStatus as PiStatus)) return false;
  if (!rule.roles.includes(role)) return false;
  return true;
}

// 특정 상태에서 특정 역할이 취할 수 있는 행동 목록(버튼 노출 판단 등에 사용).
export function availablePiActions(currentStatus: string, role: WorkflowRole): PiAction[] {
  return (PI_ACTIONS as readonly PiAction[]).filter((a) => canPiTransition(a, currentStatus, role));
}
