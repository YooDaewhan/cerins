-- 제품검사(Product Inspection) 프로세스 전용 상세 테이블 + 공통 payments 확장.
-- 공통 구조(service_requests, request_files, request_status_histories,
-- payments, request_messages, request_number_seq)는 기존
-- 2026-07-10-service-requests.sql 를 그대로 재사용하고, 제품검사 고유 데이터만 추가한다.
--   product_inspections : 검사 일정(예정/실제) + 장소/메모 + 외부기관 리포트 제출 정보. 의뢰당 1행(upsert).
-- 검사일정 변경 이력 / 진행불가·리포트문제·입금문제 등 예외 라우팅(resume_status)은
-- 새 테이블을 만들지 않고 request_status_histories.metadata_json 에 저장한다(가장 최근 이력에서 조회).
-- 제품검사 접수번호(insp-YY-0001~)는 request_number_seq 의 'insp' prefix 로 발급한다
--   (기존 nextRequestNumber(category='INSPECTION') 재사용, 인증 서비스 cert-* 와 구분됨).
-- 상수/step/라벨은 src/lib/productInspectionTypes.ts, 전이 규칙은 src/lib/productInspectionWorkflow.ts.
-- 실행:   mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-11-product-inspection.sql
-- 롤백:   mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-11-product-inspection.down.sql

-- 1) 제품검사 상세 -------------------------------------------------------
-- 검사 일정(예정/실제, 시간대 포함), 처리자/처리시각, 외부 인증기관 리포트 제출 정보.
-- 고객 공개 메모(customer_visible_memo)와 내부 메모(internal_memo)는 컬럼을 분리한다.
CREATE TABLE IF NOT EXISTS product_inspections (
  id                            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id            BIGINT       NOT NULL,

  planned_start_date            DATE         NULL,
  planned_end_date              DATE         NULL,
  planned_start_time            TIME         NULL,
  planned_end_time              TIME         NULL,

  actual_start_date             DATE         NULL,
  actual_end_date               DATE         NULL,
  actual_start_time             TIME         NULL,
  actual_end_time               TIME         NULL,

  inspection_location           VARCHAR(255) NULL,

  schedule_confirmed_at         DATETIME     NULL,
  schedule_confirmed_by         BIGINT       NULL,
  inspection_started_at         DATETIME     NULL,
  inspection_started_by         BIGINT       NULL,
  inspection_completed_at       DATETIME     NULL,
  inspection_completed_by       BIGINT       NULL,
  report_submitted_at           DATETIME     NULL,
  report_submitted_by           BIGINT       NULL,

  -- 다른 인증기관 리포트 제출 정보(내부용).
  external_agency_name          VARCHAR(190) NULL,
  external_agency_department    VARCHAR(190) NULL,
  external_agency_contact_name  VARCHAR(190) NULL,
  external_agency_contact_email VARCHAR(190) NULL,
  external_agency_contact_phone VARCHAR(60)  NULL,
  external_reference_number     VARCHAR(120) NULL,
  report_submission_method      VARCHAR(16)  NULL,  -- EMAIL / PORTAL / OFFLINE / OTHER

  customer_visible_memo         TEXT         NULL,
  internal_memo                 TEXT         NULL,

  created_at                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pi_request (service_request_id),
  CONSTRAINT fk_pi_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_pi_schedule_by FOREIGN KEY (schedule_confirmed_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pi_started_by FOREIGN KEY (inspection_started_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pi_completed_by FOREIGN KEY (inspection_completed_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pi_report_by FOREIGN KEY (report_submitted_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) payments 확장 ------------------------------------------------------
-- 제품검사 Step 7 의 외부 인증기관 정산 입금(payment_type='EXTERNAL_AGENCY_PAYMENT')을
-- 기존 payments 테이블로 처리한다. 고객 선금/잔금과 달리 통화·실입금액·정산기관·수취계좌를
-- 함께 기록해야 하므로 nullable 컬럼을 추가한다(TRCU/CEC 결제에는 영향 없음).
-- payment_type 은 기존 VARCHAR(16) 으로는 'EXTERNAL_AGENCY_PAYMENT'(23자)를 담지 못하므로 확장한다.
ALTER TABLE payments
  MODIFY COLUMN payment_type         VARCHAR(32)   NOT NULL,
  ADD COLUMN currency                VARCHAR(8)    NULL AFTER expected_amount,
  ADD COLUMN paid_amount             DECIMAL(15,2) NULL AFTER currency,
  ADD COLUMN payer_organization_name VARCHAR(190)  NULL AFTER paid_amount,
  ADD COLUMN external_reference_number VARCHAR(120) NULL AFTER payer_organization_name,
  ADD COLUMN received_account        VARCHAR(190)  NULL AFTER external_reference_number;
