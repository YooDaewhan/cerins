// 보관 파일명 규칙 단위 테스트 (DB 불필요, 순수 함수).
// 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReportFilename } from "@/src/lib/photoReports";

const AUG_28 = new Date(2026, 7, 28);

test("날짜_형식_이름 순서로 만든다", () => {
  assert.equal(
    buildReportFilename("CEC Inspection Report", "유지환", "docx", AUG_28),
    "260828_CEC Inspection Report_유지환.docx",
  );
});

test("한 자리 월/일은 0 을 채운다", () => {
  assert.equal(
    buildReportFilename("Inspection Report", "홍길동", "zip", new Date(2026, 0, 5)),
    "260105_Inspection Report_홍길동.zip",
  );
});

test("파일명에 쓸 수 없는 문자는 지운다", () => {
  assert.equal(
    buildReportFilename("PSIC Inspection Report (Scrap)", "a/b:c*?", "docx", AUG_28),
    "260828_PSIC Inspection Report (Scrap)_abc.docx",
  );
});
