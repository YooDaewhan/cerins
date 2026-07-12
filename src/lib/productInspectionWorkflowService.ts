// 제품검사 워크플로 전이 오케스트레이션. 컨트롤러에서 step/status 를 직접 수정하지 말고
// 반드시 이 서비스의 메서드를 호출한다. 각 메서드는:
//   1) 사용자 권한 확인   2) 현재 step+status 에서 가능한 행동인지(productInspectionWorkflow)
//   3) 필수 입력/파일 검증   4) 날짜 관계 검증   5) 트랜잭션(FOR UPDATE 로 상태 재확인)
//   6) 상태/이력/파일/결제 저장   7) 커밋   8) 커밋 후 메일(best-effort, 실패해도 롤백 없음).
// TRCU/GOST · CEC India 워크플로와 완전히 분리되어 있으며 공통 헬퍼만 재사용한다.
// 중복 클릭/새로고침 재전송은 FOR UPDATE + 현재 상태 검증으로 한 번만 처리된다.

import type { User } from "@/src/lib/types";
import { isAdminLevel } from "@/src/lib/userTypes";
import type { ServiceRequest } from "@/src/lib/serviceRequestTypes";
import {
  PI_STATUS,
  PI_STATUS_STEP,
  PI_PAYMENT_TYPE,
  piStepForStatus,
  isPiFileType,
  PI_FILE_META,
  type PiStatus,
  type PiFileType,
} from "@/src/lib/productInspectionTypes";
import { canPiTransition, type PiAction } from "@/src/lib/productInspectionWorkflow";
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
  getProductInspection,
  upsertProductInspection,
  insertExternalAgencyPayment,
  getLatestPaymentByType,
  getLatestHistoryMetaTo,
} from "@/src/lib/serviceRequestRepo";
import { nextRequestNumber } from "@/src/lib/serviceRequestRepo";
import type { StoredFileMeta } from "@/src/lib/requestStorage";
import { sendMailSafe } from "@/src/lib/mail";
import * as mails from "@/src/lib/productInspectionMails";

const SVC = "PRODUCT_INSPECTION";

export interface PiWorkflowResult {
  request: ServiceRequest;
  mail?: { ok: boolean; error?: string };
}

/* ----------------------------- 공통 유틸 ---------------------------- */

async function applyPiStatus(
  conn: Tx,
  requestId: number,
  toStatus: PiStatus,
  extra?: { assigneeUserId?: number; requestNumber?: string; setAssignedNow?: boolean; setCompletedNow?: boolean },
): Promise<void> {
  await updateStatusStep(conn, requestId, toStatus, PI_STATUS_STEP[toStatus], extra);
}

