// 비공개 첨부파일 다운로드. 로그인 + 권한(해당 의뢰의 고객/담당자/관리자) 검증 후에만 스트리밍.
// 최종 인증서는 완료(COMPLETED) 이후에만 고객이 다운로드할 수 있다.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { isAdminLevel, isStaffLevel } from "@/src/lib/userTypes";
import { STATUS, FINAL_FILE_TYPE } from "@/src/lib/serviceRequestTypes";
import { getFileById, getRequestById } from "@/src/lib/serviceRequestRepo";
import { readStoredFile } from "@/src/lib/requestStorage";
import { canDownloadCecFile } from "@/src/lib/cecFiles";
import { canDownloadProductInspectionFile } from "@/src/lib/productInspectionFiles";
import { canDownloadScrapFile } from "@/src/lib/scrapIndiaFiles";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "잘못된 파일 ID 입니다." }, { status: 400 });
  }

  const file = await getFileById(id);
  if (!file) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  const request = await getRequestById(file.service_request_id);
  if (!request) return NextResponse.json({ error: "의뢰를 찾을 수 없습니다." }, { status: 404 });

  const isAdmin = isAdminLevel(user.user_level);
  const isAssignee = request.assignee_user_id === user.id && isStaffLevel(user.user_level);
  const isOwner = request.customer_user_id === user.id;
  const isInternal = isAdmin || isAssignee;

  let allowed = false;
  if (request.service_type === "CEC_INDIA") {
    // CEC 는 파일 종류별 규칙(내부 리포트/미리보기 전용/완료 후 최종본)을 별도 적용.
    allowed = canDownloadCecFile({ isInternal, isOwner }, request.status, file);
  } else if (request.service_type === "PRODUCT_INSPECTION") {
    // 제품검사는 제품사진만 고객 접근 가능, 리포트/증빙 등은 내부 전용.
    allowed = canDownloadProductInspectionFile({ isInternal, isOwner }, file);
  } else if (request.service_type === "SCRAP_INDIA") {
    // 스크랩은 고객 서류/청구서/세금계산서/입금 증빙만 고객 접근, 리포트/DGFT 자료는 내부 전용.
    allowed = canDownloadScrapFile({ isInternal, isOwner }, file);
  } else if (isInternal) {
    allowed = true; // 담당자/관리자는 모든 첨부(임시 포함) 접근 가능
  } else if (isOwner) {
    if (file.file_type === FINAL_FILE_TYPE) {
      allowed = request.status === STATUS.COMPLETED; // 완료 후에만
    } else {
      allowed = file.is_customer_visible; // 임시/내부 파일 차단
    }
  }
  if (!allowed) {
    return NextResponse.json({ error: "파일에 접근할 권한이 없습니다." }, { status: 403 });
  }

  const buffer = await readStoredFile(file.storage_path);
  if (!buffer) {
    return NextResponse.json({ error: "파일을 읽을 수 없습니다." }, { status: 404 });
  }

  // 원본 파일명은 RFC 5987 로 인코딩(한글/특수문자 안전).
  const encoded = encodeURIComponent(file.original_name);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": file.mime_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
