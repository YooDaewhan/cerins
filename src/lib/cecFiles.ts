// CEC India 파일 접근 규칙(순수 함수). 파일 종류만 보고 판단하지 말고
// is_customer_visible + file_type 메타 + 현재 status + 뷰어 역할(소유/담당/관리)을 함께 본다.
//   - 검사 리포트(CEC_INSPECTION_REPORT)  : 내부 전용. 고객 다운로드/열람 불가.
//   - 최종 인증서 초안(..._PREVIEW)        : 고객은 미리보기만(다운로드 불가). 보안 미리보기 엔드포인트 사용.
//   - 최종 인증서(CEC_FINAL_CERTIFICATE)   : 완료(CEC_COMPLETED) 이후에만 고객 다운로드.
//   - 그 외(영수증/명판/제품사진/초안/인보이스/BL/세금계산서 등): is_customer_visible 에 따름.

import type { RequestFile } from "@/src/lib/serviceRequestTypes";
import { CEC_STATUS, CEC_FILE_META, type CecFileType } from "@/src/lib/cecTypes";

export interface CecFileViewer {
  isInternal: boolean; // 관리자 또는 배정된 담당자
  isOwner: boolean; // 해당 의뢰의 고객
}

// 첨부파일 목록/다운로드 링크로 "다운로드" 가능한가?
export function canDownloadCecFile(viewer: CecFileViewer, status: string, file: RequestFile): boolean {
  if (viewer.isInternal) return true; // 담당자/관리자는 모든 첨부 접근
  if (!viewer.isOwner) return false;

  const meta = CEC_FILE_META[file.file_type as CecFileType];
  // 알 수 없는 종류는 공개 플래그를 따른다.
  if (!meta) return file.is_customer_visible;

  if (meta.previewOnly) return false; // 최종 초안: 다운로드 금지(미리보기 전용)
  if (file.file_type === "CEC_FINAL_CERTIFICATE") {
    return status === CEC_STATUS.COMPLETED; // 완료 후에만
  }
  if (!meta.customerVisible) return false; // 검사 리포트 등 내부 전용
  return file.is_customer_visible;
}

// 보안 미리보기(inline) 가능한가? 최종 인증서 초안만 대상.
export function canPreviewCecFile(viewer: CecFileViewer, file: RequestFile): boolean {
  if (file.file_type !== "CEC_FINAL_CERTIFICATE_PREVIEW") return false;
  return viewer.isInternal || viewer.isOwner;
}

// 고객 상세 화면에 노출할 파일인가?(목록 필터) — 다운로드 가능 파일 + 미리보기 전용 파일 포함.
export function isCecFileVisibleToCustomer(status: string, file: RequestFile): boolean {
  const meta = CEC_FILE_META[file.file_type as CecFileType];
  if (!meta) return file.is_customer_visible;
  if (meta.previewOnly) return true; // 미리보기 전용도 목록에는 표시(미리보기 버튼)
  if (file.file_type === "CEC_FINAL_CERTIFICATE") return status === CEC_STATUS.COMPLETED;
  if (!meta.customerVisible) return false; // 내부 전용 숨김
  return file.is_customer_visible;
}