// FOR UPDATE 로 잠그고 제품검사 의뢰 여부 + 권한 + 전이 가능 여부 검사.
async function lockAndAuthorize(
  conn: Tx,
  user: User,
  requestId: number,
  action: PiAction,
): Promise<{ request: ServiceRequest; role: WorkflowRole }> {
  const request = await getRequestById(requestId, conn, true);
  if (!request) throw new WorkflowError("의뢰를 찾을 수 없습니다.", "NOT_FOUND", 404);
  if (request.service_type !== SVC) {
    throw new WorkflowError("제품검사 의뢰가 아닙니다.", "INVALID_STATE", 409);
  }
  const role = resolveRole(user, request);
  if (!role) throw new WorkflowError("권한이 없습니다.", "FORBIDDEN", 403);
  if (!canPiTransition(action, request.status, role)) {
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

async function history(
  conn: Tx,
  args: {
    requestId: number; actorId: number | null; action: string;
    from: string; to: string; message?: string | null; metadata?: unknown;
  },
): Promise<void> {
  await insertHistory(conn, {
    requestId: args.requestId, actorId: args.actorId, action: args.action,
    fromStep: piStepForStatus(args.from), toStep: piStepForStatus(args.to),
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

// YYYY-MM-DD 문자열 비교(사전식 비교로 충분). end < start 이면 true.
function endBeforeStart(start: string, end: string): boolean {
  return Boolean(start) && Boolean(end) && end < start;
}
function validDate(v: string | undefined): boolean {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/* ================================================================== */
/* Step 0 제출은 requestWorkflowService.submitRequest 를 재사용(공통).     */
/* 여기서는 배정 이후의 제품검사 전용 전이만 다룬다.                        */
/* ================================================================== */

/* ------------------------- Step 1: 담당자 지정 ---------------------- */

export async function assignProductInspectionStaff(
  actor: User, requestId: number, assigneeUserId: number, year2?: number,
): Promise<PiWorkflowResult> {
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "PI_ASSIGN_STAFF");
    // 접수번호는 최초 1회만 발급(insp-YY-0001). 담당자가 바뀌어도 번호는 유지.
    let requestNumber = request.request_number;
    if (!requestNumber) {
      const yy = year2 ?? new Date().getFullYear() % 100;
      requestNumber = await nextRequestNumber(conn, "INSPECTION", yy);
    }
    await applyPiStatus(conn, requestId, PI_STATUS.ASSIGNED, {
      assigneeUserId, requestNumber, setAssignedNow: true,
    });
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_ASSIGN_STAFF",
      from: request.status, to: PI_STATUS.ASSIGNED,
      metadata: { assigneeUserId, requestNumber },
    });
    return reload(conn, requestId);
  });
  return { request };
}

// 담당자 변경(상태/접수번호 유지). 관리자 전용.
export async function reassignProductInspectionStaff(
  actor: User, requestId: number, assigneeUserId: number,
): Promise<PiWorkflowResult> {
  if (!isAdminLevel(actor.user_level)) throw new WorkflowError("권한이 없습니다.", "FORBIDDEN", 403);
  const request = await withTx(async (conn) => {
    const r = await getRequestById(requestId, conn, true);
    if (!r) throw new WorkflowError("의뢰를 찾을 수 없습니다.", "NOT_FOUND", 404);
    if (r.service_type !== SVC) throw new WorkflowError("제품검사 의뢰가 아닙니다.", "INVALID_STATE", 409);
    if (!r.request_number) throw new WorkflowError("아직 담당자가 지정되지 않은 의뢰입니다.", "INVALID_STATE", 409);
    await conn.execute(`UPDATE service_requests SET assignee_user_id = ? WHERE id = ?`, [assigneeUserId, requestId]);
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_REASSIGN_STAFF",
      from: r.status, to: r.status, metadata: { from: r.assignee_user_id, to: assigneeUserId, reassign: true },
    });
    return reload(conn, requestId);
  });
  return { request };
}

/* --------------------- Step 1→2: 보완 요청 / 재제출 ------------------ */

export async function rejectProductInspectionRequest(
  actor: User, requestId: number, reason: string, neededDocs?: string,
): Promise<PiWorkflowResult> {
  const trimmed = reason.trim();
  if (!trimmed) throw new WorkflowError("보완 요청 사유는 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "PI_REJECT_REQUEST");
    await applyPiStatus(conn, requestId, PI_STATUS.REQUEST_REJECTED);
    await insertMessage(conn, { requestId, authorId: actor.id, type: "REJECTION", message: trimmed, customerVisible: true });
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_REJECT_REQUEST",
      from: PI_STATUS.ASSIGNED, to: PI_STATUS.REQUEST_REJECTED, message: trimmed,
      metadata: { needed_docs: neededDocs?.trim() || null },
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `PI_REJECT_REQUEST ${request.request_number}`,
    ...mails.buildPiRejectRequestMail(request, { reason: trimmed, neededDocs: neededDocs?.trim() || null }),
  });
  return { request, mail };
}

