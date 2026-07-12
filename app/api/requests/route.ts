// 의뢰 등록(Step 0) + 고객 본인 의뢰 목록.
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/src/lib/auth";
import {
  isServiceType,
  categoryOfService,
  IMPLEMENTED_SERVICE_TYPES,
  REQUEST_FILE_TYPES,
  type ServiceType,
} from "@/src/lib/serviceRequestTypes";
import {
  CEC_REQUEST_FILE_TYPES,
  CEC_REQUIRED_REQUEST_FILE_TYPES,
  CEC_FILE_META,
  type CecFileType,
} from "@/src/lib/cecTypes";
import {
  PI_REQUEST_FILE_TYPES,
  PI_REQUIRED_REQUEST_FILE_TYPES,
  PI_FILE_META,
  type PiFileType,
} from "@/src/lib/productInspectionTypes";
import { validateUpload, storeRequestFile, type StoredFileMeta } from "@/src/lib/requestStorage";
import {
  submitRequest,
  validateRequiredFiles,
  type PendingFile,
} from "@/src/lib/requestWorkflowService";
import { saveScrapInitialRequest } from "@/src/lib/scrapIndiaWorkflowService";
import { saveCecInitialRequest } from "@/src/lib/cecWorkflowService";
import { listCustomerRequests } from "@/src/lib/serviceRequestRepo";

