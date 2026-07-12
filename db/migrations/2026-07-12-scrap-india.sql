-- 검사 → 스크랩(인도) (Scrap India) 프로세스 전용 상세 테이블 + 동적 제출서류 관리 + 공통 확장.
-- 공통 구조(service_requests, request_files, request_status_histories, payments,
-- quotations/quotation_items, request_messages, request_number_seq)는 기존
-- 2026-07-10-service-requests.sql 를 그대로 재사용하고, 스크랩 India 고유 데이터만 추가한다.
--   category = 'INSPECTION', service_type = 'SCRAP_INDIA' 인 의뢰만 이 규칙을 따른다.
--   scrap_inspections           : 검사 일정(요청/확정/실제) + 현장 담당자 + 처리자/시각 + 메모. 의뢰당 1행(upsert).
--   scrap_dgft_registrations    : DGFT 등록 문서/신청/등록번호/증빙 처리 정보. 의뢰당 1행(upsert).
--   service_document_requirements : 서비스별·단계별 고객 제출서류 항목(동적). 관리자가 화면에서 등록/수정.
-- 예외 라우팅(검사 진행 보류/리포트 보류/DGFT 보류의 resume_status)은 새 테이블을 만들지 않고
-- request_status_histories.metadata_json 에 저장한다(가장 최근 이력에서 조회, 제품검사와 동일 방식).
-- 스크랩 India 접수번호(scrap-YY-0001~)는 request_number_seq 의 'scrap' prefix 로 발급한다
--   (requestNumberService.nextScrapRequestNumber, 인증 cert-* / 제품검사 insp-* 와 구분됨).
-- 고객 청구 입금(payment_type='SCRAP_INSPECTION_PAYMENT')은 기존 payments 테이블을 재사용한다
--   (payment_type 은 2026-07-11-product-inspection.sql 에서 이미 VARCHAR(32) 로 확장되어 있어 그대로 사용).
-- 상수/step/라벨은 src/lib/scrapIndiaTypes.ts, 전이 규칙은 src/lib/scrapIndiaWorkflow.ts.
-- 실행:   mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-12-scrap-india.sql
-- 롤백:   mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-12-scrap-india.down.sql

