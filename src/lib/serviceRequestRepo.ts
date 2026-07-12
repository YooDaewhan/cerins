// 의뢰 데이터 접근 계층. 읽기 쿼리 + 트랜잭션에서 쓰는 헬퍼(접수번호 발급 등).
// 모든 쿼리는 ? 파라미터 바인딩(SQL injection 방지). 프로젝트 관용구를 따른다.

import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getPool } from "@/src/lib/db";
import type {
  Category,
  Payment,
  PaymentType,
  Quotation,
  QuotationItem,
  RequestFile,
  RequestMessage,
  RequestStatusHistory,
  ServiceRequest,
  UserBrief,
} from "@/src/lib/serviceRequestTypes";
import { CATEGORY_SLUGS } from "@/src/lib/serviceRequestTypes";
import type { CecInspection, CecValuation } from "@/src/lib/cecTypes";
import type { ProductInspection } from "@/src/lib/productInspectionTypes";
import type { ScrapInspection, ScrapDgftRegistration } from "@/src/lib/scrapIndiaTypes";

type Executor = Pick<PoolConnection, "query" | "execute">;
function db(conn?: Executor): Executor {
  return conn ?? getPool();
}

/* ------------------------------- 의뢰 ------------------------------- */

export async function getRequestById(
  id: number,
  conn?: Executor,
  forUpdate = false,
): Promise<ServiceRequest | null> {
  const [rows] = await db(conn).query<RowDataPacket[]>(
    `SELECT * FROM service_requests WHERE id = ? LIMIT 1${forUpdate ? " FOR UPDATE" : ""}`,
    [id],
  );
  const list = rows as unknown as ServiceRequest[];
  return list.length ? list[0] : null;
}

// 고객 목록 아이템: 의뢰 + 담당자 간략 정보(지정된 경우). 담당자가 정해지면
// 목록에서도 누가 담당인지 보여주기 위해 users 를 LEFT JOIN 한다.
export interface CustomerRequestListItem extends ServiceRequest {
  assignee: UserBrief | null;
}

export async function listCustomerRequests(
  customerUserId: number,
): Promise<CustomerRequestListItem[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT sr.*,
            u.login_id  AS assignee_login_id,
            u.email     AS assignee_email,
            u.job_title AS assignee_job_title,
            u.company   AS assignee_company
       FROM service_requests sr
       LEFT JOIN users u ON u.id = sr.assignee_user_id
      WHERE sr.customer_user_id = ?
      ORDER BY sr.created_at DESC`,
    [customerUserId],
  );
  type JoinedRow = ServiceRequest & {
    assignee_login_id: string | null;
    assignee_email: string | null;
    assignee_job_title: string | null;
    assignee_company: string | null;
  };
  return (rows as unknown as JoinedRow[]).map((row) => {
    const { assignee_login_id, assignee_email, assignee_job_title, assignee_company, ...request } = row;
    const assignee: UserBrief | null =
      row.assignee_user_id && assignee_login_id
        ? {
            id: row.assignee_user_id,
            login_id: assignee_login_id,
            email: assignee_email ?? "",
            job_title: assignee_job_title,
            company: assignee_company,
          }
        : null;
    return { ...(request as ServiceRequest), assignee };
  });
}

// 완료된 인증 의뢰의 최종 인증서(고객 다운로드 가능분). 목록에서 완료 표시/다운로드 버튼에 사용.
// TRCU/GOST: FINAL_CERTIFICATE(완료 COMPLETED), CEC India: CEC_FINAL_CERTIFICATE(완료 CEC_COMPLETED).
// 다운로드 권한(완료 이후에만)은 /api/files 라우트에서 최종 검증한다.
export interface CustomerFinalCertificate {
  service_request_id: number;
  file_id: number;
  original_name: string;
}

export async function listCustomerFinalCertificates(
  customerUserId: number,
): Promise<Map<number, CustomerFinalCertificate>> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT rf.id AS file_id, rf.service_request_id, rf.original_name
       FROM request_files rf
       JOIN service_requests sr ON sr.id = rf.service_request_id
      WHERE sr.customer_user_id = ?
        AND (
          (rf.file_type = 'FINAL_CERTIFICATE' AND sr.status = 'COMPLETED')
          OR (rf.file_type = 'CEC_FINAL_CERTIFICATE' AND sr.status = 'CEC_COMPLETED')
        )
      ORDER BY rf.created_at DESC`,
    [customerUserId],
  );
  const map = new Map<number, CustomerFinalCertificate>();
  for (const row of rows as unknown as CustomerFinalCertificate[]) {
    // created_at DESC 정렬이라 각 의뢰의 첫 행(최신본)만 사용한다.
    if (!map.has(row.service_request_id)) map.set(row.service_request_id, row);
  }
  return map;
}

