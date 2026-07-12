// 워크플로 전이 오케스트레이션. 컨트롤러에서 request.step=X; save() 하지 말고
// 반드시 이 서비스의 메서드를 호출한다. 각 메서드는 다음을 수행한다.
//   1) 현재 사용자 권한 검사   2) 현재 상태에서 가능한 행동인지 검사(serviceWorkflow)
//   3) 필수 데이터/파일 검사   4) 트랜잭션(FOR UPDATE 로 상태 재확인 → 중복 처리 방지)
//   5) 관련 데이터 저장 + step/status 변경 + 이력 저장   6) 커밋   7) 커밋 후 메일(best-effort)
// 허용되지 않은 전이는 WorkflowError 로 거부한다.

import type { User } from "@/src/lib/types";
import { isAdminLevel } from "@/src/lib/userTypes";
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
  STATUS,
  STATUS_STEP,
  FINAL_FILE_TYPE,
  REQUIRED_REQUEST_FILE_TYPES,
  REQUEST_FILE_META,
  type Category,
  type ServiceType,
  type RequestStatus,
  type RequestFileType,
  type ServiceRequest,
  type MessageType,
  type PaymentType,
} from "@/src/lib/serviceRequestTypes";
import {
  TRANSITIONS,
  canTransition,
  WorkflowError,
  type TransitionAction,
  type WorkflowRole,
} from "@/src/lib/serviceWorkflow";
import {
  getRequestById,
  getQuotation,
  getLatestPayment,
  countFilesByType,
  nextRequestNumber,
} from "@/src/lib/serviceRequestRepo";
import { storeRequestFile, type StoredFileMeta } from "@/src/lib/requestStorage";
import { computeQuotation, type QuotationItemInput } from "@/src/lib/quotationMath";
import { getBankInfo, DEFAULT_CURRENCY } from "@/src/lib/requestSettings";
import { sendMailSafe } from "@/src/lib/mail";
import * as mails from "@/src/lib/requestMails";

/* ----------------------------- 공통 유틸 ---------------------------- */

// 트랜잭션/이력/메모/파일/역할 헬퍼는 requestWorkflowShared 에서 재사용한다.
// applyStatus 는 TRCU 상태→step 맵(STATUS_STEP)을 적용하는 얇은 래퍼다.
async function applyStatus(
  conn: Tx,
  requestId: number,
  toStatus: RequestStatus,
  extra?: {
    assigneeUserId?: number;
    requestNumber?: string;
    setAssignedNow?: boolean;
    setCompletedNow?: boolean;
  },
): Promise<void> {
  await updateStatusStep(conn, requestId, toStatus, STATUS_STEP[toStatus], extra);
}

// 트랜잭션에서 FOR UPDATE 로 잠그고 권한 + 전이 가능 여부 검사.
async function lockAndAuthorize(
  conn: Tx,
  user: User,
  requestId: number,
  action: TransitionAction,
): Promise<{ request: ServiceRequest; role: WorkflowRole }> {
  const request = await getRequestById(requestId, conn, true);
  if (!request) throw new WorkflowError("의뢰를 찾을 수 없습니다.", "NOT_FOUND", 404);
  const role = resolveRole(user, request);
  if (!role) throw new WorkflowError("권한이 없습니다.", "FORBIDDEN", 403);
  if (!canTransition(action, request.status, role)) {
    throw new WorkflowError(
      "현재 상태에서 허용되지 않는 작업이거나 이미 처리되었습니다.",
      "INVALID_STATE",
      409,
    );
  }
  return { request, role };
}

export interface WorkflowResult {
  request: ServiceRequest;
  mail?: { ok: boolean; error?: string };
}

/* ------------------------------------------------------------------ */
/* 생성: Step 0 의뢰 등록                                               */
/* ------------------------------------------------------------------ */

export interface SubmitRequestInput {
  category: Category;
  service_type: ServiceType;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  title: string;
  description: string;
}

export interface PendingFile {
  file: File;
  fileType: RequestFileType;
}

