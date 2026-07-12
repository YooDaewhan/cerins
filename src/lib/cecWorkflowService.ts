// CEC India 워크플로 전이 오케스트레이션. 컨트롤러에서 step/status 를 직접 수정하지 말고
// 반드시 이 서비스의 메서드를 호출한다. 각 메서드는:
//   1) 사용자 권한 확인   2) 현재 step+status 에서 가능한 행동인지(cecWorkflow)   3) 필수 파일/입력 검증
//   4) 금액 서버 재계산   5) 트랜잭션(FOR UPDATE 로 상태 재확인)   6) 상태/이력/파일/결제 저장
//   7) 커밋   8) 커밋 후 메일(best-effort, 실패해도 롤백 없음).
// TRCU/GOST 워크플로(requestWorkflowService)와 완전히 분리되어 있으며 공통 헬퍼만 재사용한다.

import type { User } from "@/src/lib/types";
import { isAdminLevel } from "@/src/lib/userTypes";
import type { ServiceRequest } from "@/src/lib/serviceRequestTypes";
import {
  CEC_STATUS,
  CEC_STATUS_STEP,
  CEC_BLOCK_TYPE,
  CEC_REJECT_TYPE,
  CEC_PAYMENT_TYPE,
  cecStepForStatus,
  type CecStatus,
} from "@/src/lib/cecTypes";
import {
  canCecTransition,
  type CecAction,
} from "@/src/lib/cecWorkflow";
import { WorkflowError, type WorkflowRole } from "@/src/lib/serviceWorkflow";
import {
  type Tx,
  withTx,
  resolveRole,
  insertHistory,
  insertMessage,
  insertRequestFiles,
  updateStatusStep,
} from "@/src/lib/requestWorkflowShared";
import {
  getRequestById,
  getUserBrief,
  countFilesByType,
  getCecInspection,
  upsertCecInspection,
  getLatestCecValuation,
  insertCecValuation,
  markCecValuationConfirmed,
  getLatestPaymentByType,
  getLatestHistoryMetaTo,
} from "@/src/lib/serviceRequestRepo";
import { nextCecRequestNumber } from "@/src/lib/requestNumberService";
import { getBankInfo, getCecPricing } from "@/src/lib/requestSettings";
import { inspectionDays, computeCecEstimate, computeCecFinal, computeSurcharge } from "@/src/lib/cecMath";
import type { StoredFileMeta } from "@/src/lib/requestStorage";
import { CEC_FILE_META, isCecFileType, type CecFileType } from "@/src/lib/cecTypes";
import { sendMailSafe } from "@/src/lib/mail";
import * as mails from "@/src/lib/cecMails";

const SVC = "CEC_INDIA";

export interface CecWorkflowResult {
  request: ServiceRequest;
  mail?: { ok: boolean; error?: string };
}

/* ----------------------------- 공통 유틸 ---------------------------- */

// CEC 상태→step 맵을 적용하는 얇은 래퍼.
async function applyCecStatus(
  conn: Tx,
  requestId: number,
  toStatus: CecStatus,
  extra?: { assigneeUserId?: number; requestNumber?: string; setAssignedNow?: boolean; setCompletedNow?: boolean },
): Promise<void> {
  await updateStatusStep(conn, requestId, toStatus, CEC_STATUS_STEP[toStatus], extra);
}

// FOR UPDATE 로 잠그고 CEC 의뢰 여부 + 권한 + 전이 가능 여부 검사.
async function lockAndAuthorize(
  conn: Tx,
  user: User,
  requestId: number,
  action: CecAction,
): Promise<{ request: ServiceRequest; role: WorkflowRole }> {
  const request = await getRequestById(requestId, conn, true);
  if (!request) throw new WorkflowError("의뢰를 찾을 수 없습니다.", "NOT_FOUND", 404);
  if (request.service_type !== SVC) {
    throw new WorkflowError("CEC India 의뢰가 아닙니다.", "INVALID_STATE", 409);
  }
  const role = resolveRole(user, request);
  if (!role) throw new WorkflowError("권한이 없습니다.", "FORBIDDEN", 403);
  if (!canCecTransition(action, request.status, role)) {
    throw new WorkflowError(
      "현재 상태에서 허용되지 않는 작업이거나 이미 처리되었습니다.",
      "INVALID_STATE",
      409,
    );
  }
  return { request, role };
}

async function reload(conn: Tx, id: number): Promise<ServiceRequest> {
  return (await getRequestById(id, conn))!;
}

interface CecPaymentInput {
  depositor_name: string;
  sender_account?: string;
  payment_date?: string;
  memo?: string;
}

function validatePayment(p: CecPaymentInput): void {
  if (!p.depositor_name?.trim()) throw new WorkflowError("입금자명은 필수입니다.", "VALIDATION", 400);
}

async function insertCecPayment(
  conn: Tx,
  args: { requestId: number; type: string; expected: string | null; input: CecPaymentInput; submittedBy: number },
): Promise<void> {
  await conn.execute(
    `INSERT INTO payments
       (service_request_id, payment_type, expected_amount, depositor_name, sender_account, payment_date, memo, status, submitted_by, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, NOW())`,
    [
      args.requestId, args.type, args.expected,
      args.input.depositor_name.trim(),
      args.input.sender_account?.trim() || null,
      args.input.payment_date || null,
      args.input.memo?.trim() || null,
      args.submittedBy,
    ],
  );
}

async function history(
  conn: Tx,
  args: {
    requestId: number; actorId: number | null; action: string;
    from: string; to: string; message?: string | null; metadata?: unknown;
  },
): Promise<void> {
  await insertHistory(conn, {
    requestId: args.requestId, actorId: args.actorId, action: args.action,
    fromStep: cecStepForStatus(args.from), toStep: cecStepForStatus(args.to),
    fromStatus: args.from, toStatus: args.to,
    message: args.message ?? null, metadata: args.metadata,
  });
}

