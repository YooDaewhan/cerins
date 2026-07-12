// 스크랩 India 워크플로 전이 오케스트레이션. 컨트롤러에서 step/status 를 직접 수정하지 말고
// 반드시 이 서비스의 메서드를 호출한다. 각 메서드는:
//   1) 사용자 권한 확인   2) 현재 step+status 에서 가능한 행동인지(scrapIndiaWorkflow)
//   3) 필수 입력/파일 검증   4) 날짜 관계 검증   5) 트랜잭션(FOR UPDATE 로 상태 재확인)
//   6) 상태/이력/파일/결제/상세 저장   7) 커밋   8) 커밋 후 메일(best-effort, 실패해도 롤백 없음).
// TRCU/GOST · CEC India · 제품검사 워크플로와 완전히 분리되어 있으며 공통 헬퍼/테이블만 재사용한다.
// 중복 클릭/새로고침 재전송은 FOR UPDATE + 현재 상태 검증으로 한 번만 처리된다.

import type { User } from "@/src/lib/types";
import { isAdminLevel } from "@/src/lib/userTypes";
import type { ServiceRequest } from "@/src/lib/serviceRequestTypes";
import {
  SCRAP_STATUS,
  SCRAP_STATUS_STEP,
  SCRAP_PAYMENT_TYPE,
  scrapStepForStatus,
  isScrapFileType,
  SCRAP_FILE_META,
  type ScrapStatus,
  type ScrapFileType,
} from "@/src/lib/scrapIndiaTypes";
import { canScrapTransition, type ScrapAction } from "@/src/lib/scrapIndiaWorkflow";
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
  countCustomerDocumentFiles,
  getQuotation,
  getLatestPaymentByType,
  getLatestHistoryMetaTo,
  getScrapInspection,
  upsertScrapInspection,
  getScrapDgftRegistration,
  upsertScrapDgftRegistration,
} from "@/src/lib/serviceRequestRepo";
import { nextScrapRequestNumber } from "@/src/lib/requestNumberService";
import { listActiveDocumentRequirements } from "@/src/lib/serviceDocumentRequirements";
import { computeQuotation, type QuotationItemInput } from "@/src/lib/quotationMath";
import { getBankInfo, DEFAULT_CURRENCY } from "@/src/lib/requestSettings";
import type { StoredFileMeta } from "@/src/lib/requestStorage";
import { sendMailSafe } from "@/src/lib/mail";
import * as mails from "@/src/lib/scrapIndiaMails";

const SVC = "SCRAP_INDIA";
const DOC_STEP = 5; // 고객 제출서류 단계

export interface ScrapWorkflowResult {
  request: ServiceRequest;
  mail?: { ok: boolean; error?: string };
}

/* ----------------------------- 공통 유틸 ---------------------------- */

async function applyScrapStatus(
  conn: Tx,
  requestId: number,
  toStatus: ScrapStatus,
  extra?: { assigneeUserId?: number; requestNumber?: string; setAssignedNow?: boolean; setCompletedNow?: boolean },
): Promise<void> {
  await updateStatusStep(conn, requestId, toStatus, SCRAP_STATUS_STEP[toStatus], extra);
}

// FOR UPDATE 로 잠그고 스크랩 India 의뢰 여부 + 권한 + 전이 가능 여부 검사.
async function lockAndAuthorize(
  conn: Tx,
  user: User,
  requestId: number,
  action: ScrapAction,
): Promise<{ request: ServiceRequest; role: WorkflowRole }> {
  const request = await getRequestById(requestId, conn, true);
  if (!request) throw new WorkflowError("의뢰를 찾을 수 없습니다.", "NOT_FOUND", 404);
  if (request.service_type !== SVC) {
    throw new WorkflowError("스크랩 India 의뢰가 아닙니다.", "INVALID_STATE", 409);
  }
  const role = resolveRole(user, request);
  if (!role) throw new WorkflowError("권한이 없습니다.", "FORBIDDEN", 403);
  if (!canScrapTransition(action, request.status, role)) {
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
    fromStep: scrapStepForStatus(args.from), toStep: scrapStepForStatus(args.to),
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

async function notifyAssignee(
  requestId: number,
  requestNumber: string | null,
  subject: string,
  text: string,
): Promise<{ ok: boolean; error?: string } | undefined> {
  const to = await assigneeEmail(requestId);
  if (!to) return undefined;
  return sendMailSafe({ to, context: `${subject} ${requestNumber ?? "-"}`, subject, text });
}

// YYYY-MM-DD 문자열 비교(사전식). end < start 이면 true.
function endBeforeStart(start: string, end: string): boolean {
  return Boolean(start) && Boolean(end) && end < start;
}
function validDate(v: string | undefined | null): boolean {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}
function clean(v: string | undefined | null): string | null {
  return v?.trim() ? v.trim() : null;
}

/* ================================================================== */
/* Step 0 제출은 requestWorkflowService.submitRequest + 상세(scrap_inspections)  */
/* upsert 로 처리한다(app/api/requests/route.ts). 여기서는 배정 이후 전이만 다룬다. */
/* ================================================================== */

/* ------------------- Step 0: 검사 요청 상세 저장 -------------------- */

export interface ScrapInitialRequestInput {
  requested_start_date?: string;
  requested_end_date?: string;
  requested_start_time?: string;
  requested_end_time?: string;
  requested_location?: string;
  requested_location_detail?: string;
  site_contact_name?: string;
  site_contact_phone?: string;
  request_note?: string; // 검사 관련 요청사항(고객 공개 메모로 보존)
}

// submitRequest(공통) 로 service_requests + 파일이 생성된 직후, 스크랩 검사 요청 상세를 저장한다.
// 신청 당시 값 스냅샷은 service_requests 의 회사명/담당자 등 공통 컬럼이 이미 보관한다.
export async function saveScrapInitialRequest(
  requestId: number, input: ScrapInitialRequestInput,
): Promise<void> {
  await withTx(async (conn) => {
    await upsertScrapInspection(conn, requestId, {
      requested_start_date: clean(input.requested_start_date),
      requested_end_date: clean(input.requested_end_date),
      requested_start_time: clean(input.requested_start_time),
      requested_end_time: clean(input.requested_end_time),
      requested_location: clean(input.requested_location),
      requested_location_detail: clean(input.requested_location_detail),
      site_contact_name: clean(input.site_contact_name),
      site_contact_phone: clean(input.site_contact_phone),
    });
    if (clean(input.request_note)) {
      // 검사 관련 요청사항은 고객 공개 메모로 보존(담당자 확정 메모와 별개 행).
      await insertMessage(conn, {
        requestId, authorId: null, type: "CUSTOMER_MEMO", message: input.request_note!.trim(), customerVisible: true,
      });
    }
  });
}

/* ------------------------- Step 1: 담당자 지정 ---------------------- */

export async function assignScrapStaff(
  actor: User, requestId: number, assigneeUserId: number, year2?: number,
): Promise<ScrapWorkflowResult> {
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "SCRAP_ASSIGN_STAFF");
    // 접수번호는 최초 1회만 발급(scrap-YY-0001). 담당자가 바뀌어도 번호는 유지.
    let requestNumber = request.request_number;
    if (!requestNumber) {
      const yy = year2 ?? new Date().getFullYear() % 100;
      requestNumber = await nextScrapRequestNumber(conn, yy);
    }
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.ASSIGNED, {
      assigneeUserId, requestNumber, setAssignedNow: true,
    });
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_ASSIGN_STAFF",
      from: request.status, to: SCRAP_STATUS.ASSIGNED,
      metadata: { assigneeUserId, requestNumber },
    });
    return reload(conn, requestId);
  });
  const mail = await notifyAssignee(
    requestId, request.request_number,
    `[스크랩검사] 신규 의뢰 배정 — [${request.request_number ?? "-"}] ${request.title}`,
    "스크랩 India 의뢰가 배정되었습니다. 관리자 화면에서 검사 요청 일정을 검토해 주세요.",
  );
  return { request, mail };
}