export async function listStaffRequests(
  assigneeUserId: number,
): Promise<ServiceRequest[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT * FROM service_requests WHERE assignee_user_id = ? ORDER BY updated_at DESC`,
    [assigneeUserId],
  );
  return rows as unknown as ServiceRequest[];
}

export interface AdminRequestFilter {
  service_type?: string;
  status?: string;
  step?: number;
  assignee_user_id?: number;
  company_name?: string;
  request_number?: string;
  from_date?: string; // YYYY-MM-DD
  to_date?: string;
  completed?: boolean;
  sort?: "recent" | "updated" | "oldest" | "request_number";
  page?: number;
  pageSize?: number;
}

export async function adminListRequests(
  filter: AdminRequestFilter,
): Promise<{ items: ServiceRequest[]; total: number; page: number; pageSize: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.service_type) { where.push("service_type = ?"); params.push(filter.service_type); }
  if (filter.status) { where.push("status = ?"); params.push(filter.status); }
  if (typeof filter.step === "number") { where.push("workflow_step = ?"); params.push(filter.step); }
  if (filter.assignee_user_id) { where.push("assignee_user_id = ?"); params.push(filter.assignee_user_id); }
  if (filter.company_name) { where.push("company_name LIKE ?"); params.push(`%${filter.company_name}%`); }
  if (filter.request_number) { where.push("request_number LIKE ?"); params.push(`%${filter.request_number}%`); }
  if (filter.from_date) { where.push("created_at >= ?"); params.push(`${filter.from_date} 00:00:00`); }
  if (filter.to_date) { where.push("created_at <= ?"); params.push(`${filter.to_date} 23:59:59`); }
  if (filter.completed === true) { where.push("status = 'COMPLETED'"); }
  if (filter.completed === false) { where.push("status <> 'COMPLETED'"); }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderSql = {
    recent: "ORDER BY created_at DESC",
    updated: "ORDER BY updated_at DESC",
    oldest: "ORDER BY created_at ASC",
    request_number: "ORDER BY request_number IS NULL, request_number ASC",
  }[filter.sort ?? "recent"];

  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const [countRows] = await getPool().query<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM service_requests ${whereSql}`,
    params,
  );
  const total = Number((countRows[0] as { cnt: number }).cnt);

  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT * FROM service_requests ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { items: rows as unknown as ServiceRequest[], total, page, pageSize };
}

/* --------------------------- 담당자 후보 ---------------------------- */

export interface StaffUser {
  id: number;
  login_id: string;
  email: string;
  company: string | null;
  user_level: number;
}

// 직원(7) 이상 유저 = 담당자 지정 후보.
export async function listStaffUsers(): Promise<StaffUser[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, login_id, email, company, user_level FROM users
       WHERE user_level >= 7 ORDER BY user_level DESC, login_id ASC`,
  );
  return rows as unknown as StaffUser[];
}

export async function getUserBrief(id: number): Promise<UserBrief | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, login_id, email, job_title, company FROM users WHERE id = ? LIMIT 1`,
    [id],
  );
  const list = rows as unknown as UserBrief[];
  return list.length ? list[0] : null;
}

/* --------------------------- 접수번호 발급 -------------------------- */

