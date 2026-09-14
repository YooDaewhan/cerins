-- 관리자 회원 대상 메일 발송 기능: 메일 양식(템플릿) + 발송 로그.
-- 실행:   mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-22-admin-email.sql
-- 롤백:   mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-22-admin-email.down.sql

-- 저장해 둔 메일 양식(제목 + 에디터 HTML 본문).
CREATE TABLE IF NOT EXISTS email_templates (
  id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(190) NOT NULL,
  subject    VARCHAR(255) NOT NULL DEFAULT '',
  body_html  MEDIUMTEXT   NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 발송 1건(캠페인) = 1행. 수신자 목록/성공·실패 수를 함께 보관.
CREATE TABLE IF NOT EXISTS email_logs (
  id           BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  subject      VARCHAR(255) NOT NULL,
  body_html    MEDIUMTEXT   NOT NULL,
  recipients   JSON         NOT NULL,           -- 발송 대상 이메일 배열
  sent_count   INT          NOT NULL DEFAULT 0,
  failed_count INT          NOT NULL DEFAULT 0,
  error        TEXT         NULL,               -- 첫 실패 메시지(요약)
  sent_by      BIGINT       NULL,               -- users.id (관리자)
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_email_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
