import { NextResponse } from "next/server";
import { getPool } from "@/src/lib/db";
import { getCurrentUser } from "@/src/lib/auth";
import { normalizeRatings, SATISFACTION_ITEMS } from "@/src/lib/reviewTypes";
import { USER_LEVELS } from "@/src/lib/userTypes";
import { sendMail } from "@/src/lib/mail";

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
    const reviewEmail = clip(body.email, 190) ?? user.email;

    try {
      await sendMail({
        subject: `[고객 만족도] ${name}`,
        replyTo: reviewEmail,
        text: [
          `이름: ${name}`,
          `회사: ${clip(body.company, 190) ?? "-"}`,
          `이메일: ${reviewEmail}`,
          "",
          ...SATISFACTION_ITEMS.map((item) => `${item.label}: ${ratings[item.key] ?? "-"}`),
          "",
          "코멘트:",
          clip(body.comment, 5000) ?? "-",
        ].join("\n"),
      });
    } catch (mailErr) {
      console.error("satisfaction notification mail error", mailErr);
    }

    return NextResponse.json({ ok: true, id: insertId });
  } catch (err) {
    console.error("satisfaction create error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