export async function resubmitProductInspectionRequest(
  actor: User, requestId: number, note?: string,
): Promise<PiWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "PI_RESUBMIT_REQUEST");
    await applyPiStatus(conn, requestId, PI_STATUS.ASSIGNED);
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_RESUBMIT_REQUEST",
      from: PI_STATUS.REQUEST_REJECTED, to: PI_STATUS.ASSIGNED, message: note?.trim() || null,
    });
    return reload(conn, requestId);
  });
  // 내부 담당자 알림: 고객이 보완자료를 재제출함.
  const to = await assigneeEmail(requestId);
  const mail = to
    ? await sendMailSafe({
        to, context: `PI_RESUBMIT_REQUEST ${request.request_number}`,
        subject: `[제품검사] 고객 보완 재제출 — [${request.request_number ?? "-"}] ${request.title}`,
        text: `고객이 보완 자료를 재제출했습니다. 관리자 화면에서 다시 검토해 주세요.\n${note?.trim() ? `메모: ${note.trim()}` : ""}`,
      })
    : undefined;
  return { request, mail };
}

/* --------------------- Step 3: 검사 일정 확정 / 변경 ----------------- */

export interface ConfirmScheduleInput {
  planned_start_date: string;
  planned_end_date: string;
  planned_start_time?: string;
  planned_end_time?: string;
  inspection_location?: string;
  customer_memo?: string;
  internal_memo?: string;
}

export async function confirmProductInspectionSchedule(
  actor: User, requestId: number, input: ConfirmScheduleInput,
): Promise<PiWorkflowResult> {
  if (!validDate(input.planned_start_date) || !validDate(input.planned_end_date)) {
    throw new WorkflowError("검사 시작일/종료일이 올바르지 않습니다.", "VALIDATION", 400);
  }
  if (endBeforeStart(input.planned_start_date, input.planned_end_date)) {
    throw new WorkflowError("검사 종료일은 시작일보다 빠를 수 없습니다.", "VALIDATION", 400);
  }
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "PI_CONFIRM_SCHEDULE");
    await upsertProductInspection(conn, requestId, {
      planned_start_date: input.planned_start_date,
      planned_end_date: input.planned_end_date,
      planned_start_time: input.planned_start_time?.trim() || null,
      planned_end_time: input.planned_end_time?.trim() || null,
      inspection_location: input.inspection_location?.trim() || null,
      customer_visible_memo: input.customer_memo?.trim() || null,
      internal_memo: input.internal_memo?.trim() || null,
    });
    await conn.execute(
      `UPDATE product_inspections SET schedule_confirmed_at = NOW(), schedule_confirmed_by = ? WHERE service_request_id = ?`,
      [actor.id, requestId],
    );
    await applyPiStatus(conn, requestId, PI_STATUS.SCHEDULED);
    if (input.customer_memo?.trim()) {
      await insertMessage(conn, { requestId, authorId: actor.id, type: "CUSTOMER_MEMO", message: input.customer_memo.trim(), customerVisible: true });
    }
    if (input.internal_memo?.trim()) {
      await insertMessage(conn, { requestId, authorId: actor.id, type: "INTERNAL_MEMO", message: input.internal_memo.trim(), customerVisible: false });
    }
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_CONFIRM_SCHEDULE",
      from: PI_STATUS.ASSIGNED, to: PI_STATUS.SCHEDULED,
      metadata: { planned_start: input.planned_start_date, planned_end: input.planned_end_date },
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `PI_CONFIRM_SCHEDULE ${request.request_number}`,
    ...mails.buildPiScheduleConfirmedMail(request, {
      startDate: input.planned_start_date,
      endDate: input.planned_end_date,
      startTime: input.planned_start_time?.trim() || null,
      endTime: input.planned_end_time?.trim() || null,
      location: input.inspection_location?.trim() || null,
      publicMemo: input.customer_memo?.trim() || null,
    }),
  });
  return { request, mail };
}

export interface UpdateScheduleInput extends ConfirmScheduleInput {
  change_reason: string;
}

