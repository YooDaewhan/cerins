import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPool } from "@/src/lib/db";
import { setSessionUserId } from "@/src/lib/session";

interface LoginBody {
  login_id?: string;
  password?: string;
}

interface UserRow {
  id: number;
  password_hash: string;
  country: string | null;
}

export async function POST(req: Request) {
  let body: LoginBody;
  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const login_id = (body.login_id ?? "").trim();
  const password = body.password ?? "";

  if (!login_id || !password) {
    return NextResponse.json(
      { error: "아이디와 비밀번호를 입력하세요." },
      { status: 400 },
    );
  }

  const pool = getPool();
  try {
    const [rows] = await pool.execute(
      `SELECT id, password_hash, country FROM users WHERE login_id = ? LIMIT 1`,
      [login_id],
    );
    const list = rows as UserRow[];
    if (list.length === 0) {
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 },
      );
    }
    const user = list[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 },
      );
    }
    await setSessionUserId(user.id);
    return NextResponse.json({ ok: true, id: user.id, country: user.country });
  } catch (err) {
    console.error("login error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
