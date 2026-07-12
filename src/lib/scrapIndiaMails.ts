// 스크랩 India 단계별 안내 메일 본문 빌더(순수 함수). 발송은 scrapIndiaWorkflowService 가
// 커밋 이후 sendMailSafe 로 수행한다(메일 실패가 상태 전이를 롤백시키지 않는다).
// 공통 유틸(wrap/money/mypageRequestUrl)은 requestMails 에서 재사용한다.
// 내부 검사 리포트/내부 메모/DGFT 내부자료 등 내부 정보는 절대 메일에 포함하지 않는다.

import { wrap, money, mypageRequestUrl, type BuiltMail } from "@/src/lib/requestMails";
import type { BankInfo } from "@/src/lib/requestSettings";
import type { ServiceRequest } from "@/src/lib/serviceRequestTypes";

const tag = (r: ServiceRequest) => `[${r.request_number ?? "접수번호 미발급"}] ${r.title}`;

function scheduleLines(ctx: {
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
}): string[] {
  const lines: string[] = [];
  if (ctx.startDate) lines.push(`검사 시작일: ${ctx.startDate}`);
  if (ctx.endDate) lines.push(`검사 종료일: ${ctx.endDate}`);
  if (ctx.startTime || ctx.endTime) {
    lines.push(`검사 시간: ${ctx.startTime ?? "-"} ~ ${ctx.endTime ?? "-"}`);
  }
  if (ctx.location) lines.push(`검사 장소: ${ctx.location}`);
  return lines;
}

