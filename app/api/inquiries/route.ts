import { NextResponse } from "next/server";
import { getPool } from "@/src/lib/db";
import { sendMail } from "@/src/lib/mail";

interface InquiryBody {
  category?: string;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  country?: string;
  department?: string;
  subject?: string;
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CATEGORIES = ["불편 접수", "추가 요청사항", "기타"];

function clip(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t.slice(0, max);
}

export async function POST(req: Request) {
  let body: InquiryBody;
  try {
    body = (await req.json()) as InquiryBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const name = clip(body.name, 190);
  const email = clip(body.email, 190);
  const subject = clip(body.subject, 255);
  const message = clip(body.message, 5000);
  const company = clip(body.company, 190);
  const country = clip(body.country, 120);
  const phone = clip(body.phone, 60);
  const department = clip(body.department, 190);
  const rawCategory = clip(body.category, 40);
  const category = rawCategory && CATEGORIES.includes(rawCategory) ? rawCategory : "기타";

  if (!name || !email || !subject || !message) {
    return NextResponse.json(
      { error: "이름, 이메일, 제목, 메시지는 필수입니다." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO inquiries (category, name, company, email, phone, country, department, subject, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [category, name, company, email, phone, country, department, subject, message],
    );
    const insertId = (result as { insertId: number }).insertId;

    try {
      await sendMail({
        subject: `[문의:${category}] ${subject}`,
        replyTo: email,
        text: [
          `분류: ${category}`,
          `아이디: ${name}`,
          `회사: ${company ?? "-"}`,
          `직위: ${department ?? "-"}`,
          `이메일: ${email}`,
          `전화번호: ${phone ?? "-"}`,
          `국가: ${country ?? "-"}`,
          "",
          "메시지:",
          message,
        ].join("\n"),
      });
    } catch (mailErr) {
      console.error("inquiry notification mail error", mailErr);
    }

    return NextResponse.json({ ok: true, id: insertId });
  } catch (err) {
    console.error("inquiry create error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
