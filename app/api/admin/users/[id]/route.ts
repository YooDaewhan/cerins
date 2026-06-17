import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";
import { isAccountType } from "@/src/lib/userTypes";

interface PatchBody {
  email?: string;
  email_consent?: boolean;
  account_type?: string;
  user_level?: number;
  password?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (id === null) {
    return NextResponse.json({ error: "잘못된 사용자 ID 입니다." }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const sets: string[] = [];
  const params: (string | number)[] = [];

  if (typeof body.email === "string") {
    const email = body.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 190) {
      return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
    }
    sets.push("email = ?");
    params.push(email);
  }
  if (typeof body.email_consent === "boolean") {
    sets.push("email_consent = ?");
    params.push(body.email_consent ? 1 : 0);
  }
  if (typeof body.account_type === "string") {
    if (!isAccountType(body.account_type)) {
      return NextResponse.json(
        { error: "회원 구분 값이 올바르지 않습니다." },
        { status: 400 },
      );
    }
    sets.push("account_type = ?");
    params.push(body.account_type);
  }
  if (typeof body.user_level === "number" && Number.isFinite(body.user_level)) {
    sets.push("user_level = ?");
    params.push(Math.trunc(body.user_level));
  }
  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 8 || body.password.length > 128) {
      return NextResponse.json(
        { error: "비밀번호는 8-128자여야 합니다." },
        { status: 400 },
      );
    }
    const password_hash = await bcrypt.hash(body.password, 10);
    sets.push("password_hash = ?");
    params.push(password_hash);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  params.push(id);

  try {
    const pool = getPool();
    const [result] = await pool.execute(
      `UPDATE users SET ${sets.join(", ")} WHERE id = ?`,
      params,
    );
    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected === 0) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "이미 사용 중인 이메일입니다." },
        { status: 409 },
      );
    }
    console.error("admin user patch error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (id === null) {
    return NextResponse.json({ error: "잘못된 사용자 ID 입니다." }, { status: 400 });
  }

  if (id === admin.id) {
    return NextResponse.json(
      { error: "자신의 계정은 삭제할 수 없습니다." },
      { status: 400 },
    );
  }

  try {
    const pool = getPool();
    const [result] = await pool.execute(`DELETE FROM users WHERE id = ?`, [id]);
    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected === 0) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin user delete error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
