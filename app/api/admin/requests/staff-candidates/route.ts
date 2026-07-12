// 담당자 지정 후보(직원 7 이상) 목록.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/auth";
import { listStaffUsers } from "@/src/lib/serviceRequestRepo";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  const staff = await listStaffUsers();
  return NextResponse.json({ staff });
}