// 담당자 변경(상태/접수번호 유지). 관리자 전용.
export async function reassignScrapStaff(
  actor: User, requestId: number, assigneeUserId: number,
): Promise<ScrapWorkflowResult> {
  if (!isAdminLevel(actor.user_level)) throw new WorkflowError("권한이 없습니다.", "FORBIDDEN", 403);
  const request = await withTx(async (conn) => {
    const r = await getRequestById(requestId, conn, true);
    if (!r) throw new WorkflowError("의뢰를 찾을 수 없습니다.", "NOT_FOUND", 404);
    if (r.service_type !== SVC) throw new WorkflowError("스크랩 India 의뢰가 아닙니다.", "INVALID_STATE", 409);
    if (!r.request_number) throw new WorkflowError("아직 담당자가 지정되지 않은 의뢰입니다.", "INVALID_STATE", 409);
    await conn.execute(`UPDATE service_requests SET assignee_user_id = ? WHERE id = ?`, [assigneeUserId, requestId]);
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_REASSIGN_STAFF",
      from: r.status, to: r.status, metadata: { from: r.assignee_user_id, to: assigneeUserId, reassign: true },
    });
    return reload(conn, requestId);
  });
  return { request };
}

/* --------------- Step 1→3 / 1→2 / 2→1: 검사 일정 검토 --------------- */

export interface ConfirmScrapScheduleInput {
  confirmed_start_date: string;
  confirmed_end_date: string;
  confirmed_start_time?: string;
  confirmed_end_time?: string;
  confirmed_location?: string;
  change_reason?: string; // 고객 요청과 다른 일정으로 확정하는 경우 사유(선택)
  customer_memo?: string;
  internal_memo?: string;
}

export async function confirmScrapInspectionSchedule(
  actor: User, requestId: number, input: ConfirmScrapScheduleInput,
): Promise<ScrapWorkflowResult> {
  if (!validDate(input.confirmed_start_date) || !validDate(input.confirmed_end_date)) {
    throw new WorkflowError("확정 검사 시작일/종료일이 올바르지 않습니다.", "VALIDATION", 400);
  }
  if (endBeforeStart(input.confirmed_start_date, input.confirmed_end_date)) {
    throw new WorkflowError("검사 종료일은 시작일보다 빠를 수 없습니다.", "VALIDATION", 400);
  }
  const changed = Boolean(clean(input.change_reason));
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_CONFIRM_SCHEDULE");
    await upsertScrapInspection(conn, requestId, {
      confirmed_start_date: input.confirmed_start_date,
      confirmed_end_date: input.confirmed_end_date,
      confirmed_start_time: clean(input.confirmed_start_time),
      confirmed_end_time: clean(input.confirmed_end_time),
      confirmed_location: clean(input.confirmed_location),
      customer_visible_memo: clean(input.customer_memo),
      internal_memo: clean(input.internal_memo),
    });
    await conn.execute(
      `UPDATE scrap_inspections SET schedule_confirmed_at = NOW(), schedule_confirmed_by = ? WHERE service_request_id = ?`,
      [actor.id, requestId],
    );
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.INSPECTION_SCHEDULED);
    if (clean(input.customer_memo)) {
      await insertMessage(conn, { requestId, authorId: actor.id, type: "CUSTOMER_MEMO", message: input.customer_memo!.trim(), customerVisible: true });
    }
    if (clean(input.internal_memo)) {
      await insertMessage(conn, { requestId, authorId: actor.id, type: "INTERNAL_MEMO", message: input.internal_memo!.trim(), customerVisible: false });
    }
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_CONFIRM_SCHEDULE",
      from: SCRAP_STATUS.ASSIGNED, to: SCRAP_STATUS.INSPECTION_SCHEDULED,
      message: clean(input.change_reason),
      metadata: { confirmed_start: input.confirmed_start_date, confirmed_end: input.confirmed_end_date, changed },
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `SCRAP_CONFIRM_SCHEDULE ${request.request_number}`,
    ...mails.buildScrapScheduleConfirmedMail(request, {
      startDate: input.confirmed_start_date,
      endDate: input.confirmed_end_date,
      startTime: clean(input.confirmed_start_time),
      endTime: clean(input.confirmed_end_time),
      location: clean(input.confirmed_location),
      publicMemo: clean(input.customer_memo),
      changed,
      changeReason: clean(input.change_reason),
    }),
  });
  return { request, mail };
}

export interface RequestScrapScheduleRevisionInput {
  reason: string;
  alt_start_date?: string;
  alt_end_date?: string;
  alt_time?: string;
  location_note?: string;
  customer_memo?: string;
}

