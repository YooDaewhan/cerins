// 동적 제출서류 항목 수정/비활성화(관리자 전용).
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { isAdminLevel } from "@/src/lib/userTypes";
import { WorkflowError } from "@/src/lib/serviceWorkflow";
import {
  updateDocumentRequirement,
  deactivateDocumentRequirement,
  type DocumentRequirementUpdate,
} from "@/src/lib/serviceDocumentRequirements";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  if (!isAdminLevel(user.user_level)) return { error: NextResponse.json({ error: "권한이 없습니다." }, { status: 403 }) };
  return { user };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: "잘못된 ID 입니다." }, { status: 400 });

  let body: DocumentRequirementUpdate;
  try {
    body = (await req.json()) as DocumentRequirementUpdate;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }
  try {
    const item = await updateDocumentRequirement(id, body);
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    if (err instanceof WorkflowError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.httpStatus });
    }
    console.error("update document requirement error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: "잘못된 ID 입니다." }, { status: 400 });
  await deactivateDocumentRequirement(id);
  return NextResponse.json({ ok: true });
}