export async function updateProductInspectionSchedule(
  actor: User, requestId: number, input: UpdateScheduleInput,
): Promise<PiWorkflowResult> {
  const reason = input.change_reason?.trim();
  if (!reason) throw new WorkflowError("일정 변경 사유는 필수입니다.", "VALIDATION", 400);
  if (!validDate(input.planned_start_date) || !validDate(input.planned_end_date)) {
    throw new WorkflowError("검사 시작일/종료일이 올바르지 않습니다.", "VALIDATION", 400);
  }
  if (endBeforeStart(input.planned_start_date, input.planned_end_date)) {
    throw new WorkflowError("검사 종료일은 시작일보다 빠를 수 없습니다.", "VALIDATION", 400);
  }
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "PI_UPDATE_SCHEDULE");
    // 기존 값을 삭제하지 않고 변경 이력을 metadata 로 보존한다.
    const prev = await getProductInspection(requestId, conn);
    await upsertProductInspection(conn, requestId, {
      planned_start_date: input.planned_start_date,
      planned_end_date: input.planned_end_date,
      planned_start_time: input.planned_start_time?.trim() || null,
      planned_end_time: input.planned_end_time?.trim() || null,
      inspection_location: input.inspection_location?.trim() || null,
    });
    await conn.execute(
      `UPDATE product_inspections SET schedule_confirmed_at = NOW(), schedule_confirmed_by = ? WHERE service_request_id = ?`,
      [actor.id, requestId],
    );
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_UPDATE_SCHEDULE",
      from: PI_STATUS.SCHEDULED, to: PI_STATUS.SCHEDULED, message: reason,
      metadata: {
        previous_start_date: prev?.planned_start_date ?? null,
        previous_end_date: prev?.planned_end_date ?? null,
        new_start_date: input.planned_start_date,
        new_end_date: input.planned_end_date,
        change_reason: reason,
      },
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `PI_UPDATE_SCHEDULE ${request.request_number}`,
    ...mails.buildPiScheduleUpdatedMail(request, {
      startDate: input.planned_start_date,
      endDate: input.planned_end_date,
      location: input.inspection_location?.trim() || null,
      reason,
    }),
  });
  return { request, mail };
}

/* ----------------------- Step 3: 검사 시작 -------------------------- */

export async function startProductInspection(actor: User, requestId: number): Promise<PiWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "PI_START_INSPECTION");
    // 실제 시작 정보 기록(이미 있으면 유지). 행은 일정 확정 시 생성되어 존재한다.
    await conn.execute(
      `UPDATE product_inspections
         SET inspection_started_at = NOW(), inspection_started_by = ?,
             actual_start_date = COALESCE(actual_start_date, CURDATE()),
             actual_start_time = COALESCE(actual_start_time, CURTIME())
       WHERE service_request_id = ?`,
      [actor.id, requestId],
    );
    await applyPiStatus(conn, requestId, PI_STATUS.IN_PROGRESS);
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_START_INSPECTION",
      from: PI_STATUS.SCHEDULED, to: PI_STATUS.IN_PROGRESS,
    });
    return reload(conn, requestId);
  });
  return { request };
}

/* ----------------------- Step 3→4: 검사 진행 불가 / 재개 ------------- */

export async function blockProductInspection(
  actor: User, requestId: number, reason: string, opts?: { neededAction?: string; customerVisible?: boolean },
): Promise<PiWorkflowResult> {
  const trimmed = reason.trim();
  if (!trimmed) throw new WorkflowError("진행 불가 사유는 필수입니다.", "VALIDATION", 400);
  const customerVisible = opts?.customerVisible ?? false;
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "PI_BLOCK_INSPECTION");
    await applyPiStatus(conn, requestId, PI_STATUS.BLOCKED);
    await insertMessage(conn, {
      requestId, authorId: actor.id,
      type: customerVisible ? "CUSTOMER_MEMO" : "INTERNAL_MEMO",
      message: trimmed, customerVisible,
    });
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_BLOCK_INSPECTION",
      from: request.status, to: PI_STATUS.BLOCKED, message: trimmed,
      metadata: { resume_status: request.status, needed_action: opts?.neededAction?.trim() || null, customer_visible: customerVisible },
    });
    return reload(conn, requestId);
  });
  // 고객 조치가 필요한(공개) 경우에만 메일 발송.
  const mail = customerVisible
    ? await sendMailSafe({
        to: request.contact_email, context: `PI_BLOCK_INSPECTION ${request.request_number}`,
        ...mails.buildPiInspectionBlockedMail(request, { reason: trimmed, neededAction: opts?.neededAction?.trim() || null }),
      })
    : undefined;
  return { request, mail };
}