// 트랜잭션 내부에서 호출. (year_2, prefix) 행을 원자적으로 증가시켜 중복 없는 번호를 만든다.
// 형식: cert-26-0001. UNIQUE index(uq_service_requests_request_number) 가 최종 방어선.
export async function nextRequestNumber(
  conn: Executor,
  category: Category,
  year2: number,
): Promise<string> {
  const prefix = category === "CERTIFICATION" ? "cert" : "insp";
  // 존재하지 않으면 0으로 시작, 그리고 원자적 +1. 같은 행에 대한 UPDATE 는 행 잠금으로 직렬화됨.
  await conn.execute(
    `INSERT INTO request_number_seq (year_2, prefix, last_seq) VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE last_seq = last_seq + 1`,
    [year2, prefix],
  );
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT last_seq FROM request_number_seq WHERE year_2 = ? AND prefix = ?`,
    [year2, prefix],
  );
  const seq = Number((rows[0] as { last_seq: number }).last_seq);
  const yy = String(year2).padStart(2, "0");
  return `${prefix}-${yy}-${String(seq).padStart(4, "0")}`;
}

/* ------------------------------- 파일 ------------------------------- */

export async function listFiles(
  serviceRequestId: number,
  conn?: Executor,
): Promise<RequestFile[]> {
  const [rows] = await db(conn).query<RowDataPacket[]>(
    `SELECT * FROM request_files WHERE service_request_id = ? ORDER BY created_at ASC`,
    [serviceRequestId],
  );
  return (rows as unknown as (Omit<RequestFile, "is_customer_visible"> & { is_customer_visible: number })[]).map(
    (r) => ({ ...r, is_customer_visible: Number(r.is_customer_visible) === 1 }),
  );
}

export async function getFileById(id: number): Promise<RequestFile | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT * FROM request_files WHERE id = ? LIMIT 1`,
    [id],
  );
  const list = rows as unknown as (Omit<RequestFile, "is_customer_visible"> & { is_customer_visible: number })[];
  if (!list.length) return null;
  return { ...list[0], is_customer_visible: Number(list[0].is_customer_visible) === 1 };
}

// 특정 종류의 파일 개수(필수 파일 검증 등).
export async function countFilesByType(
  serviceRequestId: number,
  fileType: string,
  conn?: Executor,
): Promise<number> {
  const [rows] = await db(conn).query<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM request_files WHERE service_request_id = ? AND file_type = ?`,
    [serviceRequestId, fileType],
  );
  return Number((rows[0] as { cnt: number }).cnt);
}

/* ----------------------------- 견적/결제 --------------------------- */

export async function getQuotation(
  serviceRequestId: number,
  conn?: Executor,
): Promise<Quotation | null> {
  const [rows] = await db(conn).query<RowDataPacket[]>(
    `SELECT * FROM quotations WHERE service_request_id = ? LIMIT 1`,
    [serviceRequestId],
  );
  const list = rows as unknown as Quotation[];
  return list.length ? list[0] : null;
}

export async function getQuotationItems(
  quotationId: number,
): Promise<QuotationItem[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order ASC, id ASC`,
    [quotationId],
  );
  return rows as unknown as QuotationItem[];
}

export async function listPayments(
  serviceRequestId: number,
): Promise<Payment[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT * FROM payments WHERE service_request_id = ? ORDER BY created_at ASC`,
    [serviceRequestId],
  );
  return rows as unknown as Payment[];
}

export async function getLatestPayment(
  serviceRequestId: number,
  type: PaymentType,
  conn?: Executor,
): Promise<Payment | null> {
  const [rows] = await db(conn).query<RowDataPacket[]>(
    `SELECT * FROM payments WHERE service_request_id = ? AND payment_type = ?
       ORDER BY created_at DESC, id DESC LIMIT 1`,
    [serviceRequestId, type],
  );
  const list = rows as unknown as Payment[];
  return list.length ? list[0] : null;
}

/* ------------------------------ 메모/이력 --------------------------- */

export async function listMessages(
  serviceRequestId: number,
  opts?: { includeInternal?: boolean; type?: string },
): Promise<RequestMessage[]> {
  const where = ["service_request_id = ?"];
  const params: unknown[] = [serviceRequestId];
  if (!opts?.includeInternal) where.push("is_customer_visible = 1");
  if (opts?.type) { where.push("message_type = ?"); params.push(opts.type); }
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT * FROM request_messages WHERE ${where.join(" AND ")} ORDER BY created_at ASC`,
    params,
  );
  return (rows as unknown as (Omit<RequestMessage, "is_customer_visible"> & { is_customer_visible: number })[]).map(
    (r) => ({ ...r, is_customer_visible: Number(r.is_customer_visible) === 1 }),
  );
}

