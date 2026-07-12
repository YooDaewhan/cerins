import nodemailer from "nodemailer";

declare global {
  // eslint-disable-next-line no-var
  var __cerinsMailer: nodemailer.Transporter | undefined;
}

function getTransport(): nodemailer.Transporter {
  if (!global.__cerinsMailer) {
    global.__cerinsMailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return global.__cerinsMailer;
}

export interface MailAttachment {
  filename: string;
  path?: string; // 파일 경로 첨부
  content?: Buffer | string; // 메모리 버퍼 첨부
  contentType?: string;
}

// 기존 시그니처 유지(to 생략 시 CONTACT_TO_EMAIL 로 발송) + html/to/attachments 확장.
export async function sendMail(opts: {
  subject: string;
  text: string;
  html?: string;
  to?: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}): Promise<void> {
  const to = opts.to ?? process.env.CONTACT_TO_EMAIL;
  if (!to) throw new Error("CONTACT_TO_EMAIL is not set");

  await getTransport().sendMail({
    from: `"Cerins Website" <${process.env.SMTP_USER}>`,
    to,
    replyTo: opts.replyTo,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    attachments: opts.attachments,
  });
}

// 상태 변경 커밋 이후 호출하는 안전 래퍼.
// 메일 실패가 워크플로 전이를 롤백시키지 않도록 예외를 잡아 로깅만 하고 결과를 반환한다.
export async function sendMailSafe(opts: {
  subject: string;
  text: string;
  html?: string;
  to?: string;
  replyTo?: string;
  attachments?: MailAttachment[];
  context?: string; // 로그 식별용(예: "REJECT_REQUEST cert-26-0001")
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await sendMail(opts);
    console.info(`[mail] sent ok: ${opts.context ?? opts.subject} → ${opts.to ?? "(default)"}`);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[mail] send failed: ${opts.context ?? opts.subject}`, message);
    return { ok: false, error: message };
  }
}