export async function resumeProductInspection(actor: User, requestId: number, note?: string): Promise<PiWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "PI_RESUME_INSPECTION");
    const meta = await getLatestHistoryMetaTo(requestId, PI_STATUS.BLOCKED, conn);
    const resume = String(meta?.resume_status ?? PI_STATUS.SCHEDULED);
    const target: PiStatus = resume === PI_STATUS.IN_PROGRESS ? PI_STATUS.IN_PROGRESS : PI_STATUS.SCHEDULED;
    await applyPiStatus(conn, requestId, target);
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_RESUME_INSPECTION",
      from: PI_STATUS.BLOCKED, to: target, message: note?.trim() || null,
    });
    return reload(conn, requestId);
  });
  return { request };
}

/* ------------------- Step 3→5: 검사 완료 ---------------------------- */

export interface CompleteInspectionInput {
  actual_start_date: string;
  actual_end_date: string;
  actual_start_time?: string;
  actual_end_time?: string;
  internal_memo?: string;
  customer_memo?: string;
}

export async function completeProductInspection(
  actor: User, requestId: number, input: CompleteInspectionInput,
): Promise<PiWorkflowResult> {
  if (!validDate(input.actual_start_date) || !validDate(input.actual_end_date)) {
    throw new WorkflowError("실제 검사 시작일/완료일이 올바르지 않습니다.", "VALIDATION", 400);
  }
  if (endBeforeStart(input.actual_start_date, input.actual_end_date)) {
    throw new WorkflowError("검사 완료일은 시작일보다 빠를 수 없습니다.", "VALIDATION", 400);
  }
  const request = await withTx(async (conn) => {
    const { request: cur } = await lockAndAuthorize(conn, actor, requestId, "PI_COMPLETE_INSPECTION");
    const fromStatus = cur.status; // SCHEDULED(시작 버튼 미사용) 또는 IN_PROGRESS
    await upsertProductInspection(conn, requestId, {
      actual_start_date: input.actual_start_date,
      actual_end_date: input.actual_end_date,
      actual_start_time: input.actual_start_time?.trim() || null,
      actual_end_time: input.actual_end_time?.trim() || null,
    });
    await conn.execute(
      `UPDATE product_inspections SET inspection_completed_at = NOW(), inspection_completed_by = ? WHERE service_request_id = ?`,
      [actor.id, requestId],
    );
    if (input.internal_memo?.trim()) {
      await insertMessage(conn, { requestId, authorId: actor.id, type: "INTERNAL_MEMO", message: input.internal_memo.trim(), customerVisible: false });
    }
    if (input.customer_memo?.trim()) {
      await insertMessage(conn, { requestId, authorId: actor.id, type: "CUSTOMER_MEMO", message: input.customer_memo.trim(), customerVisible: true });
    }
    await applyPiStatus(conn, requestId, PI_STATUS.COMPLETED);
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_COMPLETE_INSPECTION",
      from: fromStatus, to: PI_STATUS.COMPLETED,
      metadata: { actual_start: input.actual_start_date, actual_end: input.actual_end_date },
    });
    return reload(conn, requestId);
  });
  const pi = await getProductInspection(requestId);
  const mail = await sendMailSafe({
    to: request.contact_email, context: `PI_COMPLETE_INSPECTION ${request.request_number}`,
    ...mails.buildPiInspectionCompletedMail(request, {
      plannedStart: pi?.planned_start_date ?? null,
      actualStart: input.actual_start_date,
      actualEnd: input.actual_end_date,
      publicMemo: input.customer_memo?.trim() || null,
    }),
  });
  return { request, mail };
}

/* ------------------- Step 5→7: 다른 인증기관 리포트 제출 ------------- */

