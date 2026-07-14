-- 회원가입 이메일 인증(6자리 코드) 저장 테이블.
-- 이메일 1건당 최신 인증 시도 1행만 유지(재발송 시 UPSERT). verified_at 이 채워지면 인증 완료.
-- 실행:   mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-14-email-verifications.sql
-- 롤백:   mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-14-email-verifications.down.sql

CREATE TABLE IF NOT EXISTS email_verifications (
  id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(190) NOT NULL,
  code       CHAR(6)      NOT NULL,
  expires_at DATETIME     NOT NULL,
  verified_at DATETIME    NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_email_verifications_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
