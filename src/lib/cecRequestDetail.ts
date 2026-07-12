// CEC India 의뢰 상세 데이터를 뷰어 권한에 맞게 조립.
// 고객에게는 공개 파일/메모만, 내부 검사 리포트·내부 메모·이력은 제외한다.
// TRCU 상세(requestDetail.ts)와 분리되어 있으며, 파일 가시성 규칙은 cecFiles.ts 를 따른다.
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
  CEC_STATUS,
  type CecInspection,
  type CecValuation,
  type CecBlockType,
  type CecRejectType,
} from "@/src/lib/cecTypes";
import { availableCecActions, type CecAction } from "@/src/lib/cecWorkflow";
import { resolveViewerRole } from "@/src/lib/requestDetail";
import { isCecFileVisibleToCustomer } from "@/src/lib/cecFiles";
import { getCecPricing, type CecPricing } from "@/src/lib/requestSettings";
import {
  getRequestById,
  listFiles,
  getQuotation,
  getQuotationItems,
  listPayments,
  listMessages,
  listHistories,
  getUserBrief,
  getCecInspection,
  getLatestCecValuation,
  getLatestHistoryMetaTo,
} from "@/src/lib/serviceRequestRepo";

export interface CecBlockInfo {
  block_type: CecBlockType | null;
  resume_step: number | null;
  needed_docs: string | null;
}
export interface CecRejectInfo {
  reject_type: CecRejectType | null;
  resume_step: number | null;
}

export interface CecRequestDetailBundle {
  kind: "cec";
  request: ServiceRequest;
  role: WorkflowRole;
  files: RequestFile[];
  inspection: CecInspection | null;
  valuation: CecValuation | null;
  quotation: { quotation: Quotation; items: QuotationItem[] } | null;
  payments: Payment[];
  messages: RequestMessage[];
  histories: RequestStatusHistory[]; // 고객에게는 빈 배열
  block: CecBlockInfo | null;
  reject: CecRejectInfo | null;
  actions: CecAction[];
  assignee: UserBrief | null;
  customer: UserBrief | null;
  pricing: CecPricing;
}

export async function loadCecRequestDetail(
  user: User,
  requestId: number,
): Promise<CecRequestDetailBundle | null> {
  const request = await getRequestById(requestId);
  if (!request || request.service_type !== "CEC_INDIA") return null;
  const role = resolveViewerRole(user, request);
  if (!role) return null;

  const isInternal = role === "STAFF" || role === "ADMIN";

  const [allFiles, quotation, payments, messages, histories, inspection, valuation, assignee, customer] =
    await Promise.all([
      listFiles(requestId),
      getQuotation(requestId),
      listPayments(requestId),
      listMessages(requestId, { includeInternal: isInternal }),
      isInternal ? listHistories(requestId) : Promise.resolve([]),
      getCecInspection(requestId),
      getLatestCecValuation(requestId),
      request.assignee_user_id ? getUserBrief(request.assignee_user_id) : Promise.resolve(null),
      request.customer_user_id ? getUserBrief(request.customer_user_id) : Promise.resolve(null),
    ]);

  const files = isInternal
    ? allFiles
    : allFiles.filter((f) => isCecFileVisibleToCustomer(request.status, f));

  const quotationBundle = quotation
    ? { quotation, items: await getQuotationItems(quotation.id) }
    : null;

  // 예외 상태(step 8 / step 10) 라우팅 정보: 현재 그 상태일 때만 최신 이력 metadata 에서 조회.
  const status: string = request.status;
  let block: CecBlockInfo | null = null;
  if (status === CEC_STATUS.CERTIFICATION_BLOCKED) {
    const meta = await getLatestHistoryMetaTo(requestId, CEC_STATUS.CERTIFICATION_BLOCKED);
    block = {
      block_type: (meta?.block_type as CecBlockType) ?? null,
      resume_step: meta?.resume_step != null ? Number(meta.resume_step) : null,
      needed_docs: (meta?.needed_docs as string) ?? null,
    };
  }
  let reject: CecRejectInfo | null = null;
  if (status === CEC_STATUS.FINAL_OR_PAYMENT_REJECTED) {
    const meta = await getLatestHistoryMetaTo(requestId, CEC_STATUS.FINAL_OR_PAYMENT_REJECTED);
    reject = {
      reject_type: (meta?.reject_type as CecRejectType) ?? null,
      resume_step: meta?.resume_step != null ? Number(meta.resume_step) : null,
    };
  }

  return {
    kind: "cec",
    request,
    role,
    files,
    inspection,
    valuation,
    quotation: quotationBundle,
    payments,
    messages,
    histories,
    block,
    reject,
    actions: availableCecActions(request.status, role),
    assignee: assignee ?? null,
    customer: customer ?? null,
    pricing: getCecPricing(),
  };
}
