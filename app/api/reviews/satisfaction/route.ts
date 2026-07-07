import { NextResponse } from "next/server";
import { getPool } from "@/src/lib/db";
import { getCurrentUser } from "@/src/lib/auth";
import { normalizeRatings } from "@/src/lib/reviewTypes";
import { USER_LEVELS } from "@/src/lib/userTypes";

interface Body {
  name?: string;
  company?: string;
  email?: string;
  ratings?: unknown;
  comment?: string;
}

function clip(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t.slice(0, max);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  // 고객 만족도는 일반회원(1) / 기업회원(3) 대상.
  if (user.user_level !== USER_LEVELS.user && user.user_level !== USER_LEVELS.business) {
    return NextResponse.json(
      { error: "고객 만족도는 일반/기업 회원만 작성할 수 있습니다." },
      { status: 403 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const name = clip(body.name, 190);
  if (!name) {
    return NextResponse.json({ error: "이름은 필수입니다." }, { status: 400 });
  }
  const ratings = normalizeRatings("satisfaction", body.ratings);
  if (!ratings) {
    return NextResponse.json({ error: "별점을 1개 이상 선택해 주세요." }, { status: 400 });
  }

  try {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO satisfaction_reviews (user_id, name, company, email, ratings, comment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        name,
        clip(body.company, 190),
        clip(body.email, 190) ?? user.email,
        JSON.stringify(ratings),
        clip(body.comment, 5000),
      ],
    );
    const insertId = (result as { insertId: number }).insertId;
    return NextResponse.json({ ok: true, id: insertId });
  } catch (err) {
    console.error("satisfaction create error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