// 필수 파일(메뉴얼/도면/JOS) 검증. 반환값이 있으면 에러 메시지.
export function validateRequiredFiles(files: PendingFile[]): string | null {
  for (const t of REQUIRED_REQUEST_FILE_TYPES) {
    if (!files.some((f) => f.fileType === t)) {
      return `${REQUEST_FILE_META[t].label} 파일은 필수입니다.`;
    }
  }
  return null;
}

export async function submitRequest(
  actor: User | null,
  input: SubmitRequestInput,
  storedFiles: { meta: StoredFileMeta; fileType: string }[],
): Promise<ServiceRequest> {
  // 최초 상태는 서비스별로 다르다. CEC India 는 CEC_REQUESTED, 제품검사는
  // PRODUCT_INSPECTION_REQUESTED, 그 외(TRCU/GOST 등)는 공통 REQUESTED(모두 step 0).
  // 이후 전이는 각 워크플로 규칙을 따른다.
  const initialStatus =
    input.service_type === "CEC_INDIA"
      ? "CEC_REQUESTED"
      : input.service_type === "PRODUCT_INSPECTION"
        ? "PRODUCT_INSPECTION_REQUESTED"
        : input.service_type === "SCRAP_INDIA"
          ? "SCRAP_REQUESTED"
          : STATUS.REQUESTED;
  const created = await withTx(async (conn) => {
    const [res] = await conn.execute(
      `INSERT INTO service_requests
         (request_number, customer_user_id, assignee_user_id, category, service_type,
          company_name, contact_name, contact_phone, contact_email, title, description,
          workflow_step, status, submitted_at)
       VALUES (NULL, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW())`,
      [
        actor?.id ?? null,
        input.category,
        input.service_type,
        input.company_name,
        input.contact_name,
        input.contact_phone,
        input.contact_email,
        input.title,
        input.description,
        initialStatus,
      ],
    );
    const requestId = Number((res as { insertId: number }).insertId);

    await insertRequestFiles(
      conn,
      requestId,
      storedFiles.map((f) => ({
        meta: f.meta,
        fileType: f.fileType,
        uploadedBy: actor?.id ?? null,
        customerVisible: true,
      })),
    );

    await insertHistory(conn, {
      requestId,
      actorId: actor?.id ?? null,
      action: "SUBMIT_REQUEST",
      toStep: 0,
      toStatus: initialStatus,
      metadata: { fileCount: storedFiles.length },
    });

    const request = await getRequestById(requestId, conn);
    return request!;
  });
  return created;
}

/* ------------------------------------------------------------------ */
/* 담당자 지정 / 변경                                                   */
/* ------------------------------------------------------------------ */

// year2 는 테스트 재현성을 위해 주입 가능(미지정 시 서버 현재 연도).
export async function assignStaff(
  actor: User,
  requestId: number,
  assigneeUserId: number,
  year2?: number,
): Promise<WorkflowResult> {
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "ASSIGN_STAFF");

    // 접수번호는 최초 1회만 발급. (이미 있으면 유지)
    let requestNumber = request.request_number;
    if (!requestNumber) {
      const yy = year2 ?? new Date().getFullYear() % 100;
      requestNumber = await nextRequestNumber(conn, request.category as Category, yy);
    }

    await applyStatus(conn, requestId, STATUS.ASSIGNED, {
      assigneeUserId,
      requestNumber,
      setAssignedNow: true,
    });
    await insertHistory(conn, {
      requestId,
      actorId: actor.id,
      action: "ASSIGN_STAFF",
      fromStep: STATUS_STEP[request.status], toStep: STATUS_STEP.ASSIGNED,
      fromStatus: request.status, toStatus: STATUS.ASSIGNED,
      metadata: { assigneeUserId, requestNumber },
    });
    return (await getRequestById(requestId, conn))!;
  });
  return { request };
}