export interface SubmitReportInput {
  external_agency_name: string;
  external_agency_department?: string;
  external_agency_contact_name?: string;
  external_agency_contact_email?: string;
  external_agency_contact_phone?: string;
  external_reference_number?: string;
  report_submission_method?: string;
  report_submitted_at: string; // YYYY-MM-DD
  transfer_memo?: string;
}

export async function submitProductInspectionReport(
  actor: User, requestId: number, input: SubmitReportInput,
): Promise<PiWorkflowResult> {
  const agency = input.external_agency_name?.trim();
  if (!agency) throw new WorkflowError("전달 인증기관명은 필수입니다.", "VALIDATION", 400);
  if (!validDate(input.report_submitted_at)) throw new WorkflowError("리포트 제출일이 올바르지 않습니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "PI_SUBMIT_REPORT");
    // 검사 완료일 + 내부 검사 리포트(최소 1개) 확인.
    const pi = await getProductInspection(requestId, conn);
    if (!pi?.inspection_completed_at) throw new WorkflowError("검사 완료일이 입력되어야 합니다.", "INVALID_STATE", 409);
    const reportCount = await countFilesByType(requestId, "PRODUCT_INSPECTION_REPORT", conn);
    if (reportCount < 1) throw new WorkflowError("내부 검사 리포트를 먼저 업로드해야 합니다.", "VALIDATION", 400);

    await upsertProductInspection(conn, requestId, {
      external_agency_name: agency,
      external_agency_department: input.external_agency_department?.trim() || null,
      external_agency_contact_name: input.external_agency_contact_name?.trim() || null,
      external_agency_contact_email: input.external_agency_contact_email?.trim() || null,
      external_agency_contact_phone: input.external_agency_contact_phone?.trim() || null,
      external_reference_number: input.external_reference_number?.trim() || null,
      report_submission_method: input.report_submission_method?.trim() || null,
      report_submitted_at: input.report_submitted_at,
    });
    await conn.execute(
      `UPDATE product_inspections SET report_submitted_by = ? WHERE service_request_id = ?`,
      [actor.id, requestId],
    );
    if (input.transfer_memo?.trim()) {
      await insertMessage(conn, { requestId, authorId: actor.id, type: "INTERNAL_MEMO", message: input.transfer_memo.trim(), customerVisible: false });
    }
    await applyPiStatus(conn, requestId, PI_STATUS.REPORT_SUBMITTED);
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_SUBMIT_REPORT",
      from: PI_STATUS.COMPLETED, to: PI_STATUS.REPORT_SUBMITTED,
      metadata: { agency, report_submitted_at: input.report_submitted_at, method: input.report_submission_method?.trim() || null },
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `PI_SUBMIT_REPORT ${request.request_number}`,
    ...mails.buildPiReportSubmittedMail(request, { reportSubmittedAt: input.report_submitted_at }),
  });
  return { request, mail };
}

/* ------------------- Step 6: 리포트 처리 문제 / 해결 ----------------- */

export async function blockProductInspectionReport(
  actor: User, requestId: number, reason: string, opts?: { problemType?: string; neededAction?: string },
): Promise<PiWorkflowResult> {
  const trimmed = reason.trim();
  if (!trimmed) throw new WorkflowError("문제 사유는 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "PI_BLOCK_REPORT");
    await applyPiStatus(conn, requestId, PI_STATUS.REPORT_BLOCKED);
    await insertMessage(conn, { requestId, authorId: actor.id, type: "INTERNAL_MEMO", message: trimmed, customerVisible: false });
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_BLOCK_REPORT",
      from: request.status, to: PI_STATUS.REPORT_BLOCKED, message: trimmed,
      metadata: { resume_status: request.status, problem_type: opts?.problemType?.trim() || null, needed_action: opts?.neededAction?.trim() || null },
    });
    return reload(conn, requestId);
  });
  return { request };
}

