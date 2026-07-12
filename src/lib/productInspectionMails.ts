// 제품검사 단계별 안내 메일 본문 빌더(순수 함수). 발송은 productInspectionWorkflowService 가
// 커밋 이후 sendMailSafe 로 수행한다(메일 실패가 상태 전이를 롤백시키지 않는다).
// 공통 유틸(wrap/mypageRequestUrl)은 requestMails 에서 재사용한다.
// 외부 인증기관 정산 금액/계좌/증빙 등 내부 정보는 절대 메일에 포함하지 않는다.

import { wrap, mypageRequestUrl, type BuiltMail } from "@/src/lib/requestMails";
import type { ServiceRequest } from "@/src/lib/serviceRequestTypes";

const tag = (r: ServiceRequest) => `[${r.request_number ?? "접수번호 미발급"}] ${r.title}`;

/* 1) 의뢰 보완 요청 */
export function buildPiRejectRequestMail(
  r: ServiceRequest,
  ctx: { reason: string; neededDocs?: string | null },
): BuiltMail {
  return wrap(
    `[제품검사] 보완 요청 — ${tag(r)}`,
    [
      `접수번호 ${r.request_number ?? "-"} 제품검사 의뢰 검토 결과 보완이 필요합니다.`,
      `의뢰 제목: ${r.title}`,
      "",
      "보완이 필요한 이유:",
      ctx.reason,
      ...(ctx.neededDocs ? ["", "필요한 추가자료:", ctx.neededDocs] : []),
      "",
      "마이페이지에서 의뢰 내용을 수정하고 제품사진을 추가한 뒤 재제출해 주세요.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 2) 검사 일정 확정 */
export function buildPiScheduleConfirmedMail(
  r: ServiceRequest,
  ctx: {
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
    location?: string | null;
    publicMemo?: string | null;
  },
): BuiltMail {
  const timeLine =
    ctx.startTime || ctx.endTime ? `검사 시간: ${ctx.startTime ?? "-"} ~ ${ctx.endTime ?? "-"}` : null;
  return wrap(
    `[제품검사] 검사 일정 확정 안내 — ${tag(r)}`,
    [
      `제품검사 일정이 확정되었습니다. (접수번호 ${r.request_number ?? "-"})`,
      `의뢰 제목: ${r.title}`,
      "",
      `검사 시작일: ${ctx.startDate}`,
      `검사 종료일: ${ctx.endDate}`,
      ...(timeLine ? [timeLine] : []),
      ...(ctx.location ? [`검사 장소: ${ctx.location}`] : []),
      ...(ctx.publicMemo ? ["", `담당자 안내: ${ctx.publicMemo}`] : []),
      "",
      "마이페이지에서 상세 일정을 확인하실 수 있습니다.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 3) 검사 일정 변경 */
export function buildPiScheduleUpdatedMail(
  r: ServiceRequest,
  ctx: {
    startDate: string;
    endDate: string;
    location?: string | null;
    reason?: string | null;
  },
): BuiltMail {
  return wrap(
    `[제품검사] 검사 일정 변경 안내 — ${tag(r)}`,
    [
      `제품검사 일정이 변경되었습니다. (접수번호 ${r.request_number ?? "-"})`,
      `의뢰 제목: ${r.title}`,
      "",
      `변경된 검사 시작일: ${ctx.startDate}`,
      `변경된 검사 종료일: ${ctx.endDate}`,
      ...(ctx.location ? [`검사 장소: ${ctx.location}`] : []),
      ...(ctx.reason ? ["", `변경 사유: ${ctx.reason}`] : []),
      "",
      "마이페이지에서 변경된 일정을 확인하실 수 있습니다.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 4) 고객 조치가 필요한 검사 진행 문제(고객 공개 시에만 발송) */
export function buildPiInspectionBlockedMail(
  r: ServiceRequest,
  ctx: { reason: string; neededAction?: string | null },
): BuiltMail {
  return wrap(
    `[제품검사] 검사 진행 관련 안내 — ${tag(r)}`,
    [
      `제품검사 진행 중 확인이 필요한 사항이 발생했습니다. (접수번호 ${r.request_number ?? "-"})`,
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

/* 5) 검사 완료 */
export function buildPiInspectionCompletedMail(
  r: ServiceRequest,
  ctx: { plannedStart?: string | null; actualStart: string; actualEnd: string; publicMemo?: string | null },
): BuiltMail {
  return wrap(
    `[제품검사] 검사 완료 안내 — ${tag(r)}`,
    [
      `제품검사가 완료되었습니다. (접수번호 ${r.request_number ?? "-"})`,
      `의뢰 제목: ${r.title}`,
      "",
      ...(ctx.plannedStart ? [`검사 예정일: ${ctx.plannedStart}`] : []),
      `실제 검사 시작일: ${ctx.actualStart}`,
      `검사 완료일: ${ctx.actualEnd}`,
      ...(ctx.publicMemo ? ["", `담당자 안내: ${ctx.publicMemo}`] : []),
      "",
      "현재 검사 리포트를 작성 중입니다. 진행 상황은 마이페이지에서 확인하실 수 있습니다.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 6) 리포트 제출 완료(리포트 파일은 첨부하지 않는다) */
export function buildPiReportSubmittedMail(
  r: ServiceRequest,
  ctx: { reportSubmittedAt: string },
): BuiltMail {
  return wrap(
    `[제품검사] 리포트 제출 완료 안내 — ${tag(r)}`,
    [
      `검사 리포트가 인증기관에 제출되었습니다. (접수번호 ${r.request_number ?? "-"})`,
      `의뢰 제목: ${r.title}`,
      "",
      `리포트 제출일: ${ctx.reportSubmittedAt}`,
      "",
      "현재 외부기관에서 처리 중입니다. 진행 상황은 마이페이지에서 확인하실 수 있습니다.",
    ],
    mypageRequestUrl(r.id),
  );
}

/* 7) 최종 업무 완료 */
export function buildPiCompletedMail(
  r: ServiceRequest,
  ctx: { plannedStart?: string | null; actualEnd?: string | null; reportSubmittedAt?: string | null },
): BuiltMail {
  return wrap(
    `[제품검사] 업무 완료 안내 — ${tag(r)}`,
    [
      `제품검사 업무가 모두 완료되었습니다. (접수번호 ${r.request_number ?? "-"})`,
      `의뢰 제목: ${r.title}`,
      "",
      ...(ctx.plannedStart ? [`검사 예정일: ${ctx.plannedStart}`] : []),
      ...(ctx.actualEnd ? [`검사 완료일: ${ctx.actualEnd}`] : []),
      ...(ctx.reportSubmittedAt ? [`리포트 제출일: ${ctx.reportSubmittedAt}`] : []),
      `업무 완료일: ${r.completed_at ?? "-"}`,
      "",
      "마이페이지에서 최종 진행 결과를 확인하실 수 있습니다.",
    ],
    mypageRequestUrl(r.id),
  );
}
