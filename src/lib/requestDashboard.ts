// 의뢰 현황(대시보드) 집계 계층.
// 관리자 "의뢰 현황" 페이지가 사용하는 통계 쿼리 모음.
// 모든 집계는 기간(created_at 기준)으로 범위를 좁힐 수 있으며, 담당자로 추가 필터링할 수 있다.
// 상수/라벨은 serviceRequestTypes.ts, 목록 조회는 serviceRequestRepo.ts 참고.

import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/src/lib/db";
import {
  STATUS_STEP,
  type RequestStatus,
} from "@/src/lib/serviceRequestTypes";

/* ------------------------------- 기간 ------------------------------- */

export const DASHBOARD_PRESETS = ["month", "6month", "year", "all", "custom"] as const;
export type DashboardPreset = (typeof DASHBOARD_PRESETS)[number];

export const PRESET_LABELS: Record<DashboardPreset, string> = {
  month: "최근 1개월",
  "6month": "최근 6개월",
  year: "최근 1년",
  all: "전체",
  custom: "기간 지정",
};

export interface ResolvedRange {
  from: string | null; // 'YYYY-MM-DD HH:MM:SS'
  to: string | null;
  bucket: "day" | "month";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function fmt(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function parseDayStart(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0);
}
function parseDayEnd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59);
}

// preset(+custom from/to) → 실제 datetime 범위와 일/월 집계 단위.
export function resolveRange(
  preset: DashboardPreset,
  fromStr?: string,
  toStr?: string,
): ResolvedRange {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  if (preset === "all") {
    return { from: null, to: null, bucket: "month" };
  }
  if (preset === "custom") {
    const f = fromStr ? parseDayStart(fromStr) : null;
    const t = toStr ? parseDayEnd(toStr) : end;
    const from = f ? fmt(f) : null;
    const to = t ? fmt(t) : null;
    const spanDays =
      f && t ? Math.round((t.getTime() - f.getTime()) / 86400000) : 999;
    return { from, to, bucket: spanDays > 92 ? "month" : "day" };
  }

  const start = new Date(end);
  if (preset === "month") start.setMonth(start.getMonth() - 1);
  else if (preset === "6month") start.setMonth(start.getMonth() - 6);
  else if (preset === "year") start.setFullYear(start.getFullYear() - 1);
  start.setHours(0, 0, 0, 0);

  const spanDays = Math.round((end.getTime() - start.getTime()) / 86400000);
  return { from: fmt(start), to: fmt(end), bucket: spanDays > 92 ? "month" : "day" };
}

/* ------------------------------- 타입 ------------------------------- */

export interface DashboardSummary {
  totalAllTime: number; // 전체 기간 총 의뢰(참고용)
  total: number; // 기간 내 접수 건수
  inProgress: number; // 기간 내 진행 중(미완료)
  completed: number; // 기간 내 완료
  rejected: number; // 기간 내 반려
  revenue: number; // 기간 내 접수 건의 견적 총액 합
  revenueCompleted: number; // 그 중 완료된 건의 견적 총액
  avgAmount: number; // 견적이 있는 건의 평균 견적액
  quotedCount: number; // 견적이 등록된 건수
}

export interface CountSlice {
  key: string;
  label: string;
  count: number;
}

export interface TrendPoint {
  bucket: string; // 'YYYY-MM-DD' 또는 'YYYY-MM'
  count: number;
  revenue: number;
}

export interface StaffPerformance {
  assignee_user_id: number;
  name: string;
  handled: number; // 기간 내 접수 & 배정된 건수
  completed: number; // 그 중 완료
  inProgress: number;
  revenue: number; // 담당 건의 견적 총액
  revenueCompleted: number;
}

export interface DashboardData {
  range: ResolvedRange & { preset: DashboardPreset };
  summary: DashboardSummary;
  byStatus: CountSlice[];
  byService: CountSlice[];
  trend: TrendPoint[];
  staff: StaffPerformance[];
}

/* ----------------------------- 집계 쿼리 ---------------------------- */

interface RangeOpts {
  from: string | null;
  to: string | null;
  bucket: "day" | "month";
  assigneeUserId?: number;
}

