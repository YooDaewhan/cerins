// 의뢰 추가 파일 업로드. 역할에 따라 고객 보완자료 / 담당자 자료로 분기.
// 필드명 files_<FILETYPE> (다중). 최종 인증서(FINAL_CERTIFICATE)는 PDF 만 허용.
// 스크랩 India 고객 제출서류는 동적 서류 항목과 연결하므로 필드명 doc_<requirementId> 로 받는다.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { WorkflowError } from "@/src/lib/serviceWorkflow";
import {
  ALL_FILE_TYPES,
  FINAL_FILE_TYPE,
} from "@/src/lib/serviceRequestTypes";
import { CEC_FILE_TYPES, CEC_FILE_META, type CecFileType } from "@/src/lib/cecTypes";
import { PI_FILE_TYPES, PI_FILE_META, type PiFileType } from "@/src/lib/productInspectionTypes";
import { SCRAP_FILE_TYPES } from "@/src/lib/scrapIndiaTypes";
import { validateUpload, storeRequestFile, type StoredFileMeta } from "@/src/lib/requestStorage";
import { getRequestById } from "@/src/lib/serviceRequestRepo";
import { addCustomerFiles, addStaffFiles } from "@/src/lib/requestWorkflowService";
import { addCecFiles } from "@/src/lib/cecWorkflowService";
import { addProductInspectionFiles } from "@/src/lib/productInspectionWorkflowService";
import { addScrapFiles, type ScrapStoredFile } from "@/src/lib/scrapIndiaWorkflowService";
import { listActiveDocumentRequirements } from "@/src/lib/serviceDocumentRequirements";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "잘못된 의뢰 ID 입니다." }, { status: 400 });
  }

  const request = await getRequestById(id);
  if (!request) return NextResponse.json({ error: "의뢰를 찾을 수 없습니다." }, { status: 404 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "잘못된 업로드 요청입니다." }, { status: 400 });
  }

  /* ------------------------- 스크랩 India ------------------------- */
  if (request.service_type === "SCRAP_INDIA") {
    return handleScrapUpload(user, id, form);
  }

  // 수집 + 검증. 서비스 종류별로 허용 파일 종류가 다르다.
  const isCec = request.service_type === "CEC_INDIA";
  const isPi = request.service_type === "PRODUCT_INSPECTION";
  const uploadTypes: readonly string[] = isCec
    ? CEC_FILE_TYPES
    : isPi
      ? PI_FILE_TYPES
      : ALL_FILE_TYPES;
  const collected: { file: File; fileType: string }[] = [];
  for (const type of uploadTypes) {
    for (const entry of form.getAll(`files_${type}`)) {
      if (entry instanceof File && entry.size > 0) {
        // 최종 인증서류(PDF 전용)/제품사진(이미지 전용)은 확장자/MIME 을 엄격히 검증.
        const pdfOnly = isCec
          ? Boolean(CEC_FILE_META[type as CecFileType]?.pdfOnly)
          : !isPi && type === FINAL_FILE_TYPE;
        const imageOnly = isPi && Boolean(PI_FILE_META[type as PiFileType]?.imageOnly);
        const v = validateUpload(entry, { pdfOnly, imageOnly });
        if (!v.ok) {
          return NextResponse.json({ error: `${entry.name}: ${v.error}` }, { status: 400 });
        }
        collected.push({ file: entry, fileType: type });
      }
    }
  }
  if (collected.length === 0) {
    return NextResponse.json({ error: "업로드할 파일이 없습니다." }, { status: 400 });
  }

  // 저장(비공개).
  const stored: { meta: StoredFileMeta; fileType: string }[] = [];
  for (const c of collected) {
    const meta = await storeRequestFile(String(id), c.file);
    stored.push({ meta, fileType: c.fileType });
  }

  try {
    if (isCec) {
      // CEC 는 파일 종류 메타로 공개 여부를 결정(내부 리포트/최종본은 비공개).
      await addCecFiles(user, id, stored);
    } else if (isPi) {
      // 제품검사도 파일 종류 메타로 공개 여부를 결정(리포트/증빙은 내부 전용).
      await addProductInspectionFiles(user, id, stored);
    } else if (request.customer_user_id === user.id) {
      await addCustomerFiles(user, id, stored);
    } else {
      await addStaffFiles(user, id, stored);
    }
    return NextResponse.json({ ok: true, count: stored.length });
  } catch (err) {
    if (err instanceof WorkflowError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.httpStatus });
    }
    console.error("file upload error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// 스크랩 India 업로드: 고정 종류(files_<TYPE>) + 고객 제출서류(doc_<requirementId>).
async function handleScrapUpload(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
  id: number,
  form: FormData,
): Promise<NextResponse> {
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const collected: { file: File; fileType: string; requirementId?: number; displayNameSnapshot?: string }[] = [];

  // 1) 고정 종류(내부 리포트/청구서/세금계산서/입금 증빙/DGFT 자료 등).
  for (const type of SCRAP_FILE_TYPES) {
    if (type === "SCRAP_CUSTOMER_DOCUMENT") continue; // 동적 항목으로 별도 수집
    for (const entry of form.getAll(`files_${type}`)) {
      if (entry instanceof File && entry.size > 0) {
        const v = validateUpload(entry);
        if (!v.ok) return NextResponse.json({ error: `${entry.name}: ${v.error}` }, { status: 400 });
        collected.push({ file: entry, fileType: type });
      }
    }
  }

  // 2) 고객 제출서류(동적 항목). 필드명 doc_<requirementId>.
  const reqs = await listActiveDocumentRequirements("SCRAP_INDIA", 5);
  const reqById = new Map(reqs.map((r) => [r.id, r]));
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("doc_")) continue;
    if (!(value instanceof File) || value.size === 0) continue;
    const reqId = Number(key.slice(4));
    const requirement = reqById.get(reqId);
    if (!requirement) {
      return NextResponse.json({ error: "알 수 없는 제출서류 항목입니다." }, { status: 400 });
    }
    const v = validateUpload(value);
    if (!v.ok) return NextResponse.json({ error: `${value.name}: ${v.error}` }, { status: 400 });
    collected.push({
      file: value,
      fileType: "SCRAP_CUSTOMER_DOCUMENT",
      requirementId: reqId,
      displayNameSnapshot: requirement.display_name,
    });
  }

  if (collected.length === 0) {
    return NextResponse.json({ error: "업로드할 파일이 없습니다." }, { status: 400 });
  }

  const stored: ScrapStoredFile[] = [];
  for (const c of collected) {
    const meta = await storeRequestFile(String(id), c.file);
    stored.push({
      meta,
      fileType: c.fileType,
      documentRequirementId: c.requirementId ?? null,
      displayNameSnapshot: c.displayNameSnapshot ?? null,
    });
  }

  try {
    await addScrapFiles(user, id, stored);
    return NextResponse.json({ ok: true, count: stored.length });
  } catch (err) {
    if (err instanceof WorkflowError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.httpStatus });
    }
    console.error("scrap file upload error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
