// 동적 제출서류 항목 관리(관리자 전용). 서비스별·단계별 항목 목록 조회 + 생성.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { isAdminLevel } from "@/src/lib/userTypes";
import { WorkflowError } from "@/src/lib/serviceWorkflow";
import {
  listAllDocumentRequirements,
  createDocumentRequirement,
  type DocumentRequirementInput,
} from "@/src/lib/serviceDocumentRequirements";

export const runtime = "nodejs";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  if (!isAdminLevel(user.user_level)) return { error: NextResponse.json({ error: "권한이 없습니다." }, { status: 403 }) };
  return { user };
}

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const url = new URL(req.url);
  const serviceType = url.searchParams.get("service_type") ?? "SCRAP_INDIA";
  const step = Number(url.searchParams.get("step") ?? "5");
  if (!Number.isFinite(step)) return NextResponse.json({ error: "단계가 올바르지 않습니다." }, { status: 400 });
  const items = await listAllDocumentRequirements(serviceType, step);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  let body: DocumentRequirementInput;
  try {
    body = (await req.json()) as DocumentRequirementInput;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }
  if (!body.service_type || !Number.isFinite(body.workflow_step)) {
    return NextResponse.json({ error: "서비스 종류와 단계는 필수입니다." }, { status: 400 });
  }
  try {
    const item = await createDocumentRequirement(body);
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    if (err instanceof WorkflowError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.httpStatus });
    }
    console.error("create document requirement error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