export async function listHistories(
  serviceRequestId: number,
): Promise<RequestStatusHistory[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT * FROM request_status_histories WHERE service_request_id = ? ORDER BY created_at ASC, id ASC`,
    [serviceRequestId],
  );
  return rows as unknown as RequestStatusHistory[];
}

/* ------------------------------ 카테고리 URL ------------------------ */
export function categorySlug(category: Category): string {
  return CATEGORY_SLUGS[category];
}

/* ================================================================== */
/* CEC India 전용 데이터 접근                                            */
/* ================================================================== */

/* --------------------------- 검사 일정 ----------------------------- */

export async function getCecInspection(
  serviceRequestId: number,
  conn?: Executor,
): Promise<CecInspection | null> {
  const [rows] = await db(conn).query<RowDataPacket[]>(
    `SELECT * FROM cec_inspections WHERE service_request_id = ? LIMIT 1`,
    [serviceRequestId],
  );
  const list = rows as unknown as CecInspection[];
  return list.length ? list[0] : null;
}

// 의뢰당 1행(upsert). 예정/실제 일정을 부분 갱신한다(전달된 필드만).
export async function upsertCecInspection(
  conn: Executor,
  serviceRequestId: number,
  fields: Partial<
    Pick<
      CecInspection,
      | "requested_start_date" | "requested_end_date"
      | "requested_start_time" | "requested_end_time"
      | "site_contact_name" | "site_contact_phone"
      | "planned_start_date" | "planned_end_date" | "planned_days"
      | "actual_start_date" | "actual_end_date" | "actual_days"
      | "inspection_location" | "inspection_memo"
    >
  >,
): Promise<void> {
  const cols = Object.keys(fields);
  const vals: (string | number | null)[] = cols.map((c) => {
    const v = (fields as Record<string, unknown>)[c];
    return (v ?? null) as string | number | null;
  });
  const insertCols = ["service_request_id", ...cols].join(", ");
  const placeholders = ["?", ...cols.map(() => "?")].join(", ");
  const updates = cols.map((c) => `${c} = VALUES(${c})`).join(", ");
  await conn.execute(
    `INSERT INTO cec_inspections (${insertCols}) VALUES (${placeholders})
       ON DUPLICATE KEY UPDATE ${updates || "service_request_id = service_request_id"}`,
    [serviceRequestId, ...vals],
  );
}

/* ----------------------------- 가격평가 --------------------------- */

// append-only: 최신 id 가 "현재 평가". 이력은 보존된다.
export async function getLatestCecValuation(
  serviceRequestId: number,
  conn?: Executor,
): Promise<CecValuation | null> {
  const [rows] = await db(conn).query<RowDataPacket[]>(
    `SELECT * FROM cec_valuations WHERE service_request_id = ? ORDER BY id DESC LIMIT 1`,
    [serviceRequestId],
  );
  const list = rows as unknown as (Omit<CecValuation, "surcharge_applied"> & { surcharge_applied: number })[];
  if (!list.length) return null;
  return { ...list[0], surcharge_applied: Number(list[0].surcharge_applied) === 1 };
}

export async function listCecValuations(serviceRequestId: number): Promise<CecValuation[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT * FROM cec_valuations WHERE service_request_id = ? ORDER BY id ASC`,
    [serviceRequestId],
  );
  return (rows as unknown as (Omit<CecValuation, "surcharge_applied"> & { surcharge_applied: number })[]).map(
    (r) => ({ ...r, surcharge_applied: Number(r.surcharge_applied) === 1 }),
  );
}