export const runtime = "nodejs";

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const items = await listCustomerRequests(user.id);
  return NextResponse.json({ requests: items });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "잘못된 업로드 요청입니다." }, { status: 400 });
  }

  const serviceTypeRaw = str(form, "service_type");
  if (!isServiceType(serviceTypeRaw)) {
    return NextResponse.json({ error: "서비스 종류가 올바르지 않습니다." }, { status: 400 });
  }
  const serviceType = serviceTypeRaw as ServiceType;
  if (!IMPLEMENTED_SERVICE_TYPES.includes(serviceType)) {
    return NextResponse.json(
      { error: "해당 서비스의 온라인 의뢰는 준비 중입니다." },
      { status: 400 },
    );
  }

  const input = {
    category: categoryOfService(serviceType),
    service_type: serviceType,
    company_name: str(form, "company_name"),
    contact_name: str(form, "contact_name"),
    contact_phone: str(form, "contact_phone"),
    contact_email: str(form, "contact_email"),
    title: str(form, "title"),
    description: str(form, "description"),
  };
  for (const [k, label] of [
    ["company_name", "회사명"], ["contact_name", "담당자 이름"],
    ["contact_phone", "연락처"], ["contact_email", "이메일"],
    ["title", "의뢰 제목"], ["description", "의뢰 내용"],
  ] as const) {
    if (!input[k as keyof typeof input]) {
      return NextResponse.json({ error: `${label}은(는) 필수입니다.` }, { status: 400 });
    }
  }

  // 파일 수집: 필드명 files_<TYPE> (다중). 서비스 종류별로 허용 파일 종류가 다르다.
  // 실제로 선택된 파일(name 존재)은 크기가 0이어도 담아서 validateUpload 로
  // "빈 파일입니다" 를 정확히 안내한다. (선택 안 한 필드는 name 이 비어 스킵)
  const isCec = serviceType === "CEC_INDIA";
  const isPi = serviceType === "PRODUCT_INSPECTION";
  const isScrap = serviceType === "SCRAP_INDIA";
  // 스크랩 India 는 step 0 에서 첨부파일을 받지 않는다(고객 서류는 현장검사 완료 후 제출).
  const collectTypes: readonly string[] = isScrap
    ? []
    : isCec
      ? CEC_REQUEST_FILE_TYPES
      : isPi
        ? PI_REQUEST_FILE_TYPES
        : REQUEST_FILE_TYPES;
  const pending: { file: File; fileType: string }[] = [];
  for (const type of collectTypes) {
    for (const entry of form.getAll(`files_${type}`)) {
      if (entry instanceof File && entry.name !== "") {
        pending.push({ file: entry, fileType: type });
      }
    }
  }

  // 스크랩 India 는 파일 대신 검사 요청 일정/장소 검증(검사 요청일 없이 신청 불가).
  if (isScrap) {
    const reqStart = str(form, "requested_start_date");
    const reqEnd = str(form, "requested_end_date");
    const reqLocation = str(form, "requested_location");
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(reqStart) || !dateRe.test(reqEnd)) {
      return NextResponse.json({ error: "검사 요청 시작일/종료일은 필수입니다." }, { status: 400 });
    }
    if (reqEnd < reqStart) {
      return NextResponse.json({ error: "검사 요청 종료일은 시작일보다 빠를 수 없습니다." }, { status: 400 });
    }
    if (!reqLocation) {
      return NextResponse.json({ error: "검사 장소는 필수입니다." }, { status: 400 });
    }
  }

  // CEC India 는 검사 요청 일정(가능일)/현장 담당자가 필수 입력.
  if (isCec) {
    const reqStart = str(form, "requested_start_date");
    const reqEnd = str(form, "requested_end_date");
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(reqStart) || !dateRe.test(reqEnd)) {
      return NextResponse.json({ error: "검사 요청 시작일/종료일은 필수입니다." }, { status: 400 });
    }
    if (reqEnd < reqStart) {
      return NextResponse.json({ error: "검사 요청 종료일은 시작일보다 빠를 수 없습니다." }, { status: 400 });
    }
    if (!str(form, "site_contact_name") || !str(form, "site_contact_phone")) {
      return NextResponse.json({ error: "현장 담당자명과 연락처는 필수입니다." }, { status: 400 });
    }
  }

  // 필수 파일 검증(서비스별). CEC: 영수증/명판/제품사진, 제품검사: 제품사진. 스크랩: 없음.
  const missing = isScrap
    ? null
    : isCec
      ? validateCecRequiredFiles(pending)
      : isPi
        ? validatePiRequiredFiles(pending)
        : validateRequiredFiles(pending as PendingFile[]);
  if (missing) return NextResponse.json({ error: missing }, { status: 400 });

  for (const p of pending) {
    // 제품검사 제품사진은 이미지 형식만 서버에서 검증한다.
    const imageOnly = isPi && Boolean(PI_FILE_META[p.fileType as PiFileType]?.imageOnly);
    const v = validateUpload(p.file, { imageOnly });
    if (!v.ok) return NextResponse.json({ error: `${p.file.name}: ${v.error}` }, { status: 400 });
  }

  // 신규 생성 전이므로 임시 배치 폴더에 저장 후 메타만 넘긴다.
  const batchKey = crypto.randomUUID();
  const stored: { meta: StoredFileMeta; fileType: string }[] = [];
  for (const p of pending) {
    const meta = await storeRequestFile(batchKey, p.file);
    stored.push({ meta, fileType: p.fileType });
  }

  try {
    const request = await submitRequest(user, input, stored);
    // 스크랩 India: 검사 요청 일정/장소/현장 담당자/요청사항을 상세 테이블에 저장.
    if (isScrap) {
      await saveScrapInitialRequest(request.id, {
        requested_start_date: str(form, "requested_start_date"),
        requested_end_date: str(form, "requested_end_date"),
        requested_start_time: str(form, "requested_start_time"),
        requested_end_time: str(form, "requested_end_time"),
        requested_location: str(form, "requested_location"),
        requested_location_detail: str(form, "requested_location_detail"),
        site_contact_name: str(form, "site_contact_name"),
        site_contact_phone: str(form, "site_contact_phone"),
        request_note: str(form, "request_note"),
      });
    }
    // CEC India: 고객이 입력한 검사 요청 일정(가능일)/현장 담당자를 상세 테이블에 저장.
    if (isCec) {
      await saveCecInitialRequest(request.id, {
        requested_start_date: str(form, "requested_start_date"),
        requested_end_date: str(form, "requested_end_date"),
        requested_start_time: str(form, "requested_start_time"),
        requested_end_time: str(form, "requested_end_time"),
        site_contact_name: str(form, "site_contact_name"),
        site_contact_phone: str(form, "site_contact_phone"),
      });
    }
    return NextResponse.json({ ok: true, id: request.id });
  } catch (err) {
    console.error("submitRequest error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// CEC 의뢰서 필수 파일: 최초 구매가 영수증/명판/제품사진 각 최소 1개.
function validateCecRequiredFiles(files: { fileType: string }[]): string | null {
  for (const t of CEC_REQUIRED_REQUEST_FILE_TYPES as CecFileType[]) {
    if (!files.some((f) => f.fileType === t)) {
      return `${CEC_FILE_META[t].label} 파일은 필수입니다.`;
    }
  }
  return null;
}

// 제품검사 의뢰서 필수 파일: 제품사진 최소 1개.
function validatePiRequiredFiles(files: { fileType: string }[]): string | null {
  for (const t of PI_REQUIRED_REQUEST_FILE_TYPES as PiFileType[]) {
    if (!files.some((f) => f.fileType === t)) {
      return `${PI_FILE_META[t].label} 파일은 필수입니다.`;
    }
  }
  return null;
}
