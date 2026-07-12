// 워크플로 오케스트레이션 공통 헬퍼(트랜잭션/이력/메모/파일/상태갱신/역할판정).
// TRCU/GOST(requestWorkflowService.ts)와 CEC India(cecWorkflowService.ts)가 함께 사용한다.
// 순수 라우팅 규칙은 serviceWorkflow.ts / cecWorkflow.ts, 데이터 접근은 serviceRequestRepo.ts.

import type { PoolConnection } from "mysql2/promise";
import { getPool } from "@/src/lib/db";
import type { User } from "@/src/lib/types";
import { isAdminLevel, isStaffLevel } from "@/src/lib/userTypes";
import type { ServiceRequest } from "@/src/lib/serviceRequestTypes";
import type { WorkflowRole } from "@/src/lib/serviceWorkflow";
import type { StoredFileMeta } from "@/src/lib/requestStorage";

export type Tx = PoolConnection;

export async function withTx<T>(fn: (conn: Tx) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// 사용자의 이 의뢰에 대한 워크플로 역할. (ADMIN > 배정된 STAFF > 소유 CUSTOMER)
export function resolveRole(user: User, r: ServiceRequest): WorkflowRole | null {
  if (isAdminLevel(user.user_level)) return "ADMIN";
  if (r.assignee_user_id === user.id && isStaffLevel(user.user_level)) return "STAFF";
  if (r.customer_user_id === user.id) return "CUSTOMER";
  return null;
}

export async function insertHistory(
  conn: Tx,
  h: {
    requestId: number;
    actorId: number | null;
    action: string;
    fromStep?: number | null;
    toStep?: number | null;
    fromStatus?: string | null;
    toStatus?: string | null;
    message?: string | null;
    metadata?: unknown;
  },
): Promise<void> {
  await conn.execute(
    `INSERT INTO request_status_histories
       (service_request_id, actor_user_id, action, from_step, to_step, from_status, to_status, message, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      h.requestId,
      h.actorId,
      h.action,
      h.fromStep ?? null,
      h.toStep ?? null,
      h.fromStatus ?? null,
      h.toStatus ?? null,
      h.message ?? null,
      h.metadata == null ? null : JSON.stringify(h.metadata),
    ],
  );
}

export async function insertMessage(
  conn: Tx,
  m: {
    requestId: number;
    authorId: number | null;
    type: string;
    message: string;
    customerVisible: boolean;
  },
): Promise<void> {
  await conn.execute(
    `INSERT INTO request_messages (service_request_id, author_user_id, message_type, message, is_customer_visible)
     VALUES (?, ?, ?, ?, ?)`,
    [m.requestId, m.authorId, m.type, m.message, m.customerVisible ? 1 : 0],
  );
}

export async function insertRequestFiles(
  conn: Tx,
  requestId: number,
  entries: {
    meta: StoredFileMeta;
    fileType: string;
    uploadedBy: number | null;
    customerVisible: boolean;
    // 동적 제출서류(service_document_requirements) 연결값(스크랩 India 고객 서류 등에서만 사용).
    documentRequirementId?: number | null;
    displayNameSnapshot?: string | null;
  }[],
): Promise<void> {
  for (const e of entries) {
    await conn.execute(
      `INSERT INTO request_files
         (service_request_id, file_type, service_document_requirement_id, display_name_snapshot,
          original_name, stored_name, storage_path, mime_type, extension, file_size, uploaded_by, is_customer_visible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        requestId,
        e.fileType,
        e.documentRequirementId ?? null,
        e.displayNameSnapshot ?? null,
        e.meta.originalName,
        e.meta.storedName,
        e.meta.storagePath,
        e.meta.mimeType,
        e.meta.extension,
        e.meta.fileSize,
        e.uploadedBy,
        e.customerVisible ? 1 : 0,
      ],
    );
  }
}

// status + 명시적 step 갱신(+ 선택 필드). step 은 각 워크플로의 상태→step 맵에서 구해 넘긴다.
export async function updateStatusStep(
  conn: Tx,
  requestId: number,
  toStatus: string,
  toStep: number,
  extra?: {
    assigneeUserId?: number;
    requestNumber?: string;
    setAssignedNow?: boolean;
    setCompletedNow?: boolean;
  },
): Promise<void> {
  const sets = ["status = ?", "workflow_step = ?"];
  const params: (string | number)[] = [toStatus, toStep];
  if (extra?.assigneeUserId !== undefined) { sets.push("assignee_user_id = ?"); params.push(extra.assigneeUserId); }
  if (extra?.requestNumber !== undefined) { sets.push("request_number = ?"); params.push(extra.requestNumber); }
  if (extra?.setAssignedNow) sets.push("assigned_at = NOW()");
  if (extra?.setCompletedNow) sets.push("completed_at = NOW()");
  params.push(requestId);
  await conn.execute(`UPDATE service_requests SET ${sets.join(", ")} WHERE id = ?`, params);
}