async function assigneeEmail(requestId: number): Promise<string | null> {
  const r = await getRequestById(requestId);
  if (!r?.assignee_user_id) return null;
  const u = await getUserBrief(r.assignee_user_id);
  return u?.email ?? null;
}

/* ================================================================== */
/* Step 0 제출은 requestWorkflowService.submitRequest 를 재사용(공통).     */
/* 검사 요청 일정(가능일)/현장 담당자 상세만 cec_inspections 에 추가 저장.   */
/* 여기서는 그 외 배정 이후의 CEC 전용 전이만 다룬다.                       */
/* ================================================================== */

/* ------------------- Step 0: 검사 요청 상세 저장 -------------------- */

export interface CecInitialRequestInput {
  requested_start_date?: string;
  requested_end_date?: string;
  requested_start_time?: string; // 시간 미정이면 비워둔다.
  requested_end_time?: string;
  site_contact_name?: string;
  site_contact_phone?: string;
}

// submitRequest(공통)로 service_requests + 파일이 생성된 직후, 고객이 신청 당시 희망한
// 검사 가능일/시간·현장 담당자를 cec_inspections 에 보존한다(담당자 확정 예정 일정과 별개).
// 입력이 하나도 없으면 빈 행을 만들지 않는다.
export async function saveCecInitialRequest(
  requestId: number, input: CecInitialRequestInput,
): Promise<void> {
  const clean = (v?: string) => (v && v.trim() ? v.trim() : null);
  const fields = {
    requested_start_date: clean(input.requested_start_date),
    requested_end_date: clean(input.requested_end_date),
    requested_start_time: clean(input.requested_start_time),
    requested_end_time: clean(input.requested_end_time),
    site_contact_name: clean(input.site_contact_name),
    site_contact_phone: clean(input.site_contact_phone),
  };
  if (Object.values(fields).every((v) => v === null)) return;
  await withTx(async (conn) => {
    await upsertCecInspection(conn, requestId, fields);
  });
}

/* ------------------------- Step 1: 담당자 지정 ---------------------- */

export async function assignCecStaff(
  actor: User, requestId: number, assigneeUserId: number, year2?: number,
): Promise<CecWorkflowResult> {
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "CEC_ASSIGN_STAFF");
    let requestNumber = request.request_number;
    if (!requestNumber) {
      const yy = year2 ?? new Date().getFullYear() % 100;
      requestNumber = await nextCecRequestNumber(conn, yy);
    }
    await applyCecStatus(conn, requestId, CEC_STATUS.ASSIGNED, {
      assigneeUserId, requestNumber, setAssignedNow: true,
    });
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_ASSIGN_STAFF",
      from: request.status, to: CEC_STATUS.ASSIGNED,
      metadata: { assigneeUserId, requestNumber },
    });
    return reload(conn, requestId);
  });
  return { request };
}

// 담당자 변경(상태 유지, 접수번호 유지). 관리자 전용.
export async function reassignCecStaff(
  actor: User, requestId: number, assigneeUserId: number,
): Promise<CecWorkflowResult> {
  if (!isAdminLevel(actor.user_level)) throw new WorkflowError("권한이 없습니다.", "FORBIDDEN", 403);
  const request = await withTx(async (conn) => {
    const r = await getRequestById(requestId, conn, true);
    if (!r) throw new WorkflowError("의뢰를 찾을 수 없습니다.", "NOT_FOUND", 404);
    if (r.service_type !== SVC) throw new WorkflowError("CEC India 의뢰가 아닙니다.", "INVALID_STATE", 409);
    if (!r.request_number) throw new WorkflowError("아직 담당자가 지정되지 않은 의뢰입니다.", "INVALID_STATE", 409);
    await conn.execute(`UPDATE service_requests SET assignee_user_id = ? WHERE id = ?`, [assigneeUserId, requestId]);
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_ASSIGN_STAFF",
      from: r.status, to: r.status, metadata: { from: r.assignee_user_id, to: assigneeUserId, reassign: true },
    });
    return reload(conn, requestId);
  });
  return { request };
}

/* --------------------- Step 1→2: 서류 반려 / 재제출 ------------------ */

export async function rejectCecDocuments(actor: User, requestId: number, reason: string): Promise<CecWorkflowResult> {
  const trimmed = reason.trim();
  if (!trimmed) throw new WorkflowError("반려 사유는 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "CEC_REJECT_DOCUMENTS");
    await applyCecStatus(conn, requestId, CEC_STATUS.DOCUMENT_REJECTED);
    await insertMessage(conn, { requestId, authorId: actor.id, type: "REJECTION", message: trimmed, customerVisible: true });
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_REJECT_DOCUMENTS",
      from: CEC_STATUS.ASSIGNED, to: CEC_STATUS.DOCUMENT_REJECTED, message: trimmed,
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `CEC_REJECT_DOCUMENTS ${request.request_number}`,
    ...mails.buildCecRejectDocumentsMail(request, trimmed),
  });
  return { request, mail };
}

export async function resubmitCecDocuments(actor: User, requestId: number, note?: string): Promise<CecWorkflowResult> {
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "CEC_RESUBMIT_DOCUMENTS");
    await applyCecStatus(conn, requestId, CEC_STATUS.ASSIGNED);
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_RESUBMIT_DOCUMENTS",
      from: CEC_STATUS.DOCUMENT_REJECTED, to: CEC_STATUS.ASSIGNED, message: note?.trim() || null,
    });
    return reload(conn, requestId);
  });
  return { request };
}

