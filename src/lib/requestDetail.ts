// 의뢰 상세 데이터를 뷰어 권한에 맞게 조립. 고객에게는 공개 파일/메모만, 내부 이력/내부 메모는 제외.
import type { User } from "@/src/lib/types";
import { isAdminLevel, isStaffLevel } from "@/src/lib/userTypes";
import { STATUS, FINAL_FILE_TYPE } from "@/src/lib/serviceRequestTypes";
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
import type { WorkflowRole, TransitionAction } from "@/src/lib/serviceWorkflow";
import { availableActions } from "@/src/lib/serviceWorkflow";
import {
  getRequestById,
  listFiles,
  getQuotation,
  getQuotationItems,
  listPayments,
  listMessages,
  listHistories,
  getUserBrief,
} from "@/src/lib/serviceRequestRepo";

export interface RequestDetailBundle {
  request: ServiceRequest;
  role: WorkflowRole;
  files: RequestFile[];
  quotation: { quotation: Quotation; items: QuotationItem[] } | null;
  payments: Payment[];
  messages: RequestMessage[];
  histories: RequestStatusHistory[]; // 고객에게는 빈 배열
  actions: TransitionAction[];
  assignee: UserBrief | null;
  customer: UserBrief | null;
}

export function resolveViewerRole(user: User, r: ServiceRequest): WorkflowRole | null {
  if (isAdminLevel(user.user_level)) return "ADMIN";
  if (r.assignee_user_id === user.id && isStaffLevel(user.user_level)) return "STAFF";
  if (r.customer_user_id === user.id) return "CUSTOMER";
  return null;
}

export async function loadRequestDetail(
  user: User,
  requestId: number,
): Promise<RequestDetailBundle | null> {
  const request = await getRequestById(requestId);
  if (!request) return null;
  const role = resolveViewerRole(user, request);
  if (!role) return null; // 권한 없음

  const isInternal = role === "STAFF" || role === "ADMIN";

  const [allFiles, quotation, payments, messages, histories, assignee, customer] =
    await Promise.all([
      listFiles(requestId),
      getQuotation(requestId),
      listPayments(requestId),
      listMessages(requestId, { includeInternal: isInternal }),
      isInternal ? listHistories(requestId) : Promise.resolve([]),
      request.assignee_user_id ? getUserBrief(request.assignee_user_id) : Promise.resolve(null),
      request.customer_user_id ? getUserBrief(request.customer_user_id) : Promise.resolve(null),
    ]);

  // 고객 파일 필터: 공개 파일 + (완료된 최종 인증서).
  const files = isInternal
    ? allFiles
    : allFiles.filter(
        (f) =>
          (f.file_type === FINAL_FILE_TYPE && request.status === STATUS.COMPLETED) ||
          (f.file_type !== FINAL_FILE_TYPE && f.is_customer_visible),
      );

  const quotationBundle = quotation
    ? { quotation, items: await getQuotationItems(quotation.id) }
    : null;

  return {
    request,
    role,
    files,
    quotation: quotationBundle,
    payments,
    messages,
    histories,
    actions: availableActions(request.status, role),
    assignee: assignee ?? null,
    customer: customer ?? null,
  };
}