export async function requestScrapScheduleRevision(
  actor: User, requestId: number, input: RequestScrapScheduleRevisionInput,
): Promise<ScrapWorkflowResult> {
  const reason = clean(input.reason);
  if (!reason) throw new WorkflowError("조정 요청 사유는 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_REQUEST_SCHEDULE_REVISION");
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.SCHEDULE_REVISION_REQUIRED);
    await insertMessage(conn, { requestId, authorId: actor.id, type: "CUSTOMER_MEMO", message: reason, customerVisible: true });
    if (clean(input.customer_memo)) {
      await insertMessage(conn, { requestId, authorId: actor.id, type: "CUSTOMER_MEMO", message: input.customer_memo!.trim(), customerVisible: true });
    }
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_REQUEST_SCHEDULE_REVISION",
      from: SCRAP_STATUS.ASSIGNED, to: SCRAP_STATUS.SCHEDULE_REVISION_REQUIRED, message: reason,
      metadata: {
        alt_start_date: clean(input.alt_start_date), alt_end_date: clean(input.alt_end_date),
        alt_time: clean(input.alt_time), location_note: clean(input.location_note),
      },
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `SCRAP_REQUEST_SCHEDULE_REVISION ${request.request_number}`,
    ...mails.buildScrapScheduleRevisionMail(request, {
      reason,
      altStartDate: clean(input.alt_start_date), altEndDate: clean(input.alt_end_date),
      altTime: clean(input.alt_time), locationNote: clean(input.location_note),
      publicMemo: clean(input.customer_memo),
    }),
  });
  return { request, mail };
}

export interface ResubmitScrapScheduleInput {
  requested_start_date?: string;
  requested_end_date?: string;
  requested_start_time?: string;
  requested_end_time?: string;
  requested_location?: string;
  requested_location_detail?: string;
  site_contact_name?: string;
  site_contact_phone?: string;
  note?: string;
}

export async function resubmitScrapSchedule(
  actor: User, requestId: number, input: ResubmitScrapScheduleInput,
): Promise<ScrapWorkflowResult> {
  if (input.requested_start_date && !validDate(input.requested_start_date)) {
    throw new WorkflowError("검사 요청 시작일이 올바르지 않습니다.", "VALIDATION", 400);
  }
  if (input.requested_end_date && !validDate(input.requested_end_date)) {
    throw new WorkflowError("검사 요청 종료일이 올바르지 않습니다.", "VALIDATION", 400);
  }
  if (
    input.requested_start_date && input.requested_end_date &&
    endBeforeStart(input.requested_start_date, input.requested_end_date)
  ) {
    throw new WorkflowError("검사 종료일은 시작일보다 빠를 수 없습니다.", "VALIDATION", 400);
  }
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_RESUBMIT_SCHEDULE");
    const prev = await getScrapInspection(requestId, conn);
    await upsertScrapInspection(conn, requestId, {
      requested_start_date: clean(input.requested_start_date),
      requested_end_date: clean(input.requested_end_date),
      requested_start_time: clean(input.requested_start_time),
      requested_end_time: clean(input.requested_end_time),
      requested_location: clean(input.requested_location),
      requested_location_detail: clean(input.requested_location_detail),
      site_contact_name: clean(input.site_contact_name),
      site_contact_phone: clean(input.site_contact_phone),
    });
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.ASSIGNED);
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_RESUBMIT_SCHEDULE",
      from: SCRAP_STATUS.SCHEDULE_REVISION_REQUIRED, to: SCRAP_STATUS.ASSIGNED, message: clean(input.note),
      metadata: {
        previous_start_date: prev?.requested_start_date ?? null,
        previous_end_date: prev?.requested_end_date ?? null,
        new_start_date: clean(input.requested_start_date),
        new_end_date: clean(input.requested_end_date),
      },
    });
    return reload(conn, requestId);
  });
  const mail = await notifyAssignee(
    requestId, request.request_number,
    `[스크랩검사] 고객 일정 재제출 — [${request.request_number ?? "-"}] ${request.title}`,
    `고객이 검사 요청 일정을 수정해 재제출했습니다. 관리자 화면에서 다시 검토해 주세요.${clean(input.note) ? `\n메모: ${input.note!.trim()}` : ""}`,
  );
  return { request, mail };
}

/* ----------------------- Step 3: 검사 시작 -------------------------- */

export async function startScrapInspection(actor: User, requestId: number): Promise<ScrapWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_START_INSPECTION");
    await conn.execute(
      `UPDATE scrap_inspections
         SET inspection_started_at = NOW(), inspection_started_by = ?,
             actual_start_date = COALESCE(actual_start_date, CURDATE()),
             actual_start_time = COALESCE(actual_start_time, CURTIME())
       WHERE service_request_id = ?`,
      [actor.id, requestId],
    );
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.INSPECTION_IN_PROGRESS);
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_START_INSPECTION",
      from: SCRAP_STATUS.INSPECTION_SCHEDULED, to: SCRAP_STATUS.INSPECTION_IN_PROGRESS,
    });
    return reload(conn, requestId);
  });
  return { request };
}

/* ----------------------- Step 3→4: 검사 진행 불가 / 재개 ------------- */

export async function blockScrapInspection(
  actor: User, requestId: number, reason: string,
  opts?: { problemType?: string; neededAction?: string; customerVisible?: boolean },
): Promise<ScrapWorkflowResult> {
  const trimmed = clean(reason);
  if (!trimmed) throw new WorkflowError("진행 불가 사유는 필수입니다.", "VALIDATION", 400);
  const customerVisible = opts?.customerVisible ?? false;
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "SCRAP_BLOCK_INSPECTION");
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.INSPECTION_BLOCKED);
    await insertMessage(conn, {
      requestId, authorId: actor.id,
      type: customerVisible ? "CUSTOMER_MEMO" : "INTERNAL_MEMO",
      message: trimmed, customerVisible,
    });
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_BLOCK_INSPECTION",
      from: request.status, to: SCRAP_STATUS.INSPECTION_BLOCKED, message: trimmed,
      metadata: {
        resume_status: request.status, problem_type: clean(opts?.problemType),
        needed_action: clean(opts?.neededAction), customer_visible: customerVisible,
      },
    });
    return reload(conn, requestId);
  });
  const mail = customerVisible
    ? await sendMailSafe({
        to: request.contact_email, context: `SCRAP_BLOCK_INSPECTION ${request.request_number}`,
        ...mails.buildScrapInspectionBlockedMail(request, { reason: trimmed, neededAction: clean(opts?.neededAction) }),
      })
    : undefined;
  return { request, mail };
}