/* --------------------- Step 1→3: 접수(검사 일정 입력) ----------------- */

export interface AcceptCecInput {
  inspection_start_date: string; // YYYY-MM-DD
  inspection_end_date: string;
  inspection_location?: string;
  inspection_memo?: string;
  quotation_memo?: string;
}

export async function acceptCecRequest(actor: User, requestId: number, input: AcceptCecInput): Promise<CecWorkflowResult> {
  const days = inspectionDays(input.inspection_start_date, input.inspection_end_date);
  if (days == null) throw new WorkflowError("검사 시작일/종료일이 올바르지 않습니다.", "VALIDATION", 400);
  const pricing = getCecPricing();
  const estimate = computeCecEstimate(days, pricing);

  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "CEC_ACCEPT_REQUEST");
    await upsertCecInspection(conn, requestId, {
      planned_start_date: input.inspection_start_date,
      planned_end_date: input.inspection_end_date,
      planned_days: days,
      inspection_location: input.inspection_location?.trim() || null,
      inspection_memo: input.inspection_memo?.trim() || null,
    });
    await applyCecStatus(conn, requestId, CEC_STATUS.DEPOSIT_REQUESTED);
    if (input.quotation_memo?.trim()) {
      await insertMessage(conn, { requestId, authorId: actor.id, type: "PROGRESS_MEMO", message: input.quotation_memo.trim(), customerVisible: true });
    }
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_ACCEPT_REQUEST",
      from: CEC_STATUS.ASSIGNED, to: CEC_STATUS.DEPOSIT_REQUESTED,
      metadata: { plannedDays: days, deposit: estimate.deposit },
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `CEC_ACCEPT_REQUEST ${request.request_number}`,
    ...mails.buildCecAcceptedMail(request, {
      currency: pricing.currency,
      inspectionStart: input.inspection_start_date,
      inspectionEnd: input.inspection_end_date,
      plannedDays: days,
      baseFee: estimate.baseFee,
      estimatedInspectionFee: estimate.inspectionFee,
      deposit: estimate.deposit,
      quotationMemo: input.quotation_memo?.trim() || null,
      bank: getBankInfo(),
    }),
  });
  return { request, mail };
}

/* ----------------------- Step 3: 선금 -------------------------------- */

export async function submitCecDeposit(actor: User, requestId: number, input: CecPaymentInput): Promise<CecWorkflowResult> {
  validatePayment(input);
  const pricing = getCecPricing();
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "CEC_SUBMIT_DEPOSIT");
    await insertCecPayment(conn, {
      requestId, type: CEC_PAYMENT_TYPE.DEPOSIT, expected: String(pricing.deposit.toFixed(2)),
      input, submittedBy: actor.id,
    });
    await applyCecStatus(conn, requestId, CEC_STATUS.DEPOSIT_SUBMITTED);
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_SUBMIT_DEPOSIT",
      from: request.status, to: CEC_STATUS.DEPOSIT_SUBMITTED,
    });
    return reload(conn, requestId);
  });
  return { request };
}

export async function confirmCecDeposit(actor: User, requestId: number): Promise<CecWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_CONFIRM_DEPOSIT");
    const pay = await getLatestPaymentByType(requestId, CEC_PAYMENT_TYPE.DEPOSIT, conn);
    if (pay) {
      await conn.execute(
        `UPDATE payments SET status = 'CONFIRMED', confirmed_by = ?, confirmed_at = NOW() WHERE id = ?`,
        [actor.id, pay.id],
      );
    }
    await applyCecStatus(conn, requestId, CEC_STATUS.DEPOSIT_CONFIRMED);
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_CONFIRM_DEPOSIT",
      from: CEC_STATUS.DEPOSIT_SUBMITTED, to: CEC_STATUS.DEPOSIT_CONFIRMED,
    });
    return reload(conn, requestId);
  });
  return { request };
}

export async function rejectCecDeposit(actor: User, requestId: number, reason: string): Promise<CecWorkflowResult> {
  const trimmed = reason.trim();
  if (!trimmed) throw new WorkflowError("확인불가 사유는 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_REJECT_DEPOSIT");
    const pay = await getLatestPaymentByType(requestId, CEC_PAYMENT_TYPE.DEPOSIT, conn);
    if (pay) {
      await conn.execute(
        `UPDATE payments SET status = 'REJECTED', rejection_reason = ?, confirmed_by = ?, confirmed_at = NOW() WHERE id = ?`,
        [trimmed, actor.id, pay.id],
      );
    }
    await applyCecStatus(conn, requestId, CEC_STATUS.DEPOSIT_REJECTED);
    await insertMessage(conn, { requestId, authorId: actor.id, type: "PAYMENT_REJECTION", message: trimmed, customerVisible: true });
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_REJECT_DEPOSIT",
      from: CEC_STATUS.DEPOSIT_SUBMITTED, to: CEC_STATUS.DEPOSIT_REJECTED, message: trimmed,
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `CEC_REJECT_DEPOSIT ${request.request_number}`,
    ...mails.buildCecDepositRejectedMail(request, trimmed),
  });
  return { request, mail };
}

/* ----------------------- Step 3: 검사 진행 --------------------------- */

export async function scheduleCecInspection(actor: User, requestId: number): Promise<CecWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_SCHEDULE_INSPECTION");
    await applyCecStatus(conn, requestId, CEC_STATUS.INSPECTION_SCHEDULED);
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_SCHEDULE_INSPECTION",
      from: CEC_STATUS.DEPOSIT_CONFIRMED, to: CEC_STATUS.INSPECTION_SCHEDULED,
    });
    return reload(conn, requestId);
  });
  return { request };
}

