// CEC India 전체 워크플로 수동 검증 스크립트 (dev server + 실제 DB).
// 사용법:
//   1) 개발 서버 실행:  npm run dev      (기본 포트 3001)
//   2) 다른 터미널에서:  node scripts/cec-e2e.mjs
// 세션 쿠키는 평문(cerins_uid=<id>)이므로 비밀번호 없이 역할별로 호출을 흉내낸다.
// 기본 사용자 id: 고객 3(customer), 관리자 1(admin), 담당 직원 4(staff).
// 필요 시 아래 상수를 환경에 맞게 수정.
const BASE = process.env.E2E_BASE || "http://localhost:3001";
const CUSTOMER = Number(process.env.E2E_CUSTOMER || 3);
const ADMIN = Number(process.env.E2E_ADMIN || 1);
const STAFF = Number(process.env.E2E_STAFF || 4);

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log("  ok  -", msg); }
  else { fail++; console.log("  FAIL-", msg, extra != null ? JSON.stringify(extra) : ""); }
}

async function tx(uid, id, body) {
  const res = await fetch(`${BASE}/api/requests/${id}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `cerins_uid=${uid}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}
const pdf = (name) => new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a])], name, { type: "application/pdf" });
const img = (name) => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], name, { type: "image/png" });
async function uploadFiles(uid, id, entries) {
  const fd = new FormData();
  for (const [field, file] of entries) fd.append(`files_${field}`, file);
  const res = await fetch(`${BASE}/api/requests/${id}/files`, { method: "POST", headers: { Cookie: `cerins_uid=${uid}` }, body: fd });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function main() {
  await fetch(`${BASE}/api/requests`, { headers: { Cookie: `cerins_uid=${CUSTOMER}` } }).catch(() => {});

  console.log("\n[1] 필수파일 누락(제품사진 없음) → 신청 불가");
  {
    const fd = new FormData();
    fd.set("service_type", "CEC_INDIA");
    fd.set("company_name", "테스트상사"); fd.set("contact_name", "홍길동"); fd.set("contact_phone", "010-1111-2222");
    fd.set("contact_email", "e2e@example.com"); fd.set("title", "중고 프레스 인증"); fd.set("description", "테스트 의뢰");
    fd.append("files_CEC_PURCHASE_RECEIPT", pdf("receipt.pdf"));
    fd.append("files_CEC_NAMEPLATE", img("nameplate.png"));
    const res = await fetch(`${BASE}/api/requests`, { method: "POST", headers: { Cookie: `cerins_uid=${CUSTOMER}` }, body: fd });
    const data = await res.json().catch(() => ({}));
    ok(res.status === 400 && /제품사진/.test(data.error || ""), "제품사진 없으면 400", data);
  }

  console.log("\n[2] 필수파일 모두 첨부 → 신청 성공");
  let id;
  {
    const fd = new FormData();
    fd.set("service_type", "CEC_INDIA");
    fd.set("company_name", "테스트상사"); fd.set("contact_name", "홍길동"); fd.set("contact_phone", "010-1111-2222");
    fd.set("contact_email", "e2e@example.com"); fd.set("title", "중고 프레스 인증"); fd.set("description", "테스트 의뢰");
    fd.append("files_CEC_PURCHASE_RECEIPT", pdf("receipt.pdf"));
    fd.append("files_CEC_NAMEPLATE", img("nameplate.png"));
    fd.append("files_CEC_PRODUCT_PHOTO", img("p1.png"));
    fd.append("files_CEC_PRODUCT_PHOTO", img("p2.png"));
    const res = await fetch(`${BASE}/api/requests`, { method: "POST", headers: { Cookie: `cerins_uid=${CUSTOMER}` }, body: fd });
    const data = await res.json().catch(() => ({}));
    id = data.id;
    ok(res.status === 200 && data.ok && id > 0, "신청 성공, id 발급", data);
  }
  if (!id) return finish();

  console.log("\n[3] 담당자 지정 → 접수번호 cert-YY-1000대");
  {
    const { status, data } = await tx(ADMIN, id, { action: "CEC_ASSIGN_STAFF", assignee_user_id: STAFF });
    ok(status === 200 && data.step === 1, "step 1 (CEC_ASSIGNED)", data);
    const num = String(data.request_number || "");
    ok(/^cert-\d{2}-\d{4}$/.test(num) && Number(num.split("-")[2]) >= 1000, `접수번호 ${num} (>=1000)`, data);
  }

  console.log("\n[negative] 고객은 담당자 액션(접수) 불가");
  {
    const { status } = await tx(CUSTOMER, id, { action: "CEC_ACCEPT_REQUEST", cec_accept: { inspection_start_date: "2026-08-01", inspection_end_date: "2026-08-01" } });
    ok(status === 403 || status === 409, "고객 접수 시도 거부", status);
  }

  console.log("\n[4] 접수 (검사 시작=종료 → 1일) → step 3 DEPOSIT_REQUESTED");
  {
    const { status, data } = await tx(STAFF, id, { action: "CEC_ACCEPT_REQUEST", cec_accept: { inspection_start_date: "2026-08-01", inspection_end_date: "2026-08-01", inspection_location: "인천", quotation_memo: "견적 메모" } });
    ok(status === 200 && data.step === 3 && data.status === "DEPOSIT_REQUESTED", "step 3 / DEPOSIT_REQUESTED", data);
  }

  console.log("\n[5] 선금 제출→확인, 검사 예정→시작");
  {
    let r = await tx(CUSTOMER, id, { action: "CEC_SUBMIT_DEPOSIT", payment: { depositor_name: "홍길동", payment_date: "2026-07-20" } });
    ok(r.data.status === "DEPOSIT_SUBMITTED", "DEPOSIT_SUBMITTED", r.data);
    r = await tx(STAFF, id, { action: "CEC_CONFIRM_DEPOSIT" });
    ok(r.data.status === "DEPOSIT_CONFIRMED", "DEPOSIT_CONFIRMED", r.data);
    r = await tx(STAFF, id, { action: "CEC_SCHEDULE_INSPECTION" });
    ok(r.data.status === "INSPECTION_SCHEDULED", "INSPECTION_SCHEDULED", r.data);
    r = await tx(STAFF, id, { action: "CEC_START_INSPECTION" });
    ok(r.data.status === "INSPECTION_IN_PROGRESS", "INSPECTION_IN_PROGRESS", r.data);
  }

  console.log("\n[9] 검사 리포트 없이 완료 불가 → 리포트 업로드 후 가격평가");
  {
    let r = await tx(STAFF, id, { action: "CEC_COMPLETE_VALUATION", cec_valuation: { actual_start_date: "2026-08-01", actual_end_date: "2026-08-04", valuation_amount: 100000, surcharge_applied: true } });
    ok(r.status === 400, "검사 리포트 없이 완료 불가", r.data);
    const up = await uploadFiles(STAFF, id, [["CEC_INSPECTION_REPORT", pdf("report.pdf")]]);
    ok(up.status === 200, "검사 리포트 업로드", up.data);
    r = await tx(STAFF, id, { action: "CEC_COMPLETE_VALUATION", cec_valuation: { actual_start_date: "2026-08-01", actual_end_date: "2026-08-04", valuation_amount: 100000, surcharge_applied: true, internal_memo: "내부", customer_memo: "고객메모" } });
    ok(r.data.step === 5 && r.data.status === "CEC_VALUATION_REVIEW", "가격평가 완료 step 5 (실제 4일)", r.data);
  }

  console.log("\n[12] 고객 가격평가 확인 → step 7");
  {
    const r = await tx(CUSTOMER, id, { action: "CEC_APPROVE_VALUATION" });
    ok(r.data.step === 7 && r.data.status === "CEC_CERTIFICATE_DRAFT", "step 7 CEC_CERTIFICATE_DRAFT", r.data);
  }

  console.log("\n[15] 초안 업로드 → 인보이스 없이 선적제출 불가 → 인보이스 후 step 9");
  {
    let up = await uploadFiles(STAFF, id, [["CEC_CERTIFICATE_DRAFT", pdf("draft.pdf")]]);
    ok(up.status === 200, "초안 업로드", up.data);
    let r = await tx(STAFF, id, { action: "CEC_UPLOAD_CERTIFICATE_DRAFT" });
    ok(r.data.status === "CEC_CERTIFICATE_DRAFT", "초안 업로드 완료(상태 유지)", r.data);
    r = await tx(CUSTOMER, id, { action: "CEC_APPROVE_DRAFT_SUBMIT_SHIPPING" });
    ok(r.status === 400, "인보이스 없이 선적서류 제출 불가", r.data);
    up = await uploadFiles(CUSTOMER, id, [["CEC_SHIPPING_INVOICE", pdf("invoice.pdf")]]);
    ok(up.status === 200, "인보이스 업로드", up.data);
    r = await tx(CUSTOMER, id, { action: "CEC_APPROVE_DRAFT_SUBMIT_SHIPPING" });
    ok(r.data.step === 9 && r.data.status === "CEC_FINAL_DRAFT_PREPARATION", "step 9 CEC_FINAL_DRAFT_PREPARATION", r.data);
  }

  console.log("\n[16] 최종 초안 준비(미리보기+세금계산서) → step 11 BALANCE_REQUESTED");
  {
    const up = await uploadFiles(STAFF, id, [["CEC_FINAL_CERTIFICATE_PREVIEW", pdf("preview.pdf")], ["CEC_TAX_INVOICE", pdf("tax.pdf")]]);
    ok(up.status === 200, "미리보기+세금계산서 업로드", up.data);
    const r = await tx(STAFF, id, { action: "CEC_PREPARE_FINAL_DRAFT" });
    ok(r.data.step === 11 && r.data.status === "BALANCE_REQUESTED", "step 11 BALANCE_REQUESTED", r.data);
  }

  console.log("\n[18,19] 잔금 제출→step11 유지, 확인→BALANCE_CONFIRMED(완료 아님)");
  {
    let r = await tx(CUSTOMER, id, { action: "CEC_SUBMIT_BALANCE", payment: { depositor_name: "홍길동", payment_date: "2026-08-10" } });
    ok(r.data.step === 11 && r.data.status === "BALANCE_SUBMITTED", "step 11 유지 / BALANCE_SUBMITTED", r.data);
    r = await tx(STAFF, id, { action: "CEC_CONFIRM_BALANCE" });
    ok(r.data.step === 11 && r.data.status === "BALANCE_CONFIRMED", "BALANCE_CONFIRMED (step 13 아님)", r.data);
  }

  console.log("\n[20,21] 최종 PDF 없이 완료 불가 → 업로드 후 완료 step 13");
  {
    let r = await tx(STAFF, id, { action: "CEC_COMPLETE_CERTIFICATION" });
    ok(r.status === 400, "최종 인증서 없이 완료 불가", r.data);
    const up = await uploadFiles(STAFF, id, [["CEC_FINAL_CERTIFICATE", pdf("final.pdf")]]);
    ok(up.status === 200, "최종 인증서(PDF) 업로드", up.data);
    r = await tx(STAFF, id, { action: "CEC_COMPLETE_CERTIFICATION" });
    ok(r.data.step === 13 && r.data.status === "CEC_COMPLETED", "step 13 CEC_COMPLETED", r.data);
  }

  console.log("\n[10,17,22] 파일 가시성 검증");
  {
    const found = { report: null, preview: null, final: null };
    for (let fid = 1; fid <= 500 && !(found.report && found.preview && found.final); fid++) {
      const res = await fetch(`${BASE}/api/files/${fid}`, { headers: { Cookie: `cerins_uid=${ADMIN}` } });
      if (res.status !== 200) continue;
      const cd = res.headers.get("content-disposition") || "";
      if (/report\.pdf/.test(cd)) found.report = fid;
      else if (/preview\.pdf/.test(cd)) found.preview = fid;
      else if (/final\.pdf/.test(cd)) found.final = fid;
    }
    if (found.report) {
      const c = await fetch(`${BASE}/api/files/${found.report}`, { headers: { Cookie: `cerins_uid=${CUSTOMER}` } });
      ok(c.status === 403, "고객: 검사 리포트 다운로드 403(내부 전용)", { status: c.status });
    } else ok(false, "검사 리포트 파일 id 탐색 실패");
    if (found.preview) {
      const dl = await fetch(`${BASE}/api/files/${found.preview}`, { headers: { Cookie: `cerins_uid=${CUSTOMER}` } });
      ok(dl.status === 403, "고객: 최종 초안 일반 다운로드 403", { status: dl.status });
      const pv = await fetch(`${BASE}/api/requests/${id}/preview/${found.preview}`, { headers: { Cookie: `cerins_uid=${CUSTOMER}` } });
      ok(pv.status === 200 && /inline/.test(pv.headers.get("content-disposition") || ""), "고객: 최종 초안 미리보기 200 inline", { status: pv.status });
    } else ok(false, "미리보기 파일 id 탐색 실패");
    if (found.final) {
      const c = await fetch(`${BASE}/api/files/${found.final}`, { headers: { Cookie: `cerins_uid=${CUSTOMER}` } });
      ok(c.status === 200, "고객: 완료 후 최종 인증서 다운로드 200", { status: c.status });
    } else ok(false, "최종 인증서 파일 id 탐색 실패");
  }

  finish();
}
function finish() {
  console.log(`\n===== e2e 결과: pass ${pass}, fail ${fail} =====`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error("SCRIPT ERROR:", e); process.exit(1); });