export async function resumeScrapInspection(actor: User, requestId: number, note?: string): Promise<ScrapWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_RESUME_INSPECTION");
    const meta = await getLatestHistoryMetaTo(requestId, SCRAP_STATUS.INSPECTION_BLOCKED, conn);
    const resume = String(meta?.resume_status ?? SCRAP_STATUS.INSPECTION_SCHEDULED);
    const target: ScrapStatus =
      resume === SCRAP_STATUS.INSPECTION_IN_PROGRESS ? SCRAP_STATUS.INSPECTION_IN_PROGRESS : SCRAP_STATUS.INSPECTION_SCHEDULED;
    await applyScrapStatus(conn, requestId, target);
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_RESUME_INSPECTION",
      from: SCRAP_STATUS.INSPECTION_BLOCKED, to: target, message: clean(note),
    });
    return reload(conn, requestId);
  });
  return { request };
}

/* ------------------- Step 3→5: 검사 완료 ---------------------------- */

export interface CompleteScrapInspectionInput {
  actual_start_date: string;
  actual_end_date: string;
  actual_start_time?: string;
  actual_end_time?: string;
  customer_memo?: string;
  internal_memo?: string;
}

export async function completeScrapInspection(
  actor: User, requestId: number, input: CompleteScrapInspectionInput,
): Promise<ScrapWorkflowResult> {
  if (!validDate(input.actual_end_date)) {
    throw new WorkflowError("실제 검사 완료일은 필수입니다.", "VALIDATION", 400);
  }
  if (input.actual_start_date && !validDate(input.actual_start_date)) {
    throw new WorkflowError("실제 검사 시작일이 올바르지 않습니다.", "VALIDATION", 400);
  }
  if (
    input.actual_start_date &&
    endBeforeStart(input.actual_start_date, input.actual_end_date)
  ) {
    throw new WorkflowError("검사 완료일은 시작일보다 빠를 수 없습니다.", "VALIDATION", 400);
  }
  const request = await withTx(async (conn) => {
    const { request: cur } = await lockAndAuthorize(conn, actor, requestId, "SCRAP_COMPLETE_INSPECTION");
    const fromStatus = cur.status; // SCHEDULED(시작 버튼 미사용) 또는 IN_PROGRESS
    await upsertScrapInspection(conn, requestId, {
      actual_start_date: clean(input.actual_start_date),
      actual_end_date: input.actual_end_date,
      actual_start_time: clean(input.actual_start_time),
      actual_end_time: clean(input.actual_end_time),
    });
    await conn.execute(
      `UPDATE scrap_inspections SET inspection_completed_at = NOW(), inspection_completed_by = ? WHERE service_request_id = ?`,
      [actor.id, requestId],
    );
    if (clean(input.internal_memo)) {
      await insertMessage(conn, { requestId, authorId: actor.id, type: "INTERNAL_MEMO", message: input.internal_memo!.trim(), customerVisible: false });
    }
    if (clean(input.customer_memo)) {
      await insertMessage(conn, { requestId, authorId: actor.id, type: "CUSTOMER_MEMO", message: input.customer_memo!.trim(), customerVisible: true });
    }
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.CUSTOMER_DOCUMENTS_PENDING);
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_COMPLETE_INSPECTION",
      from: fromStatus, to: SCRAP_STATUS.CUSTOMER_DOCUMENTS_PENDING,
      metadata: { actual_start: clean(input.actual_start_date), actual_end: input.actual_end_date },
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `SCRAP_COMPLETE_INSPECTION ${request.request_number}`,
    ...mails.buildScrapInspectionCompletedMail(request, {
      actualStart: clean(input.actual_start_date),
      actualEnd: input.actual_end_date,
      publicMemo: clean(input.customer_memo),
    }),
  });
  return { request, mail };
}

/* --------------- Step 5/6: 고객 서류 제출 / 검토 / 보완 -------------- */

// 활성 필수 서류가 모두 제출되었는지 확인(파일은 files 라우트로 먼저 업로드된 상태).
async function assertRequiredDocumentsPresent(conn: Tx, requestId: number): Promise<void> {
  const reqs = await listActiveDocumentRequirements(SVC, DOC_STEP, conn);
  for (const req of reqs) {
    if (!req.is_required) continue;
    const cnt = await countCustomerDocumentFiles(requestId, req.id, conn);
    if (cnt < 1) {
      throw new WorkflowError(`필수 서류 "${req.display_name}" 를 제출해야 합니다.`, "VALIDATION", 400);
    }
  }
}

export async function submitScrapCustomerDocuments(
  actor: User, requestId: number, note?: string,
): Promise<ScrapWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_SUBMIT_DOCUMENTS");
    await assertRequiredDocumentsPresent(conn, requestId);
    await conn.execute(
      `UPDATE scrap_inspections SET customer_documents_submitted_at = NOW() WHERE service_request_id = ?`,
      [requestId],
    );
    if (clean(note)) {
      await insertMessage(conn, { requestId, authorId: actor.id, type: "CUSTOMER_MEMO", message: note!.trim(), customerVisible: true });
    }
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.CUSTOMER_DOCUMENTS_SUBMITTED);
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_SUBMIT_DOCUMENTS",
      from: SCRAP_STATUS.CUSTOMER_DOCUMENTS_PENDING, to: SCRAP_STATUS.CUSTOMER_DOCUMENTS_SUBMITTED, message: clean(note),
    });
    return reload(conn, requestId);
  });
  const mail = await notifyAssignee(
    requestId, request.request_number,
    `[스크랩검사] 고객 서류 제출 — [${request.request_number ?? "-"}] ${request.title}`,
    "고객이 제출 서류를 등록했습니다. 관리자 화면에서 서류를 검토해 주세요.",
  );
  return { request, mail };
}

export async function resubmitScrapCustomerDocuments(
  actor: User, requestId: number, note?: string,
): Promise<ScrapWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_RESUBMIT_DOCUMENTS");
    await assertRequiredDocumentsPresent(conn, requestId);
    await conn.execute(
      `UPDATE scrap_inspections SET customer_documents_submitted_at = NOW() WHERE service_request_id = ?`,
      [requestId],
    );
    if (clean(note)) {
      await insertMessage(conn, { requestId, authorId: actor.id, type: "CUSTOMER_MEMO", message: note!.trim(), customerVisible: true });
    }
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.CUSTOMER_DOCUMENTS_SUBMITTED);
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_RESUBMIT_DOCUMENTS",
      from: SCRAP_STATUS.DOCUMENTS_REVISION_REQUIRED, to: SCRAP_STATUS.CUSTOMER_DOCUMENTS_SUBMITTED, message: clean(note),
    });
    return reload(conn, requestId);
  });
  const mail = await notifyAssignee(
    requestId, request.request_number,
    `[스크랩검사] 고객 보완 서류 재제출 — [${request.request_number ?? "-"}] ${request.title}`,
    "고객이 보완 서류를 재제출했습니다. 관리자 화면에서 다시 검토해 주세요.",
  );
  return { request, mail };
}

