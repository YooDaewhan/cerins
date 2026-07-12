// 의뢰/워크플로 관련 설정값. 은행 계좌·JOS 양식 경로·통화·파일 제한 등
// 소스코드에 하드코딩하지 말아야 하는 값을 환경변수에서 읽는다.
// (관리자 UI 설정 테이블로 승격하기 쉽도록 한 곳에 모아둔다.)

export interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

// 견적/입금 안내에 사용할 입금 계좌 정보.
export function getBankInfo(): BankInfo {
  return {
    bankName: process.env.PAYMENT_BANK_NAME ?? "",
    accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER ?? "",
    accountHolder: process.env.PAYMENT_ACCOUNT_HOLDER ?? "",
  };
}

export function bankInfoConfigured(info: BankInfo = getBankInfo()): boolean {
  return Boolean(info.bankName && info.accountNumber && info.accountHolder);
}

// 기본 통화. 별도 업무 설정이 없으면 KRW.
export const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY ?? "KRW";

// 선금/잔금 비율(%). 명세상 50/50.
export const DEPOSIT_RATE = 0.5;

// JOS 양식 파일의 공개 다운로드 경로(예: /uploads/forms/jos-template.xlsx).
// 코드에 하드코딩하지 않고 설정값으로 관리한다.
export function getJosTemplateUrl(): string | null {
  return process.env.JOS_TEMPLATE_URL ?? null;
}

/* ------------------------------------------------------------------ */
/* 파일 업로드 정책                                                     */
/* ------------------------------------------------------------------ */

// 확장자 → 허용 MIME. 서버에서 확장자와 MIME 을 모두 검증한다.
export const ALLOWED_UPLOAD_MIMES: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".gif": ["image/gif"],
  ".webp": ["image/webp"],
  ".doc": ["application/msword"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  ".ppt": ["application/vnd.ms-powerpoint"],
  ".pptx": [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  ".zip": ["application/zip", "application/x-zip-compressed"],
  ".dwg": ["application/acad", "image/vnd.dwg", "application/octet-stream"],
  ".step": ["application/octet-stream", "application/step", "model/step"],
  ".stp": ["application/octet-stream", "application/step", "model/step"],
};

// 파일 1개 최대 크기(바이트). 설정값으로 관리.
export const MAX_UPLOAD_BYTES = Number(
  process.env.MAX_UPLOAD_BYTES ?? 50 * 1024 * 1024, // 기본 50MB
);

// 최종 인증서는 PDF 만 허용.
export const FINAL_CERTIFICATE_ALLOWED_MIMES = ["application/pdf"];
export const FINAL_CERTIFICATE_ALLOWED_EXT = ".pdf";

/* ------------------------------------------------------------------ */
/* CEC India 가격 설정 (USD)                                            */
/* ------------------------------------------------------------------ */

// 소스에 하드코딩하지 않고 환경변수/설정으로 관리(관리자 설정 테이블로 승격 용이).
// 명세 기본값: 기본 인증비 1,800 / 검사비 1일당 250 / 선금 900 / 물건가액 추가 수수료율 0.5%.
export interface CecPricing {
  baseFee: number; // 기본 인증비
  inspectionDailyFee: number; // 1일당 검사비
  deposit: number; // 선금(고정)
  surchargeRate: number; // 물건가액 추가 수수료율 (0.005 = 0.5%)
  currency: string;
}

export function getCecPricing(): CecPricing {
  return {
    baseFee: Number(process.env.CEC_BASE_FEE ?? 1800),
    inspectionDailyFee: Number(process.env.CEC_INSPECTION_DAILY_FEE ?? 250),
    deposit: Number(process.env.CEC_DEPOSIT ?? 900),
    surchargeRate: Number(process.env.CEC_SURCHARGE_RATE ?? 0.005),
    currency: process.env.CEC_CURRENCY ?? "USD",
  };
}