// 담당자 변경: 상태를 바꾸지 않고 담당자만 교체(접수번호 유지). 관리자 전용.
export async function reassignStaff(
  actor: User,
  requestId: number,
  assigneeUserId: number,
): Promise<WorkflowResult> {
  if (!isAdminLevel(actor.user_level)) {
    throw new WorkflowError("권한이 없습니다.", "FORBIDDEN", 403);
  }
  const request = await withTx(async (conn) => {
    const r = await getRequestById(requestId, conn, true);
    if (!r) throw new WorkflowError("의뢰를 찾을 수 없습니다.", "NOT_FOUND", 404);
    if (!r.request_number) {
      throw new WorkflowError("아직 담당자가 지정되지 않은 의뢰입니다.", "INVALID_STATE", 409);
    }
    await conn.execute(
      `UPDATE service_requests SET assignee_user_id = ? WHERE id = ?`,
      [assigneeUserId, requestId],
    );
    await insertHistory(conn, {
      requestId,
      actorId: actor.id,
      action: "REASSIGN_STAFF",
      fromStatus: r.status, toStatus: r.status,
      metadata: { from: r.assignee_user_id, to: assigneeUserId },
    });
    return (await getRequestById(requestId, conn))!;
  });
  return { request };
}

/* ------------------------------------------------------------------ */
/* Step 1: 접수 / 반려 / 재제출                                         */
/* ------------------------------------------------------------------ */

export async function acceptRequest(actor: User, requestId: number): Promise<WorkflowResult> {
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "ACCEPT_REQUEST");
    await applyStatus(conn, requestId, STATUS.QUOTATION);
    await insertHistory(conn, {
      requestId, actorId: actor.id, action: "ACCEPT_REQUEST",
      fromStep: STATUS_STEP.ASSIGNED, toStep: STATUS_STEP.QUOTATION,
      fromStatus: STATUS.ASSIGNED, toStatus: STATUS.QUOTATION,
    });
    return (await getRequestById(requestId, conn))!;
  });
  return { request };
}

export async function rejectRequest(
  actor: User, requestId: number, reason: string,
): Promise<WorkflowResult> {
  const trimmed = reason.trim();
  if (!trimmed) throw new WorkflowError("반려 사유는 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "REJECT_REQUEST");
    await applyStatus(conn, requestId, STATUS.REQUEST_REJECTED);
    await insertMessage(conn, {
      requestId, authorId: actor.id, type: "REJECTION", message: trimmed, customerVisible: true,
    });
    await insertHistory(conn, {
      requestId, actorId: actor.id, action: "REJECT_REQUEST",
      fromStep: STATUS_STEP.ASSIGNED, toStep: STATUS_STEP.REQUEST_REJECTED,
      fromStatus: STATUS.ASSIGNED, toStatus: STATUS.REQUEST_REJECTED,
      message: trimmed,
    });
    return (await getRequestById(requestId, conn))!;
  });
  const mail = await sendMailSafe({
    to: request.contact_email,
    context: `REJECT_REQUEST ${request.request_number}`,
    ...mails.buildRejectRequestMail(request, trimmed),
  });
  return { request, mail };
}

export async function resubmitRequest(
  actor: User,
  requestId: number,
  storedFiles: { meta: StoredFileMeta; fileType: RequestFileType }[] = [],
  note?: string,
): Promise<WorkflowResult> {
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "RESUBMIT_REQUEST");
    if (storedFiles.length) {
      await insertRequestFiles(conn, requestId, storedFiles.map((f) => ({
        meta: f.meta, fileType: f.fileType, uploadedBy: actor.id, customerVisible: true,
      })));
    }
    // 담당자 유지, 상태만 ASSIGNED 로 복귀.
    await applyStatus(conn, requestId, STATUS.ASSIGNED);
    await insertHistory(conn, {
      requestId, actorId: actor.id, action: "RESUBMIT_REQUEST",
      fromStep: STATUS_STEP.REQUEST_REJECTED, toStep: STATUS_STEP.ASSIGNED,
      fromStatus: STATUS.REQUEST_REJECTED, toStatus: STATUS.ASSIGNED,
      message: note?.trim() || null,
      metadata: { addedFiles: storedFiles.length },
    });
    return (await getRequestById(requestId, conn))!;
  });
  return { request };
}

/* ------------------------------------------------------------------ */
/* Step 3: 견적 완료                                                    */
/* ------------------------------------------------------------------ */

