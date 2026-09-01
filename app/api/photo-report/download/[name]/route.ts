// 방금 만든 사진보고서 내려받기. 저장 파일명(UUID)을 아는 사람만 받을 수 있다.
// blob 다운로드는 아이폰 사파리·인앱 브라우저에서 무시되는 일이 있어, 평범한 GET 으로 받게 한다.
import { NextResponse } from "next/server";
import { getPhotoReportByStoredName } from "@/src/lib/photoReports";
import { readStoredFile } from "@/src/lib/requestStorage";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ name: string }>;
}

const STORED_NAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(docx|zip)$/i;

export async function GET(_req: Request, ctx: Ctx) {
  const { name } = await ctx.params;
  if (!STORED_NAME_RE.test(name)) {
    return NextResponse.json({ error: "잘못된 파일 이름입니다." }, { status: 400 });
  }

  const report = await getPhotoReportByStoredName(name);
  if (!report) {
    return NextResponse.json({ error: "보고서를 찾을 수 없습니다." }, { status: 404 });
  }

  const buffer = await readStoredFile(report.storage_path);
  if (!buffer) {
    return NextResponse.json({ error: "파일을 읽을 수 없습니다." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": report.mime_type || "application/octet-stream",
      // 한글 이름이 들어가므로 RFC 5987 로 인코딩한다.
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(report.original_name)}`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
