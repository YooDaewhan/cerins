// CEC 최종 인증서 초안(워터마크 PDF) 보안 미리보기. 일반 다운로드 대신 inline 스트리밍만 제공한다.
// 권한(해당 의뢰의 고객/담당자/관리자) 검증 후에만 열람 가능하며, 실제 저장경로는 노출하지 않는다.
// 주의: inline 미리보기는 브라우저 화면 캡처까지 막지는 못한다.
//
// 추후 CecCertificatePreviewService(PDF 워터마크 삽입/미리보기 PDF 생성)로 이 엔드포인트의
// 스트리밍 소스를 교체할 수 있도록 접근 판정과 스트리밍을 분리해 둔다.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { isAdminLevel, isStaffLevel } from "@/src/lib/userTypes";
import { getFileById, getRequestById } from "@/src/lib/serviceRequestRepo";
import { readStoredFile } from "@/src/lib/requestStorage";
import { canPreviewCecFile } from "@/src/lib/cecFiles";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string; fileId: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id: idRaw, fileId: fileRaw } = await ctx.params;
  const id = Number(idRaw);
  const fileId = Number(fileRaw);
  if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(fileId) || fileId <= 0) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const file = await getFileById(fileId);
  if (!file || file.service_request_id !== id) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }
  const request = await getRequestById(id);
  if (!request || request.service_type !== "CEC_INDIA") {
    return NextResponse.json({ error: "의뢰를 찾을 수 없습니다." }, { status: 404 });
  }

  const isInternal =
    isAdminLevel(user.user_level) ||
    (request.assignee_user_id === user.id && isStaffLevel(user.user_level));
  const isOwner = request.customer_user_id === user.id;

  if (!canPreviewCecFile({ isInternal, isOwner }, file)) {
    return NextResponse.json({ error: "미리보기 권한이 없습니다." }, { status: 403 });
  }

  const buffer = await readStoredFile(file.storage_path);
  if (!buffer) return NextResponse.json({ error: "파일을 읽을 수 없습니다." }, { status: 404 });

  const encoded = encodeURIComponent(file.original_name);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": file.mime_type || "application/pdf",
      // inline: 브라우저 내 미리보기(첨부 다운로드가 아님).
      "Content-Disposition": `inline; filename*=UTF-8''${encoded}`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