export interface CompleteQuotationInput {
  currency?: string;
  notes?: string;
  items: QuotationItemInput[];
}

export async function completeQuotation(
  actor: User, requestId: number, input: CompleteQuotationInput,
): Promise<WorkflowResult> {
  if (!input.items || input.items.length === 0) {
    throw new WorkflowError("가격표 항목이 최소 1개 필요합니다.", "VALIDATION", 400);
  }
  const currency = input.currency || DEFAULT_CURRENCY;
  const computed = computeQuotation(input.items); // 서버 재계산

  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "COMPLETE_QUOTATION");

    // 견적 upsert (uq_quotations_request 로 1:1).
    const [qres] = await conn.execute(
      `INSERT INTO quotations
         (service_request_id, currency, total_amount, deposit_amount, balance_amount, notes, created_by, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         currency = VALUES(currency), total_amount = VALUES(total_amount),
         deposit_amount = VALUES(deposit_amount), balance_amount = VALUES(balance_amount),
         notes = VALUES(notes), created_by = VALUES(created_by), sent_at = NOW()`,
      [requestId, currency, computed.totalAmount, computed.depositAmount, computed.balanceAmount,
       input.notes?.trim() || null, actor.id],
    );
    // insertId 는 신규 시에만 유효 → 재조회로 확실히.
    void qres;
    const quotation = await getQuotation(requestId, conn);
    const quotationId = quotation!.id;
    await conn.execute(`DELETE FROM quotation_items WHERE quotation_id = ?`, [quotationId]);
    let order = 0;
    for (const it of computed.items) {
      await conn.execute(
        `INSERT INTO quotation_items
           (quotation_id, item_type, item_name, quantity, unit_price, amount, memo, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [quotationId, it.item_type ?? null, it.item_name, it.quantity, it.unit_price, it.amount,
         it.memo ?? null, order++],
      );
    }

    await applyStatus(conn, requestId, STATUS.DEPOSIT_REQUESTED);
    await insertHistory(conn, {
      requestId, actorId: actor.id, action: "COMPLETE_QUOTATION",
      fromStep: STATUS_STEP.QUOTATION, toStep: STATUS_STEP.DEPOSIT_REQUESTED,
      fromStatus: STATUS.QUOTATION, toStatus: STATUS.DEPOSIT_REQUESTED,
      metadata: { total: computed.totalAmount, currency },
    });
    return (await getRequestById(requestId, conn))!;
  });

  const mail = await sendMailSafe({
    to: request.contact_email,
    context: `COMPLETE_QUOTATION ${request.request_number}`,
    ...mails.buildQuotationMail(request, {
      currency, total: computed.totalAmount, deposit: computed.depositAmount,
      items: computed.items.map((it) => ({ item_name: it.item_name, amount: it.amount })),
      bank: getBankInfo(),
    }),
  });
  return { request, mail };
}

/* ------------------------------------------------------------------ */
/* 결제 입력(선금/잔금)                                                 */
/* ------------------------------------------------------------------ */

export interface PaymentInput {
  depositor_name: string;
  sender_account?: string;
  payment_date?: string; // YYYY-MM-DD
  memo?: string;
}

function validatePayment(p: PaymentInput): void {
  if (!p.depositor_name?.trim()) throw new WorkflowError("입금자명은 필수입니다.", "VALIDATION", 400);
}

async function insertPayment(
  conn: Tx,
  args: {
    requestId: number; type: PaymentType; expected: string | null;
    input: PaymentInput; submittedBy: number; status: RequestStatus | string;
  },
): Promise<void> {
  await conn.execute(
    `INSERT INTO payments
       (service_request_id, payment_type, expected_amount, depositor_name, sender_account, payment_date, memo, status, submitted_by, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      args.requestId, args.type, args.expected,
      args.input.depositor_name.trim(),
      args.input.sender_account?.trim() || null,
      args.input.payment_date || null,
      args.input.memo?.trim() || null,
      args.status, args.submittedBy,
    ],
  );
}

