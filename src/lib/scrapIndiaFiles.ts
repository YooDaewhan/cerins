// 스크랩 India 파일 접근 규칙(순수 함수). 파일 종류만 보고 판단하지 말고
// is_customer_visible + file_type 메타 + 뷰어 역할(소유/담당/관리)을 함께 본다.
//   - 고객 제출서류 / 청구서 / 세금계산서 / 입금 증빙(고객 공개 종류) : 고객/내부 모두 접근(공개 플래그에 따름).
//   - 내부 검사 리포트 / DGFT 제출문서 / DGFT 등록 증빙 / DGFT 기타 : 내부 전용. 고객은 목록·다운로드 모두 불가.
// 고객이 직접 파일 URL(또는 id)을 알더라도 서버에서 이 규칙으로 다운로드를 차단한다.

import type { RequestFile } from "@/src/lib/serviceRequestTypes";
import { SCRAP_FILE_META, type ScrapFileType } from "@/src/lib/scrapIndiaTypes";

export interface ScrapFileViewer {
  isInternal: boolean; // 관리자 또는 배정된 담당자
  isOwner: boolean; // 해당 의뢰의 고객
}

// 첨부파일 목록/다운로드 링크로 "다운로드" 가능한가?
export function canDownloadScrapFile(viewer: ScrapFileViewer, file: RequestFile): boolean {
  if (viewer.isInternal) return true; // 담당자/관리자는 모든 첨부 접근
  if (!viewer.isOwner) return false;

  const meta = SCRAP_FILE_META[file.file_type as ScrapFileType];
  // 알 수 없는 종류는 공개 플래그를 따른다.
  if (!meta) return file.is_customer_visible;
  if (!meta.customerVisible) return false; // 내부 전용(리포트/DGFT 자료 등)
  return file.is_customer_visible;
}

// 고객 상세 화면에 노출할 파일인가?(목록 필터)
export function isScrapFileVisibleToCustomer(file: RequestFile): boolean {
  const meta = SCRAP_FILE_META[file.file_type as ScrapFileType];
  if (!meta) return file.is_customer_visible;
  if (!meta.customerVisible) return false; // 내부 전용 숨김
  return file.is_customer_visible;
}
