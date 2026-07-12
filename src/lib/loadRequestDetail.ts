// 의뢰 상세를 service_type 에 따라 알맞은 로더로 분기한다.
// 상세 페이지(mypage/staff/admin)는 이 함수를 호출하고, kind 로 렌더링할 뷰를 고른다.
import type { User } from "@/src/lib/types";
import type { WorkflowRole } from "@/src/lib/serviceWorkflow";
import { getRequestById } from "@/src/lib/serviceRequestRepo";
import { loadRequestDetail, type RequestDetailBundle } from "@/src/lib/requestDetail";
import { loadCecRequestDetail, type CecRequestDetailBundle } from "@/src/lib/cecRequestDetail";
import {
  loadProductInspectionRequestDetail,
  type ProductInspectionDetailBundle,
} from "@/src/lib/productInspectionRequestDetail";
import {
  loadScrapIndiaRequestDetail,
  type ScrapIndiaDetailBundle,
} from "@/src/lib/scrapIndiaRequestDetail";

export type RoutedRequestDetail =
  | { kind: "trcu"; role: WorkflowRole; bundle: RequestDetailBundle }
  | { kind: "cec"; role: WorkflowRole; bundle: CecRequestDetailBundle }
  | { kind: "product_inspection"; role: WorkflowRole; bundle: ProductInspectionDetailBundle }
  | { kind: "scrap_india"; role: WorkflowRole; bundle: ScrapIndiaDetailBundle };

export async function loadRequestDetailRouted(
  user: User,
  requestId: number,
): Promise<RoutedRequestDetail | null> {
  const request = await getRequestById(requestId);
  if (!request) return null;

  if (request.service_type === "CEC_INDIA") {
    const bundle = await loadCecRequestDetail(user, requestId);
    if (!bundle) return null;
    return { kind: "cec", role: bundle.role, bundle };
  }
  if (request.service_type === "PRODUCT_INSPECTION") {
    const bundle = await loadProductInspectionRequestDetail(user, requestId);
    if (!bundle) return null;
    return { kind: "product_inspection", role: bundle.role, bundle };
  }
  if (request.service_type === "SCRAP_INDIA") {
    const bundle = await loadScrapIndiaRequestDetail(user, requestId);
    if (!bundle) return null;
    return { kind: "scrap_india", role: bundle.role, bundle };
  }
  const bundle = await loadRequestDetail(user, requestId);
  if (!bundle) return null;
  return { kind: "trcu", role: bundle.role, bundle };
}