// Step 4: 고객 선금 입력
export async function submitDeposit(
  actor: User, requestId: number, input: PaymentInput,
): Promise<WorkflowResult> {
  validatePayment(input);
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "SUBMIT_DEPOSIT");
    const q = await getQuotation(requestId, conn);
    await insertPayment(conn, {
      requestId, type: "DEPOSIT", expected: q?.deposit_amount ?? null,
      input, submittedBy: actor.id, status: "PENDING",
    });
    await applyStatus(conn, requestId, STATUS.DEPOSIT_SUBMITTED);
    await insertHistory(conn, {
      requestId, actorId: actor.id, action: "SUBMIT_DEPOSIT",
      fromStep: STATUS_STEP.DEPOSIT_REQUESTED, toStep: STATUS_STEP.DEPOSIT_SUBMITTED,
      fromStatus: STATUS.DEPOSIT_REQUESTED, toStatus: STATUS.DEPOSIT_SUBMITTED,
    });
    return (await getRequestById(requestId, conn))!;
  });
  return { request };
}

// Step 5: 담당자 선금 확인
export async function confirmDeposit(actor: User, requestId: number): Promise<WorkflowResult> {
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "CONFIRM_DEPOSIT");
    const pay = await getLatestPayment(requestId, "DEPOSIT", conn);
    if (pay) {
      await conn.execute(
        `UPDATE payments SET status = 'CONFIRMED', confirmed_by = ?, confirmed_at = NOW() WHERE id = ?`,
        [actor.id, pay.id],
      );
    }
    await applyStatus(conn, requestId, STATUS.CERTIFICATION_IN_PROGRESS);
    await insertHistory(conn, {
      requestId, actorId: actor.id, action: "CONFIRM_DEPOSIT",
      fromStep: STATUS_STEP.DEPOSIT_SUBMITTED, toStep: STATUS_STEP.CERTIFICATION_IN_PROGRESS,
      fromStatus: STATUS.DEPOSIT_SUBMITTED, toStatus: STATUS.CERTIFICATION_IN_PROGRESS,
    });
    return (await getRequestById(requestId, conn))!;
  });
  return { request };
}

// Step 5 → 6: 선금 확인불가
export async function rejectDeposit(
  actor: User, requestId: number, reason: string,
): Promise<WorkflowResult> {
  const trimmed = reason.trim();
  if (!trimmed) throw new WorkflowError("확인불가 사유는 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "REJECT_DEPOSIT");
    const pay = await getLatestPayment(requestId, "DEPOSIT", conn);
    if (pay) {
      await conn.execute(
        `UPDATE payments SET status = 'REJECTED', rejection_reason = ?, confirmed_by = ?, confirmed_at = NOW() WHERE id = ?`,
        [trimmed, actor.id, pay.id],
      );
    }
    await applyStatus(conn, requestId, STATUS.DEPOSIT_REJECTED);
    await insertMessage(conn, {
      requestId, authorId: actor.id, type: "PAYMENT_REJECTION", message: trimmed, customerVisible: true,
    });
    await insertHistory(conn, {
      requestId, actorId: actor.id, action: "REJECT_DEPOSIT",
      fromStep: STATUS_STEP.DEPOSIT_SUBMITTED, toStep: STATUS_STEP.DEPOSIT_REJECTED,
      fromStatus: STATUS.DEPOSIT_SUBMITTED, toStatus: STATUS.DEPOSIT_REJECTED,
      message: trimmed,
    });
    return (await getRequestById(requestId, conn))!;
  });
  const mail = await sendMailSafe({
    to: request.contact_email,
    context: `REJECT_DEPOSIT ${request.request_number}`,
    ...mails.buildDepositRejectedMail(request, trimmed),
  });
  return { request, mail };
}

