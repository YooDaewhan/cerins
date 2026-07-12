// 동적 제출서류 항목(service_document_requirements) 데이터 접근 + 관리자 CRUD 서비스.
// 서비스별·워크플로 단계별로 고객이 제출해야 하는 서류 항목을 관리자가 등록/수정한다.
// 서류 명칭을 코드에 고정하지 않으므로, 명칭이 확정되거나 종류가 추가되어도 코드 수정이 필요 없다.
// 특정 서비스에 종속되지 않는 공통 구조이므로 다른 서비스(제품검사 등)도 재사용할 수 있다.

import type { PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getPool } from "@/src/lib/db";
import { WorkflowError } from "@/src/lib/serviceWorkflow";
import type { ServiceDocumentRequirement } from "@/src/lib/scrapIndiaTypes";

type Executor = Pick<PoolConnection, "query" | "execute">;
function db(conn?: Executor): Executor {
  return conn ?? getPool();
}

type RawRequirementRow = Omit<
  ServiceDocumentRequirement,
  "is_required" | "allows_multiple" | "is_active"
> & { is_required: number; allows_multiple: number; is_active: number };

function mapRow(r: RowDataPacket): ServiceDocumentRequirement {
  const row = r as unknown as RawRequirementRow;
  return {
    ...row,
    is_required: Number(row.is_required) === 1,
    allows_multiple: Number(row.allows_multiple) === 1,
    is_active: Number(row.is_active) === 1,
  };
}

/* ------------------------------- 조회 ------------------------------- */

// 고객 화면용: 활성 항목만 정렬 순서대로.
export async function listActiveDocumentRequirements(
  serviceType: string,
  workflowStep: number,
  conn?: Executor,
): Promise<ServiceDocumentRequirement[]> {
  const [rows] = await db(conn).query<RowDataPacket[]>(
    `SELECT * FROM service_document_requirements
       WHERE service_type = ? AND workflow_step = ? AND is_active = 1
       ORDER BY sort_order ASC, id ASC`,
    [serviceType, workflowStep],
  );
  return (rows as RowDataPacket[]).map(mapRow);
}

// 관리자 화면용: 비활성 포함 전체.
export async function listAllDocumentRequirements(
  serviceType: string,
  workflowStep: number,
): Promise<ServiceDocumentRequirement[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT * FROM service_document_requirements
       WHERE service_type = ? AND workflow_step = ?
       ORDER BY sort_order ASC, id ASC`,
    [serviceType, workflowStep],
  );
  return (rows as RowDataPacket[]).map(mapRow);
}

export async function getDocumentRequirement(
  id: number,
  conn?: Executor,
): Promise<ServiceDocumentRequirement | null> {
  const [rows] = await db(conn).query<RowDataPacket[]>(
    `SELECT * FROM service_document_requirements WHERE id = ? LIMIT 1`,
    [id],
  );
  const list = rows as RowDataPacket[];
  return list.length ? mapRow(list[0]) : null;
}

/* ---------------------------- 관리자 CRUD --------------------------- */

export interface DocumentRequirementInput {
  service_type: string;
  workflow_step: number;
  document_code?: string; // 미지정 시 자동 생성
  display_name: string;
  description?: string | null;
  is_required?: boolean;
  allows_multiple?: boolean;
  allowed_extensions?: string | null;
  max_file_size?: number | null;
  sort_order?: number;
  is_active?: boolean;
}

// document_code 는 서비스+단계 내 유일. 미지정 시 안전한 자동 코드를 만든다.
function autoCode(serviceType: string, step: number, seq: number): string {
  return `${serviceType}_S${step}_DOC_${String(seq).padStart(3, "0")}`;
}

export async function createDocumentRequirement(
  input: DocumentRequirementInput,
): Promise<ServiceDocumentRequirement> {
  const displayName = input.display_name?.trim();
  if (!displayName) throw new WorkflowError("서류 표시명은 필수입니다.", "VALIDATION", 400);

  const id = await (async () => {
    const pool = getPool();
    // 정렬 순서/자동 코드 계산을 위해 현재 개수를 센다.
    const [cntRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM service_document_requirements WHERE service_type = ? AND workflow_step = ?`,
      [input.service_type, input.workflow_step],
    );
    const count = Number((cntRows[0] as { cnt: number }).cnt);
    const code = input.document_code?.trim() || autoCode(input.service_type, input.workflow_step, count + 1);
    const [res] = await pool.execute<ResultSetHeader>(
      `INSERT INTO service_document_requirements
         (service_type, workflow_step, document_code, display_name, description,
          is_required, allows_multiple, allowed_extensions, max_file_size, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.service_type,
        input.workflow_step,
        code,
        displayName,
        input.description?.trim() || null,
        input.is_required === false ? 0 : 1,
        input.allows_multiple ? 1 : 0,
        input.allowed_extensions?.trim() || null,
        input.max_file_size ?? null,
        input.sort_order ?? count,
        input.is_active === false ? 0 : 1,
      ],
    );
    return Number(res.insertId);
  })().catch((err: unknown) => {
    if (err && typeof err === "object" && (err as { code?: string }).code === "ER_DUP_ENTRY") {
      throw new WorkflowError("이미 존재하는 서류 코드입니다.", "VALIDATION", 400);
    }
    throw err;
  });

  const created = await getDocumentRequirement(id);
  return created!;
}

export interface DocumentRequirementUpdate {
  display_name?: string;
  description?: string | null;
  is_required?: boolean;
  allows_multiple?: boolean;
  allowed_extensions?: string | null;
  max_file_size?: number | null;
  sort_order?: number;
  is_active?: boolean;
}

export async function updateDocumentRequirement(
  id: number,
  patch: DocumentRequirementUpdate,
): Promise<ServiceDocumentRequirement> {
  const existing = await getDocumentRequirement(id);
  if (!existing) throw new WorkflowError("서류 항목을 찾을 수 없습니다.", "NOT_FOUND", 404);

  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  const push = (col: string, val: string | number | null) => {
    sets.push(`${col} = ?`);
    params.push(val);
  };
  if (patch.display_name !== undefined) {
    const dn = patch.display_name.trim();
    if (!dn) throw new WorkflowError("서류 표시명은 비울 수 없습니다.", "VALIDATION", 400);
    push("display_name", dn);
  }
  if (patch.description !== undefined) push("description", patch.description?.trim() || null);
  if (patch.is_required !== undefined) push("is_required", patch.is_required ? 1 : 0);
  if (patch.allows_multiple !== undefined) push("allows_multiple", patch.allows_multiple ? 1 : 0);
  if (patch.allowed_extensions !== undefined) push("allowed_extensions", patch.allowed_extensions?.trim() || null);
  if (patch.max_file_size !== undefined) push("max_file_size", patch.max_file_size ?? null);
  if (patch.sort_order !== undefined) push("sort_order", patch.sort_order);
  if (patch.is_active !== undefined) push("is_active", patch.is_active ? 1 : 0);

  if (sets.length) {
    params.push(id);
    await getPool().execute(
      `UPDATE service_document_requirements SET ${sets.join(", ")} WHERE id = ?`,
      params,
    );
  }
  const updated = await getDocumentRequirement(id);
  return updated!;
}

// 삭제 대신 비활성화를 권장하지만, 미사용 항목의 완전 삭제도 지원한다.
export async function deactivateDocumentRequirement(id: number): Promise<void> {
  await getPool().execute(
    `UPDATE service_document_requirements SET is_active = 0 WHERE id = ?`,
    [id],
  );
}