export async function startCecInspection(actor: User, requestId: number): Promise<CecWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_START_INSPECTION");
    await applyCecStatus(conn, requestId, CEC_STATUS.INSPECTION_IN_PROGRESS);
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_START_INSPECTION",
      from: CEC_STATUS.INSPECTION_SCHEDULED, to: CEC_STATUS.INSPECTION_IN_PROGRESS,
    });
    return reload(conn, requestId);
  });
  return { request };
}

/* ----------------------- Step 3→4: 검사 진행 불가 -------------------- */

export async function blockCecInspection(
  actor: User, requestId: number, reason: string, neededDocs?: string,
): Promise<CecWorkflowResult> {
  const trimmed = reason.trim();
  if (!trimmed) throw new WorkflowError("문제 발생 사유는 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_BLOCK_INSPECTION");
    await applyCecStatus(conn, requestId, CEC_STATUS.INSPECTION_BLOCKED);
    await insertMessage(conn, { requestId, authorId: actor.id, type: "CERTIFICATION_BLOCKED", message: trimmed, customerVisible: true });
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_BLOCK_INSPECTION",
      from: CEC_STATUS.INSPECTION_IN_PROGRESS, to: CEC_STATUS.INSPECTION_BLOCKED,
      message: trimmed, metadata: { origin_step: 3, resume_step: 3, needed_docs: neededDocs?.trim() || null },
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `CEC_BLOCK_INSPECTION ${request.request_number}`,
    ...mails.buildCecCertificationBlockedMail(request, { reason: trimmed, neededDocs: neededDocs?.trim() || null }),
  });
  return { request, mail };
}

export async function resumeCecInspection(actor: User, requestId: number, note?: string): Promise<CecWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_RESUME_INSPECTION");
    await applyCecStatus(conn, requestId, CEC_STATUS.INSPECTION_IN_PROGRESS);
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_RESUME_INSPECTION",
      from: CEC_STATUS.INSPECTION_BLOCKED, to: CEC_STATUS.INSPECTION_IN_PROGRESS, message: note?.trim() || null,
    });
    return reload(conn, requestId);
  });
  return { request };
}

/* ------------- Step 3→5: 검사 결과 + 가격평가 입력 ------------------- */

export interface CompleteCecValuationInput {
  actual_start_date: string;
  actual_end_date: string;
  internal_memo?: string;
  customer_memo?: string;
  valuation_amount: number;
  valuation_currency?: string;
  valuation_description?: string;
  surcharge_applied: boolean;
  notes?: string;
}

export async function completeCecValuation(
  actor: User, requestId: number, input: CompleteCecValuationInput,
): Promise<CecWorkflowResult> {
  const days = inspectionDays(input.actual_start_date, input.actual_end_date);
  if (days == null) throw new WorkflowError("실제 검사 시작일/종료일이 올바르지 않습니다.", "VALIDATION", 400);
  if (!(input.valuation_amount >= 0)) throw new WorkflowError("평가 물건가액이 올바르지 않습니다.", "VALIDATION", 400);
  const pricing = getCecPricing();
  const surchargeAmount = computeSurcharge(input.valuation_amount, input.surcharge_applied, pricing);

  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "CEC_COMPLETE_VALUATION");

    // 선금이 확인되지 않으면 검사 완료 처리 불가.
    const dep = await getLatestPaymentByType(requestId, CEC_PAYMENT_TYPE.DEPOSIT, conn);
    if (!dep || dep.status !== "CONFIRMED") {
      throw new WorkflowError("선금이 확인되지 않아 검사를 완료할 수 없습니다.", "INVALID_STATE", 409);
    }
    // 내부 검사 리포트가 최소 1개 있어야 한다.
    const reportCount = await countFilesByType(requestId, "CEC_INSPECTION_REPORT", conn);
    if (reportCount < 1) {
      throw new WorkflowError("내부 검사 리포트를 먼저 업로드해야 합니다.", "VALIDATION", 400);
    }

    await upsertCecInspection(conn, requestId, {
      actual_start_date: input.actual_start_date,
      actual_end_date: input.actual_end_date,
      actual_days: days,
    });
    await insertCecValuation(conn, {
      serviceRequestId: requestId,
      valuationAmount: String(input.valuation_amount),
      currency: input.valuation_currency?.trim() || pricing.currency,
      description: input.valuation_description?.trim() || null,
      surchargeApplied: input.surcharge_applied,
      surchargeRate: String(pricing.surchargeRate),
      surchargeAmount,
      notes: input.notes?.trim() || null,
      createdBy: actor.id,
    });
    if (input.internal_memo?.trim()) {
      await insertMessage(conn, { requestId, authorId: actor.id, type: "INTERNAL_MEMO", message: input.internal_memo.trim(), customerVisible: false });
    }
    if (input.customer_memo?.trim()) {
      await insertMessage(conn, { requestId, authorId: actor.id, type: "CUSTOMER_MEMO", message: input.customer_memo.trim(), customerVisible: true });
    }
    await applyCecStatus(conn, requestId, CEC_STATUS.VALUATION_REVIEW);
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_COMPLETE_VALUATION",
      from: CEC_STATUS.INSPECTION_IN_PROGRESS, to: CEC_STATUS.VALUATION_REVIEW,
      metadata: { actualDays: days, valuation: input.valuation_amount, surchargeApplied: input.surcharge_applied, surchargeAmount },
    });
    return reload(conn, requestId);
  });

  const final = computeCecFinal(
    { actualDays: days, surchargeApplied: input.surcharge_applied, valuationAmount: input.valuation_amount },
    pricing,
  );
  const mail = await sendMailSafe({
    to: request.contact_email, context: `CEC_COMPLETE_VALUATION ${request.request_number}`,
    ...mails.buildCecValuationCompletedMail(request, {
      currency: pricing.currency,
      valuation: String(input.valuation_amount.toFixed(2)),
      surchargeApplied: input.surcharge_applied,
      estimatedTotal: final.totalAmount,
      balance: final.balanceAmount,
    }),
  });
  return { request, mail };
}