// Step 6 → 5: 고객이 선금 정보 재제출(이전 payment 는 보존, 새 행 추가)
export async function resumeAfterDepositRejection(
  actor: User, requestId: number, input: PaymentInput,
): Promise<WorkflowResult> {
  validatePayment(input);
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "RESUME_AFTER_DEPOSIT_REJECTION");
    const q = await getQuotation(requestId, conn);
    await insertPayment(conn, {
      requestId, type: "DEPOSIT", expected: q?.deposit_amount ?? null,
      input, submittedBy: actor.id, status: "PENDING",
    });
    await applyStatus(conn, requestId, STATUS.DEPOSIT_SUBMITTED);
    await insertHistory(conn, {
      requestId, actorId: actor.id, action: "RESUME_AFTER_DEPOSIT_REJECTION",
      fromStep: STATUS_STEP.DEPOSIT_REJECTED, toStep: STATUS_STEP.DEPOSIT_SUBMITTED,
      fromStatus: STATUS.DEPOSIT_REJECTED, toStatus: STATUS.DEPOSIT_SUBMITTED,
    });
    return (await getRequestById(requestId, conn))!;
  });
  return { request };
}

/* ------------------------------------------------------------------ */
/* Step 7: 인증 진행 → 완료 / 보완                                      */
/* ------------------------------------------------------------------ */

export async function completeCertification(actor: User, requestId: number): Promise<WorkflowResult> {
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "COMPLETE_CERTIFICATION");
    await applyStatus(conn, requestId, STATUS.BALANCE_REQUESTED);
    await insertHistory(conn, {
      requestId, actorId: actor.id, action: "COMPLETE_CERTIFICATION",
      fromStep: STATUS_STEP.CERTIFICATION_IN_PROGRESS, toStep: STATUS_STEP.BALANCE_REQUESTED,
      fromStatus: STATUS.CERTIFICATION_IN_PROGRESS, toStatus: STATUS.BALANCE_REQUESTED,
    });
    return (await getRequestById(requestId, conn))!;
  });
  const q = await getQuotation(requestId);
  const mail = await sendMailSafe({
    to: request.contact_email,
    context: `COMPLETE_CERTIFICATION ${request.request_number}`,
    ...mails.buildBalanceRequestMail(request, {
      currency: q?.currency ?? DEFAULT_CURRENCY,
      total: q?.total_amount ?? "0", deposit: q?.deposit_amount ?? "0", balance: q?.balance_amount ?? "0",
      bank: getBankInfo(),
    }),
  });
  return { request, mail };
}

export async function blockCertification(
  actor: User, requestId: number, reason: string,
): Promise<WorkflowResult> {
  const trimmed = reason.trim();
  if (!trimmed) throw new WorkflowError("보완/인증불가 사유는 필수입니다.", "VALIDATION", 400);
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "BLOCK_CERTIFICATION");
    await applyStatus(conn, requestId, STATUS.CERTIFICATION_BLOCKED);
    await insertMessage(conn, {
      requestId, authorId: actor.id, type: "CERTIFICATION_BLOCKED", message: trimmed, customerVisible: true,
    });
    await insertHistory(conn, {
      requestId, actorId: actor.id, action: "BLOCK_CERTIFICATION",
      fromStep: STATUS_STEP.CERTIFICATION_IN_PROGRESS, toStep: STATUS_STEP.CERTIFICATION_BLOCKED,
      fromStatus: STATUS.CERTIFICATION_IN_PROGRESS, toStatus: STATUS.CERTIFICATION_BLOCKED,
      message: trimmed,
    });
    return (await getRequestById(requestId, conn))!;
  });
  const mail = await sendMailSafe({
    to: request.contact_email,
    context: `BLOCK_CERTIFICATION ${request.request_number}`,
    ...mails.buildCertificationBlockedMail(request, trimmed),
  });
  return { request, mail };
}

export async function resumeCertification(
  actor: User, requestId: number, note?: string,
): Promise<WorkflowResult> {
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "RESUME_CERTIFICATION");
    await applyStatus(conn, requestId, STATUS.CERTIFICATION_IN_PROGRESS);
    await insertHistory(conn, {
      requestId, actorId: actor.id, action: "RESUME_CERTIFICATION",
      fromStep: STATUS_STEP.CERTIFICATION_BLOCKED, toStep: STATUS_STEP.CERTIFICATION_IN_PROGRESS,
      fromStatus: STATUS.CERTIFICATION_BLOCKED, toStatus: STATUS.CERTIFICATION_IN_PROGRESS,
      message: note?.trim() || null,
    });
    return (await getRequestById(requestId, conn))!;
  });
  return { request };
}