export async function resumeProductInspectionReport(actor: User, requestId: number, note?: string): Promise<PiWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "PI_RESUME_REPORT");
    const meta = await getLatestHistoryMetaTo(requestId, PI_STATUS.REPORT_BLOCKED, conn);
    const resume = String(meta?.resume_status ?? PI_STATUS.COMPLETED);
    const target: PiStatus = resume === PI_STATUS.REPORT_SUBMITTED ? PI_STATUS.REPORT_SUBMITTED : PI_STATUS.COMPLETED;
    await applyPiStatus(conn, requestId, target);
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_RESUME_REPORT",
      from: PI_STATUS.REPORT_BLOCKED, to: target, message: note?.trim() || null,
    });
    return reload(conn, requestId);
  });
  return { request };
}

/* ------------------- Step 7: 외부 인증기관 입금 --------------------- */

export interface RecordPaymentInput {
  payer_organization_name: string;
  paid_amount: number;
  currency: string;
  payment_date: string; // YYYY-MM-DD
  depositor_name?: string;
  received_account?: string;
  external_reference_number?: string;
  internal_memo?: string;
}

export async function recordExternalAgencyPayment(
  actor: User, requestId: number, input: RecordPaymentInput,
): Promise<PiWorkflowResult> {
  const org = input.payer_organization_name?.trim();
  if (!org) throw new WorkflowError("입금 기관명은 필수입니다.", "VALIDATION", 400);
  if (!(input.paid_amount >= 0)) throw new WorkflowError("입금 금액이 올바르지 않습니다.", "VALIDATION", 400);
  if (!validDate(input.payment_date)) throw new WorkflowError("입금일자가 올바르지 않습니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "PI_RECORD_PAYMENT");
    await insertExternalAgencyPayment(conn, {
      serviceRequestId: requestId,
      payerOrganizationName: org,
      paidAmount: String(input.paid_amount),
      currency: input.currency?.trim() || "KRW",
      paymentDate: input.payment_date,
      depositorName: input.depositor_name?.trim() || null,
      receivedAccount: input.received_account?.trim() || null,
      externalReferenceNumber: input.external_reference_number?.trim() || null,
      memo: input.internal_memo?.trim() || null,
      submittedBy: actor.id,
    });
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_RECORD_PAYMENT",
      from: PI_STATUS.REPORT_SUBMITTED, to: PI_STATUS.REPORT_SUBMITTED,
      metadata: { org, amount: input.paid_amount, currency: input.currency, payment_date: input.payment_date },
    });
    return reload(conn, requestId);
  });
  // 내부 정산 정보이므로 고객 메일 없음.
  return { request };
}

/* ------------------- Step 8: 외부 입금 확인 문제 / 해결 -------------- */

export async function blockExternalAgencyPayment(
  actor: User, requestId: number, reason: string,
  opts?: { problemType?: string; expectedAmount?: number; confirmedAmount?: number },
): Promise<PiWorkflowResult> {
  const trimmed = reason.trim();
  if (!trimmed) throw new WorkflowError("문제 사유는 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "PI_BLOCK_PAYMENT");
    await applyPiStatus(conn, requestId, PI_STATUS.PAYMENT_BLOCKED);
    await insertMessage(conn, { requestId, authorId: actor.id, type: "INTERNAL_MEMO", message: trimmed, customerVisible: false });
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_BLOCK_PAYMENT",
      from: PI_STATUS.REPORT_SUBMITTED, to: PI_STATUS.PAYMENT_BLOCKED, message: trimmed,
      metadata: {
        problem_type: opts?.problemType?.trim() || null,
        expected_amount: opts?.expectedAmount ?? null,
        confirmed_amount: opts?.confirmedAmount ?? null,
      },
    });
    return reload(conn, requestId);
  });
  return { request };
}

export async function resumeExternalAgencyPayment(actor: User, requestId: number, note?: string): Promise<PiWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "PI_RESUME_PAYMENT");
    await applyPiStatus(conn, requestId, PI_STATUS.REPORT_SUBMITTED);
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_RESUME_PAYMENT",
      from: PI_STATUS.PAYMENT_BLOCKED, to: PI_STATUS.REPORT_SUBMITTED, message: note?.trim() || null,
    });
    return reload(conn, requestId);
  });
  return { request };
}