export async function requestScrapDocumentRevision(
  actor: User, requestId: number, reason: string, neededDocs?: string,
): Promise<ScrapWorkflowResult> {
  const trimmed = clean(reason);
  if (!trimmed) throw new WorkflowError("보완 요청 사유는 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_REQUEST_DOCUMENT_REVISION");
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.DOCUMENTS_REVISION_REQUIRED);
    await insertMessage(conn, { requestId, authorId: actor.id, type: "REJECTION", message: trimmed, customerVisible: true });
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_REQUEST_DOCUMENT_REVISION",
      from: SCRAP_STATUS.CUSTOMER_DOCUMENTS_SUBMITTED, to: SCRAP_STATUS.DOCUMENTS_REVISION_REQUIRED, message: trimmed,
      metadata: { needed_docs: clean(neededDocs) },
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `SCRAP_REQUEST_DOCUMENT_REVISION ${request.request_number}`,
    ...mails.buildScrapDocumentRevisionMail(request, { reason: trimmed, neededDocs: clean(neededDocs) }),
  });
  return { request, mail };
}

export async function approveScrapCustomerDocuments(actor: User, requestId: number): Promise<ScrapWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_APPROVE_DOCUMENTS");
    await conn.execute(
      `UPDATE scrap_inspections SET customer_documents_confirmed_at = NOW(), customer_documents_confirmed_by = ? WHERE service_request_id = ?`,
      [actor.id, requestId],
    );
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.REPORT_PREPARING);
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_APPROVE_DOCUMENTS",
      from: SCRAP_STATUS.CUSTOMER_DOCUMENTS_SUBMITTED, to: SCRAP_STATUS.REPORT_PREPARING,
    });
    return reload(conn, requestId);
  });
  return { request };
}

/* --------------- Step 7/8: 내부 리포트 + 청구 ----------------------- */

export async function completeScrapInternalReport(
  actor: User, requestId: number, opts?: { internal_memo?: string },
): Promise<ScrapWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_COMPLETE_REPORT");
    const reportCount = await countFilesByType(requestId, "SCRAP_INSPECTION_REPORT", conn);
    if (reportCount < 1) throw new WorkflowError("내부 검사 리포트를 먼저 업로드해야 합니다.", "VALIDATION", 400);
    if (clean(opts?.internal_memo)) {
      await insertMessage(conn, { requestId, authorId: actor.id, type: "INTERNAL_MEMO", message: opts!.internal_memo!.trim(), customerVisible: false });
    }
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.REPORT_COMPLETED);
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_COMPLETE_REPORT",
      from: SCRAP_STATUS.REPORT_PREPARING, to: SCRAP_STATUS.REPORT_COMPLETED,
    });
    return reload(conn, requestId);
  });
  return { request };
}

export async function blockScrapReport(
  actor: User, requestId: number, reason: string, opts?: { problemType?: string; neededAction?: string; customerVisible?: boolean },
): Promise<ScrapWorkflowResult> {
  const trimmed = clean(reason);
  if (!trimmed) throw new WorkflowError("문제 사유는 필수입니다.", "VALIDATION", 400);
  const customerVisible = opts?.customerVisible ?? false;
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "SCRAP_BLOCK_REPORT");
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.REPORT_BLOCKED);
    await insertMessage(conn, {
      requestId, authorId: actor.id, type: customerVisible ? "CUSTOMER_MEMO" : "INTERNAL_MEMO", message: trimmed, customerVisible,
    });
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_BLOCK_REPORT",
      from: request.status, to: SCRAP_STATUS.REPORT_BLOCKED, message: trimmed,
      metadata: { resume_status: request.status, problem_type: clean(opts?.problemType), needed_action: clean(opts?.neededAction), customer_visible: customerVisible },
    });
    return reload(conn, requestId);
  });
  return { request };
}

export async function resumeScrapReport(actor: User, requestId: number, note?: string): Promise<ScrapWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_RESUME_REPORT");
    const meta = await getLatestHistoryMetaTo(requestId, SCRAP_STATUS.REPORT_BLOCKED, conn);
    const resume = String(meta?.resume_status ?? SCRAP_STATUS.REPORT_PREPARING);
    const target: ScrapStatus = resume === SCRAP_STATUS.REPORT_COMPLETED ? SCRAP_STATUS.REPORT_COMPLETED : SCRAP_STATUS.REPORT_PREPARING;
    await applyScrapStatus(conn, requestId, target);
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_RESUME_REPORT",
      from: SCRAP_STATUS.REPORT_BLOCKED, to: target, message: clean(note),
    });
    return reload(conn, requestId);
  });
  return { request };
}

export interface IssueScrapBillingInput {
  currency?: string;
  items: QuotationItemInput[];
  due_date?: string; // YYYY-MM-DD
  guide?: string;
}

