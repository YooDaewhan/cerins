import type { PageContentBlock } from "@/src/lib/types";

// 페이지 본문(content)은 이제 HTML 문자열이다(포스트 에디터와 동일).
// 과거 {heading, body}[] 블록 배열로 저장된 데이터는 읽는 순간 HTML로 변환한다.
// ponytail: 파괴적 일괄 마이그레이션 대신 읽기 시 변환 — 관리자가 재저장하면 HTML로 굳는다.
export function pageContentToHtml(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return (raw as PageContentBlock[])
      .map((b) => {
        const heading = b?.heading ? `<h2>${escapeHtml(b.heading)}</h2>` : "";
        const body = b?.body
          ? `<p>${escapeHtml(b.body).replace(/\n/g, "<br>")}</p>`
          : "";
        return heading + body;
      })
      .join("");
  }
  return "";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// HTML에서 표시용 평문만 추출(메인페이지 요약 등).
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