-- 1) 스크랩 검사 상세 ----------------------------------------------------
-- 요청 일정(고객 신청 당시), 확정 일정(담당자 확인), 실제 일정(현장검사)을 각각 보존한다.
-- 시간 미정을 지원하므로 시간 컬럼은 nullable. 현장 담당자 정보와 처리자/처리시각을 함께 기록한다.
CREATE TABLE IF NOT EXISTS scrap_inspections (
  id                              BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id              BIGINT       NOT NULL,

  -- 고객이 신청한 요청 일정/장소(step 0, 이후 일정 조정 시 갱신되며 이력은 histories 에 보존).
  requested_start_date            DATE         NULL,
  requested_end_date              DATE         NULL,
  requested_start_time            TIME         NULL,
  requested_end_time              TIME         NULL,
  requested_location              VARCHAR(255) NULL,
  requested_location_detail       VARCHAR(255) NULL,

  -- 담당자가 확정한 검사 일정/장소(step 3).
  confirmed_start_date            DATE         NULL,
  confirmed_end_date              DATE         NULL,
  confirmed_start_time            TIME         NULL,
  confirmed_end_time              TIME         NULL,
  confirmed_location              VARCHAR(255) NULL,

  -- 실제 현장검사 일정.
  actual_start_date               DATE         NULL,
  actual_end_date                 DATE         NULL,
  actual_start_time               TIME         NULL,
  actual_end_time                 TIME         NULL,

  -- 현장 담당자(고객측 현장 연락처).
  site_contact_name               VARCHAR(190) NULL,
  site_contact_phone              VARCHAR(60)  NULL,

  -- 처리자/처리시각.
  schedule_confirmed_at           DATETIME     NULL,
  schedule_confirmed_by           BIGINT       NULL,
  inspection_started_at           DATETIME     NULL,
  inspection_started_by           BIGINT       NULL,
  inspection_completed_at         DATETIME     NULL,
  inspection_completed_by         BIGINT       NULL,
  customer_documents_submitted_at DATETIME     NULL,
  customer_documents_confirmed_at DATETIME     NULL,
  customer_documents_confirmed_by BIGINT       NULL,

  customer_visible_memo           TEXT         NULL,
  internal_memo                   TEXT         NULL,

  created_at                      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_scrap_request (service_request_id),
  CONSTRAINT fk_scrap_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_scrap_schedule_by FOREIGN KEY (schedule_confirmed_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_scrap_started_by FOREIGN KEY (inspection_started_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_scrap_completed_by FOREIGN KEY (inspection_completed_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_scrap_docs_by FOREIGN KEY (customer_documents_confirmed_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) DGFT 등록 상세 -----------------------------------------------------
-- 입금 확인 후 진행하는 DGFT 등록 문서 작성/신청/등록번호/증빙 처리 정보. 의뢰당 1행(upsert).
CREATE TABLE IF NOT EXISTS scrap_dgft_registrations (
  id                        BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id        BIGINT       NOT NULL,

  document_prepared_at      DATE         NULL,  -- DGFT 등록 문서 작성일
  registration_submitted_at DATE         NULL,  -- DGFT 등록 신청일
  registration_confirmed_at DATE         NULL,  -- DGFT 등록 완료(확인)일
  registration_number       VARCHAR(120) NULL,  -- DGFT 등록번호
  external_reference_number VARCHAR(120) NULL,  -- 외부 접수번호
  registered_by             BIGINT       NULL,  -- 등록 담당자(직원)
  registration_status       VARCHAR(32)  NOT NULL DEFAULT 'PREPARING', -- PREPARING/IN_PROGRESS/REGISTERED/BLOCKED
  customer_visible_memo     TEXT         NULL,
  internal_memo             TEXT         NULL,

  created_at                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_scrap_dgft_request (service_request_id),
  CONSTRAINT fk_scrap_dgft_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_scrap_dgft_registered_by FOREIGN KEY (registered_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) 동적 제출서류 항목 -------------------------------------------------
-- 서비스별·워크플로 단계별 고객 제출서류 항목을 관리자가 등록/수정한다.
-- 서류 명칭이 아직 확정되지 않았거나 추후 추가되어도 코드 수정 없이 항목만 추가하면 된다.
-- 특정 서비스에 종속되지 않는 공통 구조이므로 다른 서비스도 재사용할 수 있다.
CREATE TABLE IF NOT EXISTS service_document_requirements (
  id                 BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_type       VARCHAR(48)  NOT NULL,   -- 예: 'SCRAP_INDIA'
  workflow_step      INT          NOT NULL,   -- 예: 5 (고객 서류 제출 단계)
  document_code      VARCHAR(64)  NOT NULL,   -- 내부 식별 코드(서비스+단계 내 유일)
  display_name       VARCHAR(190) NOT NULL,   -- 고객에게 보이는 서류명(관리자 입력)
  description        VARCHAR(500) NULL,
  is_required        TINYINT(1)   NOT NULL DEFAULT 1,
  allows_multiple    TINYINT(1)   NOT NULL DEFAULT 0,
  allowed_extensions VARCHAR(190) NULL,        -- 쉼표구분(.pdf,.jpg). NULL 이면 공통 업로드 정책 사용.
  max_file_size      BIGINT       NULL,        -- 바이트. NULL 이면 공통 MAX_UPLOAD_BYTES 사용.
  sort_order         INT          NOT NULL DEFAULT 0,
  is_active          TINYINT(1)   NOT NULL DEFAULT 1,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sdr_code (service_type, workflow_step, document_code),
  INDEX idx_sdr_lookup (service_type, workflow_step, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) request_files 확장 -------------------------------------------------
-- 고객 제출서류를 동적 서류 항목과 연결한다. display_name_snapshot 은 관리자가 나중에 서류명을
-- 변경해도 제출 당시의 서류명이 유지되도록 저장한다(TRCU/CEC/제품검사 파일에는 영향 없음, nullable).
ALTER TABLE request_files
  ADD COLUMN service_document_requirement_id BIGINT      NULL AFTER file_type,
  ADD COLUMN display_name_snapshot           VARCHAR(190) NULL AFTER service_document_requirement_id,
  ADD CONSTRAINT fk_rf_doc_requirement FOREIGN KEY (service_document_requirement_id)
    REFERENCES service_document_requirements(id) ON DELETE SET NULL;
