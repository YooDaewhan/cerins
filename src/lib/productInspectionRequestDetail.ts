// 제품검사 의뢰 상세 데이터를 뷰어 권한에 맞게 조립.
// 고객에게는 공개 파일/메모만, 내부 검사 리포트·외부 정산 입금·내부 메모·이력은 제외한다.
// 파일 가시성 규칙은 productInspectionFiles.ts 를 따른다.
import type { User } from "@/src/lib/types";
import type {
  ServiceRequest,
  RequestFile,
  Payment,
  RequestMessage,
  RequestStatusHistory,
  UserBrief,
} from "@/src/lib/serviceRequestTypes";
import type { WorkflowRole } from "@/src/lib/serviceWorkflow";
import { PI_STATUS, type ProductInspection } from "@/src/lib/productInspectionTypes";
import { availablePiActions, type PiAction } from "@/src/lib/productInspectionWorkflow";
import { resolveViewerRole } from "@/src/lib/requestDetail";
import { isProductInspectionFileVisibleToCustomer } from "@/src/lib/productInspectionFiles";
import {
  getRequestById,
  listFiles,
  listPayments,
  listMessages,
  listHistories,
  getUserBrief,
  getProductInspection,
  getLatestHistoryMetaTo,
} from "@/src/lib/serviceRequestRepo";

export interface PiBlockInfo {
  resume_status: string | null;
  needed_action: string | null;
  customer_visible: boolean;
}

export interface ProductInspectionDetailBundle {
  kind: "product_inspection";
  request: ServiceRequest;
  role: WorkflowRole;
  files: RequestFile[];
  inspection: ProductInspection | null;
  payments: Payment[]; // 고객에게는 빈 배열(외부 정산 입금은 내부 전용)
  messages: RequestMessage[];
  histories: RequestStatusHistory[]; // 고객에게는 빈 배열
  block: PiBlockInfo | null;
  actions: PiAction[];
  assignee: UserBrief | null;
  customer: UserBrief | null;
}

export async function loadProductInspectionRequestDetail(
  user: User,
  requestId: number,
): Promise<ProductInspectionDetailBundle | null> {
  const request = await getRequestById(requestId);
  if (!request || request.service_type !== "PRODUCT_INSPECTION") return null;
  const role = resolveViewerRole(user, request);
  if (!role) return null;

  const isInternal = role === "STAFF" || role === "ADMIN";

  const [allFiles, payments, messages, histories, inspection, assignee, customer] =
    await Promise.all([
      listFiles(requestId),
      isInternal ? listPayments(requestId) : Promise.resolve([]),
      listMessages(requestId, { includeInternal: isInternal }),
      isInternal ? listHistories(requestId) : Promise.resolve([]),
      getProductInspection(requestId),
      request.assignee_user_id ? getUserBrief(request.assignee_user_id) : Promise.resolve(null),
      request.customer_user_id ? getUserBrief(request.customer_user_id) : Promise.resolve(null),
    ]);

  const files = isInternal
    ? allFiles
    : allFiles.filter((f) => isProductInspectionFileVisibleToCustomer(f));

  // 예외 상태(검사 보류) 안내: 현재 그 상태일 때만 최신 이력 metadata 에서 조회.
  const status: string = request.status;
  let block: PiBlockInfo | null = null;
  if (status === PI_STATUS.BLOCKED) {
    const meta = await getLatestHistoryMetaTo(requestId, PI_STATUS.BLOCKED);
    block = {
      resume_status: (meta?.resume_status as string) ?? null,
      needed_action: (meta?.needed_action as string) ?? null,
      customer_visible: Boolean(meta?.customer_visible),
    };
  }

  return {
    kind: "product_inspection",
    request,
    role,
    files,
    inspection,
    payments,
    messages,
    histories,
    block,
    actions: availablePiActions(request.status, role),
    assignee: assignee ?? null,
    customer: customer ?? null,
  };
}
