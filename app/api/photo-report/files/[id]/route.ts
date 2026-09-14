// 보관된 사진보고서 다운로드. 관리자만 접근 가능.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/auth";
import { getPhotoReport } from "@/src/lib/photoReports";
import { readStoredFile } from "@/src/lib/requestStorage";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "잘못된 파일 ID 입니다." }, { status: 400 });
  }

  const report = await getPhotoReport(id);
  if (!report) {
    return NextResponse.json({ error: "보고서를 찾을 수 없습니다." }, { status: 404 });
  }

  const buffer = await readStoredFile(report.storage_path);
  if (!buffer) {
    return NextResponse.json({ error: "파일을 읽을 수 없습니다." }, { status: 404 });
  }

  const encoded = encodeURIComponent(report.original_name);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": report.mime_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