/* ------------------------------------------------------------------ */
/* Step 9: 고객 잔금 입력                                               */
/* ------------------------------------------------------------------ */

export async function submitBalance(
  actor: User, requestId: number, input: PaymentInput,
): Promise<WorkflowResult> {
  validatePayment(input);
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "SUBMIT_BALANCE");
    const q = await getQuotation(requestId, conn);
    await insertPayment(conn, {
      requestId, type: "BALANCE", expected: q?.balance_amount ?? null,
      input, submittedBy: actor.id, status: "PENDING",
    });
    await applyStatus(conn, requestId, STATUS.BALANCE_SUBMITTED);
    await insertHistory(conn, {
      requestId, actorId: actor.id, action: "SUBMIT_BALANCE",
      fromStep: STATUS_STEP.BALANCE_REQUESTED, toStep: STATUS_STEP.BALANCE_SUBMITTED,
      fromStatus: STATUS.BALANCE_REQUESTED, toStatus: STATUS.BALANCE_SUBMITTED,
    });
    return (await getRequestById(requestId, conn))!;
  });
  return { request };
}

// Step 10: 담당자 잔금 확인 → 최종 인증서 등록 대기(11)
export async function confirmBalance(actor: User, requestId: number): Promise<WorkflowResult> {
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "CONFIRM_BALANCE");
    const pay = await getLatestPayment(requestId, "BALANCE", conn);
    if (pay) {
      await conn.execute(
        `UPDATE payments SET status = 'CONFIRMED', confirmed_by = ?, confirmed_at = NOW() WHERE id = ?`,
        [actor.id, pay.id],
      );
    }
    await applyStatus(conn, requestId, STATUS.FINAL_DOCUMENT_PENDING);
    await insertHistory(conn, {
      requestId, actorId: actor.id, action: "CONFIRM_BALANCE",
      fromStep: STATUS_STEP.BALANCE_SUBMITTED, toStep: STATUS_STEP.FINAL_DOCUMENT_PENDING,
      fromStatus: STATUS.BALANCE_SUBMITTED, toStatus: STATUS.FINAL_DOCUMENT_PENDING,
    });
    return (await getRequestById(requestId, conn))!;
  });
  return { request };
}

/* ------------------------------------------------------------------ */
/* Step 11: 최종 인증서 등록 → 완료                                     */
/* ------------------------------------------------------------------ */

export async function completeFinalDocument(actor: User, requestId: number): Promise<WorkflowResult> {
  const request = await withTx(async (conn) => {
    const { request } = await lockAndAuthorize(conn, actor, requestId, "COMPLETE_FINAL_DOCUMENT");
    // 최종 인증서(FINAL_CERTIFICATE)가 반드시 1개 이상 있어야 완료 가능.
    const finalCount = await countFilesByType(requestId, FINAL_FILE_TYPE, conn);
    if (finalCount < 1) {
      throw new WorkflowError("최종 인증서(PDF)를 먼저 등록해야 완료할 수 있습니다.", "VALIDATION", 400);
    }
    await applyStatus(conn, requestId, STATUS.COMPLETED, { setCompletedNow: true });
    await insertHistory(conn, {
      requestId, actorId: actor.id, action: "COMPLETE_FINAL_DOCUMENT",
      fromStep: STATUS_STEP.FINAL_DOCUMENT_PENDING, toStep: STATUS_STEP.COMPLETED,
      fromStatus: STATUS.FINAL_DOCUMENT_PENDING, toStatus: STATUS.COMPLETED,
    });
    return (await getRequestById(requestId, conn))!;
  });
  const mail = await sendMailSafe({
    to: request.contact_email,
    context: `COMPLETE_FINAL_DOCUMENT ${request.request_number}`,
    ...mails.buildCompletedMail(request),
  });
  return { request, mail };
}