/* ----------------------- Step 5→7 / 5→6: 고객 가격평가 -------------- */

export async function approveCecValuation(actor: User, requestId: number): Promise<CecWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_APPROVE_VALUATION");
    const val = await getLatestCecValuation(requestId, conn);
    if (val) await markCecValuationConfirmed(conn, val.id);
    await applyCecStatus(conn, requestId, CEC_STATUS.CERTIFICATE_DRAFT);
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_APPROVE_VALUATION",
      from: CEC_STATUS.VALUATION_REVIEW, to: CEC_STATUS.CERTIFICATE_DRAFT,
    });
    return reload(conn, requestId);
  });
  return { request };
}

export async function rejectCecValuation(actor: User, requestId: number, reason: string): Promise<CecWorkflowResult> {
  const trimmed = reason.trim();
  if (!trimmed) throw new WorkflowError("거절 사유는 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_REJECT_VALUATION");
    await applyCecStatus(conn, requestId, CEC_STATUS.VALUATION_REJECTED);
    await insertMessage(conn, { requestId, authorId: actor.id, type: "REJECTION", message: trimmed, customerVisible: true });
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_REJECT_VALUATION",
      from: CEC_STATUS.VALUATION_REVIEW, to: CEC_STATUS.VALUATION_REJECTED, message: trimmed,
    });
    return reload(conn, requestId);
  });
  const to = await assigneeEmail(requestId);
  const mail = to
    ? await sendMailSafe({ to, context: `CEC_REJECT_VALUATION ${request.request_number}`, ...mails.buildCecValuationRejectedNotice(request, trimmed) })
    : undefined;
  return { request, mail };
}

export interface ResubmitCecValuationInput {
  valuation_amount: number;
  valuation_currency?: string;
  valuation_description?: string;
  surcharge_applied: boolean;
  notes?: string;
}

export async function resubmitCecValuation(
  actor: User, requestId: number, input: ResubmitCecValuationInput,
): Promise<CecWorkflowResult> {
  if (!(input.valuation_amount >= 0)) throw new WorkflowError("평가 물건가액이 올바르지 않습니다.", "VALIDATION", 400);
  const pricing = getCecPricing();
  const surchargeAmount = computeSurcharge(input.valuation_amount, input.surcharge_applied, pricing);
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_RESUBMIT_VALUATION");
    // 기존 평가는 덮어쓰지 않고 새 행 추가(이력 보존).
    await insertCecValuation(conn, {
      serviceRequestId: requestId,
      valuationAmount: String(input.valuation_amount),
      currency: input.valuation_currency?.trim() || pricing.currency,
      description: input.valuation_description?.trim() || null,
      surchargeApplied: input.surcharge_applied,
      surchargeRate: String(pricing.surchargeRate),
      surchargeAmount,
      notes: input.notes?.trim() || null,
      createdBy: actor.id,
    });
    await applyCecStatus(conn, requestId, CEC_STATUS.VALUATION_REVIEW);
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_RESUBMIT_VALUATION",
      from: CEC_STATUS.VALUATION_REJECTED, to: CEC_STATUS.VALUATION_REVIEW,
      metadata: { valuation: input.valuation_amount, surchargeApplied: input.surcharge_applied },
    });
    return reload(conn, requestId);
  });
  const inspection = await getCecInspection(requestId);
  const final = computeCecFinal(
    { actualDays: inspection?.actual_days ?? 0, surchargeApplied: input.surcharge_applied, valuationAmount: input.valuation_amount },
    pricing,
  );
  const mail = await sendMailSafe({
    to: request.contact_email, context: `CEC_RESUBMIT_VALUATION ${request.request_number}`,
    ...mails.buildCecValuationCompletedMail(request, {
      currency: pricing.currency,
      valuation: String(input.valuation_amount.toFixed(2)),
      surchargeApplied: input.surcharge_applied,
      estimatedTotal: final.totalAmount,
      balance: final.balanceAmount,
    }),
  });
  return { request, mail };
}

/* ----------------------- Step 7: 인증서 초안 ------------------------ */

// 초안 파일 업로드(파일은 파일 엔드포인트에서 저장) 후 고객에게 확인 안내.
export async function uploadCecCertificateDraft(actor: User, requestId: number): Promise<CecWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_UPLOAD_CERTIFICATE_DRAFT");
    const cnt = await countFilesByType(requestId, "CEC_CERTIFICATE_DRAFT", conn);
    if (cnt < 1) throw new WorkflowError("인증서 초안 파일을 먼저 업로드해야 합니다.", "VALIDATION", 400);
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_UPLOAD_CERTIFICATE_DRAFT",
      from: CEC_STATUS.CERTIFICATE_DRAFT, to: CEC_STATUS.CERTIFICATE_DRAFT,
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `CEC_UPLOAD_CERTIFICATE_DRAFT ${request.request_number}`,
    ...mails.buildCecCertificateDraftMail(request),
  });
  return { request, mail };
}

// 초안 승인 + 선적서류 제출(인보이스 필수). 파일은 파일 엔드포인트에서 저장.
export async function approveCecDraftAndSubmitShippingDocuments(actor: User, requestId: number): Promise<CecWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_APPROVE_DRAFT_SUBMIT_SHIPPING");
    const invoiceCount = await countFilesByType(requestId, "CEC_SHIPPING_INVOICE", conn);
    if (invoiceCount < 1) throw new WorkflowError("인보이스가 없으면 제출할 수 없습니다.", "VALIDATION", 400);
    await applyCecStatus(conn, requestId, CEC_STATUS.FINAL_DRAFT_PREPARATION);
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_APPROVE_DRAFT_SUBMIT_SHIPPING",
      from: CEC_STATUS.CERTIFICATE_DRAFT, to: CEC_STATUS.FINAL_DRAFT_PREPARATION,
    });
    return reload(conn, requestId);
  });
  return { request };
}