/* ------------------- Step 7→9: 최종 완료 ---------------------------- */

export async function completeProductInspectionProcess(actor: User, requestId: number): Promise<PiWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "PI_COMPLETE");
    const pi = await getProductInspection(requestId, conn);
    if (!pi?.inspection_completed_at) throw new WorkflowError("검사 완료일이 입력되어야 합니다.", "INVALID_STATE", 409);
    if (!pi?.report_submitted_at) throw new WorkflowError("리포트 제출일이 입력되어야 합니다.", "INVALID_STATE", 409);
    if (!pi?.external_agency_name) throw new WorkflowError("리포트 전달 인증기관이 입력되어야 합니다.", "INVALID_STATE", 409);
    const reportCount = await countFilesByType(requestId, "PRODUCT_INSPECTION_REPORT", conn);
    if (reportCount < 1) throw new WorkflowError("내부 검사 리포트가 업로드되어야 합니다.", "VALIDATION", 400);
    const pay = await getLatestPaymentByType(requestId, PI_PAYMENT_TYPE, conn);
    if (!pay || pay.status !== "CONFIRMED") {
      throw new WorkflowError("외부 인증기관 입금이 확인되지 않았습니다.", "INVALID_STATE", 409);
    }
    await applyPiStatus(conn, requestId, PI_STATUS.FINISHED, { setCompletedNow: true });
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_COMPLETE",
      from: PI_STATUS.REPORT_SUBMITTED, to: PI_STATUS.FINISHED,
    });
    return reload(conn, requestId);
  });
  const pi = await getProductInspection(requestId);
  const mail = await sendMailSafe({
    to: request.contact_email, context: `PI_COMPLETE ${request.request_number}`,
    ...mails.buildPiCompletedMail(request, {
      plannedStart: pi?.planned_start_date ?? null,
      actualEnd: pi?.actual_end_date ?? null,
      reportSubmittedAt: pi?.report_submitted_at ?? null,
    }),
  });
  return { request, mail };
}

/* ------------------------- 파일 업로드 (제품검사) ------------------- */

// 제품검사 파일 저장. is_customer_visible 은 PI_FILE_META 로 결정한다(리포트/증빙은 내부 전용).
export async function addProductInspectionFiles(
  actor: User,
  requestId: number,
  storedFiles: { meta: StoredFileMeta; fileType: string }[],
): Promise<void> {
  await withTx(async (conn) => {
    const r = await getRequestById(requestId, conn, true);
    if (!r) throw new WorkflowError("의뢰를 찾을 수 없습니다.", "NOT_FOUND", 404);
    if (r.service_type !== SVC) throw new WorkflowError("제품검사 의뢰가 아닙니다.", "INVALID_STATE", 409);
    const role = resolveRole(actor, r);
    if (!role) throw new WorkflowError("권한이 없습니다.", "FORBIDDEN", 403);

    for (const f of storedFiles) {
      if (!isPiFileType(f.fileType)) throw new WorkflowError("허용되지 않은 파일 종류입니다.", "VALIDATION", 400);
      // 고객은 제품사진만 업로드할 수 있다(내부 전용 파일 업로드 차단).
      if (role === "CUSTOMER" && f.fileType !== "PRODUCT_INSPECTION_PHOTO") {
        throw new WorkflowError("고객은 제품사진만 업로드할 수 있습니다.", "FORBIDDEN", 403);
      }
    }
    await insertRequestFiles(conn, requestId, storedFiles.map((f) => ({
      meta: f.meta, fileType: f.fileType, uploadedBy: actor.id,
      customerVisible: PI_FILE_META[f.fileType as PiFileType].customerVisible,
    })));
    await history(conn, {
      requestId, actorId: actor.id, action: "PI_UPLOAD_FILE",
      from: r.status, to: r.status, metadata: { by: role, count: storedFiles.length },
    });
  });
}
