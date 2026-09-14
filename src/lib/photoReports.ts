// 사진보고서 생성 결과 보관. 파일은 requests 첨부와 같은 비공개 저장소(private-uploads)의
// photo-reports/ 아래에 두고, 목록/다운로드용 메타만 DB(photo_reports)에 남긴다.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getPool } from "@/src/lib/db";
import { getStorageRoot } from "@/src/lib/requestStorage";

export interface PhotoReportRow {
  id: number;
  report_type: string;
  original_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

const REL_DIR = "photo-reports";

/** 저장 파일명: 260828_CEC Inspection Report_유지환.docx (당일날짜_형식_이름) */
export function buildReportFilename(
  title: string,
  reporterName: string,
  ext: string,
  now: Date = new Date(),
): string {
  const stamp =
    String(now.getFullYear()).slice(2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  // 파일 시스템에서 쓸 수 없는 문자만 제거한다(한글·공백은 그대로).
  const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, "").trim();
  return `${stamp}_${safe(title)}_${safe(reporterName)}.${ext}`;
}

export async function savePhotoReport(input: {
  reportType: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  createdBy: number | null;
}): Promise<{ id: number; storedName: string }> {
  const ext = path.extname(input.filename);
  const storedName = `${crypto.randomUUID()}${ext}`;
  const absDir = path.join(getStorageRoot(), REL_DIR);
  await mkdir(absDir, { recursive: true });
  await writeFile(path.join(absDir, storedName), input.buffer);

  const [res] = await getPool().execute(
    `INSERT INTO photo_reports
       (report_type, original_name, stored_name, storage_path, mime_type, file_size, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.reportType,
      input.filename,
      storedName,
      `${REL_DIR}/${storedName}`,
      input.mimeType,
      input.buffer.length,
      input.createdBy,
    ],
  );
  return { id: (res as { insertId: number }).insertId, storedName };
}

/** 저장 파일명(UUID)으로 찾는다. 이 이름 자체가 다운로드 링크의 열쇠 역할을 한다. */
export async function getPhotoReportByStoredName(storedName: string): Promise<PhotoReportRow | null> {
  const [rows] = await getPool().execute(
    `SELECT id, report_type, original_name, storage_path, mime_type, file_size, created_at
       FROM photo_reports WHERE stored_name = ? LIMIT 1`,
    [storedName],
  );
  const list = rows as PhotoReportRow[];
  return list.length === 0 ? null : list[0];
}

// 정렬 키 화이트리스트. 사용자 입력을 SQL 에 직접 넣지 않는다.
const SORT_COLUMNS: Record<string, string> = {
  created: "created_at",
  name: "original_name",
  type: "report_type",
  size: "file_size",
};
export type SortKey = keyof typeof SORT_COLUMNS;

export const PAGE_SIZE = 15;

export async function listPhotoReports(opts: {
  q?: string;
  sort?: string;
  dir?: string;
  page?: number;
}): Promise<{ items: PhotoReportRow[]; total: number; page: number; pages: number }> {
  const column = SORT_COLUMNS[opts.sort ?? "created"] ?? SORT_COLUMNS.created;
  const dir = opts.dir === "asc" ? "ASC" : "DESC";
  const q = (opts.q ?? "").trim();
  const where = q ? "WHERE original_name LIKE ? OR report_type LIKE ?" : "";
  const params = q ? [`%${q}%`, `%${q}%`] : [];

  const pool = getPool();
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM photo_reports ${where}`,
    params,
  );
  const total = Number((countRows as { cnt: number }[])[0].cnt);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, opts.page ?? 1));

  const [rows] = await pool.query(
    `SELECT id, report_type, original_name, storage_path, mime_type, file_size, created_at
       FROM photo_reports ${where}
      ORDER BY ${column} ${dir}, id DESC
      LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE],
  );
  return { items: rows as PhotoReportRow[], total, page, pages };
}

export async function getPhotoReport(id: number): Promise<PhotoReportRow | null> {
  const [rows] = await getPool().execute(
    `SELECT id, report_type, original_name, storage_path, mime_type, file_size, created_at
       FROM photo_reports WHERE id = ? LIMIT 1`,
    [id],
  );
  const list = rows as PhotoReportRow[];
  return list.length === 0 ? null : list[0];
}