// 초안 거절 → step 8 (block_type CERTIFICATE_DRAFT_REJECTED, resume_step 7).
export async function rejectCecCertificateDraft(actor: User, requestId: number, reason: string): Promise<CecWorkflowResult> {
  const trimmed = reason.trim();
  if (!trimmed) throw new WorkflowError("거절 사유는 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_REJECT_CERTIFICATE_DRAFT");
    await applyCecStatus(conn, requestId, CEC_STATUS.CERTIFICATION_BLOCKED);
    await insertMessage(conn, { requestId, authorId: actor.id, type: "REJECTION", message: trimmed, customerVisible: true });
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_REJECT_CERTIFICATE_DRAFT",
      from: CEC_STATUS.CERTIFICATE_DRAFT, to: CEC_STATUS.CERTIFICATION_BLOCKED, message: trimmed,
      metadata: { block_type: CEC_BLOCK_TYPE.CERTIFICATE_DRAFT_REJECTED, origin_step: 7, resume_step: 7 },
    });
    return reload(conn, requestId);
  });
  const to = await assigneeEmail(requestId);
  const mail = to
    ? await sendMailSafe({ to, context: `CEC_REJECT_CERTIFICATE_DRAFT ${request.request_number}`, ...mails.buildCecCertificateDraftRejectedNotice(request, trimmed) })
    : undefined;
  return { request, mail };
}

/* ----------------------- Step 8: 인증 진행 문제 --------------------- */

// 최종 인증서 발급 준비 문제 → step 8 (block_type CERTIFICATE_ISSUANCE_BLOCKED, resume_step 9).
export async function blockCecCertificateIssuance(
  actor: User, requestId: number, reason: string, neededDocs?: string,
): Promise<CecWorkflowResult> {
  const trimmed = reason.trim();
  if (!trimmed) throw new WorkflowError("문제 사유는 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_BLOCK_CERTIFICATE_ISSUANCE");
    await applyCecStatus(conn, requestId, CEC_STATUS.CERTIFICATION_BLOCKED);
    await insertMessage(conn, { requestId, authorId: actor.id, type: "CERTIFICATION_BLOCKED", message: trimmed, customerVisible: true });
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_BLOCK_CERTIFICATE_ISSUANCE",
      from: CEC_STATUS.FINAL_DRAFT_PREPARATION, to: CEC_STATUS.CERTIFICATION_BLOCKED, message: trimmed,
      metadata: { block_type: CEC_BLOCK_TYPE.CERTIFICATE_ISSUANCE_BLOCKED, origin_step: 9, resume_step: 9, needed_docs: neededDocs?.trim() || null },
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `CEC_BLOCK_CERTIFICATE_ISSUANCE ${request.request_number}`,
    ...mails.buildCecCertificationBlockedMail(request, { reason: trimmed, neededDocs: neededDocs?.trim() || null }),
  });
  return { request, mail };
}

// 문제 해결 후 resume_step(7 또는 9)에 따라 복귀.
export async function resumeCecCertification(actor: User, requestId: number, note?: string): Promise<CecWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_RESUME_CERTIFICATION");
    const meta = await getLatestHistoryMetaTo(requestId, CEC_STATUS.CERTIFICATION_BLOCKED, conn);
    const resumeStep = Number(meta?.resume_step ?? 7);
    const target: CecStatus = resumeStep === 9 ? CEC_STATUS.FINAL_DRAFT_PREPARATION : CEC_STATUS.CERTIFICATE_DRAFT;
    await applyCecStatus(conn, requestId, target);
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_RESUME_CERTIFICATION",
      from: CEC_STATUS.CERTIFICATION_BLOCKED, to: target, message: note?.trim() || null,
      metadata: { resume_step: resumeStep },
    });
    return reload(conn, requestId);
  });
  return { request };
}

/* ------------- Step 9→11: 최종 확인증서 초안 작성 ------------------- */

