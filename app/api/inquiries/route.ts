import { NextResponse } from "next/server";
import { getPool } from "@/src/lib/db";
import { sendMail } from "@/src/lib/mail";

interface InquiryBody {
  name?: string;
  company?: string;
  department?: string;
  country?: string;
  email?: string;
  website?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      `INSERT INTO inquiries
         (name, company, department, country, email, website, phone, subject, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        clip(body.company, 190),
        clip(body.department, 190),
        clip(body.country, 120),
        email,
        clip(body.website, 255),
        clip(body.phone, 60),
        subject,
        message,
      ],
    );
    const insertId = (result as { insertId: number }).insertId;

    try {
      await sendMail({
        subject: `[문의] ${subject}`,
        replyTo: email,
        text: [
          `이름: ${name}`,
          `회사: ${clip(body.company, 190) ?? "-"}`,
          `부서: ${clip(body.department, 190) ?? "-"}`,
          `국가: ${clip(body.country, 120) ?? "-"}`,
          `이메일: ${email}`,
          `웹사이트: ${clip(body.website, 255) ?? "-"}`,
          `전화번호: ${clip(body.phone, 60) ?? "-"}`,
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
