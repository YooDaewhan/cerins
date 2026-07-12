// 관리자 프로세스 목록 (필터/정렬/페이징).
import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/auth";
import { adminListRequests, type AdminRequestFilter } from "@/src/lib/serviceRequestRepo";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const num = (k: string) => {
    const v = sp.get(k);
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const str = (k: string) => sp.get(k)?.trim() || undefined;
  const completedRaw = sp.get("completed");

  const filter: AdminRequestFilter = {
    service_type: str("service_type"),
    status: str("status"),
    step: num("step"),
    assignee_user_id: num("assignee_user_id"),
    company_name: str("company_name"),
    request_number: str("request_number"),
    from_date: str("from_date"),
    to_date: str("to_date"),
    completed: completedRaw === "1" ? true : completedRaw === "0" ? false : undefined,
    sort: (str("sort") as AdminRequestFilter["sort"]) ?? "recent",
    page: num("page") ?? 1,
    pageSize: num("pageSize") ?? 20,
  };

  const result = await adminListRequests(filter);
  return NextResponse.json(result);
}