export async function insertCecValuation(
  conn: Executor,
  v: {
    serviceRequestId: number;
    valuationAmount: string;
    currency: string;
    description: string | null;
    surchargeApplied: boolean;
    surchargeRate: string;
    surchargeAmount: string;
    notes: string | null;
    createdBy: number | null;
  },
): Promise<void> {
  await conn.execute(
    `INSERT INTO cec_valuations
       (service_request_id, valuation_amount, valuation_currency, valuation_description,
        surcharge_applied, surcharge_rate, surcharge_amount, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      v.serviceRequestId, v.valuationAmount, v.currency, v.description,
      v.surchargeApplied ? 1 : 0, v.surchargeRate, v.surchargeAmount, v.notes, v.createdBy,
    ],
  );
}

// 고객이 특정(최신) 평가를 확인한 시각 기록.
export async function markCecValuationConfirmed(conn: Executor, valuationId: number): Promise<void> {
  await conn.execute(
    `UPDATE cec_valuations SET customer_confirmed_at = NOW() WHERE id = ?`,
    [valuationId],
  );
}

/* --------------------------- CEC 결제 ------------------------------ */

// payment_type 을 문자열로 조회(CEC_DEPOSIT / CEC_BALANCE). TRCU 의 getLatestPayment 와 분리.
export async function getLatestPaymentByType(
  serviceRequestId: number,
  paymentType: string,
  conn?: Executor,
): Promise<Payment | null> {
  const [rows] = await db(conn).query<RowDataPacket[]>(
    `SELECT * FROM payments WHERE service_request_id = ? AND payment_type = ?
       ORDER BY created_at DESC, id DESC LIMIT 1`,
    [serviceRequestId, paymentType],
  );
  const list = rows as unknown as Payment[];
  return list.length ? list[0] : null;
}

/* ------------------- 예외 라우팅 상태(이력 metadata) ----------------- */

function parseMeta(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

// to_status 로 전이한 가장 최근 이력의 metadata 를 읽는다.
// step 8 복귀(resume_step) / step 10 라우팅(reject_type) 판단에 사용.
export async function getLatestHistoryMetaTo(
  serviceRequestId: number,
  toStatus: string,
  conn?: Executor,
): Promise<Record<string, unknown> | null> {
  const [rows] = await db(conn).query<RowDataPacket[]>(
    `SELECT metadata_json FROM request_status_histories
       WHERE service_request_id = ? AND to_status = ?
       ORDER BY id DESC LIMIT 1`,
    [serviceRequestId, toStatus],
  );
  const list = rows as unknown as { metadata_json: unknown }[];
  if (!list.length) return null;
  return parseMeta(list[0].metadata_json);
}

// 특정 status 에서 "빠져나온"(from_status) 가장 최근 이력의 metadata 를 읽는다.
// 예: BLOCKED 진입 시 저장한 resume_status 를, 복귀 후 재판단이 필요할 때 조회.
export async function getLatestHistoryMetaFrom(
  serviceRequestId: number,
  fromStatus: string,
  conn?: Executor,
): Promise<Record<string, unknown> | null> {
  const [rows] = await db(conn).query<RowDataPacket[]>(
    `SELECT metadata_json FROM request_status_histories
       WHERE service_request_id = ? AND from_status = ?
       ORDER BY id DESC LIMIT 1`,
    [serviceRequestId, fromStatus],
  );
  const list = rows as unknown as { metadata_json: unknown }[];
  if (!list.length) return null;
  return parseMeta(list[0].metadata_json);
}

/* ================================================================== */
/* 제품검사(Product Inspection) 전용 데이터 접근                          */
/* ================================================================== */

export async function getProductInspection(
  serviceRequestId: number,
  conn?: Executor,
): Promise<ProductInspection | null> {
  const [rows] = await db(conn).query<RowDataPacket[]>(
    `SELECT * FROM product_inspections WHERE service_request_id = ? LIMIT 1`,
    [serviceRequestId],
  );
  const list = rows as unknown as ProductInspection[];
  return list.length ? list[0] : null;
}

// 의뢰당 1행(upsert). 전달된 필드만 부분 갱신한다.
export async function upsertProductInspection(
  conn: Executor,
  serviceRequestId: number,
  fields: Partial<
    Pick<
      ProductInspection,
      | "planned_start_date" | "planned_end_date" | "planned_start_time" | "planned_end_time"
      | "actual_start_date" | "actual_end_date" | "actual_start_time" | "actual_end_time"
      | "inspection_location"
      | "schedule_confirmed_at" | "schedule_confirmed_by"
      | "inspection_started_at" | "inspection_started_by"
      | "inspection_completed_at" | "inspection_completed_by"
      | "report_submitted_at" | "report_submitted_by"
      | "external_agency_name" | "external_agency_department" | "external_agency_contact_name"
      | "external_agency_contact_email" | "external_agency_contact_phone"
      | "external_reference_number" | "report_submission_method"
      | "customer_visible_memo" | "internal_memo"
    >
  >,
): Promise<void> {
  const cols = Object.keys(fields);
  const vals: (string | number | null)[] = cols.map((c) => {
    const v = (fields as Record<string, unknown>)[c];
    return (v ?? null) as string | number | null;
  });
  const insertCols = ["service_request_id", ...cols].join(", ");
  const placeholders = ["?", ...cols.map(() => "?")].join(", ");
  const updates = cols.map((c) => `${c} = VALUES(${c})`).join(", ");
  await conn.execute(
    `INSERT INTO product_inspections (${insertCols}) VALUES (${placeholders})
       ON DUPLICATE KEY UPDATE ${updates || "service_request_id = service_request_id"}`,
    [serviceRequestId, ...vals],
  );
}

// 외부 인증기관 정산 입금(payment_type='EXTERNAL_AGENCY_PAYMENT') 기록.
// 고객 선금/잔금과 달리 통화/실입금액/정산기관/수취계좌를 함께 저장한다. 확인된 입금이므로 CONFIRMED.
export async function insertExternalAgencyPayment(
  conn: Executor,
  p: {
    serviceRequestId: number;
    payerOrganizationName: string;
    paidAmount: string;
    currency: string;
    paymentDate: string;
    depositorName: string | null;
    receivedAccount: string | null;
    externalReferenceNumber: string | null;
    memo: string | null;
    submittedBy: number | null;
  },
): Promise<void> {
  await conn.execute(
    `INSERT INTO payments
       (service_request_id, payment_type, currency, paid_amount, payer_organization_name,
        external_reference_number, received_account, depositor_name, payment_date, memo,
        status, submitted_by, submitted_at, confirmed_by, confirmed_at)
     VALUES (?, 'EXTERNAL_AGENCY_PAYMENT', ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, NOW(), ?, NOW())`,
    [
      p.serviceRequestId, p.currency, p.paidAmount, p.payerOrganizationName,
      p.externalReferenceNumber, p.receivedAccount, p.depositorName ?? "", p.paymentDate, p.memo,
      p.submittedBy, p.submittedBy,
    ],
  );
}

/* ================================================================== */
/* 스크랩 India(Scrap India) 전용 데이터 접근                            */
/* ================================================================== */

/* --------------------------- 검사 상세 ----------------------------- */

export async function getScrapInspection(
  serviceRequestId: number,
  conn?: Executor,
): Promise<ScrapInspection | null> {
  const [rows] = await db(conn).query<RowDataPacket[]>(
    `SELECT * FROM scrap_inspections WHERE service_request_id = ? LIMIT 1`,
    [serviceRequestId],
  );
  const list = rows as unknown as ScrapInspection[];
  return list.length ? list[0] : null;
}

// 의뢰당 1행(upsert). 전달된 필드만 부분 갱신한다.
export async function upsertScrapInspection(
  conn: Executor,
  serviceRequestId: number,
  fields: Partial<
    Pick<
      ScrapInspection,
      | "requested_start_date" | "requested_end_date" | "requested_start_time" | "requested_end_time"
      | "requested_location" | "requested_location_detail"
      | "confirmed_start_date" | "confirmed_end_date" | "confirmed_start_time" | "confirmed_end_time"
      | "confirmed_location"
      | "actual_start_date" | "actual_end_date" | "actual_start_time" | "actual_end_time"
      | "site_contact_name" | "site_contact_phone"
      | "schedule_confirmed_at" | "schedule_confirmed_by"
      | "inspection_started_at" | "inspection_started_by"
      | "inspection_completed_at" | "inspection_completed_by"
      | "customer_documents_submitted_at"
      | "customer_documents_confirmed_at" | "customer_documents_confirmed_by"
      | "customer_visible_memo" | "internal_memo"
    >
  >,
): Promise<void> {
  const cols = Object.keys(fields);
  const vals: (string | number | null)[] = cols.map((c) => {
    const v = (fields as Record<string, unknown>)[c];
    return (v ?? null) as string | number | null;
  });
  const insertCols = ["service_request_id", ...cols].join(", ");
  const placeholders = ["?", ...cols.map(() => "?")].join(", ");
  const updates = cols.map((c) => `${c} = VALUES(${c})`).join(", ");
  await conn.execute(
    `INSERT INTO scrap_inspections (${insertCols}) VALUES (${placeholders})
       ON DUPLICATE KEY UPDATE ${updates || "service_request_id = service_request_id"}`,
    [serviceRequestId, ...vals],
  );
}

/* --------------------------- DGFT 등록 상세 ------------------------- */

export async function getScrapDgftRegistration(
  serviceRequestId: number,
  conn?: Executor,
): Promise<ScrapDgftRegistration | null> {
  const [rows] = await db(conn).query<RowDataPacket[]>(
    `SELECT * FROM scrap_dgft_registrations WHERE service_request_id = ? LIMIT 1`,
    [serviceRequestId],
  );
  const list = rows as unknown as ScrapDgftRegistration[];
  return list.length ? list[0] : null;
}

export async function upsertScrapDgftRegistration(
  conn: Executor,
  serviceRequestId: number,
  fields: Partial<
    Pick<
      ScrapDgftRegistration,
      | "document_prepared_at" | "registration_submitted_at" | "registration_confirmed_at"
      | "registration_number" | "external_reference_number" | "registered_by"
      | "registration_status" | "customer_visible_memo" | "internal_memo"
    >
  >,
): Promise<void> {
  const cols = Object.keys(fields);
  const vals: (string | number | null)[] = cols.map((c) => {
    const v = (fields as Record<string, unknown>)[c];
    return (v ?? null) as string | number | null;
  });
  const insertCols = ["service_request_id", ...cols].join(", ");
  const placeholders = ["?", ...cols.map(() => "?")].join(", ");
  const updates = cols.map((c) => `${c} = VALUES(${c})`).join(", ");
  await conn.execute(
    `INSERT INTO scrap_dgft_registrations (${insertCols}) VALUES (${placeholders})
       ON DUPLICATE KEY UPDATE ${updates || "service_request_id = service_request_id"}`,
    [serviceRequestId, ...vals],
  );
}

/* ------------------- 고객 제출서류(동적 항목 연결) 집계 --------------- */

// 특정 동적 서류 항목(requirement)에 대해 제출된 파일 개수. 필수 서류 검증에 사용.
export async function countCustomerDocumentFiles(
  serviceRequestId: number,
  requirementId: number,
  conn?: Executor,
): Promise<number> {
  const [rows] = await db(conn).query<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM request_files
       WHERE service_request_id = ? AND service_document_requirement_id = ?`,
    [serviceRequestId, requirementId],
  );
  return Number((rows[0] as { cnt: number }).cnt);
}
