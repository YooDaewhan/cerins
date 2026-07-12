// 관리자 의뢰 현황(대시보드) 집계 API.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/auth";
import {
  getDashboard,
  DASHBOARD_PRESETS,
  type DashboardPreset,
} from "@/src/lib/requestDashboard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const presetRaw = sp.get("preset") ?? "6month";
  const preset: DashboardPreset = (DASHBOARD_PRESETS as readonly string[]).includes(
    presetRaw,
  )
    ? (presetRaw as DashboardPreset)
    : "6month";

  const from = sp.get("from")?.trim() || undefined;
  const to = sp.get("to")?.trim() || undefined;
  const assigneeRaw = sp.get("assignee");
  const assignee =
    assigneeRaw && Number.isFinite(Number(assigneeRaw)) && Number(assigneeRaw) > 0
      ? Number(assigneeRaw)
      : undefined;

  const data = await getDashboard(preset, from, to, assignee);
  return NextResponse.json(data);
}