/* ------------------------------------------------------------------ */
/* 파일 / 메모 (상태 전이 없음)                                         */
/* ------------------------------------------------------------------ */

// 고객 보완 자료 업로드. 반려(2) 또는 인증보완(8) 상태에서만. isCustomerVisible=true.
export async function addCustomerFiles(
  actor: User,
  requestId: number,
  storedFiles: { meta: StoredFileMeta; fileType: string }[],
): Promise<void> {
  await withTx(async (conn) => {
    const r = await getRequestById(requestId, conn, true);
    if (!r) throw new WorkflowError("의뢰를 찾을 수 없습니다.", "NOT_FOUND", 404);
    if (r.customer_user_id !== actor.id) throw new WorkflowError("권한이 없습니다.", "FORBIDDEN", 403);
    const allowed: string[] = [STATUS.REQUEST_REJECTED, STATUS.CERTIFICATION_BLOCKED];
    if (!allowed.includes(r.status)) {
      throw new WorkflowError("현재 단계에서는 자료를 추가할 수 없습니다.", "INVALID_STATE", 409);
    }
    await insertRequestFiles(conn, requestId, storedFiles.map((f) => ({
      meta: f.meta, fileType: f.fileType, uploadedBy: actor.id, customerVisible: true,
    })));
    await insertHistory(conn, {
      requestId, actorId: actor.id, action: "UPLOAD_FILE",
      fromStatus: r.status, toStatus: r.status,
      metadata: { by: "customer", count: storedFiles.length },
    });
  });
}

// 담당자/관리자 파일 업로드(견적 자료, 진행 첨부, 최종 인증서 등).
export async function addStaffFiles(
  actor: User,
  requestId: number,
  storedFiles: { meta: StoredFileMeta; fileType: string }[],
  opts?: { customerVisible?: boolean },
): Promise<void> {
  await withTx(async (conn) => {
    const r = await getRequestById(requestId, conn, true);
    if (!r) throw new WorkflowError("의뢰를 찾을 수 없습니다.", "NOT_FOUND", 404);
    const role = resolveRole(actor, r);
    if (role !== "STAFF" && role !== "ADMIN") {
      throw new WorkflowError("권한이 없습니다.", "FORBIDDEN", 403);
    }
    // 최종 인증서는 완료 전까지 고객에게 노출하지 않는다(완료 시 노출은 다운로드 권한으로 제어).
    const visible = opts?.customerVisible ?? true;
    await insertRequestFiles(conn, requestId, storedFiles.map((f) => ({
      meta: f.meta, fileType: f.fileType, uploadedBy: actor.id,
      customerVisible: f.fileType === FINAL_FILE_TYPE ? false : visible,
    })));
    await insertHistory(conn, {
      requestId, actorId: actor.id, action: "UPLOAD_FILE",
      fromStatus: r.status, toStatus: r.status,
      metadata: { by: "staff", count: storedFiles.length },
    });
  });
}

// 진행/내부/공개 메모 추가(담당자/관리자).
export async function addMessage(
  actor: User,
  requestId: number,
  type: MessageType,
  message: string,
): Promise<void> {
  const trimmed = message.trim();
  if (!trimmed) throw new WorkflowError("메모 내용이 비어 있습니다.", "VALIDATION", 400);
  await withTx(async (conn) => {
    const r = await getRequestById(requestId, conn, true);
    if (!r) throw new WorkflowError("의뢰를 찾을 수 없습니다.", "NOT_FOUND", 404);
    const role = resolveRole(actor, r);
    if (role !== "STAFF" && role !== "ADMIN") {
      throw new WorkflowError("권한이 없습니다.", "FORBIDDEN", 403);
    }
    const customerVisible = type !== "INTERNAL_MEMO";
    await insertMessage(conn, { requestId, authorId: actor.id, type, message: trimmed, customerVisible });
    await insertHistory(conn, {
      requestId, actorId: actor.id, action: "ADD_MESSAGE",
      fromStatus: r.status, toStatus: r.status, metadata: { type },
    });
  });
}

// 재노출용: 상태 전이표(라우트에서 사용).
export { TRANSITIONS, storeRequestFile };
