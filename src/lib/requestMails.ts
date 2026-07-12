// 워크플로 단계별 고객 안내 메일 본문 빌더(순수 함수). 발송은 requestWorkflowService 가
// sendMailSafe 로 커밋 이후 수행한다. HTML 은 최소한으로만 구성하고 text 를 항상 채운다.

import type { BankInfo } from "@/src/lib/requestSettings";
import type { ServiceRequest } from "@/src/lib/serviceRequestTypes";

export interface BuiltMail {
  subject: string;
  text: string;
  html: string;
}

// 마이페이지 상세 링크. APP_BASE_URL 이 있으면 절대 URL, 없으면 경로만.
export function mypageRequestUrl(requestId: number): string {
  const base = process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/mypage/requests/${requestId}`;
}

export function money(amount: string | null, currency: string): string {
  if (amount == null) return "-";
  // KRW 는 정수로 표기.
  const num = Number(amount);
  if (currency === "KRW") return `${Math.round(num).toLocaleString("ko-KR")} KRW`;
  return `${num.toLocaleString("ko-KR", { minimumFractionDigits: 2 })} ${currency}`;
}

export function wrap(title: string, lines: string[], link: string): BuiltMail {
  const text = [...lines, "", `마이페이지에서 확인: ${link}`].join("\n");
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e">
      <h2 style="color:#B4123A">${escapeHtml(title)}</h2>
      ${lines.map((l) => `<p style="margin:6px 0">${escapeHtml(l)}</p>`).join("")}
      <p style="margin-top:20px">
        <a href="${escapeHtml(link)}" style="background:#B4123A;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">마이페이지에서 확인</a>
      </p>
    </div>`;
  return { subject: title, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const tag = (r: ServiceRequest) => `[${r.request_number ?? "접수번호 미발급"}] ${r.title}`;

/* 1) 서류 반려 */
export function buildRejectRequestMail(r: ServiceRequest, reason: string): BuiltMail {
  return wrap(
    `서류 보완 요청 — ${tag(r)}`,
    [
      `안녕하세요. 접수번호 ${r.request_number ?? "-"} 의뢰 서류 검토 결과 보완이 필요합니다.`,
      `의뢰 제목: ${r.title}`,
      "",
      "보완/반려 사유:",
      reason,
      "",
      "마이페이지에서 신청 내용과 파일을 수정하신 후 재제출해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 2) 견적 완료 및 선금 요청 */
export function buildQuotationMail(
  r: ServiceRequest,
  ctx: {
    currency: string;
    total: string;
    deposit: string;
    items: { item_name: string; amount: string }[];
    bank: BankInfo;
  },
): BuiltMail {
  const itemLines = ctx.items.map(
    (it) => ` - ${it.item_name}: ${money(it.amount, ctx.currency)}`,
  );
  return wrap(
    `견적 완료 / 선금 입금 안내 — ${tag(r)}`,
    [
      `견적이 완료되었습니다. (접수번호 ${r.request_number ?? "-"})`,
      "",
      "견적 항목:",
      ...itemLines,
      "",
      `총금액: ${money(ctx.total, ctx.currency)}`,
      `선금(50%): ${money(ctx.deposit, ctx.currency)}`,
      "",
      "입금 계좌:",
      ` - 은행: ${ctx.bank.bankName || "-"}`,
      ` - 계좌번호: ${ctx.bank.accountNumber || "-"}`,
      ` - 예금주: ${ctx.bank.accountHolder || "-"}`,
      "",
      "선금 입금 후 마이페이지에서 입금 정보를 등록해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 3) 선금 확인불가 */
export function buildDepositRejectedMail(r: ServiceRequest, reason: string): BuiltMail {
  return wrap(
    `선금 확인 불가 — ${tag(r)}`,
    [
      `등록하신 선금 입금 정보를 확인할 수 없었습니다. (접수번호 ${r.request_number ?? "-"})`,
      "",
      "사유:",
      reason,
      "",
      "마이페이지에서 입금 정보를 수정하여 다시 제출해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 4) 인증 보완 / 인증불가 */
export function buildCertificationBlockedMail(r: ServiceRequest, reason: string): BuiltMail {
  return wrap(
    `인증 진행 보완 필요 — ${tag(r)}`,
    [
      `인증 진행 중 보완이 필요한 사항이 발생했습니다. (접수번호 ${r.request_number ?? "-"})`,
      "",
      "문제 / 필요한 추가서류:",
      reason,
      "",
      "마이페이지에서 추가 자료와 메모를 등록해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 5) 인증 완료 및 잔금 요청 */
export function buildBalanceRequestMail(
  r: ServiceRequest,
  ctx: { currency: string; total: string; deposit: string; balance: string; bank: BankInfo },
): BuiltMail {
  return wrap(
    `인증 완료 / 잔금 입금 안내 — ${tag(r)}`,
    [
      `인증이 완료되었습니다. 잔금 결제를 안내드립니다. (접수번호 ${r.request_number ?? "-"})`,
      "",
      `총금액: ${money(ctx.total, ctx.currency)}`,
      `기납부 선금: ${money(ctx.deposit, ctx.currency)}`,
      `잔금(50%): ${money(ctx.balance, ctx.currency)}`,
      "",
      "입금 계좌:",
      ` - 은행: ${ctx.bank.bankName || "-"}`,
      ` - 계좌번호: ${ctx.bank.accountNumber || "-"}`,
      ` - 예금주: ${ctx.bank.accountHolder || "-"}`,
      "",
      "잔금 입금 후 마이페이지에서 입금 정보를 등록해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 6) 최종 인증서 발행 완료 */
export function buildCompletedMail(r: ServiceRequest): BuiltMail {
  return wrap(
    `최종 인증서 발행 완료 — ${tag(r)}`,
    [
      `최종 인증서 발행이 완료되었습니다. (접수번호 ${r.request_number ?? "-"})`,
      `의뢰 제목: ${r.title}`,
      `완료 일자: ${r.completed_at ?? "-"}`,
      "",
      "마이페이지 완료 페이지에서 최종 인증서를 다운로드하실 수 있습니다.",
    ],
    mypageRequestUrl(r.id),
  );
}