export async function prepareCecFinalDraft(actor: User, requestId: number): Promise<CecWorkflowResult> {
  const pricing = getCecPricing();
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_PREPARE_FINAL_DRAFT");

    // 최종 인증서 초안(미리보기) + 세금계산서가 있어야 한다.
    const previewCount = await countFilesByType(requestId, "CEC_FINAL_CERTIFICATE_PREVIEW", conn);
    if (previewCount < 1) throw new WorkflowError("최종 인증서 초안(미리보기 PDF)을 먼저 업로드해야 합니다.", "VALIDATION", 400);
    const taxCount = await countFilesByType(requestId, "CEC_TAX_INVOICE", conn);
    if (taxCount < 1) throw new WorkflowError("세금계산서/청구서를 먼저 업로드해야 합니다.", "VALIDATION", 400);

    const inspection = await getCecInspection(requestId, conn);
    const val = await getLatestCecValuation(requestId, conn);
    const actualDays = inspection?.actual_days ?? 0;
    const valuationAmount = val ? Number(val.valuation_amount) : 0;
    const surchargeApplied = val?.surcharge_applied ?? false;
    const final = computeCecFinal({ actualDays, surchargeApplied, valuationAmount }, pricing);

    // 견적 upsert + 항목 재작성(서버 재계산 값).
    await conn.execute(
      `INSERT INTO quotations
         (service_request_id, currency, total_amount, deposit_amount, balance_amount, notes, created_by, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         currency = VALUES(currency), total_amount = VALUES(total_amount),
         deposit_amount = VALUES(deposit_amount), balance_amount = VALUES(balance_amount),
         created_by = VALUES(created_by), sent_at = NOW()`,
      [requestId, pricing.currency, final.totalAmount, final.deposit, final.balanceAmount, null, actor.id],
    );
    const [qrows] = await conn.query(
      `SELECT id FROM quotations WHERE service_request_id = ? LIMIT 1`,
      [requestId],
    );
    const quotationId = Number((qrows as { id: number }[])[0].id);
    await conn.execute(`DELETE FROM quotation_items WHERE quotation_id = ?`, [quotationId]);
    let order = 0;
    for (const it of final.items) {
      await conn.execute(
        `INSERT INTO quotation_items (quotation_id, item_type, item_name, quantity, unit_price, amount, memo, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [quotationId, it.item_type, it.item_name, it.quantity, it.unit_price, it.amount, null, order++],
      );
    }

    await applyCecStatus(conn, requestId, CEC_STATUS.BALANCE_REQUESTED);
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_PREPARE_FINAL_DRAFT",
      from: CEC_STATUS.FINAL_DRAFT_PREPARATION, to: CEC_STATUS.BALANCE_REQUESTED,
      metadata: { total: final.totalAmount, balance: final.balanceAmount, actualDays, surchargeApplied },
    });
    return reload(conn, requestId);
  });

  // 메일용 최종 금액 재계산(커밋된 데이터 기준).
  const inspection = await getCecInspection(requestId);
  const val = await getLatestCecValuation(requestId);
  const final = computeCecFinal(
    { actualDays: inspection?.actual_days ?? 0, surchargeApplied: val?.surcharge_applied ?? false, valuationAmount: val ? Number(val.valuation_amount) : 0 },
    pricing,
  );
  const mail = await sendMailSafe({
    to: request.contact_email, context: `CEC_PREPARE_FINAL_DRAFT ${request.request_number}`,
    ...mails.buildCecFinalDraftMail(request, {
      currency: pricing.currency,
      baseFee: final.baseFee, inspectionFee: final.inspectionFee,
      surchargeAmount: final.surchargeAmount, surchargeApplied: final.surchargeApplied,
      total: final.totalAmount, deposit: final.deposit, balance: final.balanceAmount,
      bank: getBankInfo(),
    }),
  });
  return { request, mail };
}

/* ------------- Step 11: 잔금 / 최종 초안 확인 ----------------------- */

export async function submitCecBalance(actor: User, requestId: number, input: CecPaymentInput): Promise<CecWorkflowResult> {
  validatePayment(input);
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "CEC_SUBMIT_BALANCE");
    // step 10 에서 재제출하는 경우 reject_type 이 BALANCE_REJECTED 여야 한다.
    if (String(request.status) === CEC_STATUS.FINAL_OR_PAYMENT_REJECTED) {
      const meta = await getLatestHistoryMetaTo(requestId, CEC_STATUS.FINAL_OR_PAYMENT_REJECTED, conn);
      if (meta?.reject_type !== CEC_REJECT_TYPE.BALANCE_REJECTED) {
        throw new WorkflowError("현재 단계에서는 잔금을 제출할 수 없습니다.", "INVALID_STATE", 409);
      }
    }
    const q = await conn.query(`SELECT balance_amount FROM quotations WHERE service_request_id = ? LIMIT 1`, [requestId]);
    const balance = (q[0] as { balance_amount: string }[])[0]?.balance_amount ?? null;
    await insertCecPayment(conn, { requestId, type: CEC_PAYMENT_TYPE.BALANCE, expected: balance, input, submittedBy: actor.id });
    await applyCecStatus(conn, requestId, CEC_STATUS.BALANCE_SUBMITTED);
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_SUBMIT_BALANCE",
      from: request.status, to: CEC_STATUS.BALANCE_SUBMITTED,
    });
    return reload(conn, requestId);
  });
  return { request };
}

// 최종 초안 거절 → step 10 (reject_type FINAL_DRAFT_REJECTED).
export async function rejectCecFinalDraft(actor: User, requestId: number, reason: string): Promise<CecWorkflowResult> {
  const trimmed = reason.trim();
  if (!trimmed) throw new WorkflowError("거절 사유는 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_REJECT_FINAL_DRAFT");
    await applyCecStatus(conn, requestId, CEC_STATUS.FINAL_OR_PAYMENT_REJECTED);
    await insertMessage(conn, { requestId, authorId: actor.id, type: "REJECTION", message: trimmed, customerVisible: true });
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_REJECT_FINAL_DRAFT",
      from: CEC_STATUS.BALANCE_REQUESTED, to: CEC_STATUS.FINAL_OR_PAYMENT_REJECTED, message: trimmed,
      metadata: { reject_type: CEC_REJECT_TYPE.FINAL_DRAFT_REJECTED, resume_step: 9 },
    });
    return reload(conn, requestId);
  });
  const to = await assigneeEmail(requestId);
  const mail = to
    ? await sendMailSafe({ to, context: `CEC_REJECT_FINAL_DRAFT ${request.request_number}`, ...mails.buildCecFinalDraftRejectedNotice(request, trimmed) })
    : undefined;
  return { request, mail };
}

// 최종 초안 거절 후 담당자가 수정 재개 → step 9.
export async function reworkCecFinalDraft(actor: User, requestId: number, note?: string): Promise<CecWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_REWORK_FINAL_DRAFT");
    const meta = await getLatestHistoryMetaTo(requestId, CEC_STATUS.FINAL_OR_PAYMENT_REJECTED, conn);
    if (meta?.reject_type !== CEC_REJECT_TYPE.FINAL_DRAFT_REJECTED) {
      throw new WorkflowError("최종 초안 거절 상태가 아닙니다.", "INVALID_STATE", 409);
    }
    await applyCecStatus(conn, requestId, CEC_STATUS.FINAL_DRAFT_PREPARATION);
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_REWORK_FINAL_DRAFT",
      from: CEC_STATUS.FINAL_OR_PAYMENT_REJECTED, to: CEC_STATUS.FINAL_DRAFT_PREPARATION, message: note?.trim() || null,
    });
    return reload(conn, requestId);
  });
  return { request };
}

export async function confirmCecBalance(actor: User, requestId: number): Promise<CecWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_CONFIRM_BALANCE");
    const pay = await getLatestPaymentByType(requestId, CEC_PAYMENT_TYPE.BALANCE, conn);
    if (pay) {
      await conn.execute(
        `UPDATE payments SET status = 'CONFIRMED', confirmed_by = ?, confirmed_at = NOW() WHERE id = ?`,
        [actor.id, pay.id],
      );
    }
    await applyCecStatus(conn, requestId, CEC_STATUS.BALANCE_CONFIRMED);
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_CONFIRM_BALANCE",
      from: CEC_STATUS.BALANCE_SUBMITTED, to: CEC_STATUS.BALANCE_CONFIRMED,
    });
    return reload(conn, requestId);
  });
  return { request };
}

// 잔금 확인불가 → step 10 (reject_type BALANCE_REJECTED).
export async function rejectCecBalance(actor: User, requestId: number, reason: string): Promise<CecWorkflowResult> {
  const trimmed = reason.trim();
  if (!trimmed) throw new WorkflowError("확인불가 사유는 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_REJECT_BALANCE");
    const pay = await getLatestPaymentByType(requestId, CEC_PAYMENT_TYPE.BALANCE, conn);
    if (pay) {
      await conn.execute(
        `UPDATE payments SET status = 'REJECTED', rejection_reason = ?, confirmed_by = ?, confirmed_at = NOW() WHERE id = ?`,
        [trimmed, actor.id, pay.id],
      );
    }
    await applyCecStatus(conn, requestId, CEC_STATUS.FINAL_OR_PAYMENT_REJECTED);
    await insertMessage(conn, { requestId, authorId: actor.id, type: "PAYMENT_REJECTION", message: trimmed, customerVisible: true });
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_REJECT_BALANCE",
      from: CEC_STATUS.BALANCE_SUBMITTED, to: CEC_STATUS.FINAL_OR_PAYMENT_REJECTED, message: trimmed,
      metadata: { reject_type: CEC_REJECT_TYPE.BALANCE_REJECTED, resume_step: 11 },
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `CEC_REJECT_BALANCE ${request.request_number}`,
    ...mails.buildCecBalanceRejectedMail(request, trimmed),
  });
  return { request, mail };
}

/* ------------- Step 11→13: 최종 인증서 발급 완료 -------------------- */

export async function completeCecCertification(actor: User, requestId: number): Promise<CecWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "CEC_COMPLETE_CERTIFICATION");
    // 잔금이 확인(CONFIRMED)되어야 하고, 최종 인증서(PDF)가 있어야 완료 가능.
    const bal = await getLatestPaymentByType(requestId, CEC_PAYMENT_TYPE.BALANCE, conn);
    if (!bal || bal.status !== "CONFIRMED") {
      throw new WorkflowError("잔금이 확인되지 않아 완료할 수 없습니다.", "INVALID_STATE", 409);
    }
    const finalCount = await countFilesByType(requestId, "CEC_FINAL_CERTIFICATE", conn);
    if (finalCount < 1) {
      throw new WorkflowError("최종 인증서(PDF)를 먼저 등록해야 완료할 수 있습니다.", "VALIDATION", 400);
    }
    await applyCecStatus(conn, requestId, CEC_STATUS.COMPLETED, { setCompletedNow: true });
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_COMPLETE_CERTIFICATION",
      from: CEC_STATUS.BALANCE_CONFIRMED, to: CEC_STATUS.COMPLETED,
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `CEC_COMPLETE_CERTIFICATION ${request.request_number}`,
    ...mails.buildCecCompletedMail(request),
  });
  return { request, mail };
}

/* ------------------------- 파일 업로드 (CEC) ------------------------ */

// CEC 파일 저장. is_customer_visible 은 CEC_FILE_META 로 결정한다(내부 리포트/최종본은 비공개).
export async function addCecFiles(
  actor: User,
  requestId: number,
  storedFiles: { meta: StoredFileMeta; fileType: string }[],
): Promise<void> {
  await withTx(async (conn) => {
    const r = await getRequestById(requestId, conn, true);
    if (!r) throw new WorkflowError("의뢰를 찾을 수 없습니다.", "NOT_FOUND", 404);
    if (r.service_type !== SVC) throw new WorkflowError("CEC India 의뢰가 아닙니다.", "INVALID_STATE", 409);
    const role = resolveRole(actor, r);
    if (!role) throw new WorkflowError("권한이 없습니다.", "FORBIDDEN", 403);

    for (const f of storedFiles) {
      if (!isCecFileType(f.fileType)) throw new WorkflowError("허용되지 않은 파일 종류입니다.", "VALIDATION", 400);
    }
    await insertRequestFiles(conn, requestId, storedFiles.map((f) => ({
      meta: f.meta, fileType: f.fileType, uploadedBy: actor.id,
      customerVisible: CEC_FILE_META[f.fileType as CecFileType].customerVisible,
    })));
    await history(conn, {
      requestId, actorId: actor.id, action: "CEC_UPLOAD_FILE",
      from: r.status, to: r.status, metadata: { by: role, count: storedFiles.length },
    });
  });
}