// created_at 기간 + (선택) 담당자 조건. alias 는 service_requests 테이블 별칭.
function buildWhere(opts: RangeOpts, alias = ""): { sql: string; params: unknown[] } {
  const p = alias ? `${alias}.` : "";
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.from) {
    where.push(`${p}created_at >= ?`);
    params.push(opts.from);
  }
  if (opts.to) {
    where.push(`${p}created_at <= ?`);
    params.push(opts.to);
  }
  if (opts.assigneeUserId) {
    where.push(`${p}assignee_user_id = ?`);
    params.push(opts.assigneeUserId);
  }
  return { sql: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

async function fetchSummary(opts: RangeOpts): Promise<DashboardSummary> {
  const pool = getPool();

  const [allTimeRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM service_requests${
      opts.assigneeUserId ? " WHERE assignee_user_id = ?" : ""
    }`,
    opts.assigneeUserId ? [opts.assigneeUserId] : [],
  );

  const { sql, params } = buildWhere(opts, "sr");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
        COUNT(*) AS total,
        SUM(sr.status = 'COMPLETED') AS completed,
        SUM(sr.status = 'REQUEST_REJECTED') AS rejected,
        SUM(sr.status NOT IN ('COMPLETED','REQUEST_REJECTED')) AS inProgress,
        COALESCE(SUM(q.total_amount), 0) AS revenue,
        COALESCE(SUM(CASE WHEN sr.status = 'COMPLETED' THEN q.total_amount ELSE 0 END), 0) AS revenueCompleted,
        COALESCE(AVG(q.total_amount), 0) AS avgAmount,
        SUM(q.id IS NOT NULL) AS quotedCount
       FROM service_requests sr
       LEFT JOIN quotations q ON q.service_request_id = sr.id
       ${sql}`,
    params,
  );
  const r = rows[0] ?? {};
  return {
    totalAllTime: n((allTimeRows[0] as { c: number })?.c),
    total: n(r.total),
    inProgress: n(r.inProgress),
    completed: n(r.completed),
    rejected: n(r.rejected),
    revenue: n(r.revenue),
    revenueCompleted: n(r.revenueCompleted),
    avgAmount: Math.round(n(r.avgAmount)),
    quotedCount: n(r.quotedCount),
  };
}

async function fetchByStatus(opts: RangeOpts): Promise<CountSlice[]> {
  const { sql, params } = buildWhere(opts);
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT status, COUNT(*) AS cnt FROM service_requests ${sql} GROUP BY status`,
    params,
  );
  const map = new Map<string, number>();
  for (const row of rows as { status: string; cnt: number }[]) {
    map.set(row.status, n(row.cnt));
  }
  // 워크플로 순서(step)대로 정렬. 존재하는 상태만 반환.
  return (Object.keys(STATUS_STEP) as RequestStatus[])
    .filter((s) => map.has(s))
    .sort((a, b) => STATUS_STEP[a] - STATUS_STEP[b])
    .map((s) => ({ key: s, label: s, count: map.get(s)! }));
}

async function fetchByService(opts: RangeOpts): Promise<CountSlice[]> {
  const { sql, params } = buildWhere(opts);
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT service_type, COUNT(*) AS cnt FROM service_requests ${sql}
       GROUP BY service_type ORDER BY cnt DESC`,
    params,
  );
  return (rows as { service_type: string; cnt: number }[]).map((r) => ({
    key: r.service_type,
    label: r.service_type,
    count: n(r.cnt),
  }));
}

async function fetchTrend(opts: RangeOpts): Promise<TrendPoint[]> {
  const { sql, params } = buildWhere(opts, "sr");
  const dateExpr =
    opts.bucket === "month"
      ? "DATE_FORMAT(sr.created_at, '%Y-%m')"
      : "DATE_FORMAT(sr.created_at, '%Y-%m-%d')";
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT ${dateExpr} AS bucket,
        COUNT(*) AS cnt,
        COALESCE(SUM(q.total_amount), 0) AS revenue
       FROM service_requests sr
       LEFT JOIN quotations q ON q.service_request_id = sr.id
       ${sql}
       GROUP BY bucket ORDER BY bucket ASC`,
    params,
  );
  return (rows as { bucket: string; cnt: number; revenue: number }[]).map((r) => ({
    bucket: r.bucket,
    count: n(r.cnt),
    revenue: n(r.revenue),
  }));
}

async function fetchStaff(opts: RangeOpts): Promise<StaffPerformance[]> {
  const { sql, params } = buildWhere(opts, "sr");
  const extra = sql ? `${sql} AND sr.assignee_user_id IS NOT NULL` : "WHERE sr.assignee_user_id IS NOT NULL";
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT sr.assignee_user_id AS uid,
        u.login_id AS name,
        COUNT(*) AS handled,
        SUM(sr.status = 'COMPLETED') AS completed,
        SUM(sr.status NOT IN ('COMPLETED','REQUEST_REJECTED')) AS inProgress,
        COALESCE(SUM(q.total_amount), 0) AS revenue,
        COALESCE(SUM(CASE WHEN sr.status = 'COMPLETED' THEN q.total_amount ELSE 0 END), 0) AS revenueCompleted
       FROM service_requests sr
       LEFT JOIN users u ON u.id = sr.assignee_user_id
       LEFT JOIN quotations q ON q.service_request_id = sr.id
       ${extra}
       GROUP BY sr.assignee_user_id, u.login_id
       ORDER BY handled DESC, revenue DESC`,
    params,
  );
  return (rows as {
    uid: number;
    name: string | null;
    handled: number;
    completed: number;
    inProgress: number;
    revenue: number;
    revenueCompleted: number;
  }[]).map((r) => ({
    assignee_user_id: n(r.uid),
    name: r.name ?? `#${r.uid}`,
    handled: n(r.handled),
    completed: n(r.completed),
    inProgress: n(r.inProgress),
    revenue: n(r.revenue),
    revenueCompleted: n(r.revenueCompleted),
  }));
}

export async function getDashboard(
  preset: DashboardPreset,
  fromStr?: string,
  toStr?: string,
  assigneeUserId?: number,
): Promise<DashboardData> {
  const range = resolveRange(preset, fromStr, toStr);
  const opts: RangeOpts = { ...range, assigneeUserId };

  const [summary, byStatus, byService, trend, staff] = await Promise.all([
    fetchSummary(opts),
    fetchByStatus(opts),
    fetchByService(opts),
    fetchTrend(opts),
    fetchStaff(opts),
  ]);

  return { range: { ...range, preset }, summary, byStatus, byService, trend, staff };
}
