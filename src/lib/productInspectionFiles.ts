// 제품검사 파일 접근 규칙(순수 함수). 파일 종류만 보고 판단하지 말고
// is_customer_visible + file_type 메타 + 뷰어 역할(소유/담당/관리)을 함께 본다.
//   - 제품사진(PRODUCT_INSPECTION_PHOTO) : 고객/내부 모두 접근 가능(is_customer_visible 에 따름).
//   - 검사 리포트/리포트 추가자료/입금 증빙/기타(..._REPORT, ..._REPORT_ATTACHMENT,
//     ..._PAYMENT_PROOF, ..._OTHER) : 내부 전용. 고객은 목록·다운로드 모두 불가.
// 고객이 직접 파일 URL 을 알더라도 서버에서 이 규칙으로 다운로드를 차단한다.

import type { RequestFile } from "@/src/lib/serviceRequestTypes";
import { PI_FILE_META, type PiFileType } from "@/src/lib/productInspectionTypes";

export interface PiFileViewer {
  isInternal: boolean; // 관리자 또는 배정된 담당자
  isOwner: boolean; // 해당 의뢰의 고객
}

// 첨부파일 목록/다운로드 링크로 "다운로드" 가능한가?
export function canDownloadProductInspectionFile(viewer: PiFileViewer, file: RequestFile): boolean {
  if (viewer.isInternal) return true; // 담당자/관리자는 모든 첨부 접근
  if (!viewer.isOwner) return false;

  const meta = PI_FILE_META[file.file_type as PiFileType];
  // 알 수 없는 종류는 공개 플래그를 따른다.
  if (!meta) return file.is_customer_visible;
  if (!meta.customerVisible) return false; // 내부 전용(리포트/증빙 등)
  return file.is_customer_visible;
}

// 고객 상세 화면에 노출할 파일인가?(목록 필터)
export function isProductInspectionFileVisibleToCustomer(file: RequestFile): boolean {
  const meta = PI_FILE_META[file.file_type as PiFileType];
  if (!meta) return file.is_customer_visible;
  if (!meta.customerVisible) return false; // 내부 전용 숨김
  return file.is_customer_visible;
}
