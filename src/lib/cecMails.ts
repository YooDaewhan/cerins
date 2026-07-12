// CEC India 단계별 안내 메일 본문 빌더(순수 함수). 발송은 cecWorkflowService 가 커밋 이후
// sendMailSafe 로 수행한다(메일 실패가 상태 전이를 롤백시키지 않는다).
// 공통 유틸(wrap/money/mypageRequestUrl)은 requestMails 에서 재사용한다.

import { wrap, money, mypageRequestUrl, type BuiltMail } from "@/src/lib/requestMails";
import type { BankInfo } from "@/src/lib/requestSettings";
import type { ServiceRequest } from "@/src/lib/serviceRequestTypes";

const tag = (r: ServiceRequest) => `[${r.request_number ?? "접수번호 미발급"}] ${r.title}`;

function bankLines(bank: BankInfo): string[] {
  return [
    "입금 계좌:",
    ` - 은행: ${bank.bankName || "-"}`,
    ` - 계좌번호: ${bank.accountNumber || "-"}`,
    ` - 예금주: ${bank.accountHolder || "-"}`,
  ];
}

/* 1) 서류 반려/보완 */
export function buildCecRejectDocumentsMail(r: ServiceRequest, reason: string): BuiltMail {
  return wrap(
    `[CEC India] 서류 보완 요청 — ${tag(r)}`,
    [
      `접수번호 ${r.request_number ?? "-"} 의뢰의 서류 검토 결과 보완이 필요합니다.`,
      `의뢰 제목: ${r.title}`,
      "",
      "서류 반려 / 보완 사유:",
      reason,
      "",
      "마이페이지에서 내용을 수정하고 보완 파일을 업로드한 뒤 재제출해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 2) 접수 완료 + 검사 일정 + 선금 900 안내 */
export function buildCecAcceptedMail(
  r: ServiceRequest,
  ctx: {
    currency: string;
    inspectionStart: string;
    inspectionEnd: string;
    plannedDays: number;
    baseFee: string;
    estimatedInspectionFee: string;
    deposit: string;
    quotationMemo?: string | null;
    bank: BankInfo;
  },
): BuiltMail {
  return wrap(
    `[CEC India] 접수 완료 / 선금 입금 안내 — ${tag(r)}`,
    [
      `CEC India 인증 의뢰가 접수되었습니다. (접수번호 ${r.request_number ?? "-"})`,
      "",
      `검사 시작일: ${ctx.inspectionStart}`,
      `검사 종료일: ${ctx.inspectionEnd}`,
      `예정 검사일수: ${ctx.plannedDays}일`,
      "",
      `기본 인증비: ${money(ctx.baseFee, ctx.currency)}`,
      `예상 검사비: ${money(ctx.estimatedInspectionFee, ctx.currency)}`,
      `선금: ${money(ctx.deposit, ctx.currency)}`,
      "",
      "※ 물건가액 또는 가격평가 결과에 따라 평가금액의 0.5%가 추가될 수 있습니다.",
      ...(ctx.quotationMemo ? ["", `견적 메모: ${ctx.quotationMemo}`] : []),
      "",
      ...bankLines(ctx.bank),
      "",
      "선금 입금 후 마이페이지에서 입금 정보를 등록해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 3) 선금 확인불가 */
export function buildCecDepositRejectedMail(r: ServiceRequest, reason: string): BuiltMail {
  return wrap(
    `[CEC India] 선금 확인 불가 — ${tag(r)}`,
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

/* 4) 가격평가 완료 안내 */
export function buildCecValuationCompletedMail(
  r: ServiceRequest,
  ctx: { currency: string; valuation: string; surchargeApplied: boolean; estimatedTotal: string; balance: string },
): BuiltMail {
  return wrap(
    `[CEC India] 가격평가 완료 안내 — ${tag(r)}`,
    [
      `검사 및 가격평가가 완료되었습니다. (접수번호 ${r.request_number ?? "-"})`,
      "",
      `평가 물건가액: ${money(ctx.valuation, ctx.currency)}`,
      `추가 수수료(0.5%) 적용: ${ctx.surchargeApplied ? "적용" : "미적용"}`,
      `예상 최종 총액: ${money(ctx.estimatedTotal, ctx.currency)}`,
      `예상 잔금: ${money(ctx.balance, ctx.currency)}`,
      "",
      "마이페이지에서 가격평가 결과를 확인하고 승인 또는 거절해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 5) 고객 가격평가 거절(담당자 알림) */
export function buildCecValuationRejectedNotice(r: ServiceRequest, reason: string): BuiltMail {
  return wrap(
    `[CEC India] 고객 가격평가 거절 — ${tag(r)}`,
    [
      `고객이 가격평가 결과를 거절했습니다. (접수번호 ${r.request_number ?? "-"})`,
      "",
      "거절 사유:",
      reason,
      "",
      "평가 금액/설명을 수정하여 다시 제출해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 6) 인증서 초안 업로드 완료 */
export function buildCecCertificateDraftMail(r: ServiceRequest): BuiltMail {
  return wrap(
    `[CEC India] 인증서 초안 확인 안내 — ${tag(r)}`,
    [
      `인증서 초안이 준비되었습니다. (접수번호 ${r.request_number ?? "-"})`,
      "",
      "마이페이지에서 초안을 확인하신 후,",
      "초안을 승인하고 선적서류(인보이스 등)를 제출하거나, 문제가 있으면 거절해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 7) 고객 인증서 초안 거절(담당자 알림) */
export function buildCecCertificateDraftRejectedNotice(r: ServiceRequest, reason: string): BuiltMail {
  return wrap(
    `[CEC India] 고객 인증서 초안 거절 — ${tag(r)}`,
    [
      `고객이 인증서 초안을 거절했습니다. (접수번호 ${r.request_number ?? "-"})`,
      "",
      "거절 사유:",
      reason,
      "",
      "초안을 수정하여 다시 업로드해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 8) 인증 진행 불가 / 추가자료 요청 */
export function buildCecCertificationBlockedMail(
  r: ServiceRequest,
  ctx: { reason: string; neededDocs?: string | null },
): BuiltMail {
  return wrap(
    `[CEC India] 인증 진행 보완 필요 — ${tag(r)}`,
    [
      `인증 진행 중 보완이 필요한 사항이 발생했습니다. (접수번호 ${r.request_number ?? "-"})`,
      "",
      "문제 / 사유:",
      ctx.reason,
      ...(ctx.neededDocs ? ["", "필요한 추가자료:", ctx.neededDocs] : []),
      "",
      "마이페이지에서 내용을 확인하고 필요한 자료를 준비해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 9) 최종 인증서 초안 + 잔금 안내 */
export function buildCecFinalDraftMail(
  r: ServiceRequest,
  ctx: {
    currency: string;
    baseFee: string;
    inspectionFee: string;
    surchargeAmount: string;
    surchargeApplied: boolean;
    total: string;
    deposit: string;
    balance: string;
    bank: BankInfo;
  },
): BuiltMail {
  return wrap(
    `[CEC India] 최종 인증서 초안 확인 / 잔금 안내 — ${tag(r)}`,
    [
      `최종 인증서 초안과 세금계산서가 준비되었습니다. (접수번호 ${r.request_number ?? "-"})`,
      "",
      `기본 인증비: ${money(ctx.baseFee, ctx.currency)}`,
      `검사비: ${money(ctx.inspectionFee, ctx.currency)}`,
      ...(ctx.surchargeApplied ? [`물건가액 추가 수수료: ${money(ctx.surchargeAmount, ctx.currency)}`] : []),
      `최종 총액: ${money(ctx.total, ctx.currency)}`,
      `기납부 선금: ${money(ctx.deposit, ctx.currency)}`,
      `잔금: ${money(ctx.balance, ctx.currency)}`,
      "",
      ...bankLines(ctx.bank),
      "",
      "마이페이지에서 워터마크가 표시된 최종 인증서 초안과 세금계산서를 확인하고,",
      "잔금 입금 후 입금 정보를 등록해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 10) 고객 최종 초안 거절(담당자 알림) */
export function buildCecFinalDraftRejectedNotice(r: ServiceRequest, reason: string): BuiltMail {
  return wrap(
    `[CEC India] 고객 최종 초안 거절 — ${tag(r)}`,
    [
      `고객이 최종 인증서 초안을 거절했습니다. (접수번호 ${r.request_number ?? "-"})`,
      "",
      "거절 사유:",
      reason,
      "",
      "최종 초안을 수정하여 다시 준비해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 11) 잔금 확인불가 */
export function buildCecBalanceRejectedMail(r: ServiceRequest, reason: string): BuiltMail {
  return wrap(
    `[CEC India] 잔금 확인 불가 — ${tag(r)}`,
    [
      `등록하신 잔금 입금 정보를 확인할 수 없었습니다. (접수번호 ${r.request_number ?? "-"})`,
      "",
      "사유:",
      reason,
      "",
      "마이페이지에서 입금 정보를 수정하여 다시 제출해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 12) 최종 인증서 발급 완료 */
export function buildCecCompletedMail(r: ServiceRequest): BuiltMail {
  return wrap(
    `[CEC India] 최종 인증 완료 — ${tag(r)}`,
    [
      `CEC India 인증이 완료되었습니다. (접수번호 ${r.request_number ?? "-"})`,
      `의뢰 제목: ${r.title}`,
      `최종 인증서 발급일: ${r.completed_at ?? "-"}`,
      "",
      "마이페이지에서 최종 인증서를 다운로드하실 수 있습니다.",
    ],
    mypageRequestUrl(r.id),
  );
}
