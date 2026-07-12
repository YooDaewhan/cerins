-- 고객 의뢰 / 업무 프로세스 관리 시스템 테이블.
--   service_requests        : 의뢰 본문(스냅샷 값 + 워크플로 step/status)
--   request_files           : 첨부파일 메타(실 파일은 비공개 저장소, 공개 URL 노출 금지)
--   request_status_histories: 모든 단계 변경/담당자 지정/반려/입금/업로드 이력
--   quotations / quotation_items : 견적서 + 가격표 행(금액은 DECIMAL)
--   payments                : 선금/잔금 입금 정보(의뢰 본문에 섞지 않고 분리)
--   request_messages        : 진행/내부/공개 메모, 반려·보완 사유
--   request_number_seq      : 접수번호 일련번호 발급(연도·구분별, 동시성 안전)
-- 상태 코드/step/라벨은 src/lib/serviceRequestTypes.ts, 전이 규칙은 serviceWorkflow.ts.
-- 실행:   mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-10-service-requests.sql
-- 롤백:   mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-10-service-requests.down.sql

-- 1) 의뢰 본문 ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_requests (
  id               BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  request_number   VARCHAR(32)  NULL,
  customer_user_id BIGINT       NULL,
  assignee_user_id BIGINT       NULL,
  category         VARCHAR(32)  NOT NULL,
  service_type     VARCHAR(48)  NOT NULL,
  -- 신청 당시 스냅샷(회원정보가 바뀌어도 신청서 기록은 불변)
  company_name     VARCHAR(190) NOT NULL,
  contact_name     VARCHAR(190) NOT NULL,
  contact_phone    VARCHAR(60)  NOT NULL,
  contact_email    VARCHAR(190) NOT NULL,
  title            VARCHAR(255) NOT NULL,
  description      TEXT         NOT NULL,
  workflow_step    INT          NOT NULL DEFAULT 0,
  status           VARCHAR(48)  NOT NULL DEFAULT 'REQUESTED',
  submitted_at     DATETIME     NULL,
  assigned_at      DATETIME     NULL,
  completed_at     DATETIME     NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_service_requests_request_number (request_number),
  INDEX idx_sr_customer (customer_user_id),
  INDEX idx_sr_assignee (assignee_user_id),
  INDEX idx_sr_status (status),
  INDEX idx_sr_service_type (service_type),
  INDEX idx_sr_created_at (created_at),
  CONSTRAINT fk_sr_customer FOREIGN KEY (customer_user_id)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_sr_assignee FOREIGN KEY (assignee_user_id)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) 접수번호 일련번호 ----------------------------------------------------
-- (year_2, prefix) 당 last_seq 를 원자적으로 증가. 연도가 바뀌면 새 행 → 다시 0001.
CREATE TABLE IF NOT EXISTS request_number_seq (
  year_2   INT         NOT NULL,
  prefix   VARCHAR(16) NOT NULL,
  last_seq INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (year_2, prefix)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) 첨부파일 메타 --------------------------------------------------------
CREATE TABLE IF NOT EXISTS request_files (
  id                  BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id  BIGINT       NOT NULL,
  file_type           VARCHAR(48)  NOT NULL,
  original_name       VARCHAR(255) NOT NULL,
  stored_name         VARCHAR(255) NOT NULL,
  storage_path        VARCHAR(512) NOT NULL,
  mime_type           VARCHAR(190) NOT NULL,
  extension           VARCHAR(16)  NOT NULL,
  file_size           BIGINT       NOT NULL DEFAULT 0,
  uploaded_by         BIGINT       NULL,
  is_customer_visible TINYINT(1)   NOT NULL DEFAULT 1,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rf_request (service_request_id),
  INDEX idx_rf_type (service_request_id, file_type),
  CONSTRAINT fk_rf_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_rf_uploader FOREIGN KEY (uploaded_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) 상태 변경 이력 -------------------------------------------------------
CREATE TABLE IF NOT EXISTS request_status_histories (
  id                 BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id BIGINT       NOT NULL,
  actor_user_id      BIGINT       NULL,
  action             VARCHAR(48)  NOT NULL,
  from_step          INT          NULL,
  to_step            INT          NULL,
  from_status        VARCHAR(48)  NULL,
  to_status          VARCHAR(48)  NULL,
  message            TEXT         NULL,
  metadata_json      JSON         NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rsh_request (service_request_id),
  INDEX idx_rsh_created (service_request_id, created_at),
  CONSTRAINT fk_rsh_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_rsh_actor FOREIGN KEY (actor_user_id)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5) 견적서 --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotations (
  id                 BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id BIGINT        NOT NULL,
  currency           VARCHAR(8)    NOT NULL DEFAULT 'KRW',
  total_amount       DECIMAL(15,2) NOT NULL DEFAULT 0,
  deposit_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,
  balance_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes              TEXT          NULL,
  created_by         BIGINT        NULL,
  sent_at            DATETIME      NULL,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_quotations_request (service_request_id),
  CONSTRAINT fk_q_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_q_creator FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6) 가격표 행 -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotation_items (
  id           BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  quotation_id BIGINT        NOT NULL,
  item_type    VARCHAR(48)   NULL,
  item_name    VARCHAR(190)  NOT NULL,
  quantity     DECIMAL(15,2) NOT NULL DEFAULT 0,
  unit_price   DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount       DECIMAL(15,2) NOT NULL DEFAULT 0,
  memo         VARCHAR(255)  NULL,
  sort_order   INT           NOT NULL DEFAULT 0,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_qi_quotation (quotation_id),
  CONSTRAINT fk_qi_quotation FOREIGN KEY (quotation_id)
    REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7) 결제 ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id                 BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id BIGINT        NOT NULL,
  payment_type       VARCHAR(16)   NOT NULL,
  expected_amount    DECIMAL(15,2) NULL,
  depositor_name     VARCHAR(190)  NOT NULL,
  sender_account     VARCHAR(190)  NULL,
  payment_date       DATE          NULL,
  memo               VARCHAR(255)  NULL,
  status             VARCHAR(16)   NOT NULL DEFAULT 'PENDING',
  submitted_by       BIGINT        NULL,
  submitted_at       DATETIME      NULL,
  confirmed_by       BIGINT        NULL,
  confirmed_at       DATETIME      NULL,
  rejection_reason   TEXT          NULL,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pay_request (service_request_id),
  INDEX idx_pay_type (service_request_id, payment_type),
  CONSTRAINT fk_pay_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_pay_submitter FOREIGN KEY (submitted_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pay_confirmer FOREIGN KEY (confirmed_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8) 메모 / 메시지 -------------------------------------------------------
CREATE TABLE IF NOT EXISTS request_messages (
  id                  BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id  BIGINT       NOT NULL,
  author_user_id      BIGINT       NULL,
  message_type        VARCHAR(48)  NOT NULL,
  message             TEXT         NOT NULL,
  is_customer_visible TINYINT(1)   NOT NULL DEFAULT 1,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rm_request (service_request_id),
  INDEX idx_rm_visible (service_request_id, is_customer_visible),
  CONSTRAINT fk_rm_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_rm_author FOREIGN KEY (author_user_id)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