/* 1) 검사 일정 확정 */
export function buildScrapScheduleConfirmedMail(
  r: ServiceRequest,
  ctx: {
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
    location?: string | null;
    publicMemo?: string | null;
    changed?: boolean;
    changeReason?: string | null;
  },
): BuiltMail {
  return wrap(
    `[스크랩검사] 검사 일정 ${ctx.changed ? "변경" : "확정"} 안내 — ${tag(r)}`,
    [
      `스크랩 검사 일정이 ${ctx.changed ? "변경" : "확정"}되었습니다. (접수번호 ${r.request_number ?? "-"})`,
      `의뢰 제목: ${r.title}`,
      "",
      ...scheduleLines(ctx),
      ...(ctx.changed && ctx.changeReason ? ["", `변경 사유: ${ctx.changeReason}`] : []),
      ...(ctx.publicMemo ? ["", `담당자 안내: ${ctx.publicMemo}`] : []),
      "",
      "마이페이지에서 상세 일정을 확인하실 수 있습니다.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 2) 검사 일정 조정 요청(고객이 요청 일정을 수정해 재제출해야 함) */
export function buildScrapScheduleRevisionMail(
  r: ServiceRequest,
  ctx: {
    reason: string;
    altStartDate?: string | null;
    altEndDate?: string | null;
    altTime?: string | null;
    locationNote?: string | null;
    publicMemo?: string | null;
  },
): BuiltMail {
  return wrap(
    `[스크랩검사] 검사 일정 조정 요청 — ${tag(r)}`,
    [
      `요청하신 일정으로 검사 진행이 어려워 일정 조정을 요청드립니다. (접수번호 ${r.request_number ?? "-"})`,
      `의뢰 제목: ${r.title}`,
      "",
      "조정 요청 사유:",
      ctx.reason,
      ...(ctx.altStartDate || ctx.altEndDate
        ? ["", `가능한 대체 일정: ${ctx.altStartDate ?? "-"} ~ ${ctx.altEndDate ?? "-"}`]
        : []),
      ...(ctx.altTime ? [`가능한 시간: ${ctx.altTime}`] : []),
      ...(ctx.locationNote ? [`장소 관련 의견: ${ctx.locationNote}`] : []),
      ...(ctx.publicMemo ? ["", `담당자 메모: ${ctx.publicMemo}`] : []),
      "",
      "마이페이지에서 검사 요청 일정/장소/현장 담당자 정보를 수정하고 재제출해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 3) 고객 조치가 필요한 검사 진행 문제(고객 공개 시에만 발송) */
export function buildScrapInspectionBlockedMail(
  r: ServiceRequest,
  ctx: { reason: string; neededAction?: string | null },
): BuiltMail {
  return wrap(
    `[스크랩검사] 검사 진행 관련 안내 — ${tag(r)}`,
    [
      `현장검사 진행 중 확인이 필요한 사항이 발생했습니다. (접수번호 ${r.request_number ?? "-"})`,
      "",
      "안내 사항:",
      ctx.reason,
      ...(ctx.neededAction ? ["", "필요한 조치:", ctx.neededAction] : []),
      "",
      "마이페이지에서 내용을 확인해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 4) 현장검사 완료 및 후속서류 제출 요청 */
export function buildScrapInspectionCompletedMail(
  r: ServiceRequest,
  ctx: { actualStart?: string | null; actualEnd: string; publicMemo?: string | null },
): BuiltMail {
  return wrap(
    `[스크랩검사] 현장검사 완료 / 서류 제출 요청 — ${tag(r)}`,
    [
      `현장검사가 완료되었습니다. (접수번호 ${r.request_number ?? "-"})`,
      `의뢰 제목: ${r.title}`,
      "",
      ...(ctx.actualStart ? [`검사 시작일: ${ctx.actualStart}`] : []),
      `검사 완료일: ${ctx.actualEnd}`,
      ...(ctx.publicMemo ? ["", `담당자 안내: ${ctx.publicMemo}`] : []),
      "",
      "후속 절차 진행을 위해 필요한 서류를 마이페이지에서 업로드해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 5) 제출서류 보완 요청 */
export function buildScrapDocumentRevisionMail(
  r: ServiceRequest,
  ctx: { reason: string; neededDocs?: string | null },
): BuiltMail {
  return wrap(
    `[스크랩검사] 제출 서류 보완 요청 — ${tag(r)}`,
    [
      `제출하신 서류 검토 결과 보완이 필요합니다. (접수번호 ${r.request_number ?? "-"})`,
      `의뢰 제목: ${r.title}`,
      "",
      "보완 사유:",
      ctx.reason,
      ...(ctx.neededDocs ? ["", "보완이 필요한 서류/수정사항:", ctx.neededDocs] : []),
      "",
      "마이페이지에서 파일을 추가·교체하신 후 재제출해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 6) 비용 청구 */
export function buildScrapBillingMail(
  r: ServiceRequest,
  ctx: {
    currency: string;
    total: string;
    items: { item_name: string; amount: string }[];
    dueDate?: string | null;
    guide?: string | null;
    bank: BankInfo;
  },
): BuiltMail {
  const itemLines = ctx.items.map((it) => ` - ${it.item_name}: ${money(it.amount, ctx.currency)}`);
  return wrap(
    `[스크랩검사] 검사 비용 청구 안내 — ${tag(r)}`,
    [
      `스크랩 검사 비용을 안내드립니다. (접수번호 ${r.request_number ?? "-"})`,
      `의뢰 제목: ${r.title}`,
      "",
      "청구 항목:",
      ...itemLines,
      "",
      `총 청구금액: ${money(ctx.total, ctx.currency)}`,
      ...(ctx.dueDate ? [`지급기한: ${ctx.dueDate}`] : []),
      ...(ctx.guide ? ["", `청구 안내: ${ctx.guide}`] : []),
      "",
      "입금 계좌:",
      ` - 은행: ${ctx.bank.bankName || "-"}`,
      ` - 계좌번호: ${ctx.bank.accountNumber || "-"}`,
      ` - 예금주: ${ctx.bank.accountHolder || "-"}`,
      "",
      "입금 후 마이페이지에서 입금 정보를 등록해 주세요. 청구서/세금계산서는 마이페이지에서 확인하실 수 있습니다.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 7) 입금 확인 불가 */
export function buildScrapPaymentRejectedMail(
  r: ServiceRequest,
  ctx: { reason: string },
): BuiltMail {
  return wrap(
    `[스크랩검사] 입금 확인 불가 안내 — ${tag(r)}`,
    [
      `등록하신 입금 정보를 확인할 수 없었습니다. (접수번호 ${r.request_number ?? "-"})`,
      "",
      "확인 불가 사유:",
      ctx.reason,
      "",
      "마이페이지에서 입금 정보를 수정하여 다시 제출해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 8) 고객 조치가 필요한 DGFT 등록 문제(고객 공개 시에만 발송) */
export function buildScrapDgftBlockedMail(
  r: ServiceRequest,
  ctx: { reason: string; neededAction?: string | null },
): BuiltMail {
  return wrap(
    `[스크랩검사] DGFT 등록 관련 안내 — ${tag(r)}`,
    [
      `DGFT 등록 진행 중 확인이 필요한 사항이 발생했습니다. (접수번호 ${r.request_number ?? "-"})`,
      "",
      "안내 사항:",
      ctx.reason,
      ...(ctx.neededAction ? ["", "필요한 조치:", ctx.neededAction] : []),
      "",
      "마이페이지에서 내용을 확인하고 필요한 보완자료를 업로드해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 9) DGFT 등록 및 전체 업무 완료 */
export function buildScrapCompletedMail(
  r: ServiceRequest,
  ctx: {
    actualEnd?: string | null;
    documentsSubmittedAt?: string | null;
    dgftRegisteredAt?: string | null;
    registrationNumber?: string | null; // 공개 정책에 따라 null 이면 표기 생략
  },
): BuiltMail {
  return wrap(
    `[스크랩검사] 스크랩 India 업무 완료 안내 — ${tag(r)}`,
    [
      `스크랩 India 업무가 모두 완료되었습니다. (접수번호 ${r.request_number ?? "-"})`,
      `의뢰 제목: ${r.title}`,
      "",
      ...(ctx.actualEnd ? [`검사 완료일: ${ctx.actualEnd}`] : []),
      ...(ctx.documentsSubmittedAt ? [`서류 제출일: ${ctx.documentsSubmittedAt}`] : []),
      ...(ctx.dgftRegisteredAt ? [`DGFT 등록일: ${ctx.dgftRegisteredAt}`] : []),
      ...(ctx.registrationNumber ? [`DGFT 등록번호: ${ctx.registrationNumber}`] : []),
      `업무 완료일: ${r.completed_at ?? "-"}`,
      "",
      "마이페이지에서 최종 진행 결과를 확인하실 수 있습니다.",
    ],
    mypageRequestUrl(r.id),
  );
}