export async function issueScrapBilling(
  actor: User, requestId: number, input: IssueScrapBillingInput,
): Promise<ScrapWorkflowResult> {
  if (!input.items || input.items.length === 0) {
    throw new WorkflowError("청구 항목이 최소 1개 필요합니다.", "VALIDATION", 400);
  }
  if (input.due_date && !validDate(input.due_date)) {
    throw new WorkflowError("지급기한이 올바르지 않습니다.", "VALIDATION", 400);
  }
  const currency = clean(input.currency) || DEFAULT_CURRENCY;
  const computed = computeQuotation(input.items); // 서버 재계산(총액 = Σ 수량×단가)

  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_ISSUE_BILLING");
    const reportCount = await countFilesByType(requestId, "SCRAP_INSPECTION_REPORT", conn);
    if (reportCount < 1) throw new WorkflowError("내부 검사 리포트가 있어야 청구할 수 있습니다.", "VALIDATION", 400);

    // 단일 청구(선금/잔금 구분 없음). deposit=0, balance=total 로 저장, 청구 총액은 total_amount.
    await conn.execute(
      `INSERT INTO quotations
         (service_request_id, currency, total_amount, deposit_amount, balance_amount, notes, created_by, sent_at)
       VALUES (?, ?, ?, 0, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         currency = VALUES(currency), total_amount = VALUES(total_amount),
         deposit_amount = 0, balance_amount = VALUES(balance_amount),
         notes = VALUES(notes), created_by = VALUES(created_by), sent_at = NOW()`,
      [requestId, currency, computed.totalAmount, computed.totalAmount, clean(input.guide), actor.id],
    );
    const quotation = await getQuotation(requestId, conn);
    const quotationId = quotation!.id;
    await conn.execute(`DELETE FROM quotation_items WHERE quotation_id = ?`, [quotationId]);
    let order = 0;
    for (const it of computed.items) {
      await conn.execute(
        `INSERT INTO quotation_items
           (quotation_id, item_type, item_name, quantity, unit_price, amount, memo, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [quotationId, it.item_type ?? null, it.item_name, it.quantity, it.unit_price, it.amount, it.memo ?? null, order++],
      );
    }
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.PAYMENT_REQUESTED);
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_ISSUE_BILLING",
      from: SCRAP_STATUS.REPORT_COMPLETED, to: SCRAP_STATUS.PAYMENT_REQUESTED,
      metadata: { total: computed.totalAmount, currency, due_date: clean(input.due_date) },
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `SCRAP_ISSUE_BILLING ${request.request_number}`,
    ...mails.buildScrapBillingMail(request, {
      currency, total: computed.totalAmount,
      items: computed.items.map((it) => ({ item_name: it.item_name, amount: it.amount })),
      dueDate: clean(input.due_date), guide: clean(input.guide), bank: getBankInfo(),
    }),
  });
  return { request, mail };
}

/* --------------- Step 9/10: 고객 입금 / 확인 / 확인불가 -------------- */

export interface ScrapPaymentInput {
  depositor_name: string;
  sender_account?: string;
  payment_date?: string;
  memo?: string;
}

async function insertScrapPayment(
  conn: Tx, requestId: number, input: ScrapPaymentInput, submittedBy: number,
): Promise<void> {
  const q = await getQuotation(requestId, conn);
  await conn.execute(
    `INSERT INTO payments
       (service_request_id, payment_type, expected_amount, currency, depositor_name, sender_account, payment_date, memo, status, submitted_by, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, NOW())`,
    [
      requestId, SCRAP_PAYMENT_TYPE, q?.total_amount ?? null, q?.currency ?? DEFAULT_CURRENCY,
      input.depositor_name.trim(), clean(input.sender_account), clean(input.payment_date), clean(input.memo), submittedBy,
    ],
  );
}

export async function submitScrapPayment(
  actor: User, requestId: number, input: ScrapPaymentInput,
): Promise<ScrapWorkflowResult> {
  if (!clean(input.depositor_name)) throw new WorkflowError("입금자명은 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_SUBMIT_PAYMENT");
    await insertScrapPayment(conn, requestId, input, actor.id);
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.PAYMENT_SUBMITTED);
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_SUBMIT_PAYMENT",
      from: SCRAP_STATUS.PAYMENT_REQUESTED, to: SCRAP_STATUS.PAYMENT_SUBMITTED,
    });
    return reload(conn, requestId);
  });
  const mail = await notifyAssignee(
    requestId, request.request_number,
    `[스크랩검사] 고객 입금 정보 제출 — [${request.request_number ?? "-"}] ${request.title}`,
    "고객이 입금 정보를 제출했습니다. 관리자 화면에서 입금을 확인해 주세요.",
  );
  return { request, mail };
}

export async function resubmitScrapPayment(
  actor: User, requestId: number, input: ScrapPaymentInput,
): Promise<ScrapWorkflowResult> {
  if (!clean(input.depositor_name)) throw new WorkflowError("입금자명은 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_RESUBMIT_PAYMENT");
    // 이전 결제 정보는 보존하고 새 행을 추가한다.
    await insertScrapPayment(conn, requestId, input, actor.id);
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.PAYMENT_SUBMITTED);
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_RESUBMIT_PAYMENT",
      from: SCRAP_STATUS.PAYMENT_REJECTED, to: SCRAP_STATUS.PAYMENT_SUBMITTED,
    });
    return reload(conn, requestId);
  });
  const mail = await notifyAssignee(
    requestId, request.request_number,
    `[스크랩검사] 고객 입금 정보 재제출 — [${request.request_number ?? "-"}] ${request.title}`,
    "고객이 입금 정보를 수정해 재제출했습니다. 관리자 화면에서 다시 확인해 주세요.",
  );
  return { request, mail };
}

export interface ConfirmScrapPaymentInput {
  paid_amount?: number;
  payment_date?: string;
  internal_memo?: string;
}

export async function confirmScrapPayment(
  actor: User, requestId: number, input?: ConfirmScrapPaymentInput,
): Promise<ScrapWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_CONFIRM_PAYMENT");
    const pay = await getLatestPaymentByType(requestId, SCRAP_PAYMENT_TYPE, conn);
    if (pay) {
      await conn.execute(
        `UPDATE payments SET status = 'CONFIRMED', confirmed_by = ?, confirmed_at = NOW(),
             paid_amount = COALESCE(?, paid_amount), payment_date = COALESCE(?, payment_date) WHERE id = ?`,
        [actor.id, input?.paid_amount != null ? String(input.paid_amount) : null, clean(input?.payment_date), pay.id],
      );
    }
    if (clean(input?.internal_memo)) {
      await insertMessage(conn, { requestId, authorId: actor.id, type: "INTERNAL_MEMO", message: input!.internal_memo!.trim(), customerVisible: false });
    }
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.PAYMENT_CONFIRMED);
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_CONFIRM_PAYMENT",
      from: SCRAP_STATUS.PAYMENT_SUBMITTED, to: SCRAP_STATUS.PAYMENT_CONFIRMED,
    });
    return reload(conn, requestId);
  });
  return { request };
}

export async function rejectScrapPayment(
  actor: User, requestId: number, reason: string,
  opts?: { expectedAmount?: number; confirmedAmount?: number },
): Promise<ScrapWorkflowResult> {
  const trimmed = clean(reason);
  if (!trimmed) throw new WorkflowError("확인불가 사유는 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_REJECT_PAYMENT");
    const pay = await getLatestPaymentByType(requestId, SCRAP_PAYMENT_TYPE, conn);
    if (pay) {
      await conn.execute(
        `UPDATE payments SET status = 'REJECTED', rejection_reason = ?, confirmed_by = ?, confirmed_at = NOW() WHERE id = ?`,
        [trimmed, actor.id, pay.id],
      );
    }
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.PAYMENT_REJECTED);
    await insertMessage(conn, { requestId, authorId: actor.id, type: "PAYMENT_REJECTION", message: trimmed, customerVisible: true });
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_REJECT_PAYMENT",
      from: SCRAP_STATUS.PAYMENT_SUBMITTED, to: SCRAP_STATUS.PAYMENT_REJECTED, message: trimmed,
      metadata: { expected_amount: opts?.expectedAmount ?? null, confirmed_amount: opts?.confirmedAmount ?? null },
    });
    return reload(conn, requestId);
  });
  const mail = await sendMailSafe({
    to: request.contact_email, context: `SCRAP_REJECT_PAYMENT ${request.request_number}`,
    ...mails.buildScrapPaymentRejectedMail(request, { reason: trimmed }),
  });
  return { request, mail };
}

/* --------------- Step 11/12: DGFT 등록 ------------------------------ */

export async function startDgftDocumentPreparation(actor: User, requestId: number): Promise<ScrapWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_START_DGFT_DOCUMENT");
    await upsertScrapDgftRegistration(conn, requestId, { registration_status: "PREPARING" });
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.DGFT_DOCUMENT_PREPARING);
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_START_DGFT_DOCUMENT",
      from: SCRAP_STATUS.PAYMENT_CONFIRMED, to: SCRAP_STATUS.DGFT_DOCUMENT_PREPARING,
    });
    return reload(conn, requestId);
  });
  return { request };
}

export interface StartDgftRegistrationInput {
  document_prepared_at?: string;
  registration_submitted_at?: string;
  registration_number?: string;
  external_reference_number?: string;
  customer_memo?: string;
  internal_memo?: string;
}

export async function startDgftRegistration(
  actor: User, requestId: number, input?: StartDgftRegistrationInput,
): Promise<ScrapWorkflowResult> {
  if (input?.document_prepared_at && !validDate(input.document_prepared_at)) {
    throw new WorkflowError("DGFT 등록 문서 작성일이 올바르지 않습니다.", "VALIDATION", 400);
  }
  if (input?.registration_submitted_at && !validDate(input.registration_submitted_at)) {
    throw new WorkflowError("DGFT 등록 신청일이 올바르지 않습니다.", "VALIDATION", 400);
  }
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_START_DGFT_REGISTRATION");
    await upsertScrapDgftRegistration(conn, requestId, {
      document_prepared_at: clean(input?.document_prepared_at),
      registration_submitted_at: clean(input?.registration_submitted_at),
      registration_number: clean(input?.registration_number),
      external_reference_number: clean(input?.external_reference_number),
      registered_by: actor.id,
      registration_status: "IN_PROGRESS",
      customer_visible_memo: clean(input?.customer_memo),
      internal_memo: clean(input?.internal_memo),
    });
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.DGFT_REGISTRATION_IN_PROGRESS);
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_START_DGFT_REGISTRATION",
      from: SCRAP_STATUS.DGFT_DOCUMENT_PREPARING, to: SCRAP_STATUS.DGFT_REGISTRATION_IN_PROGRESS,
    });
    return reload(conn, requestId);
  });
  return { request };
}

export async function blockDgftRegistration(
  actor: User, requestId: number, reason: string,
  opts?: { problemType?: string; neededAction?: string; customerVisible?: boolean },
): Promise<ScrapWorkflowResult> {
  const trimmed = clean(reason);
  if (!trimmed) throw new WorkflowError("문제 사유는 필수입니다.", "VALIDATION", 400);
  const customerVisible = opts?.customerVisible ?? false;
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "SCRAP_BLOCK_DGFT");
    await upsertScrapDgftRegistration(conn, requestId, { registration_status: "BLOCKED" });
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.DGFT_REGISTRATION_BLOCKED);
    await insertMessage(conn, {
      requestId, authorId: actor.id, type: customerVisible ? "CUSTOMER_MEMO" : "INTERNAL_MEMO", message: trimmed, customerVisible,
    });
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_BLOCK_DGFT",
      from: request.status, to: SCRAP_STATUS.DGFT_REGISTRATION_BLOCKED, message: trimmed,
      metadata: { resume_status: request.status, problem_type: clean(opts?.problemType), needed_action: clean(opts?.neededAction), customer_visible: customerVisible },
    });
    return reload(conn, requestId);
  });
  const mail = customerVisible
    ? await sendMailSafe({
        to: request.contact_email, context: `SCRAP_BLOCK_DGFT ${request.request_number}`,
        ...mails.buildScrapDgftBlockedMail(request, { reason: trimmed, neededAction: clean(opts?.neededAction) }),
      })
    : undefined;
  return { request, mail };
}

export async function resumeDgftRegistration(actor: User, requestId: number, note?: string): Promise<ScrapWorkflowResult> {
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_RESUME_DGFT");
    const meta = await getLatestHistoryMetaTo(requestId, SCRAP_STATUS.DGFT_REGISTRATION_BLOCKED, conn);
    const resume = String(meta?.resume_status ?? SCRAP_STATUS.DGFT_DOCUMENT_PREPARING);
    const target: ScrapStatus =
      resume === SCRAP_STATUS.DGFT_REGISTRATION_IN_PROGRESS ? SCRAP_STATUS.DGFT_REGISTRATION_IN_PROGRESS : SCRAP_STATUS.DGFT_DOCUMENT_PREPARING;
    await upsertScrapDgftRegistration(conn, requestId, {
      registration_status: target === SCRAP_STATUS.DGFT_REGISTRATION_IN_PROGRESS ? "IN_PROGRESS" : "PREPARING",
    });
    await applyScrapStatus(conn, requestId, target);
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_RESUME_DGFT",
      from: SCRAP_STATUS.DGFT_REGISTRATION_BLOCKED, to: target, message: clean(note),
    });
    return reload(conn, requestId);
  });
  return { request };
}

/* --------------- Step 13: 최종 완료 --------------------------------- */

export interface CompleteDgftRegistrationInput {
  registration_submitted_at?: string;
  registration_number?: string;
  external_reference_number?: string;
  document_prepared_at?: string;
  customer_memo?: string;
  internal_memo?: string;
  show_number_to_customer?: boolean; // 등록번호를 고객 메일에 표시할지(기본 true)
}

export async function completeDgftRegistration(
  actor: User, requestId: number, input?: CompleteDgftRegistrationInput,
): Promise<ScrapWorkflowResult> {
  if (input?.registration_submitted_at && !validDate(input.registration_submitted_at)) {
    throw new WorkflowError("DGFT 등록 신청일이 올바르지 않습니다.", "VALIDATION", 400);
  }
  const request = await withTx(async (conn) => {
    await lockAndAuthorize(conn, actor, requestId, "SCRAP_COMPLETE_DGFT");

    // 입력값이 있으면 먼저 반영(신청 단계에서 못 채운 항목을 완료 시 입력할 수 있음).
    if (input) {
      await upsertScrapDgftRegistration(conn, requestId, {
        registration_submitted_at: clean(input.registration_submitted_at),
        registration_number: clean(input.registration_number),
        external_reference_number: clean(input.external_reference_number),
        document_prepared_at: clean(input.document_prepared_at),
        customer_visible_memo: clean(input.customer_memo),
        internal_memo: clean(input.internal_memo),
      });
    }

    // 최종 완료 서버 검증.
    const insp = await getScrapInspection(requestId, conn);
    if (!insp?.customer_documents_confirmed_at) {
      throw new WorkflowError("고객 서류 검토가 완료되어야 합니다.", "INVALID_STATE", 409);
    }
    const reportCount = await countFilesByType(requestId, "SCRAP_INSPECTION_REPORT", conn);
    if (reportCount < 1) throw new WorkflowError("내부 검사 리포트가 있어야 합니다.", "INVALID_STATE", 409);
    const quotation = await getQuotation(requestId, conn);
    if (!quotation) throw new WorkflowError("청구 정보가 있어야 합니다.", "INVALID_STATE", 409);
    const pay = await getLatestPaymentByType(requestId, SCRAP_PAYMENT_TYPE, conn);
    if (!pay || pay.status !== "CONFIRMED") throw new WorkflowError("고객 입금이 확인되어야 합니다.", "INVALID_STATE", 409);

    const dgft = await getScrapDgftRegistration(requestId, conn);
    if (!dgft?.registration_submitted_at) throw new WorkflowError("DGFT 등록 신청일이 입력되어야 합니다.", "INVALID_STATE", 409);
    if (!dgft?.registration_number && !dgft?.external_reference_number) {
      throw new WorkflowError("DGFT 등록번호 또는 외부 접수번호가 입력되어야 합니다.", "INVALID_STATE", 409);
    }
    if (!dgft?.registered_by) throw new WorkflowError("DGFT 등록 처리자가 입력되어야 합니다.", "INVALID_STATE", 409);

    await upsertScrapDgftRegistration(conn, requestId, {
      registration_confirmed_at: new Date().toISOString().slice(0, 10),
      registration_status: "REGISTERED",
    });
    await applyScrapStatus(conn, requestId, SCRAP_STATUS.COMPLETED, { setCompletedNow: true });
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_COMPLETE_DGFT",
      from: SCRAP_STATUS.DGFT_REGISTRATION_IN_PROGRESS, to: SCRAP_STATUS.COMPLETED,
      metadata: { show_number_to_customer: input?.show_number_to_customer ?? true },
    });
    return reload(conn, requestId);
  });
  const insp = await getScrapInspection(requestId);
  const dgft = await getScrapDgftRegistration(requestId);
  const showNumber = input?.show_number_to_customer ?? true;
  const mail = await sendMailSafe({
    to: request.contact_email, context: `SCRAP_COMPLETE_DGFT ${request.request_number}`,
    ...mails.buildScrapCompletedMail(request, {
      actualEnd: insp?.actual_end_date ?? null,
      documentsSubmittedAt: insp?.customer_documents_submitted_at ?? null,
      dgftRegisteredAt: dgft?.registration_confirmed_at ?? null,
      registrationNumber: showNumber ? (dgft?.registration_number ?? dgft?.external_reference_number ?? null) : null,
    }),
  });
  return { request, mail };
}

/* ------------------------- 파일 업로드 (스크랩) --------------------- */

export interface ScrapStoredFile {
  meta: StoredFileMeta;
  fileType: string;
  documentRequirementId?: number | null;
  displayNameSnapshot?: string | null;
}

// 스크랩 파일 저장. is_customer_visible 은 SCRAP_FILE_META 로 결정(리포트/DGFT 자료는 내부 전용).
// 고객은 고객 제출서류/입금 증빙만, 담당자/관리자는 모든 종류를 업로드할 수 있다.
export async function addScrapFiles(
  actor: User, requestId: number, storedFiles: ScrapStoredFile[],
): Promise<void> {
  await withTx(async (conn) => {
    const r = await getRequestById(requestId, conn, true);
    if (!r) throw new WorkflowError("의뢰를 찾을 수 없습니다.", "NOT_FOUND", 404);
    if (r.service_type !== SVC) throw new WorkflowError("스크랩 India 의뢰가 아닙니다.", "INVALID_STATE", 409);
    const role = resolveRole(actor, r);
    if (!role) throw new WorkflowError("권한이 없습니다.", "FORBIDDEN", 403);

    for (const f of storedFiles) {
      if (!isScrapFileType(f.fileType)) throw new WorkflowError("허용되지 않은 파일 종류입니다.", "VALIDATION", 400);
      const meta = SCRAP_FILE_META[f.fileType as ScrapFileType];
      // 고객은 고객 제출서류/입금 증빙만 업로드 가능(내부 전용 파일 차단).
      if (role === "CUSTOMER" && meta.uploader !== "CUSTOMER") {
        throw new WorkflowError("고객은 제출 서류/입금 증빙만 업로드할 수 있습니다.", "FORBIDDEN", 403);
      }
    }
    await insertRequestFiles(conn, requestId, storedFiles.map((f) => ({
      meta: f.meta, fileType: f.fileType, uploadedBy: actor.id,
      customerVisible: SCRAP_FILE_META[f.fileType as ScrapFileType].customerVisible,
      documentRequirementId: f.documentRequirementId ?? null,
      displayNameSnapshot: f.displayNameSnapshot ?? null,
    })));
    await history(conn, {
      requestId, actorId: actor.id, action: "SCRAP_UPLOAD_FILE",
      from: r.status, to: r.status, metadata: { by: role, count: storedFiles.length },
    });
  });
}
