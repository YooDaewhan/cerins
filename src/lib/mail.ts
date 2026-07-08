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

export async function sendMail(opts: {
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  const to = process.env.CONTACT_TO_EMAIL;
  if (!to) throw new Error("CONTACT_TO_EMAIL is not set");

  await getTransport().sendMail({
    from: `"Cerins Website" <${process.env.SMTP_USER}>`,
    to,
    replyTo: opts.replyTo,
    subject: opts.subject,
    text: opts.text,
  });
}
