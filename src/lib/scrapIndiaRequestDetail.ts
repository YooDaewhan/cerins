// 스크랩 India 의뢰 상세 데이터를 뷰어 권한에 맞게 조립.
// 고객에게는 공개 파일/메모/본인 결제만, 내부 검사 리포트·DGFT 내부자료·내부 메모·이력은 제외한다.
// 파일 가시성 규칙은 scrapIndiaFiles.ts 를 따른다.
import type { User } from "@/src/lib/types";
import type {
  ServiceRequest,
  RequestFile,
  Payment,
  Quotation,
  QuotationItem,
  RequestMessage,
  RequestStatusHistory,
  UserBrief,
} from "@/src/lib/serviceRequestTypes";
import type { WorkflowRole } from "@/src/lib/serviceWorkflow";
import {
  SCRAP_STATUS,
  SCRAP_PAYMENT_TYPE,
  type ScrapInspection,
  type ScrapDgftRegistration,
  type ServiceDocumentRequirement,
} from "@/src/lib/scrapIndiaTypes";
import { availableScrapActions, type ScrapAction } from "@/src/lib/scrapIndiaWorkflow";
import { resolveViewerRole } from "@/src/lib/requestDetail";
import { isScrapFileVisibleToCustomer } from "@/src/lib/scrapIndiaFiles";
import { listActiveDocumentRequirements } from "@/src/lib/serviceDocumentRequirements";
import { getBankInfo, type BankInfo } from "@/src/lib/requestSettings";
import {
  getRequestById,
  listFiles,
  listPayments,
  listMessages,
  listHistories,
  getUserBrief,
  getQuotation,
  getQuotationItems,
  getScrapInspection,
  getScrapDgftRegistration,
  getLatestHistoryMetaTo,
} from "@/src/lib/serviceRequestRepo";

const DOC_STEP = 5;

export interface ScrapBlockInfo {
  phase: "inspection" | "report" | "dgft";
  resume_status: string | null;
  needed_action: string | null;
  customer_visible: boolean;
}

export interface ScrapBillingInfo {
  due_date: string | null;
}

export interface ScrapIndiaDetailBundle {
  kind: "scrap_india";
  request: ServiceRequest;
  role: WorkflowRole;
  files: RequestFile[];
  inspection: ScrapInspection | null;
  dgft: ScrapDgftRegistration | null;
  quotation: Quotation | null;
  quotationItems: QuotationItem[];
  payments: Payment[]; // 고객에게는 본인 청구 입금(SCRAP_INSPECTION_PAYMENT)만
  messages: RequestMessage[];
  histories: RequestStatusHistory[]; // 고객에게는 빈 배열
  documentRequirements: ServiceDocumentRequirement[]; // 활성 제출서류 항목(step 5)
  block: ScrapBlockInfo | null;
  billing: ScrapBillingInfo | null;
  bank: BankInfo;
  actions: ScrapAction[];
  assignee: UserBrief | null;
  customer: UserBrief | null;
}

export async function loadScrapIndiaRequestDetail(
  user: User,
  requestId: number,
): Promise<ScrapIndiaDetailBundle | null> {
  const request = await getRequestById(requestId);
  if (!request || request.service_type !== "SCRAP_INDIA") return null;
  const role = resolveViewerRole(user, request);
  if (!role) return null;

  const isInternal = role === "STAFF" || role === "ADMIN";

  const [allFiles, allPayments, messages, histories, inspection, dgft, quotation, docReqs, assignee, customer] =
    await Promise.all([
      listFiles(requestId),
      listPayments(requestId),
      listMessages(requestId, { includeInternal: isInternal }),
      isInternal ? listHistories(requestId) : Promise.resolve([]),
      getScrapInspection(requestId),
      getScrapDgftRegistration(requestId),
      getQuotation(requestId),
      listActiveDocumentRequirements("SCRAP_INDIA", DOC_STEP),
      request.assignee_user_id ? getUserBrief(request.assignee_user_id) : Promise.resolve(null),
      request.customer_user_id ? getUserBrief(request.customer_user_id) : Promise.resolve(null),
    ]);

  const quotationItems = quotation ? await getQuotationItems(quotation.id) : [];

  const files = isInternal ? allFiles : allFiles.filter((f) => isScrapFileVisibleToCustomer(f));
  // 고객은 본인 청구 입금만(내부 정산/기타 결제 노출 없음). 내부는 전체.
  const payments = isInternal
    ? allPayments
    : allPayments.filter((p) => (p.payment_type as string) === SCRAP_PAYMENT_TYPE);

  // 예외 상태(보류) 안내: 현재 그 상태일 때만 최신 이력 metadata 에서 조회.
  const status: string = request.status;
  let block: ScrapBlockInfo | null = null;
  const blockPhase =
    status === SCRAP_STATUS.INSPECTION_BLOCKED
      ? "inspection"
      : status === SCRAP_STATUS.REPORT_BLOCKED
        ? "report"
        : status === SCRAP_STATUS.DGFT_REGISTRATION_BLOCKED
          ? "dgft"
          : null;
  if (blockPhase) {
    const meta = await getLatestHistoryMetaTo(requestId, status);
    block = {
      phase: blockPhase,
      resume_status: (meta?.resume_status as string) ?? null,
      needed_action: (meta?.needed_action as string) ?? null,
      customer_visible: Boolean(meta?.customer_visible),
    };
  }

  // 청구 지급기한(청구 시 이력 metadata 에 저장).
  let billing: ScrapBillingInfo | null = null;
  if (quotation) {
    const meta = await getLatestHistoryMetaTo(requestId, SCRAP_STATUS.PAYMENT_REQUESTED);
    billing = { due_date: (meta?.due_date as string) ?? null };
  }

  return {
    kind: "scrap_india",
    request,
    role,
    files,
    inspection,
    dgft,
    quotation,
    quotationItems,
    payments,
    messages,
    histories,
    documentRequirements: docReqs,
    block,
    billing,
    bank: getBankInfo(),
    actions: availableScrapActions(request.status, role),
    assignee: assignee ?? null,
    customer: customer ?? null,
  };
}
