-- CEC India 인증 프로세스 전용 상세 테이블.
-- 공통 구조(service_requests, request_files, request_status_histories,
-- quotations/quotation_items, payments, request_messages, request_number_seq)는
-- 기존 2026-07-10-service-requests.sql 를 그대로 재사용하고, CEC 고유 데이터만 추가한다.
--   cec_inspections : 검사 일정(예정/실제) + 장소/메모. 의뢰당 1행(upsert).
--   cec_valuations  : 가격평가. 수정 시 덮어쓰지 않고 새 행을 추가(append-only, 이력 보존).
--                     "현재 평가" = service_request 별 최신 id.
-- block_type / resume_step / reject_type 등 예외 라우팅 상태는 새 테이블을 만들지 않고
-- request_status_histories.metadata_json 에 저장한다(가장 최근 이력에서 조회).
-- CEC 접수번호(cert-YY-1000~)는 request_number_seq 의 별도 prefix 행('cec')으로 발급한다.
-- 상수/step/라벨은 src/lib/cecTypes.ts, 전이 규칙은 src/lib/cecWorkflow.ts.
-- 실행:   mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-11-cec-india.sql
-- 롤백:   mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-11-cec-india.down.sql

-- 1) 검사 일정 ----------------------------------------------------------
-- 접수(step 1→3) 시 예정 일정 입력, 검사 완료 시 실제 일정 입력.
-- planned_days / actual_days 는 서버에서 (종료-시작+1) 로 재계산해 저장한다.
CREATE TABLE IF NOT EXISTS cec_inspections (
  id                  BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id  BIGINT       NOT NULL,
  planned_start_date  DATE         NULL,
  planned_end_date    DATE         NULL,
  planned_days        INT          NULL,
  actual_start_date   DATE         NULL,
  actual_end_date     DATE         NULL,
  actual_days         INT          NULL,
  inspection_location VARCHAR(255) NULL,
  inspection_memo     TEXT         NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cec_inspection_request (service_request_id),
  CONSTRAINT fk_cec_insp_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) 가격평가(append-only) ----------------------------------------------
-- 담당자가 평가금액/설명/추가수수료 적용여부를 입력. 수정 시 새 행을 추가한다.
-- surcharge_amount 는 surcharge_applied=1 일 때 서버에서 valuation_amount*surcharge_rate 로 계산.
-- customer_confirmed_at 은 고객이 해당 평가를 확인(승인)한 시각.
CREATE TABLE IF NOT EXISTS cec_valuations (
  id                    BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id    BIGINT        NOT NULL,
  valuation_amount      DECIMAL(15,2) NOT NULL DEFAULT 0,
  valuation_currency    VARCHAR(8)    NOT NULL DEFAULT 'USD',
  valuation_description  TEXT         NULL,
  surcharge_applied     TINYINT(1)    NOT NULL DEFAULT 0,
  surcharge_rate        DECIMAL(6,5)  NOT NULL DEFAULT 0.00500,
  surcharge_amount      DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes                 TEXT          NULL,
  created_by            BIGINT        NULL,
  customer_confirmed_at DATETIME      NULL,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cec_val_request (service_request_id),
  INDEX idx_cec_val_latest (service_request_id, id),
  CONSTRAINT fk_cec_val_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_cec_val_creator FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
