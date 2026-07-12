// 워크플로 상태 전이 규칙(순수 함수). DB/네트워크 의존성이 없으므로 단위 테스트가 쉽다.
// 실제 전이 실행(트랜잭션/이력/메일)은 requestWorkflowService.ts 가 담당하며,
// 이 파일은 "이 행동이 현재 상태·역할에서 허용되는가"만 판단한다.

import {
  STATUS,
  type RequestStatus,
  type HistoryAction,
} from "@/src/lib/serviceRequestTypes";

// 행동을 수행하는 주체의 역할.
export const WORKFLOW_ROLES = ["CUSTOMER", "STAFF", "ADMIN"] as const;
export type WorkflowRole = (typeof WORKFLOW_ROLES)[number];

// 상태를 바꾸는 전이(transition). 생성(SUBMIT_REQUEST)은 기존 상태가 없으므로 제외.
export type TransitionAction = Exclude<
  HistoryAction,
  "SUBMIT_REQUEST" | "UPLOAD_FILE" | "ADD_MESSAGE"
>;

export interface TransitionRule {
  from: RequestStatus;
  to: RequestStatus;
  // 이 전이를 실행할 수 있는 역할. STAFF 는 "배정된 담당자"를 의미(서비스 계층에서 검증).
  roles: WorkflowRole[];
}

// 단일 진실 공급원: 허용된 전이 표.
// 담당자 지정(ASSIGN_STAFF)은 별도 취급(REQUESTED→ASSIGNED, 접수번호 발급).
export const TRANSITIONS: Record<TransitionAction, TransitionRule> = {
  ASSIGN_STAFF: {
    from: STATUS.REQUESTED,
    to: STATUS.ASSIGNED,
    roles: ["ADMIN"],
  },
  REASSIGN_STAFF: {
    // 담당자 변경은 상태를 바꾸지 않는다(from===to). 접수번호도 유지.
    from: STATUS.ASSIGNED,
    to: STATUS.ASSIGNED,
    roles: ["ADMIN"],
  },
  ACCEPT_REQUEST: {
    from: STATUS.ASSIGNED,
    to: STATUS.QUOTATION,
    roles: ["STAFF", "ADMIN"],
  },
  REJECT_REQUEST: {
    from: STATUS.ASSIGNED,
    to: STATUS.REQUEST_REJECTED,
    roles: ["STAFF", "ADMIN"],
  },
  RESUBMIT_REQUEST: {
    from: STATUS.REQUEST_REJECTED,
    to: STATUS.ASSIGNED,
    roles: ["CUSTOMER"],
  },
  COMPLETE_QUOTATION: {
    from: STATUS.QUOTATION,
    to: STATUS.DEPOSIT_REQUESTED,
    roles: ["STAFF", "ADMIN"],
  },
  SUBMIT_DEPOSIT: {
    from: STATUS.DEPOSIT_REQUESTED,
    to: STATUS.DEPOSIT_SUBMITTED,
    roles: ["CUSTOMER"],
  },
  CONFIRM_DEPOSIT: {
    from: STATUS.DEPOSIT_SUBMITTED,
    to: STATUS.CERTIFICATION_IN_PROGRESS,
    roles: ["STAFF", "ADMIN"],
  },
  REJECT_DEPOSIT: {
    from: STATUS.DEPOSIT_SUBMITTED,
    to: STATUS.DEPOSIT_REJECTED,
    roles: ["STAFF", "ADMIN"],
  },
  RESUME_AFTER_DEPOSIT_REJECTION: {
    from: STATUS.DEPOSIT_REJECTED,
    to: STATUS.DEPOSIT_SUBMITTED,
    roles: ["CUSTOMER"],
  },
  COMPLETE_CERTIFICATION: {
    from: STATUS.CERTIFICATION_IN_PROGRESS,
    to: STATUS.BALANCE_REQUESTED,
    roles: ["STAFF", "ADMIN"],
  },
  BLOCK_CERTIFICATION: {
    from: STATUS.CERTIFICATION_IN_PROGRESS,
    to: STATUS.CERTIFICATION_BLOCKED,
    roles: ["STAFF", "ADMIN"],
  },
  RESUME_CERTIFICATION: {
    from: STATUS.CERTIFICATION_BLOCKED,
    to: STATUS.CERTIFICATION_IN_PROGRESS,
    roles: ["STAFF", "ADMIN"],
  },
  SUBMIT_BALANCE: {
    from: STATUS.BALANCE_REQUESTED,
    to: STATUS.BALANCE_SUBMITTED,
    roles: ["CUSTOMER"],
  },
  CONFIRM_BALANCE: {
    from: STATUS.BALANCE_SUBMITTED,
    to: STATUS.FINAL_DOCUMENT_PENDING,
    roles: ["STAFF", "ADMIN"],
  },
  COMPLETE_FINAL_DOCUMENT: {
    // step 11 유지, 상태만 FINAL_DOCUMENT_PENDING → COMPLETED.
    from: STATUS.FINAL_DOCUMENT_PENDING,
    to: STATUS.COMPLETED,
    roles: ["STAFF", "ADMIN"],
  },
};

export function getTransition(action: TransitionAction): TransitionRule {
  return TRANSITIONS[action];
}

// 현재 상태·역할에서 해당 행동이 허용되는지. 서비스 계층에서 전이 실행 전에 호출.
export function canTransition(
  action: TransitionAction,
  currentStatus: string,
  role: WorkflowRole,
): boolean {
  const rule = TRANSITIONS[action];
  if (!rule) return false;
  if (rule.from !== currentStatus) return false;
  if (!rule.roles.includes(role)) return false;
  return true;
}

// 특정 상태에서 특정 역할이 취할 수 있는 행동 목록(버튼 노출 판단 등에 사용).
export function availableActions(
  currentStatus: string,
  role: WorkflowRole,
): TransitionAction[] {
  return (Object.keys(TRANSITIONS) as TransitionAction[]).filter((a) =>
    canTransition(a, currentStatus, role),
  );
}

// 전이 불가 시 던지는 에러. 서비스/라우트에서 구분하여 409 로 응답.
export class WorkflowError extends Error {
  code: string;
  httpStatus: number;
  constructor(message: string, code = "WORKFLOW_ERROR", httpStatus = 409) {
    super(message);
    this.name = "WorkflowError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
